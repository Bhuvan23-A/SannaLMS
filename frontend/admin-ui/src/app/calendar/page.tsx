'use client';
import { useState, useEffect } from 'react';
import { useRole } from '@/hooks/useRole';
import { fetchApi } from '@/lib/api';
import CollegeTargetPicker from '@/components/CollegeTargetPicker';

export default function CalendarPage() {
  const { role, isAdmin, isTrainer, isStudent } = useRole();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form State
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [eventType, setEventType] = useState('CLASS');
  const [targetTenants, setTargetTenants] = useState<string[]>([]);

  useEffect(() => {
    fetchEvents();
  }, [role]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/api/v1/events');
      setEvents(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (e: any) => {
    e.preventDefault();
    try {
      // Convert datetime-local values to ISO with timezone so the backend parses them correctly
      const toIso = (v: string) => (v ? new Date(v).toISOString() : null);
      await fetchApi('/api/v1/events', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          start_time: toIso(startTime),
          end_time: toIso(endTime),
          event_type: eventType,
          target_tenants: targetTenants
          // tenant_id is derived server-side from the verified token (master for super admin)
        })
      });
      
      setShowModal(false);
      setTargetTenants([]);
      fetchEvents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Tag the card with which colleges the event was targeted at (super admin view).
  const targetLabel = (ev: any) => {
    if (!ev.target_tenants || ev.target_tenants.length === 0) return 'Private';
    return ev.target_tenants.includes('__ALL__') ? 'All Colleges' : `${ev.target_tenants.length} college${ev.target_tenants.length > 1 ? 's' : ''}`;
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await fetchApi(`/api/v1/events/${id}`, {
        method: 'DELETE'
      });
      fetchEvents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Global Calendar</h2>
        {/* Event creation is SUPER_ADMIN / COLLEGE_ADMIN / PRIMARY_TRAINER only
            on the backend — TAs view events but cannot create them (#ta-perms). */}
        {(isAdmin || role === 'PRIMARY_TRAINER') && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>+ Add Event</button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
      
      {loading ? (
        <p>Loading events...</p>
      ) : events.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: '40px' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No upcoming events scheduled.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {events.map(ev => (
            <div key={ev.id} className="panel" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '15px', right: '15px' }}>
                <span style={{ 
                  fontSize: '11px', padding: '4px 8px', borderRadius: '4px',
                  background: ev.event_type === 'EXAM' ? 'rgba(255,50,50,0.1)' : 'rgba(0,200,255,0.1)',
                  color: ev.event_type === 'EXAM' ? '#ff6b6b' : 'var(--primary-color)'
                }}>
                  {ev.event_type}
                </span>
              </div>
              <h3 style={{ fontSize: '18px', marginBottom: '10px', paddingRight: '60px' }}>
                {ev.title}
                {role === 'SUPER_ADMIN' && (
                  <span style={{ fontSize: '11px', marginLeft: '8px', padding: '3px 8px', borderRadius: '4px', background: 'rgba(0,200,255,0.1)', color: 'var(--primary-color)' }}>
                    {targetLabel(ev)}
                  </span>
                )}
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                {ev.description || 'No description provided.'}
              </p>
              
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                <div><b>Start:</b> {new Date(ev.start_time).toLocaleString()}</div>
                <div><b>End:</b> {new Date(ev.end_time).toLocaleString()}</div>
              </div>

              {isAdmin && (
                <button 
                  className="btn-secondary" 
                  style={{ width: '100%', borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }}
                  onClick={() => deleteEvent(ev.id)}
                >
                  Delete Event
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Event Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(6px)', display: 'flex', justifyContent: 'center', alignItems: 'center', overflowY: 'auto', padding: '20px', zIndex: 1000 }}>
          <div className="panel" style={{ width: '100%', maxWidth: '540px', margin: 'auto', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', background: '#0e1726', border: '1px solid rgba(255,255,255,0.18)', borderRadius: '12px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.85)', padding: '28px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '22px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>📅</span>
                <h3 style={{ margin: 0, fontSize: '19px', fontWeight: 700, color: '#ffffff' }}>Schedule New Event</h3>
              </div>
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
                title="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={createEvent} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
                  <span>📝</span> Event Title <span style={{ color: '#f43f5e' }}>*</span>
                </label>
                <input 
                  required 
                  className="input-field" 
                  placeholder="e.g. End Semester Theory Examination"
                  value={title} 
                  onChange={e => setTitle(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.22)', color: '#ffffff', borderRadius: '6px', padding: '10px 14px', fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
                  <span>📄</span> Description (Optional)
                </label>
                <textarea 
                  className="input-field" 
                  rows={3} 
                  placeholder="Provide syllabus topics covered, room venue, or special instructions..."
                  value={description} 
                  onChange={e => setDescription(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.22)', color: '#ffffff', borderRadius: '6px', padding: '10px 14px', fontSize: '14px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
                    <span>🕒</span> Start Time <span style={{ color: '#f43f5e' }}>*</span>
                  </label>
                  <input 
                    type="datetime-local" 
                    required 
                    className="input-field" 
                    value={startTime} 
                    onChange={e => setStartTime(e.target.value)}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.22)', color: '#ffffff', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', colorScheme: 'dark' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
                    <span>⏰</span> End Time <span style={{ color: '#f43f5e' }}>*</span>
                  </label>
                  <input 
                    type="datetime-local" 
                    required 
                    className="input-field" 
                    value={endTime} 
                    onChange={e => setEndTime(e.target.value)}
                    style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.22)', color: '#ffffff', borderRadius: '6px', padding: '8px 12px', fontSize: '13px', colorScheme: 'dark' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>
                  <span>🏷️</span> Event Category
                </label>
                <select 
                  className="input-field" 
                  value={eventType} 
                  onChange={e => setEventType(e.target.value)}
                  style={{ width: '100%', background: '#131d2e', border: '1px solid rgba(255,255,255,0.22)', color: '#ffffff', borderRadius: '6px', padding: '9px 12px', fontSize: '13px' }}
                >
                  <option value="CLASS">📚 Academic Class</option>
                  <option value="EXAM">📝 Examination</option>
                  <option value="ASSIGNMENT_DEADLINE">⏰ Assignment Due Date</option>
                  <option value="HOLIDAY">🏖️ Institution Holiday</option>
                  <option value="OTHER">📌 General Announcement / Other</option>
                </select>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '14px' }}>
                <CollegeTargetPicker value={targetTenants} onChange={setTargetTenants} />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '6px', paddingTop: '14px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                <button 
                  type="submit" 
                  className="btn-primary" 
                  style={{ flex: 1, padding: '11px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <span>✓</span> Schedule Event
                </button>
                <button 
                  type="button" 
                  className="btn-secondary" 
                  style={{ flex: 1, padding: '11px', fontSize: '14px', borderColor: 'rgba(255,255,255,0.2)' }} 
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
