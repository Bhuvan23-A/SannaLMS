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
  if (isSuperAdmin) return true;
  if (!room.tenant_id) return true; // legacy global room
  if (room.tenant_id === tenantId) return true;
  if (Array.isArray(room.target_tenants)) {
    if (room.target_tenants.includes('__ALL__')) return true;
    if (room.target_tenants.includes(tenantId)) return true;
  }
  return false;
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

// List rooms visible to the caller's college
app.get('/api/v1/chat/rooms', (req, res) => {
  const visible = store.rooms.filter(r => roomVisibleToUser(r, req.tenantId, req.isSuperAdmin));
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
  const room = {
    id: uid('room'),
    name,
    type: String(req.body?.type || 'GROUP'),
    created_by: req.body?.created_by || req.userId,
    tenant_id: req.tenantId,
    target_tenants: targetTenants,
    members: [],
    created_at: new Date().toISOString(),
  };
  store.rooms.push(room);
  saveStore();
  res.status(201).json(roomView(room));
});

// Join a room
app.post('/api/v1/chat/rooms/:id/join', (req, res) => {
  const room = store.rooms.find(r => r.id === req.params.id);
  if (!room) return res.status(404).json({ message: 'Room not found' });
  if (!roomVisibleToUser(room, req.tenantId, req.isSuperAdmin)) {
    return res.status(403).json({ message: 'This room is not available in your college' });
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
  if (!room) return res.status(404).json({ message: 'Room not found' });
  if (!roomVisibleToUser(room, req.tenantId, req.isSuperAdmin)) {
    return res.status(403).json({ message: 'This room is not available in your college' });
  }
  res.json(store.messages.filter(m => m.room_id === room.id).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)));
});

// Send a message to a room
app.post('/api/v1/chat/rooms/:id/messages', (req, res) => {
  const room = store.rooms.find(r => r.id === req.params.id);
  if (!room) return res.status(404).json({ message: 'Room not found' });
  if (!roomVisibleToUser(room, req.tenantId, req.isSuperAdmin)) {
    return res.status(403).json({ message: 'This room is not available in your college' });
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
