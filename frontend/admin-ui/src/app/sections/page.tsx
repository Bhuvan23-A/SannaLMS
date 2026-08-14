'use client';
import { useState, useEffect } from 'react';
import Topbar from "@/components/Topbar";
import { fetchApi } from "@/lib/api";
import { useUserDirectory } from '@/hooks/useUserDirectory';
import { useColleges } from '@/hooks/useColleges';

export default function SectionsPage() {
  const [sections, setSections] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [sessionFilter, setSessionFilter] = useState('');
  // Super admin sees every college's sections — filter by college (tenant).
  const { isSuperAdmin, activeColleges, collegeNameByTenant } = useColleges();
  const [collegeFilter, setCollegeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const { users, nameOf, emailOf } = useUserDirectory();
  const studentUsers = users.filter((u: any) => u.role === 'STUDENT');

  // Create form
  const [branchId, setBranchId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [semesterNumber, setSemesterNumber] = useState('1');
  const [sectionName, setSectionName] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');

  // Roster modal
  const [rosterSection, setRosterSection] = useState<any>(null);
  const [roster, setRoster] = useState<any[]>([]);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [rosterBusy, setRosterBusy] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [secs, brs, sess] = await Promise.all([
        fetchApi('/api/v1/sections').catch(() => []),
        fetchApi('/api/v1/branches').catch(() => []),
        fetchApi('/api/v1/academic-sessions').catch(() => []),
      ]);
      setSections(Array.isArray(secs) ? secs : []);
      setBranches(Array.isArray(brs) ? brs : []);
      setSessions(Array.isArray(sess) ? sess : []);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const branchName = (id: string) => visibleBranches.find((b: any) => b.id === id)?.name || '—';
  const sessionName = (id: string) => visibleSessions.find((s: any) => s.id === id)?.name || '—';
  const sectionLabel = (s: any) =>
    `${collegeName(s.tenant_id)}${branchName(s.branch_id)} · ${sessionName(s.academic_session_id)} · Sem ${s.semester_number}${s.year_of_study ? ` · Yr ${s.year_of_study}` : ''}${s.name ? ` · Sec ${s.name}` : ''}`;

  const createSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFormError('');
    try {
      await fetchApi('/api/v1/sections', {
        method: 'POST',
        body: JSON.stringify({
          branch_id: branchId,
          academic_session_id: sessionId,
          semester_number: Number(semesterNumber),
          name: sectionName.trim() || undefined,
        }),
      });
      setModalOpen(false);
      setBranchId(''); setSessionId(''); setSemesterNumber('1'); setSectionName('');
      load();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const openRoster = async (s: any) => {
    setRosterSection(s);
    setRoster([]);
    setSelectedStudents([]);
    setRosterLoading(true);
    try {
      const data = await fetchApi(`/api/v1/rosters/${s.id}`);
      setRoster(Array.isArray(data) ? data : []);
    } catch { setRoster([]); } finally { setRosterLoading(false); }
  };

  const addToRoster = async () => {
    if (!rosterSection || selectedStudents.length === 0) return;
    setRosterBusy(true);
    try {
      const res = await fetchApi(`/api/v1/rosters/${rosterSection.id}/members`, {
        method: 'POST',
        body: JSON.stringify({ user_ids: selectedStudents }),
      });
      setSelectedStudents([]);
      await openRoster(rosterSection);
      alert(`✅ ${res.memberships} added to roster · ${res.enrollments} auto-enrolled in offerings`);
    } catch (err: any) { alert(err.message || 'Failed'); } finally { setRosterBusy(false); }
  };

  const removeFromRoster = async (userId: string) => {
    if (!rosterSection || !confirm('Remove this student from the section roster?')) return;
    try {
      await fetchApi(`/api/v1/rosters/${rosterSection.id}/members/${userId}`, { method: 'DELETE' });
      openRoster(rosterSection);
    } catch (err: any) { alert(err.message); }
  };

  const deleteSection = async (id: string) => {
    if (!confirm('Delete this section? Existing course offerings keep their history.')) return;
    try {
      await fetchApi(`/api/v1/sections/${id}`, { method: 'DELETE' });
      load();
    } catch (err: any) { alert(err.message); }
  };

  // ─── Section-to-section promotion (phase 5) ───
  // Promote the whole cohort: same branch + session, semester_number + 1.
  const [promoteTarget, setPromoteTarget] = useState<{ from: any; to: any } | null>(null);
  const [promotePreview, setPromotePreview] = useState<any>(null);
  const [promoting, setPromoting] = useState(false);

  const nextSection = (s: any) =>
    sections.find((x: any) =>
      x.branch_id === s.branch_id &&
      x.academic_session_id === s.academic_session_id &&
      x.semester_number === (s.semester_number || 0) + 1 &&
      (x.name || '') === (s.name || '')
    ) || null;

  const startPromote = async (s: any) => {
    const next = nextSection(s);
    if (!next) {
      alert(`No next section for ${sectionLabel(s)}. Create the Sem ${(s.semester_number || 0) + 1} section first (same branch + session), then promote.`);
      return;
    }
    setPromoteTarget({ from: s, to: next });
    setPromotePreview(null);
    try {
      const d = await fetchApi(`/api/v1/promotions/preview?branch_id=${s.branch_id}&from_section_id=${s.id}&to_section_id=${next.id}`);
      setPromotePreview(d);
    } catch (err: any) {
      alert('Preview failed: ' + (err.message || 'error'));
      setPromoteTarget(null);
    }
  };

  const confirmPromote = async () => {
    if (!promoteTarget || !promotePreview) return;
    setPromoting(true);
    try {
      const res = await fetchApi('/api/v1/promotions/promote', {
        method: 'POST',
        body: JSON.stringify({
          branch_id: promoteTarget.from.branch_id,
          from_section_id: promoteTarget.from.id,
          to_section_id: promoteTarget.to.id,
        }),
      });
      alert(`✅ Promoted ${res.student_count} students — ${res.enrollments_created} new enrollments created.`);
      setPromoteTarget(null);
      setPromotePreview(null);
      load();
    } catch (err: any) {
      alert('Promotion failed: ' + (err.message || 'error'));
    } finally {
      setPromoting(false);
    }
  };

  // College scoping for super admin: sections/sessions/branches are qualified
  // by college so two "2026-27" sessions or same-named branches can be told apart.
  const selectedCollege = activeColleges.find((c: any) => c.id === collegeFilter);
  const inCollege = (item: any) => !isSuperAdmin || !selectedCollege || !item.tenant_id || item.tenant_id === selectedCollege.tenant_id;
  const visibleBranches = branches.filter((b: any) => inCollege(b));
  const visibleSessions = sessions.filter((s: any) => inCollege(s));
  const collegeName = (tid?: string) => isSuperAdmin ? (collegeNameByTenant(tid) ? `${collegeNameByTenant(tid)} · ` : '') : '';

  const visibleSections = sections.filter((s: any) =>
    (!collegeFilter || !s.tenant_id || s.tenant_id === selectedCollege?.tenant_id) &&
    (!branchFilter || s.branch_id === branchFilter) &&
    (!sessionFilter || s.academic_session_id === sessionFilter)
  );

  return (
    <div className="animate-fade-in">
      <Topbar title="Sections (Classes)" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>All Sections</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {isSuperAdmin && activeColleges.length > 0 && (
            <select className="input-field" style={{ maxWidth: '220px' }} value={collegeFilter} onChange={e => { setCollegeFilter(e.target.value); setBranchFilter(''); setSessionFilter(''); }}>
              <option value="">All colleges</option>
              {activeColleges.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <select className="input-field" style={{ maxWidth: '240px' }} value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
            <option value="">All branches</option>
            {visibleBranches.map((b: any) => <option key={b.id} value={b.id}>{collegeName(b.tenant_id)}{b.name}</option>)}
          </select>
          <select className="input-field" style={{ maxWidth: '200px' }} value={sessionFilter} onChange={e => setSessionFilter(e.target.value)}>
            <option value="">All sessions</option>
            {visibleSessions.map((s: any) => <option key={s.id} value={s.id}>{collegeName(s.tenant_id)}{s.name}{s.is_current ? ' (current)' : ''}</option>)}
          </select>
          <button className="btn-primary" onClick={() => setModalOpen(true)}>+ Add Section</button>
        </div>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '-12px', marginBottom: '20px' }}>
        A section is a concrete class — e.g. <strong>B.Tech CSE · 2026-27 · Sem 3 · Sec A</strong>. Enroll students into the section and they are auto-enrolled in every course (offering) that section runs.
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
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Section</th>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Year of Study</th>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Semester</th>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Name</th>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center' }}>Loading...</td></tr>
            ) : visibleSections.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center' }}>No sections yet. Add the classes running this academic session.</td></tr>
            ) : (
              visibleSections.map((s) => (
                <tr key={s.id} className="table-row" style={{ transition: 'background 0.2s ease' }}>
                  <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>{sectionLabel(s)}</td>
                  <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)' }}>{s.year_of_study}</td>
                  <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)' }}>{s.semester_number}</td>
                  <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)' }}>{s.name || '—'}</td>
                  <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', textAlign: 'right' }}>
                    <button className="btn-primary" style={{ padding: '4px 10px', fontSize: '12px', marginRight: '6px' }} onClick={() => openRoster(s)}>👥 Roster</button>
                    <button
                      className="btn-secondary"
                      style={{ padding: '4px 8px', fontSize: '12px', marginRight: '6px', color: '#00c864', borderColor: '#00c864' }}
                      onClick={() => startPromote(s)}
                      title={nextSection(s) ? `Promote cohort to ${sectionLabel(nextSection(s)!)}` : 'Create the next semester section first'}
                    >
                      🎓 Promote
                    </button>
                    <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }} onClick={() => deleteSection(s.id)}>Delete</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create section modal */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', overflowY: 'auto', padding: '20px', zIndex: 1000 }}>
          <form onSubmit={createSection} className="glass-panel animate-fade-in" style={{ width: '460px', padding: '30px', margin: 'auto', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '20px' }}>Add Section</h2>
            {formError && (
              <div style={{ padding: '10px', background: 'rgba(239,68,68,0.2)', color: 'var(--danger-color)', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>{formError}</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Branch / Program *</label>
                <select required className="input-field" value={branchId} onChange={e => setBranchId(e.target.value)}>
                  <option value="">Select…</option>
                  {visibleBranches.length === 0 ? <option value="" disabled>No branches yet</option>
                    : visibleBranches.map((b: any) => <option key={b.id} value={b.id}>{collegeName(b.tenant_id)}{b.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Academic Session *</label>
                <select required className="input-field" value={sessionId} onChange={e => setSessionId(e.target.value)}>
                  <option value="">Select…</option>
                  {visibleSessions.length === 0 ? <option value="" disabled>No sessions yet — add one first</option>
                    : visibleSessions.map((s: any) => <option key={s.id} value={s.id}>{collegeName(s.tenant_id)}{s.name}{s.is_current ? ' (current)' : ''}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Semester *</label>
                  <select className="input-field" value={semesterNumber} onChange={e => setSemesterNumber(e.target.value)}>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={String(n)}>Semester {n}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Section Name</label>
                  <input className="input-field" value={sectionName} onChange={e => setSectionName(e.target.value)} placeholder="A / B / C (optional)" />
                </div>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                ℹ️ Year of study is derived automatically: Sem 1-2 → Year 1, Sem 3-4 → Year 2, etc.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={creating}>{creating ? 'Creating...' : 'Add Section'}</button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Promote modal */}
      {promoteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => !promoting && setPromoteTarget(null)}>
          <div className="glass-panel" style={{ maxWidth: '540px', width: '100%', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>🎓 Promote Cohort</h3>
            {!promotePreview ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>Checking students in {sectionLabel(promoteTarget.from)}...</p>
            ) : (
              <>
                <p style={{ margin: '0 0 16px', fontSize: '14px' }}>
                  Promote <strong>{promotePreview.student_count}</strong> students from{' '}
                  <strong>{sectionLabel(promoteTarget.from)}</strong> to{' '}
                  <strong>{sectionLabel(promoteTarget.to)}</strong>
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                  The whole class roster moves to the next semester&apos;s section, and every student is auto-enrolled in that section&apos;s course offerings. Past courses stay in history.
                </p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button className="btn-secondary" style={{ fontSize: '13px', padding: '6px 14px' }} disabled={promoting} onClick={() => setPromoteTarget(null)}>Cancel</button>
                  <button
                    className="btn-primary"
                    style={{ fontSize: '13px', padding: '6px 14px' }}
                    disabled={promoting || !promotePreview.student_count}
                    onClick={confirmPromote}
                  >
                    {promoting ? 'Promoting...' : `Promote ${promotePreview.student_count || 0} students`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Roster modal */}
      {rosterSection && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="glass-panel animate-fade-in" style={{ width: '620px', maxWidth: '94vw', maxHeight: '88vh', overflowY: 'auto', padding: '26px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>👥 Roster — {sectionLabel(rosterSection)}</h2>
              <button className="btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }} onClick={() => setRosterSection(null)}>✕ Close</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
              Students added here are auto-enrolled in every course (offering) this section runs.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Add students ({selectedStudents.length} selected)</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select className="input-field" style={{ flex: 1 }} value={selectedStudents.length === 1 ? selectedStudents[0] : ''} onChange={e => {
                  const v = e.target.value;
                  if (v) setSelectedStudents([...new Set([...selectedStudents, v])]);
                }}>
                  <option value="">Select student to add…</option>
                  {studentUsers.filter((u: any) => !roster.some((m: any) => m.user_id === u.id)).map((u: any) => (
                    <option key={u.id} value={u.id}>{[u.first_name, u.last_name].filter(Boolean).join(' ')} — {u.email}</option>
                  ))}
                </select>
                <button className="btn-primary" disabled={rosterBusy || selectedStudents.length === 0} onClick={addToRoster}>
                  {rosterBusy ? 'Adding...' : `Add ${selectedStudents.length}`}
                </button>
              </div>
              {selectedStudents.length > 1 && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Selected: {selectedStudents.map(id => nameOf(id)).join(', ')}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Roster ({roster.length} students)</div>
              {rosterLoading ? <p style={{ fontSize: '13px' }}>Loading...</p>
                : roster.length === 0 ? <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>No students in this section yet.</p>
                : roster.map((m: any) => (
                  <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', marginBottom: '6px', fontSize: '13px' }}>
                    <span><strong>{nameOf(m.user_id)}</strong>{emailOf(m.user_id) && <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>{emailOf(m.user_id)}</span>}</span>
                    <button className="btn-secondary" style={{ fontSize: '11px', padding: '2px 8px', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }} onClick={() => removeFromRoster(m.user_id)}>Remove</button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
