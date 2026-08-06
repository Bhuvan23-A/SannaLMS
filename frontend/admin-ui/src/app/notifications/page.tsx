'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';

export default function NotificationsPage() {
  const { isAdmin } = useRole();
  const [preferences, setPreferences] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendForm, setSendForm] = useState({ user_id: '', title: '', body: '', type: 'SYSTEM' });
  const [sendMsg, setSendMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // History is for everyone; preferences are only manageable by admins
      const [histData, prefData] = await Promise.all([
        fetchApi('/api/v1/notifications/history'),
        isAdmin ? fetchApi('/api/v1/notifications/preferences').catch(() => null) : Promise.resolve(null)
      ]);
      setPreferences(prefData);
      setHistory(histData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sendNotification = async (e: any) => {
    e.preventDefault();
    setSendMsg(null);
    try {
      await fetchApi('/api/v1/notifications/send', {
        method: 'POST',
        body: JSON.stringify({ ...sendForm, channels: ['WEB'] })
      });
      setSendMsg({ ok: true, text: '✅ Notification sent.' });
      setSendForm({ user_id: '', title: '', body: '', type: 'SYSTEM' });
    } catch (err: any) {
      setSendMsg({ ok: false, text: err.message || 'Failed to send notification.' });
    }
  };

  const togglePreference = async (key: string) => {
    if (!preferences) return;
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);
    try {
      await fetchApi('/api/v1/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error(err);
      alert('Failed to update preferences');
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetchApi(`/api/v1/notifications/${id}/read`, { method: 'PUT' });
      setHistory(history.map(h => h.id === id ? { ...h, read: true } : h));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="fade-in" style={{ padding: '20px' }}>Loading notifications...</div>;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>Notifications Center</h1>
      </div>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        {isAdmin && (
          <div className="panel" style={{ flex: 1, minWidth: '300px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Send Notification</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
              Notify a user directly. Trainers and students receive these in their history.
            </p>
            {sendMsg && (
              <div style={{ marginBottom: '15px', fontSize: '13px', color: sendMsg.ok ? 'var(--success-color)' : 'var(--danger-color)' }}>
                {sendMsg.text}
              </div>
            )}
            <form onSubmit={sendNotification} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input className="input-field" placeholder="User ID (Keycloak sub)" value={sendForm.user_id}
                onChange={e => setSendForm({ ...sendForm, user_id: e.target.value })} />
              <input className="input-field" required placeholder="Title" value={sendForm.title}
                onChange={e => setSendForm({ ...sendForm, title: e.target.value })} />
              <textarea className="input-field" required rows={3} placeholder="Message body..." value={sendForm.body}
                onChange={e => setSendForm({ ...sendForm, body: e.target.value })} />
              <button type="submit" className="btn-primary">📨 Send</button>
            </form>

            <h2 style={{ fontSize: '20px', margin: '30px 0 20px' }}>Your Preferences</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
              Choose how you want to receive alerts and updates.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {['email', 'sms', 'push', 'web'].map(channel => (
                <label key={channel} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <input 
                    type="checkbox" 
                    checked={preferences?.[channel] || false}
                    onChange={() => togglePreference(channel)}
                    style={{ width: '20px', height: '20px', accentColor: 'var(--primary-color)' }}
                  />
                  <span style={{ textTransform: 'capitalize', fontSize: '16px' }}>{channel} Notifications</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="panel" style={{ flex: isAdmin ? 2 : 1, minWidth: '400px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Recent History</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {history.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No notifications yet.</p>
            ) : history.map((item) => (
              <div key={item.id} style={{ 
                padding: '15px', 
                background: item.read ? 'rgba(0,0,0,0.1)' : 'rgba(0, 168, 255, 0.1)',
                borderLeft: item.read ? '3px solid transparent' : '3px solid var(--primary-color)',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '5px' }}>
                    <span className="badge badge-info">{item.type}</span>
                    <strong style={{ fontSize: '16px' }}>{item.title}</strong>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '5px 0' }}>{item.body}</p>
                  <small style={{ color: '#888' }}>{new Date(item.created_at).toLocaleString()} via {item.channel}</small>
                </div>
                {!item.read && (
                  <button className="btn-secondary" onClick={() => markAsRead(item.id)}>Mark Read</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
