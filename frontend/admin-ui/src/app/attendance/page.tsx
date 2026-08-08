'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';

export default function AttendancePage() {
  const { isAdmin, isTrainer, role } = useRole();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseId] = useState('c-1');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', date: '', lat: '', lng: '', radius_m: 100 });
  const [activeSession, setActiveSession] = useState<any>(null);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [report, setReport] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [flash, setFlash] = useState('');

  useEffect(() => { loadSessions(); }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const d = await fetchApi(`/api/v1/attendance/sessions?course_id=${courseId}`);
      setSessions(d || []);
    } catch { } finally { setLoading(false); }
  };

  const createSession = async (e: any) => {
    e.preventDefault();
    try {
      await fetchApi('/api/v1/attendance/sessions', {
        method: 'POST',
        body: JSON.stringify({ ...form, course_id: courseId, lat: parseFloat(form.lat) || null, lng: parseFloat(form.lng) || null })
      });
      setShowForm(false);
      setForm({ title: '', date: '', lat: '', lng: '', radius_m: 100 });
      loadSessions();
    } catch { alert('Failed to create session'); }
  };

  const markPresent = async (sessionId: string, userId: string) => {
    try {
      await fetchApi(`/api/v1/attendance/sessions/${sessionId}/mark`, {
        method: 'POST', body: JSON.stringify({ user_id: userId, status: 'PRESENT' })
      });
      showFlash('✅ Marked Present');
      loadRecords(sessionId);
    } catch { alert('Failed to mark attendance'); }
  };

  const checkInQR = async () => {
    try {
      await fetchApi('/api/v1/attendance/checkin/qr', { method: 'POST', body: JSON.stringify({ qr_token: qrInput }) });
      setQrModalOpen(false); setQrInput('');
      showFlash('✅ QR Check-in Successful!');
    } catch (err: any) { alert(err.message); }
  };

  const checkInGPS = async () => {
    if (!navigator.geolocation) { alert('Geolocation not supported'); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      if (!activeSession) return;
      try {
        await fetchApi('/api/v1/attendance/checkin/gps', {
          method: 'POST',
          body: JSON.stringify({ session_id: activeSession.id, lat: pos.coords.latitude, lng: pos.coords.longitude })
        });
        showFlash('✅ GPS Check-in Successful!');
      } catch (err: any) { alert(err.message); }
    }, () => alert('Could not get location. Please allow location access.'));
  };

  const loadRecords = async (sessionId: string) => {
    try {
      const d = await fetchApi(`/api/v1/attendance/sessions/${sessionId}/records`);
      setRecords(d || []);
    } catch { }
  };

  const loadReport = async () => {
    try {
      const d = await fetchApi('/api/v1/attendance/report/c-1/student/u-1');
      setReport(d);
    } catch { }
  };

  const showFlash = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(''), 3000); };

  if (loading) return <div className="fade-in" style={{ padding: '20px' }}>Loading attendance...</div>;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>📍 Attendance Management</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          {role === 'STUDENT' && (
            <>
              <button className="btn-secondary" onClick={() => setQrModalOpen(true)}>📷 QR Check-in</button>
              <button className="btn-secondary" onClick={checkInGPS}>🌍 GPS Check-in</button>
            </>
          )}
          {(isAdmin || isTrainer) && <button className="btn-primary" onClick={() => setShowForm(!showForm)}>+ New Session</button>}
        </div>
      </div>

      {flash && <div className="panel" style={{ marginBottom: '20px', borderLeft: '4px solid #00c864', background: 'rgba(0,200,100,0.1)', padding: '15px' }}>{flash}</div>}

      {/* QR Modal */}
      {qrModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="panel" style={{ width: '400px', textAlign: 'center' }}>
            <h3 style={{ marginBottom: '20px' }}>Enter QR Code</h3>
            <input className="input-field" placeholder="Paste QR token here..." value={qrInput} onChange={e => setQrInput(e.target.value)} style={{ marginBottom: '15px' }} />
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button className="btn-primary" onClick={checkInQR}>Verify & Check In</button>
              <button className="btn-secondary" onClick={() => setQrModalOpen(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Session Form */}
      {showForm && (
        <form onSubmit={createSession} className="panel" style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>New Attendance Session</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Session Title</label>
              <input required className="input-field" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Date & Time</label>
              <input required type="datetime-local" className="input-field" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Latitude (for GPS)</label>
              <input type="number" step="any" className="input-field" placeholder="e.g. 12.9716" value={form.lat} onChange={e => setForm({ ...form, lat: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Longitude (for GPS)</label>
              <input type="number" step="any" className="input-field" placeholder="e.g. 77.5946" value={form.lng} onChange={e => setForm({ ...form, lng: e.target.value })} />
            </div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>GPS Radius (meters)</label>
            <input type="number" className="input-field" style={{ width: '200px' }} value={form.radius_m} onChange={e => setForm({ ...form, radius_m: parseInt(e.target.value) })} />
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn-primary">Create Session</button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* Student Attendance Report */}
      {role === 'STUDENT' && (
        <div className="panel" style={{ marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
            <h2 style={{ fontSize: '20px' }}>My Attendance Report</h2>
            <button className="btn-secondary" onClick={loadReport}>Refresh Report</button>
          </div>
          {report ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
              {[
                { label: 'Total Sessions', value: report.total_sessions, color: 'var(--primary-color)' },
                { label: 'Present', value: report.present, color: '#00c864' },
                { label: 'Absent', value: report.absent, color: '#ff4757' },
                { label: 'Attendance %', value: `${report.percentage}%`, color: report.percentage >= 75 ? '#00c864' : '#ff4757' },
              ].map(stat => (
                <div key={stat.label} style={{ textAlign: 'center', padding: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '36px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '5px' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>Click "Refresh Report" to load your attendance data.</p>
          )}
        </div>
      )}

      {/* Sessions List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {sessions.length === 0 ? (
          <div className="panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No sessions created yet.</div>
        ) : sessions.map(s => (
          <div className="panel" key={s.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>{s.title}</h3>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <span className="badge badge-info">📅 {new Date(s.date).toLocaleString()}</span>
                  {s._count && <span className="badge badge-success">{s._count.records} checked in</span>}
                  {s.qr_token && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '8px', background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: '8px' }}>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(s.qr_token)}`}
                        alt="Session QR code"
                        style={{ background: '#fff', padding: '4px', borderRadius: '6px', width: '56px', height: '56px' }}
                      />
                      <div style={{ flex: 1, minWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span className="badge badge-warning" style={{ fontFamily: 'monospace', fontSize: '11px' }}>QR Token</span>
                          <code style={{ fontSize: '12px', color: '#fbbf24', wordBreak: 'break-all' }}>{s.qr_token}</code>
                          <button
                            className="btn-secondary"
                            style={{ fontSize: '11px', padding: '2px 10px' }}
                            onClick={() => { if (navigator.clipboard) { navigator.clipboard.writeText(s.qr_token).then(() => alert('QR token copied!')).catch(() => {}); } else { alert(s.qr_token); } }}
                          >
                            Copy
                          </button>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Share this code / QR with students so they can check in.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {(isAdmin || isTrainer) && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-secondary" style={{ fontSize: '13px' }} onClick={() => { setActiveSession(s); loadRecords(s.id); }}>
                    View Records
                  </button>
                  <button className="btn-primary" style={{ fontSize: '13px' }} onClick={() => markPresent(s.id, 'u-1')}>
                    + Mark Present
                  </button>
                </div>
              )}
            </div>

            {/* Records panel */}
            {activeSession?.id === s.id && (
              <div style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '20px' }}>
                <h4 style={{ marginBottom: '10px' }}>Attendance Records</h4>
                {records.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No records yet.</p>
                  : records.map(r => (
                    <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', marginBottom: '6px' }}>
                      <span>Student: {r.user_id}</span>
                      <span><span className={`badge ${r.status === 'PRESENT' ? 'badge-success' : 'badge-danger'}`}>{r.status}</span></span>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>via {r.method}</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
