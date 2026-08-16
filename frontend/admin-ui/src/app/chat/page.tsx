'use client';
import { useState, useEffect, useRef } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
import { useUserDirectory } from '@/hooks/useUserDirectory';
import CollegeTargetPicker from '@/components/CollegeTargetPicker';

interface DM { id: string; from_user: string; to_user: string; content: string; file_url?: string; is_read: boolean; created_at: string; }
interface Message { id: string; user_id: string; content: string; file_url?: string; created_at: string; }
interface Room { id: string; name: string; type: string; is_locked?: boolean; created_by?: string; _count: { members: number; messages: number }; }

export default function ChatPage() {
  const { role } = useRole();
  const isSuperAdmin = role === 'SUPER_ADMIN';
  // People resolver (#fix): show sender names instead of raw UUIDs
  const { users, nameOf } = useUserDirectory();
  const myUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '';
  const [view, setView] = useState<'dm' | 'rooms'>('rooms');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [dmConvo, setDmConvo] = useState<DM[]>([]);
  const [dmTarget, setDmTarget] = useState('u-2');
  const [newMsg, setNewMsg] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [targetTenants, setTargetTenants] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  // Audience (#chat): who can SEE the room — whole college / a course / users
  const [audienceType, setAudienceType] = useState('ALL');
  const [audienceCourseId, setAudienceCourseId] = useState('');
  const [audienceMemberIds, setAudienceMemberIds] = useState<string[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [audienceResolving, setAudienceResolving] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Only auto-scroll to the newest message when the user is already near the
  // bottom — polling shouldn't yank someone reading history back down.
  const nearBottomRef = useRef(true);

  const isTrainerOrAdmin = ['PRIMARY_TRAINER', 'COLLEGE_ADMIN', 'SUPER_ADMIN'].includes(role);

  const loadRooms = async () => {
    const data = await fetchApi('/api/v1/chat/rooms').catch(() => []);
    setRooms(data || []);
  };

  const loadMessages = async (room: Room) => {
    const data = await fetchApi(`/api/v1/chat/rooms/${room.id}/messages`).catch(() => []);
    setMessages(data || []);
    if (nearBottomRef.current) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  const loadDMs = async (target?: string) => {
    const id = (target ?? dmTarget);
    if (!id) return;
    const data = await fetchApi(`/api/v1/chat/dm/${id}`).catch(() => []);
    setDmConvo(data || []);
    // Auto-mark incoming DMs as read so the sender sees ✓✓ (#fix).
    const me = myUserId || 'u-1';
    (data || [])
      .filter((m: any) => m.from_user === id && m.to_user === me && !m.is_read)
      .forEach((m: any) => fetchApi(`/api/v1/chat/dm/${m.id}/read`, { method: 'PUT' }).catch(() => {}));
  };

  // DM inbox (#dm): everyone the caller has exchanged DMs with — so incoming
  // messages show up in a list, no UUID pasting needed.
  const [dmConversations, setDmConversations] = useState<any[]>([]);

  const loadDmConversations = async () => {
    const data = await fetchApi('/api/v1/chat/dm/conversations').catch(() => []);
    setDmConversations(data || []);
  };

  const openDmConversation = async (otherId: string) => {
    setDmTarget(otherId);
    await loadDMs(otherId);
    loadDmConversations();
  };

  useEffect(() => { loadRooms(); }, []);
  useEffect(() => { fetchApi('/api/v1/courses').then(d => setCourses(Array.isArray(d) ? d : [])).catch(() => {}); }, []);
  useEffect(() => { if (selectedRoom) loadMessages(selectedRoom); }, [selectedRoom]);

  // Live updates: rooms refresh every 15s, an open conversation every 5s, and
  // the DM view every 5s (#live). Lightweight — a handful of small GETs/min.
  useEffect(() => {
    const t = setInterval(() => { loadRooms(); }, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!selectedRoom) return;
    const t = setInterval(() => { loadMessages(selectedRoom); }, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRoom]);
  useEffect(() => {
    if (view !== 'dm') return;
    loadDmConversations();
    const t = setInterval(() => { loadDMs(); loadDmConversations(); }, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, dmTarget]);

  const sendRoomMessage = async () => {
    if (!newMsg.trim() || !selectedRoom) return;
    await fetchApi(`/api/v1/chat/rooms/${selectedRoom.id}/messages`, {
      method: 'POST', body: JSON.stringify({ content: newMsg })
    }).catch(() => {});
    setNewMsg('');
    loadMessages(selectedRoom);
  };

  const sendDM = async () => {
    if (!newMsg.trim()) return;
    await fetchApi('/api/v1/chat/dm', {
      method: 'POST', body: JSON.stringify({ to_user: dmTarget, content: newMsg })
    }).catch(() => {});
    setNewMsg('');
    loadDMs();
    loadDmConversations();
  };

  const createRoom = async () => {
    if (!newRoomName.trim()) return;
    setLoading(true);
    try {
      await fetchApi('/api/v1/chat/rooms', {
        method: 'POST',
        body: JSON.stringify({
          name: newRoomName, type: 'GROUP', target_tenants: targetTenants,
          audience_type: audienceType,
          audience_id: audienceType === 'COURSE' ? audienceCourseId : undefined,
          member_ids: (audienceType === 'USERS' || audienceType === 'COURSE') ? audienceMemberIds : undefined,
        }),
      });
    } catch (err: any) { alert(err.message || 'Failed to create room'); }
    setNewRoomName('');
    setTargetTenants([]);
    setAudienceType('ALL');
    setAudienceCourseId('');
    setAudienceMemberIds([]);
    setLoading(false);
    loadRooms();
  };

  // Hold / reopen / delete a room (#chat): only the creator or super admin.
  const canManageRoom = (room: any) => isSuperAdmin || room.created_by === myUserId;

  const toggleRoomLock = async (room: any) => {
    try {
      await fetchApi(`/api/v1/chat/rooms/${room.id}`, { method: 'PATCH', body: JSON.stringify({ is_locked: !room.is_locked }) });
      loadRooms();
    } catch (err: any) { alert(err.message || 'Failed to update room'); }
  };

  const deleteRoom = async (room: any) => {
    if (!confirm(`Delete room "#${room.name}"? It will be hidden everywhere (soft delete).`)) return;
    try {
      await fetchApi(`/api/v1/chat/rooms/${room.id}`, { method: 'DELETE' });
      if (selectedRoom?.id === room.id) setSelectedRoom(null);
      loadRooms();
    } catch (err: any) { alert(err.message || 'Failed to delete room'); }
  };

  const joinRoom = async (roomId: string) => {
    await fetchApi(`/api/v1/chat/rooms/${roomId}/join`, { method: 'POST' }).catch(() => {});
    loadRooms();
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>💬 Chat</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className={view === 'rooms' ? 'btn-primary' : 'btn-secondary'} onClick={() => setView('rooms')}>Group Chat</button>
          <button className={view === 'dm' ? 'btn-primary' : 'btn-secondary'} onClick={() => { setView('dm'); loadDMs(); }}>Direct Messages</button>
        </div>
      </div>

      {view === 'rooms' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', height: '70vh' }}>
          {/* Room List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto' }}>
            {isTrainerOrAdmin && (
              <div className="panel" style={{ padding: '12px' }}>
                <input className="form-input" placeholder="New room name..." value={newRoomName}
                  onChange={e => setNewRoomName(e.target.value)} style={{ marginBottom: '8px' }} />
                <button className="btn-primary" style={{ width: '100%' }} onClick={createRoom} disabled={loading}>
                  {loading ? 'Creating...' : '+ Create Room'}
                </button>
                <div style={{ marginTop: '10px' }}>
                  <CollegeTargetPicker value={targetTenants} onChange={setTargetTenants} />
                </div>
                {/* Audience (#chat): who can SEE this room */}
                <div style={{ marginTop: '10px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px' }}>Visible to</label>
                  <select className="form-input" style={{ width: '100%', marginBottom: '6px' }} value={audienceType} onChange={e => setAudienceType(e.target.value)}>
                    <option value="ALL">🏛️ Whole college (anyone can join)</option>
                    <option value="COURSE">📚 Only a course's students & trainers</option>
                    <option value="USERS">👤 Only specific users</option>
                  </select>
                  {audienceType === 'COURSE' && (
                    <select className="form-input" style={{ width: '100%' }} value={audienceCourseId}
                      onChange={async e => {
                        const cid = e.target.value;
                        setAudienceCourseId(cid);
                        if (!cid) { setAudienceMemberIds([]); return; }
                        // Resolve the course's enrolled users into member_ids so
                        // the room is visible only to that course's people.
                        setAudienceResolving(true);
                        try {
                          const ens = await fetchApi(`/api/v1/enrollments/course/${cid}`).catch(() => []);
                          setAudienceMemberIds((Array.isArray(ens) ? ens : []).map((x: any) => x.user_id).filter(Boolean));
                        } finally { setAudienceResolving(false); }
                      }}>
                      <option value="">Select course…</option>
                      {courses.length === 0 && <option value="" disabled>No courses found</option>}
                      {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  )}
                  {audienceType === 'COURSE' && audienceCourseId && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '5px' }}>
                      {audienceResolving ? 'Loading course members…' : `${audienceMemberIds.length} enrolled user(s) will see this room`}
                    </div>
                  )}
                  {audienceType === 'USERS' && (
                    <div style={{ maxHeight: '110px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '6px' }}>
                      {users.length === 0 && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No users found</span>}
                      {users.map((u: any) => {
                        const label = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email;
                        return (
                          <label key={u.id} style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '12px', padding: '2px 0', cursor: 'pointer' }}>
                            <input type="checkbox" checked={audienceMemberIds.includes(u.id)} onChange={() => setAudienceMemberIds(prev => prev.includes(u.id) ? prev.filter(x => x !== u.id) : [...prev, u.id])} />
                            <span>{label} — {u.email}</span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
            {rooms.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>No rooms. Create or join one.</p>}
            {rooms.map(room => (
              <div key={room.id} className="panel" onClick={() => setSelectedRoom(room)}
                style={{ cursor: 'pointer', border: selectedRoom?.id === room.id ? '1px solid var(--primary-color)' : undefined }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                  #{room.name}
                  {room.is_locked && <span style={{ fontSize: '10px', marginLeft: '6px', padding: '2px 7px', borderRadius: '10px', background: 'rgba(255,165,0,0.15)', color: '#fbbf24' }}>🔒 Closed</span>}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {room._count.members} members · {room._count.messages} messages
                </div>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                  <span className="badge badge-info" style={{ fontSize: '10px' }}>{room.type}</span>
                  {canManageRoom(room) && (
                    <>
                      <button className="btn-secondary" style={{ fontSize: '10px', padding: '2px 8px', color: room.is_locked ? '#00c864' : '#fbbf24', borderColor: room.is_locked ? '#00c864' : '#fbbf24' }} onClick={e => { e.stopPropagation(); toggleRoomLock(room); }}>
                        {room.is_locked ? '🔓 Reopen' : '🔒 Close'}
                      </button>
                      <button className="btn-secondary" style={{ fontSize: '10px', padding: '2px 8px', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }} onClick={e => { e.stopPropagation(); deleteRoom(room); }}>🗑 Delete</button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Messages Panel */}
          <div className="panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {!selectedRoom ? (
              <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '48px', marginBottom: '12px' }}>💬</div>
                <p>Select a room to start chatting</p>
              </div>
            ) : (
              <>
                <div style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3>
                    #{selectedRoom.name}
                    {selectedRoom.is_locked && <span style={{ fontSize: '11px', marginLeft: '8px', padding: '3px 9px', borderRadius: '10px', background: 'rgba(255,165,0,0.15)', color: '#fbbf24' }}>🔒 Closed — read only</span>}
                  </h3>
                  <button className="btn-secondary" style={{ fontSize: '12px', padding: '4px 12px' }} onClick={() => joinRoom(selectedRoom.id)}>Join</button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}
                  onScroll={(e: any) => {
                    const el = e.currentTarget as HTMLDivElement;
                    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
                  }}>
                  {messages.map(msg => (
                    <div key={msg.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                        {(nameOf(msg.user_id) || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '3px' }}>{nameOf(msg.user_id)} · {new Date(msg.created_at).toLocaleTimeString()}</div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '8px', fontSize: '14px' }}>{msg.content}</div>
                        {msg.file_url && <a href={msg.file_url} target="_blank" style={{ fontSize: '12px', color: 'var(--primary-color)' }}>📎 Attachment</a>}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div style={{ display: 'flex', gap: '10px', opacity: selectedRoom.is_locked ? 0.5 : 1, pointerEvents: selectedRoom.is_locked ? 'none' : 'auto' }}>
                  <input className="form-input" style={{ flex: 1 }} placeholder={selectedRoom.is_locked ? 'Room is closed — read only' : 'Type a message...'} value={newMsg}
                    onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendRoomMessage()} disabled={selectedRoom.is_locked} />
                  <button className="btn-primary" onClick={sendRoomMessage} disabled={selectedRoom.is_locked}>Send</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {view === 'dm' && (
        <div className="panel" style={{ display: 'flex', gap: '20px' }}>
          {/* Inbox (#dm): click a person to open the conversation */}
          <div style={{ width: '240px', flexShrink: 0, overflowY: 'auto', maxHeight: '480px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <p style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: '0' }}>Inbox</p>
            {dmConversations.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                No conversations yet — when someone messages you, it appears here.
              </p>
            ) : dmConversations.map((c: any) => (
              <div
                key={c.user_id}
                onClick={() => openDmConversation(c.user_id)}
                style={{ cursor: 'pointer', padding: '10px 12px', borderRadius: '8px', background: dmTarget === c.user_id ? 'rgba(79,70,229,0.25)' : 'rgba(255,255,255,0.03)', border: '1px solid var(--panel-border)' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name || nameOf(c.user_id) || 'User'}</span>
                  {c.unread_count > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>{c.unread_count}</span>}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                  {c.last_message || 'No messages yet'}
                </div>
              </div>
            ))}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Chatting with:</label>
              <select className="form-input" style={{ width: '260px' }} value={dmTarget} onChange={e => { setDmTarget(e.target.value); loadDMs(); }}>
                <option value="">Select a person…</option>
                {users.map((u: any) => (
                  <option key={u.id} value={u.id}>{[u.first_name, u.last_name].filter(Boolean).join(' ') || u.email} — {u.email}</option>
                ))}
              </select>
              <button className="btn-secondary" onClick={() => loadDMs()}>Load Conversation</button>
            </div>

            <div style={{ height: '400px', overflowY: 'auto', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {dmConvo.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No messages yet</p>}
              {dmConvo.map(dm => {
                const mine = dm.from_user === myUserId || (!myUserId && dm.from_user === 'u-1');
                return (
                <div key={dm.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '60%', padding: '8px 14px', borderRadius: '12px', fontSize: '14px',
                    background: mine ? 'var(--primary-color)' : 'rgba(255,255,255,0.08)',
                  }}>
                    <div>{dm.content}</div>
                    {dm.file_url && <a href={dm.file_url} target="_blank" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>📎 File</a>}
                    <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px' }}>
                      {new Date(dm.created_at).toLocaleTimeString()} {dm.is_read ? '✓✓' : '✓'}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <input className="form-input" style={{ flex: 1 }} placeholder="Write a message..." value={newMsg}
                onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendDM()} />
              <button className="btn-primary" onClick={sendDM}>Send DM</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
