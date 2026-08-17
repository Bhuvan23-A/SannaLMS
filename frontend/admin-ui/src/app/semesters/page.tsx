'use client';
import { useState, useEffect } from 'react';
import Topbar from "@/components/Topbar";
import { fetchApi } from "@/lib/api";
import { useColleges } from "@/hooks/useColleges";
import CreateSemesterModal from "@/components/CreateSemesterModal";

export default function SemestersPage() {
  const [semesters, setSemesters] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  // College context (#fix): super admin filters college -> department -> branch
  // so the list only shows one college's semesters at a time.
  const { isSuperAdmin, activeColleges, collegeName } = useColleges();
  const [collegeFilter, setCollegeFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editBranchId, setEditBranchId] = useState('');
  const [saving, setSaving] = useState(false);
  // Promotion state
  const [promoteTarget, setPromoteTarget] = useState<{ from: any; to: any } | null>(null);
  const [promotePreview, setPromotePreview] = useState<any>(null);
  const [promoting, setPromoting] = useState(false);

  const loadSemesters = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/api/v1/semesters');
      setSemesters(Array.isArray(data) ? data : []);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSemesters();
    fetchApi('/api/v1/branches').then(d => setBranches(Array.isArray(d) ? d : [])).catch(() => {});
    fetchApi('/api/v1/departments').then(d => setDepartments(Array.isArray(d) ? d : [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = (s: any) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditNumber(String(s.semester_number ?? (() => { const m = /(\d+)/.exec(s.name || ''); return m ? m[1] : ''; })()));
    setEditBranchId(s.branch_id || '');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await fetchApi(`/api/v1/semesters/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editName,
          semester_number: editNumber !== '' ? Number(editNumber) : undefined,
          branch_id: editBranchId || undefined,
        }),
      });
      setEditingId(null);
      loadSemesters();
    } catch (err: any) {
      alert('Failed to update semester: ' + (err.message || 'error'));
    } finally {
      setSaving(false);
    }
  };

  const deleteSemester = async (s: any) => {
    if (!confirm(`Delete semester "${s.name}"? This cannot be undone.`)) return;
    try {
      await fetchApi(`/api/v1/semesters/${s.id}`, { method: 'DELETE' });
      loadSemesters();
    } catch (err: any) {
      alert('Failed to delete semester: ' + (err.message || 'error'));
    }
  };

  const branchName = (id: string) => branches.find(b => b.id === id)?.name || id;

  // Semesters carry their branch (getSemesters includes branch), branches carry
  // department_id, departments carry college_id — so we can cascade filters.
  const deptCollege = (deptId?: string) => departments.find((d: any) => d.id === deptId)?.college_id;
  const visibleBranches = branches.filter((b: any) => {
    if (collegeFilter && deptCollege(b.department_id) !== collegeFilter) return false;
    if (deptFilter && b.department_id !== deptFilter) return false;
    return true;
  });

  // Semester position in the program timeline (Semester N → N+1). Uses the
  // stored semester_number when present, else parses the name.
  const semNumber = (s: any): number => {
    if (s.semester_number != null) return Number(s.semester_number);
    const m = /(\d+)/.exec(s.name || '');
    return m ? parseInt(m[1], 10) : 0;
  };
  // Program length lives on the branch (B.Tech = 8, BBA = 6, MBA = 4, ...).
  // Semesters include their branch, so we always know the true end of the
  // program — a semester is only "Final" at that point, never merely because
  // it's the last one created so far (#fix).
  const branchTotal = (s: any): number => s.branch?.total_semesters ?? 8;
  const isFinalSemester = (s: any) => semNumber(s) >= branchTotal(s);

  // Find the next EXISTING semester within the same branch (Semester N → N+1).
  // If the program still has semesters left but the row hasn't been created
  // yet, this returns null and the UI says "add the next semester first"
  // instead of calling the current one Final.
  const nextSemester = (s: any) => {
    const branchSems = semesters.filter(x => x.branch_id === s.branch_id);
    const sorted = [...branchSems].sort((a, b) => semNumber(a) - semNumber(b));
    const idx = sorted.findIndex(x => x.id === s.id);
    return idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1] : null;
  };

  const startPromote = async (s: any) => {
    const next = nextSemester(s);
    if (!next) {
      if (isFinalSemester(s)) {
        alert(`${s.name} is the final semester of the ${branchTotal(s)}-semester program — there is no next semester to promote to.`);
      } else {
        alert(`Create Semester ${semNumber(s) + 1} for this branch first, then promote students from ${s.name}.`);
      }
      return;
    }
    setPromoteTarget({ from: s, to: next });
    setPromotePreview(null);
    try {
      const d = await fetchApi(`/api/v1/promotions/preview?branch_id=${s.branch_id}&from_semester_id=${s.id}&to_semester_id=${next.id}`);
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
          from_semester_id: promoteTarget.from.id,
          to_semester_id: promoteTarget.to.id,
        }),
      });
      alert(`✅ Promoted ${res.student_count} students from ${promoteTarget.from.name} to ${promoteTarget.to.name} (${res.enrollments_created} new enrollments created).`);
      setPromoteTarget(null);
      setPromotePreview(null);
      loadSemesters();
    } catch (err: any) {
      alert('Promotion failed: ' + (err.message || 'error'));
    } finally {
      setPromoting(false);
    }
  };

  const filtered = semesters.filter(s => {
    if (collegeFilter && deptCollege(s.branch?.department_id) !== collegeFilter) return false;
    if (deptFilter && s.branch?.department_id !== deptFilter) return false;
    if (branchFilter && s.branch_id !== branchFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="animate-fade-in">
      <Topbar title="Semesters Management" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>All Semesters</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 0 auto' }}>
          ℹ️ Semesters here are the <strong>program timeline</strong> (Sem 1–8 once per branch). Running classes live under <strong>Sections</strong>.
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            className="input-field"
            placeholder="🔍 Search semesters..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '180px' }}
          />
          {isSuperAdmin && activeColleges.length > 0 && (
            <select className="input-field" style={{ maxWidth: '200px' }} value={collegeFilter} onChange={e => { setCollegeFilter(e.target.value); setDeptFilter(''); setBranchFilter(''); }}>
              <option value="">All colleges</option>
              {activeColleges.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <select className="input-field" style={{ maxWidth: '200px' }} value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setBranchFilter(''); }}>
            <option value="">All departments</option>
            {departments.filter((d: any) => !collegeFilter || d.college_id === collegeFilter).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select className="input-field" style={{ maxWidth: '200px' }} value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
            <option value="">All branches</option>
            {visibleBranches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>+ Add Semester</button>
        </div>
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '15px', color: 'var(--danger-color)', border: '1px solid var(--danger-color)', marginBottom: '20px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Semester #</th>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Name</th>
              {isSuperAdmin && <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>College</th>}
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Branch</th>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center' }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center' }}>No semesters found.</td></tr>
            ) : (
              filtered.map((semester) => (
                <tr key={semester.id} style={{ transition: 'background 0.2s ease' }} className="table-row">
                  {editingId === semester.id ? (
                    <>
                      <td style={{ padding: '12px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                        <input type="number" min={1} max={12} className="input-field" value={editNumber} onChange={e => setEditNumber(e.target.value)} style={{ width: '80px' }} />
                      </td>
                      <td style={{ padding: '12px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                        <input className="input-field" value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%' }} />
                      </td>
                      {isSuperAdmin && <td style={{ padding: '12px 20px', borderBottom: '1px solid var(--panel-border)' }}>{collegeName(deptCollege(semester.branch?.department_id))}</td>}
                      <td style={{ padding: '12px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                        <select className="input-field" value={editBranchId} onChange={e => setEditBranchId(e.target.value)} style={{ width: '100%' }}>
                          <option value="">Select branch</option>
                          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '12px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-primary" style={{ fontSize: '13px', padding: '5px 12px' }} disabled={saving} onClick={saveEdit}>
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button className="btn-secondary" style={{ fontSize: '13px', padding: '5px 12px' }} onClick={() => setEditingId(null)}>Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', fontFamily: 'monospace' }}>
                        {semNumber(semester)} / {branchTotal(semester)}
                      </td>
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>{semester.name}</td>
                      {isSuperAdmin && <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>{collegeName(deptCollege(semester.branch?.department_id))}</td>}
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>{branchName(semester.branch_id)}</td>
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button className="btn-secondary" style={{ fontSize: '13px', padding: '5px 12px' }} onClick={() => startEdit(semester)}>✏️ Edit</button>
                          <button
                            className="btn-secondary"
                            style={{ fontSize: '13px', padding: '5px 12px', color: isFinalSemester(semester) ? 'var(--text-secondary)' : '#00c864', borderColor: isFinalSemester(semester) ? 'rgba(255,255,255,0.2)' : '#00c864' }}
                            onClick={() => startPromote(semester)}
                            title={nextSemester(semester)
                              ? `Promote students to ${nextSemester(semester)?.name}`
                              : isFinalSemester(semester)
                                ? `Final semester of the ${branchTotal(semester)}-semester program`
                                : `Add Semester ${semNumber(semester) + 1} first to enable promotion`}
                          >
                            🎓 {isFinalSemester(semester) ? 'Final' : 'Promote'}
                          </button>
                          <button className="btn-secondary" style={{ fontSize: '13px', padding: '5px 12px', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }} onClick={() => deleteSemester(semester)}>🗑 Delete</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <CreateSemesterModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            loadSemesters();
          }}
        />
      )}

      {promoteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => !promoting && setPromoteTarget(null)}>
          <div className="glass-panel" style={{ maxWidth: '520px', width: '100%', padding: '24px', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: '18px' }}>🎓 Promote Students</h3>
            {!promotePreview ? (
              <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '20px' }}>Checking students in {promoteTarget.from.name}...</p>
            ) : (
              <>
                <p style={{ margin: '0 0 16px', fontSize: '14px' }}>
                  Promote <strong>{promotePreview.student_count}</strong> students from{' '}
                  <strong>{promoteTarget.from.name}</strong> to <strong>{promoteTarget.to.name}</strong> ({branchName(promoteTarget.from.branch_id)})
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <div className="panel" style={{ textAlign: 'center', padding: '16px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Source courses</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{(promotePreview.from_courses || []).length}</div>
                  </div>
                  <div className="panel" style={{ textAlign: 'center', padding: '16px' }}>
                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Target courses</div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{(promotePreview.to_courses || []).length}</div>
                  </div>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 16px' }}>
                  Students will be enrolled in all {promotePreview.to_courses?.length || 0} target-semester course(s). Their source-semester
                  courses move to "Completed" (history is kept, they leave the active course list).
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
    </div>
  );
}
