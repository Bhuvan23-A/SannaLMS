'use client';
import { useState, useEffect, useRef } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';

interface DM { id: string; from_user: string; to_user: string; content: string; file_url?: string; is_read: boolean; created_at: string; }
interface Message { id: string; user_id: string; content: string; file_url?: string; created_at: string; }
interface Room { id: string; name: string; type: string; _count: { members: number; messages: number }; }

export default function ChatPage() {
  const { role } = useRole();
  const [view, setView] = useState<'dm' | 'rooms'>('rooms');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [dmConvo, setDmConvo] = useState<DM[]>([]);
  const [dmTarget, setDmTarget] = useState('u-2');
  const [newMsg, setNewMsg] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isTrainerOrAdmin = ['PRIMARY_TRAINER', 'COLLEGE_ADMIN', 'SUPER_ADMIN'].includes(role);

  const loadRooms = async () => {
    const data = await fetchApi('/api/v1/chat/rooms').catch(() => []);
    setRooms(data || []);
  };

  const loadMessages = async (room: Room) => {
    const data = await fetchApi(`/api/v1/chat/rooms/${room.id}/messages`).catch(() => []);
    setMessages(data || []);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const loadDMs = async () => {
    const data = await fetchApi(`/api/v1/chat/dm/${dmTarget}`).catch(() => []);
    setDmConvo(data || []);
  };

  useEffect(() => { loadRooms(); }, []);
  useEffect(() => { if (selectedRoom) loadMessages(selectedRoom); }, [selectedRoom]);

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
  };

  const createRoom = async () => {
    if (!newRoomName.trim()) return;
    setLoading(true);
    await fetchApi('/api/v1/chat/rooms', { method: 'POST', body: JSON.stringify({ name: newRoomName, type: 'GROUP' }) }).catch(() => {});
    setNewRoomName('');
    setLoading(false);
    loadRooms();
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
              </div>
            )}
            {rooms.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>No rooms. Create or join one.</p>}
            {rooms.map(room => (
              <div key={room.id} className="panel" onClick={() => setSelectedRoom(room)}
                style={{ cursor: 'pointer', border: selectedRoom?.id === room.id ? '1px solid var(--primary-color)' : undefined }}>
                <div style={{ fontWeight: '600', marginBottom: '4px' }}>#{room.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {room._count.members} members · {room._count.messages} messages
                </div>
                <span className="badge badge-info" style={{ fontSize: '10px', marginTop: '4px' }}>{room.type}</span>
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
                <div style={{ borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
                  <h3>#{selectedRoom.name}</h3>
                  <button className="btn-secondary" style={{ fontSize: '12px', padding: '4px 12px' }} onClick={() => joinRoom(selectedRoom.id)}>Join</button>
                </div>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                  {messages.map(msg => (
                    <div key={msg.id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                        {msg.user_id[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '3px' }}>{msg.user_id} · {new Date(msg.created_at).toLocaleTimeString()}</div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '8px', fontSize: '14px' }}>{msg.content}</div>
                        {msg.file_url && <a href={msg.file_url} target="_blank" style={{ fontSize: '12px', color: 'var(--primary-color)' }}>📎 Attachment</a>}
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input className="form-input" style={{ flex: 1 }} placeholder="Type a message..." value={newMsg}
                    onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendRoomMessage()} />
                  <button className="btn-primary" onClick={sendRoomMessage}>Send</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {view === 'dm' && (
        <div className="panel">
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Chatting with user ID:</label>
            <input className="form-input" style={{ width: '200px' }} value={dmTarget} onChange={e => setDmTarget(e.target.value)} />
            <button className="btn-secondary" onClick={loadDMs}>Load Conversation</button>
          </div>

          <div style={{ height: '400px', overflowY: 'auto', marginBottom: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {dmConvo.length === 0 && <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>No messages yet</p>}
            {dmConvo.map(dm => (
              <div key={dm.id} style={{ display: 'flex', justifyContent: dm.from_user === 'u-1' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '60%', padding: '8px 14px', borderRadius: '12px', fontSize: '14px',
                  background: dm.from_user === 'u-1' ? 'var(--primary-color)' : 'rgba(255,255,255,0.08)',
                }}>
                  <div>{dm.content}</div>
                  {dm.file_url && <a href={dm.file_url} target="_blank" style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>📎 File</a>}
                  <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px' }}>
                    {new Date(dm.created_at).toLocaleTimeString()} {dm.is_read ? '✓✓' : '✓'}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <input className="form-input" style={{ flex: 1 }} placeholder="Write a message..." value={newMsg}
              onChange={e => setNewMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendDM()} />
            <button className="btn-primary" onClick={sendDM}>Send DM</button>
          </div>
        </div>
      )}
    </div>
  );
}
