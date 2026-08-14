'use client';
import { useState, useEffect } from 'react';
import Topbar from "@/components/Topbar";
import { fetchApi } from "@/lib/api";
import { useColleges } from "@/hooks/useColleges";

export default function AcademicSessionsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const { isSuperAdmin, activeColleges, collegeNameByTenant } = useColleges();
  const [collegeFilter, setCollegeFilter] = useState('');

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [setCurrent, setSetCurrent] = useState(true);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/api/v1/academic-sessions');
      setSessions(Array.isArray(data) ? data : []);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const createSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFormError('');
    try {
      await fetchApi('/api/v1/academic-sessions', {
        method: 'POST',
        body: JSON.stringify({
          name,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          is_current: setCurrent,
        }),
      });
      setModalOpen(false);
      setName(''); setStartDate(''); setEndDate(''); setSetCurrent(true);
      load();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const activate = async (id: string) => {
    try {
      await fetchApi(`/api/v1/academic-sessions/${id}/activate`, { method: 'POST' });
      load();
    } catch (err: any) { alert(err.message); }
  };

  const close = async (id: string) => {
    try {
      await fetchApi(`/api/v1/academic-sessions/${id}/close`, { method: 'POST' });
      load();
    } catch (err: any) { alert(err.message); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this academic session?')) return;
    try {
      await fetchApi(`/api/v1/academic-sessions/${id}`, { method: 'DELETE' });
      load();
    } catch (err: any) { alert(err.message); }
  };

  return (
    <div className="animate-fade-in">
      <Topbar title="Academic Sessions" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>Academic Years</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {isSuperAdmin && activeColleges.length > 0 && (
            <select className="input-field" style={{ maxWidth: '240px' }} value={collegeFilter} onChange={e => setCollegeFilter(e.target.value)}>
              <option value="">All colleges</option>
              {activeColleges.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button className="btn-primary" onClick={() => setModalOpen(true)}>+ Add Session</button>
        </div>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '-12px', marginBottom: '20px' }}>
        The running academic year (e.g. <strong>2026-27</strong>). Exactly one session is <strong>current</strong> — sections and courses belong to a session.
      </p>

      {error && (
        <div className="glass-panel" style={{ padding: '15px', color: 'var(--danger-color)', border: '1px solid var(--danger-color)', marginBottom: '20px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Name</th>
              {isSuperAdmin && <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>College</th>}
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Status</th>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Starts</th>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Ends</th>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center' }}>Loading...</td></tr>
            ) : sessions.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center' }}>No academic sessions yet. Create the running year (e.g. 2026-27).</td></tr>
            ) : (
              sessions.filter((s: any) => {
                if (!collegeFilter) return true;
                const col = activeColleges.find((x: any) => x.id === collegeFilter);
                return col ? s.tenant_id === col.tenant_id : true;
              }).map((s) => (
                <tr key={s.id} className="table-row" style={{ transition: 'background 0.2s ease' }}>
                  <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                    {s.name} {s.is_current && <span style={{ marginLeft: '8px', padding: '3px 8px', borderRadius: '10px', fontSize: '11px', background: 'rgba(0,200,100,0.15)', color: '#4ade80' }}>CURRENT</span>}
                  </td>
                  {isSuperAdmin && (
                    <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>{collegeNameByTenant(s.tenant_id) || '—'}</td>
                  )}
                  <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px',
                      background: s.status === 'ACTIVE' ? 'var(--success-color)' : s.status === 'CLOSED' ? 'rgba(255,255,255,0.1)' : 'rgba(250,204,21,0.15)' }}>
                      {s.status}
                    </span>
                  </td>
                  <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)' }}>{s.start_date ? new Date(s.start_date).toLocaleDateString() : '—'}</td>
                  <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)' }}>{s.end_date ? new Date(s.end_date).toLocaleDateString() : '—'}</td>
                  <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', textAlign: 'right' }}>
                    {s.status !== 'ACTIVE' && (
                      <button className="btn-primary" style={{ padding: '4px 10px', fontSize: '12px', marginRight: '6px' }} onClick={() => activate(s.id)}>Activate</button>
                    )}
                    {s.status === 'ACTIVE' && (
                      <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px', marginRight: '6px' }} onClick={() => close(s.id)}>Close</button>
                    )}
                    <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }} onClick={() => remove(s.id)}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', overflowY: 'auto', padding: '20px', zIndex: 1000 }}>
          <form onSubmit={createSession} className="glass-panel animate-fade-in" style={{ width: '440px', padding: '30px', margin: 'auto' }}>
            <h2 style={{ marginBottom: '20px' }}>Add Academic Session</h2>
            {formError && (
              <div style={{ padding: '10px', background: 'rgba(239,68,68,0.2)', color: 'var(--danger-color)', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>{formError}</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Session Name *</label>
                <input required className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. 2026-27" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Start Date</label>
                  <input type="date" className="input-field" value={startDate} onChange={e => setStartDate(e.target.value)} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>End Date</label>
                  <input type="date" className="input-field" value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
              </div>
              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px', cursor: 'pointer' }}>
                <input type="checkbox" checked={setCurrent} onChange={e => setSetCurrent(e.target.checked)} />
                Set as the current (active) session
              </label>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Add Session'}</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
