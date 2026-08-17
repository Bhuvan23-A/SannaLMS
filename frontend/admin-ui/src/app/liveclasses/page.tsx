'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
import CollegeCoursePicker from '@/components/CollegeCoursePicker';

export default function LiveClassesPage() {
  const { isAdmin, isTrainer, role } = useRole();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Course-aware live classes: pick the course from the real list, not 'c-1'.
  const [courses, setCourses] = useState<any[]>([]);
  const [courseId, setCourseId] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', scheduled_at: '', duration_mins: 60 });
  const [joiningClass, setJoiningClass] = useState<any>(null);
  const [flash, setFlash] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchApi('/api/v1/courses');
        if (Array.isArray(data)) setCourses(data);
      } catch { /* course list unavailable */ }
      // No courses yet (new college) or API failure — resolve loading so the
      // page shows an empty state instead of hanging on "Loading..." forever.
      setLoading(false);
    })();
  }, []);

  useEffect(() => { if (courseId) loadClasses(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [courseId]);

  const loadClasses = async () => {
    try {
      // No setLoading(true) — the full-page flash unmounts the CollegeCoursePicker
      // and caused an endless reload blink (#fix).
      const d = await fetchApi(`/api/v1/liveclasses?course_id=${courseId}`);
      setClasses(d || []);
    } catch { } finally { setLoading(false); }
  };

  const createClass = async (e: any) => {
    e.preventDefault();
    try {
      // datetime-local gives "2026-08-10T12:00" (no timezone) — convert to ISO
      // with timezone so the backend's new Date() parses it correctly.
      const scheduled_at = form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null;
      await fetchApi('/api/v1/liveclasses', {
        method: 'POST',
        body: JSON.stringify({ ...form, scheduled_at, course_id: courseId })
      });
      setShowForm(false);
      setForm({ title: '', description: '', scheduled_at: '', duration_mins: 60 });
      loadClasses();
    } catch { alert('Failed to schedule class'); }
  };

  const startClass = async (id: string) => {
    try {
      await fetchApi(`/api/v1/liveclasses/${id}/start`, { method: 'PUT' });
      showFlash('🔴 Class is now LIVE!');
      loadClasses();
    } catch { alert('Failed to start class'); }
  };

  const endClass = async (id: string) => {
    try {
      await fetchApi(`/api/v1/liveclasses/${id}/end`, { method: 'PUT', body: JSON.stringify({}) });
      showFlash('⏹️ Class ended.');
      loadClasses();
    } catch { alert('Failed to end class'); }
  };

  const joinClass = async (id: string) => {
    try {
      const data = await fetchApi(`/api/v1/liveclasses/${id}/join`);
      setJoiningClass(data);
    } catch { alert('Failed to get join details'); }
  };

  const showFlash = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(''), 3000); };

  if (loading) return <div className="fade-in" style={{ padding: '20px' }}>Loading classes...</div>;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>🎥 Live Classes</h1>
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <CollegeCoursePicker courses={courses} courseId={courseId} onCourseChange={setCourseId} collegeId={collegeId} onCollegeChange={setCollegeId} />
          </div>
        </div>
        {(isAdmin || isTrainer) && <button className="btn-primary" onClick={() => setShowForm(!showForm)}>+ Schedule Class</button>}
      </div>

      {flash && <div className="panel" style={{ marginBottom: '20px', borderLeft: '4px solid #00c864', background: 'rgba(0,200,100,0.1)', padding: '15px' }}>{flash}</div>}

      {/* Jitsi Join Modal */}
      {joiningClass && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="panel" style={{ width: '500px', maxWidth: '92vw', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎥</div>
            <h2 style={{ marginBottom: '10px' }}>Ready to Join!</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '5px' }}>Room Name:</p>
            <code style={{ display: 'block', padding: '10px', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', marginBottom: '20px', wordBreak: 'break-all' }}>{joiningClass.room_name}</code>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
              You will be joined as a <strong>{joiningClass.is_host ? '👑 Host (Moderator)' : '👤 Participant'}</strong>.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <a
                href={joiningClass.jitsi_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
                style={{ textDecoration: 'none', padding: '12px 24px' }}
                onClick={() => setJoiningClass(null)}
              >
                🚀 Launch Jitsi Meet
              </a>
              <button className="btn-secondary" onClick={() => setJoiningClass(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <form onSubmit={createClass} className="panel" style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>Schedule New Live Class</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Class Title</label>
              <input required className="input-field" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Duration (mins)</label>
              <input type="number" className="input-field" value={form.duration_mins} onChange={e => setForm({ ...form, duration_mins: parseInt(e.target.value) })} />
            </div>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Schedule Date & Time</label>
            <input required type="datetime-local" className="input-field" value={form.scheduled_at} onChange={e => setForm({ ...form, scheduled_at: e.target.value })} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Description</label>
            <textarea className="input-field" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn-primary">Schedule Class</button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Classes List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {classes.length === 0 ? (
          <div className="panel" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📺</div>
            <p>No live classes scheduled yet. {(isAdmin || isTrainer) ? 'Click "+ Schedule Class" to create one.' : 'Check back later.'}</p>
          </div>
        ) : classes.map(c => (
          <div className="panel" key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '20px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '8px' }}>
                {c.is_live && <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: '#ff4757', animation: 'pulse 1.5s infinite' }} />}
                <h3 style={{ fontSize: '18px' }}>{c.title}</h3>
                {c.is_live && <span className="badge" style={{ background: '#ff4757', color: 'white' }}>🔴 LIVE</span>}
                {c.ended_at && <span className="badge badge-secondary" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>⏹ Ended</span>}
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '10px' }}>{c.description}</p>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <span className="badge badge-info">📅 {new Date(c.scheduled_at).toLocaleString()}</span>
                <span className="badge badge-warning">⏱ {c.duration_mins} mins</span>
                {c.ended_at && <span className="badge badge-secondary">Ended: {new Date(c.ended_at).toLocaleString()}</span>}
                {c.recording_url && <a href={c.recording_url} target="_blank" rel="noreferrer" className="badge badge-success" style={{ textDecoration: 'none' }}>🎬 Recording</a>}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
              {/* A class that has ended can never go live again (#bugfix) */}
              {(isAdmin || isTrainer) && !c.is_live && !c.ended_at && (
                <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #ff4757, #c0392b)' }} onClick={() => startClass(c.id)}>
                  ▶ Go Live
                </button>
              )}
              {(isAdmin || isTrainer) && c.is_live && (
                <button className="btn-secondary" onClick={() => endClass(c.id)}>⏹ End Class</button>
              )}
              <button className="btn-primary" onClick={() => joinClass(c.id)}>
                {c.is_live ? '🔴 Join Now' : '👁 Preview'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
