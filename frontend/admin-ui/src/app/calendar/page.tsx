'use client';
import { useState, useEffect } from 'react';
import { useRole } from '@/hooks/useRole';

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

  useEffect(() => {
    fetchEvents();
  }, [role]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3003/api/v1/events', {
        headers: {
          'x-mock-roles': role,
          'x-mock-tenant-id': 'stanford',
        }
      });
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
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
      const res = await fetch('http://localhost:3003/api/v1/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-mock-roles': role,
          'x-mock-tenant-id': 'stanford',
          'x-mock-user-id': 'u-1',
        },
        body: JSON.stringify({
          title,
          description,
          start_time: startTime,
          end_time: endTime,
          event_type: eventType,
          tenant_id: 'stanford'
        })
      });
      
      if (!res.ok) {
        if (res.status === 403) throw new Error('You do not have permission to create events.');
        throw new Error('Failed to create event');
      }
      
      setShowModal(false);
      fetchEvents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      const res = await fetch(`http://localhost:3003/api/v1/events/${id}`, {
        method: 'DELETE',
        headers: {
          'x-mock-roles': role,
          'x-mock-tenant-id': 'stanford',
        }
      });
      if (!res.ok) {
        if (res.status === 403) throw new Error('You do not have permission to delete events.');
        throw new Error('Failed to delete event');
      }
      fetchEvents();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>Global Calendar</h2>
        {(isAdmin || isTrainer) && (
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
              <h3 style={{ fontSize: '18px', marginBottom: '10px', paddingRight: '60px' }}>{ev.title}</h3>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                {ev.description || 'No description provided.'}
              </p>
              
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                <div>📅 <b>Start:</b> {new Date(ev.start_time).toLocaleString()}</div>
                <div>📅 <b>End:</b> {new Date(ev.end_time).toLocaleString()}</div>
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="panel" style={{ width: '100%', maxWidth: '500px' }}>
            <h3 style={{ marginBottom: '20px' }}>Schedule New Event</h3>
            <form onSubmit={createEvent} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Event Title</label>
                <input required className="input-field" value={title} onChange={e => setTitle(e.target.value)} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Description</label>
                <textarea className="input-field" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>Start Time</label>
                  <input type="datetime-local" required className="input-field" value={startTime} onChange={e => setStartTime(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '5px' }}>End Time</label>
                  <input type="datetime-local" required className="input-field" value={endTime} onChange={e => setEndTime(e.target.value)} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Event Type</label>
                <select className="input-field" value={eventType} onChange={e => setEventType(e.target.value)}>
                  <option value="CLASS">Class</option>
                  <option value="EXAM">Exam</option>
                  <option value="ASSIGNMENT_DEADLINE">Assignment Deadline</option>
                  <option value="HOLIDAY">Holiday</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }}>Schedule</button>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
