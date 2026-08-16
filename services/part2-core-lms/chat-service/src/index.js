const express = require('express');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.json());

// Decode the Keycloak JWT (payload only) so real users are attributed correctly.
function jwtPayload(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) {
    try {
      return JSON.parse(Buffer.from(auth.substring(7).split('.')[1], 'base64url').toString('utf8'));
    } catch (err) { /* ignore malformed token */ }
  }
  return null;
}

function userIdFromReq(req) {
  const payload = jwtPayload(req);
  if (payload && payload.sub) return payload.sub;
  return req.headers['x-mock-user-id'] || 'u-1';
}

// Best-effort display name for the JWT bearer (Keycloak tokens carry
// name/preferred_username/email). Stored on DMs so the inbox can show who
// messaged whom without a user-directory lookup (#dm inbox).
function nameFromReq(req) {
  const payload = jwtPayload(req);
  if (payload) {
    return payload.name || payload.preferred_username || payload.email || null;
  }
  return req.headers['x-mock-user-name'] || null;
}

function tenantIdFromReq(req) {
  const payload = jwtPayload(req);
  if (payload) {
    return payload.tenant_id || (payload.attributes && payload.attributes.tenant_id && payload.attributes.tenant_id[0]) || payload.tenantId || 'master';
  }
  return req.headers['x-mock-tenant-id'] || 'master';
}

function isSuperAdminFromReq(req) {
  const payload = jwtPayload(req);
  const roles = payload ? (payload.realm_access?.roles || payload.roles || []) : (req.headers['x-mock-roles'] || '').split(',').map(r => r.trim());
  return roles.some(r => r.toLowerCase() === 'superadmin' || r.toLowerCase() === 'super_admin');
}

app.use((req, res, next) => {
  req.userId = userIdFromReq(req);
  req.tenantId = tenantIdFromReq(req);
  req.isSuperAdmin = isSuperAdminFromReq(req);
  next();
});

const PORT = process.env.PORT || 3007;
const DATA_FILE = process.env.CHAT_DATA_FILE || '/tmp/chat-store.json';

// ─── In-memory store (persisted to JSON so messages survive restarts) ───
let store = { rooms: [], messages: [], dms: [] };

function loadStore() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      store = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('[Chat] Failed to load store, starting fresh:', err.message);
  }
}

function saveStore() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
  } catch (err) {
    console.error('[Chat] Failed to persist store:', err.message);
  }
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// College targeting (#multi-college): a room is visible to
//   - its own college (tenant_id), plus
//   - colleges listed in target_tenants, plus
//   - every college when target_tenants contains '__ALL__'.
// Legacy rooms without tenant_id stay visible to everyone (pre-scoping data).
function roomVisibleToUser(room, tenantId, isSuperAdmin) {
  if (room.deleted_at) return false; // soft-deleted rooms are hidden everywhere
  if (isSuperAdmin) return true;
  if (!room.tenant_id) return true; // legacy global room
  if (room.tenant_id === tenantId) return true;
  if (Array.isArray(room.target_tenants)) {
    if (room.target_tenants.includes('__ALL__')) return true;
    if (room.target_tenants.includes(tenantId)) return true;
  }
  return false;
}

// Audience control (#chat): beyond college scoping, a room can be limited to
//   - ALL    -> anyone in the visible colleges (default)
//   - COURSE -> only users enrolled in the course (member_ids resolved at creation)
//   - USERS  -> only the explicit member list
function roomAudienceAllows(room, userId) {
  if (!room.audience_type || room.audience_type === 'ALL') return true;
  // The creator always sees (and can manage) their own room, even if they
  // didn't include themselves in the invited member list (#chat fix).
  if (room.created_by === userId) return true;
  if (room.audience_type === 'COURSE' || room.audience_type === 'USERS') {
    return Array.isArray(room.member_ids) && room.member_ids.includes(userId);
  }
  return true;
}

function roomView(room) {
  return {
    id: room.id,
    name: room.name,
    type: room.type || 'GROUP',
    created_by: room.created_by,
    created_at: room.created_at,
    tenant_id: room.tenant_id || null,
    target_tenants: room.target_tenants || [],
    audience_type: room.audience_type || 'ALL',
    audience_id: room.audience_id || null,
    member_ids: room.member_ids || [],
    is_locked: !!room.is_locked,
    _count: {
      members: room.members.length,
      messages: store.messages.filter(m => m.room_id === room.id).length,
    },
  };
}

loadStore();

// Seed a default room so the UI is never empty — visible to every college.
if (!store.rooms.some(r => r.id === 'general')) {
  store.rooms.push({ id: 'general', name: 'General', type: 'GROUP', created_by: 'system', members: [], target_tenants: ['__ALL__'], created_at: new Date().toISOString() });
  saveStore();
}

// ─── REST API ───

// List rooms visible to the caller's college + audience
app.get('/api/v1/chat/rooms', (req, res) => {
  const visible = store.rooms.filter(r => roomVisibleToUser(r, req.tenantId, req.isSuperAdmin))
    .filter(r => roomAudienceAllows(r, req.userId));
  res.json(visible.map(roomView));
});

// Create a room
app.post('/api/v1/chat/rooms', (req, res) => {
  const name = String(req.body?.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Room name is required' });
  let targetTenants = [];
  if (req.isSuperAdmin && Array.isArray(req.body?.target_tenants)) {
    targetTenants = req.body.target_tenants.map(String).filter(Boolean);
  }
  const audienceType = ['COURSE', 'USERS'].includes(req.body?.audience_type) ? req.body.audience_type : 'ALL';
  const creatorId = req.body?.created_by || req.userId;
  let memberIds = [];
  if (audienceType !== 'ALL') {
    memberIds = Array.isArray(req.body?.member_ids) ? req.body.member_ids.map(String).filter(Boolean) : [];
    // The creator is always part of their own room's audience (#chat fix).
    if (creatorId && !memberIds.includes(creatorId)) memberIds.push(creatorId);
  }
  const room = {
    id: uid('room'),
    name,
    type: String(req.body?.type || 'GROUP'),
    created_by: creatorId,
    tenant_id: req.tenantId,
    target_tenants: targetTenants,
    audience_type: audienceType,
    audience_id: audienceType === 'COURSE' ? (req.body?.audience_id || null) : null,
    member_ids: memberIds,
    is_locked: false,
    deleted_at: null,
    members: [],
    created_at: new Date().toISOString(),
  };
  store.rooms.push(room);
  saveStore();
  res.status(201).json(roomView(room));
});

// Update a room — hold/reopen (is_locked) by the creator or a super admin (#chat)
app.patch('/api/v1/chat/rooms/:id', (req, res) => {
  const room = store.rooms.find(r => r.id === req.params.id);
  if (!room || room.deleted_at) return res.status(404).json({ message: 'Room not found' });
  const canManage = req.isSuperAdmin || room.created_by === req.userId;
  if (!canManage) return res.status(403).json({ message: 'Only the room creator or a super admin can manage this room' });
  if (typeof req.body?.is_locked === 'boolean') {
    room.is_locked = req.body.is_locked;
  }
  saveStore();
  res.json(roomView(room));
});

// Soft-delete a room — creator or super admin (#chat); hidden everywhere, recoverable
app.delete('/api/v1/chat/rooms/:id', (req, res) => {
  const room = store.rooms.find(r => r.id === req.params.id);
  if (!room || room.deleted_at) return res.status(404).json({ message: 'Room not found' });
  const canManage = req.isSuperAdmin || room.created_by === req.userId;
  if (!canManage) return res.status(403).json({ message: 'Only the room creator or a super admin can delete this room' });
  room.deleted_at = new Date().toISOString();
  saveStore();
  res.json({ ok: true, id: room.id });
});

// Join a room
app.post('/api/v1/chat/rooms/:id/join', (req, res) => {
  const room = store.rooms.find(r => r.id === req.params.id);
  if (!room || room.deleted_at) return res.status(404).json({ message: 'Room not found' });
  if (!roomVisibleToUser(room, req.tenantId, req.isSuperAdmin)) {
    return res.status(403).json({ message: 'This room is not available in your college' });
  }
  if (!roomAudienceAllows(room, req.userId)) {
    return res.status(403).json({ message: 'This room is only for its invited audience' });
  }
  const userId = req.body?.user_id || req.userId;
  if (!room.members.includes(userId)) {
    room.members.push(userId);
    saveStore();
  }
  res.json(roomView(room));
});

// Messages in a room
app.get('/api/v1/chat/rooms/:id/messages', (req, res) => {
  const room = store.rooms.find(r => r.id === req.params.id);
  if (!room || room.deleted_at) return res.status(404).json({ message: 'Room not found' });
  if (!roomVisibleToUser(room, req.tenantId, req.isSuperAdmin)) {
    return res.status(403).json({ message: 'This room is not available in your college' });
  }
  if (!roomAudienceAllows(room, req.userId)) {
    return res.status(403).json({ message: 'This room is only for its invited audience' });
  }
  res.json(store.messages.filter(m => m.room_id === room.id).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
});

// Send a message to a room (blocked when the room is on hold / closed)
app.post('/api/v1/chat/rooms/:id/messages', (req, res) => {
  const room = store.rooms.find(r => r.id === req.params.id);
  if (!room || room.deleted_at) return res.status(404).json({ message: 'Room not found' });
  if (!roomVisibleToUser(room, req.tenantId, req.isSuperAdmin)) {
    return res.status(403).json({ message: 'This room is not available in your college' });
  }
  if (!roomAudienceAllows(room, req.userId)) {
    return res.status(403).json({ message: 'This room is only for its invited audience' });
  }
  if (room.is_locked) {
    return res.status(403).json({ message: 'This room is closed — new messages are disabled.' });
  }
  const content = String(req.body?.content || '').trim();
  if (!content) return res.status(400).json({ message: 'Message content is required' });
  const msg = {
    id: uid('msg'),
    room_id: room.id,
    user_id: req.body?.user_id || req.userId,
    tenant_id: req.tenantId,
    content,
    file_url: req.body?.file_url || null,
    created_at: new Date().toISOString(),
  };
  store.messages.push(msg);
  saveStore();
  // Real-time broadcast
  io.to(`chat_${room.id}`).emit('receive_message', msg);
  res.status(201).json(msg);
});

// DM inbox (#dm): every person the caller has exchanged DMs with, with the
// other party's display name, last message and unread count — so recipients
// see who messaged them without pasting a UUID.
app.get('/api/v1/chat/dm/conversations', (req, res) => {
  const me = req.userId;
  const groups = new Map();
  for (const dm of store.dms) {
    if (dm.from_user !== me && dm.to_user !== me) continue;
    const other = dm.from_user === me ? dm.to_user : dm.from_user;
    if (!groups.has(other)) groups.set(other, []);
    groups.get(other).push(dm);
  }
  const convos = [];
  for (const [other, dms] of groups) {
    const sorted = dms.slice().sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const last = sorted[sorted.length - 1];
    // Prefer the other party's own name (captured when they sent a DM).
    const name = sorted.map(d => (d.from_user === other ? d.from_name : null)).find(Boolean) || null;
    convos.push({
      user_id: other,
      name,
      last_message: last ? last.content : null,
      last_at: last ? last.created_at : null,
      unread_count: dms.filter(d => d.from_user === other && d.to_user === me && !d.is_read).length,
    });
  }
  convos.sort((a, b) => new Date(b.last_at) - new Date(a.last_at));
  res.json(convos);
});

// DM conversation with a user
app.get('/api/v1/chat/dm/:userId', (req, res) => {
  const me = req.userId;
  const them = req.params.userId;
  const convo = store.dms.filter(
    d => (d.from_user === me && d.to_user === them) || (d.from_user === them && d.to_user === me)
  ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  res.json(convo);
});

// Send a DM
app.post('/api/v1/chat/dm', (req, res) => {
  const content = String(req.body?.content || '').trim();
  const toUser = String(req.body?.to_user || '').trim();
  if (!content || !toUser) return res.status(400).json({ message: 'to_user and content are required' });
  const dm = {
    id: uid('dm'),
    from_user: req.body?.user_id || req.userId,
    from_name: req.body?.from_name || nameFromReq(req) || null,
    to_user: toUser,
    content,
    file_url: req.body?.file_url || null,
    is_read: false,
    created_at: new Date().toISOString(),
  };
  store.dms.push(dm);
  saveStore();
  io.to(`dm_${dm.from_user}_${dm.to_user}`).emit('receive_dm', dm);
  res.status(201).json(dm);
});

// Mark a DM as read (only the recipient) so the sender sees ✓✓ (#chat)
app.put('/api/v1/chat/dm/:id/read', (req, res) => {
  const dm = store.dms.find(d => d.id === req.params.id);
  if (!dm) return res.status(404).json({ message: 'Message not found' });
  if (dm.to_user !== req.userId) {
    return res.status(403).json({ message: 'Only the recipient can mark this message as read' });
  }
  dm.is_read = true;
  dm.read_at = new Date().toISOString();
  saveStore();
  res.json(dm);
});

// ─── Socket.IO real-time ───
io.on('connection', (socket) => {
  console.log(`[Chat-Service] User connected: ${socket.id}`);

  socket.on('join_room', ({ roomId, tenantId }) => {
    socket.join(`chat_${roomId}`);
    console.log(`Socket ${socket.id} joined room ${roomId}`);
  });

  socket.on('send_message', (data) => {
    const { roomId, message, sender } = data;
    io.to(`chat_${roomId}`).emit('receive_message', {
      id: uid('msg'),
      user_id: sender,
      content: message,
      created_at: new Date().toISOString(),
    });
  });

  socket.on('disconnect', () => {
    console.log(`[Chat-Service] User disconnected: ${socket.id}`);
  });
});

app.get('/health', (req, res) => {
  res.json({ service: 'chat-service', status: 'UP', part: 'Part 2: LMS Core & Real-Time Communication', rooms: store.rooms.length });
});

server.listen(PORT, () => {
  console.log(`[Part 2] Real-Time Chat & Discussion Service listening on port ${PORT}`);
});
