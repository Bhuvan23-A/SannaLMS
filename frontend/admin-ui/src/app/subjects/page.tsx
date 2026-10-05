'use client';
import { useState, useEffect } from 'react';
import Topbar from "@/components/Topbar";
import { fetchApi } from "@/lib/api";
import { useColleges } from "@/hooks/useColleges";

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // Super admin sees every college's subjects — filter by college (tenant).
  const { isSuperAdmin, activeColleges, collegeNameByTenant } = useColleges();
  const [collegeFilter, setCollegeFilter] = useState('');
  // Archived subjects are hidden by default — toggle to see/unarchive/delete them.
  const [showArchived, setShowArchived] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Edit modal state — reused for creating and editing a subject.
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [editCollegeId, setEditCollegeId] = useState('');

  // Create form state
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [credits, setCredits] = useState('3');
  const [departmentId, setDepartmentId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [ltp, setLtp] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  // Super admin picks the target college when creating (the subject must live
  // under that college's tenant, not 'master').
  const [createCollegeId, setCreateCollegeId] = useState('');

  // Syllabus editor state (phase 5): subject-owned module tree
  const [syllabusSubject, setSyllabusSubject] = useState<any>(null);
  const [syllabus, setSyllabus] = useState<any[]>([]);
  const [syllabusLoading, setSyllabusLoading] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const [subs, brs, depts] = await Promise.all([
        fetchApi(`/api/v1/subjects${showArchived ? '?include_archived=true' : ''}`).catch(() => []),
        fetchApi('/api/v1/branches').catch(() => []),
        fetchApi('/api/v1/departments').catch(() => []),
      ]);
      setSubjects(Array.isArray(subs) ? subs : []);
      setBranches(Array.isArray(brs) ? brs : []);
      setDepartments(Array.isArray(depts) ? depts : []);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [showArchived]);

  const branchName = (id: string) => branches.find((b: any) => b.id === id)?.name;
  // College-scoped cascading dropdowns: pick the college first, then its
  // departments and branches only. College admins are already tenant-scoped.
  const selectedCreateCollege = activeColleges.find((c: any) => c.id === createCollegeId);
  const inCreateCollege = (item: any) => !isSuperAdmin || !createCollegeId || !item.tenant_id || item.tenant_id === selectedCreateCollege?.tenant_id;
  const visibleDepartments = departments.filter((d: any) => inCreateCollege(d));
  const visibleBranches = branches.filter((b: any) => inCreateCollege(b) && (!departmentId || b.department_id === departmentId));

  const createSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setFormError('');
    if (isSuperAdmin && !createCollegeId) {
      setFormError('Select the college this subject belongs to');
      setCreating(false);
      return;
    }
    try {
      await fetchApi('/api/v1/subjects', {
        method: 'POST',
        body: JSON.stringify({
          name,
          code: code.trim() || undefined,
          credits: credits ? Number(credits) : undefined,
          department_id: departmentId || undefined,
          branch_id: branchId || undefined,
          lt_p: ltp.trim() || undefined,
          tenant_id: selectedCreateCollege?.tenant_id,
        }),
      });
      setModalOpen(false);
      setName(''); setCode(''); setCredits('3'); setDepartmentId(''); setBranchId(''); setLtp(''); setCreateCollegeId('');
      load();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteSubject = async (id: string) => {
    if (!confirm('Archive this subject? Its offerings keep their history, but the subject leaves the active catalog.')) return;
    try {
      await fetchApi(`/api/v1/subjects/${id}`, { method: 'DELETE' });
      load();
    } catch (err: any) { alert(err.message); }
  };

  // Open the edit modal pre-filled with the subject's current values.
  const openEdit = (s: any) => {
    setEditingSubject(s);
    setName(s.name || '');
    setCode(s.code || '');
    setCredits(String(s.credits ?? 3));
    setDepartmentId(s.department_id || '');
    setBranchId(s.branch_id || '');
    setLtp(s.lt_p || '');
    setCreateCollegeId('');
    setEditCollegeId('');
    setFormError('');
  };

  const updateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubject) return;
    setCreating(true);
    setFormError('');
    try {
      await fetchApi(`/api/v1/subjects/${editingSubject.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          code: code.trim() || undefined,
          credits: credits ? Number(credits) : undefined,
          department_id: departmentId || undefined,
          branch_id: branchId || undefined,
          lt_p: ltp.trim() || undefined,
        }),
      });
      setEditingSubject(null);
      setName(''); setCode(''); setCredits('3'); setDepartmentId(''); setBranchId(''); setLtp('');
      load();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const restoreSubject = async (id: string) => {
    if (!confirm('Restore this subject to the active catalog?')) return;
    try {
      await fetchApi(`/api/v1/subjects/${id}/restore`, { method: 'POST' });
      load();
    } catch (err: any) { alert(err.message); }
  };

  const deleteSubjectForever = async (s: any, cascade = false) => {
    const msg = cascade
      ? `Permanently delete ${s.code} — ${s.name}? This also archives its course offering(s) (grades/history stay, courses leave active lists) and removes the syllabus. Cannot be undone.`
      : `Permanently delete ${s.code} — ${s.name}? This removes the subject AND its syllabus. This cannot be undone.`;
    if (!confirm(msg)) return;
    try {
      await fetchApi(`/api/v1/subjects/${s.id}/permanent${cascade ? '?cascade=true' : ''}`, { method: 'DELETE' });
      load();
    } catch (err: any) { alert(err.message); }
  };

  const deleteWithCascade = async (s: any) => {
    if (!confirm(`Delete ${s.code} — ${s.name} and everything using it? Its course offerings will be archived automatically.`)) return;
    try {
      await fetchApi(`/api/v1/subjects/${s.id}/permanent?cascade=true`, { method: 'DELETE' });
      load();
    } catch (err: any) { alert(err.message); }
  };

  const bulkDeleteSubjects = async () => {
    if (selectedIds.length === 0) return;
    const confirmMsg = showArchived
      ? `Permanently delete all ${selectedIds.length} selected subject(s) and their syllabi? This action cannot be undone.`
      : `Archive/delete all ${selectedIds.length} selected subject(s)? Their historical marks and course offerings will remain safely preserved.`;
    if (!confirm(confirmMsg)) return;

    setBulkLoading(true);
    try {
      await Promise.all(
        selectedIds.map(id =>
          showArchived
            ? fetchApi(`/api/v1/subjects/${id}/permanent?cascade=true`, { method: 'DELETE' }).catch(() => null)
            : fetchApi(`/api/v1/subjects/${id}`, { method: 'DELETE' }).catch(() => null)
        )
      );
      setSelectedIds([]);
      await load();
    } catch (err: any) {
      alert('Bulk delete encountered an issue: ' + (err.message || 'Error'));
    } finally {
      setBulkLoading(false);
    }
  };

  const bulkRestoreSubjects = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Restore ${selectedIds.length} selected subject(s) to the active catalog?`)) return;

    setBulkLoading(true);
    try {
      await Promise.all(
        selectedIds.map(id =>
          fetchApi(`/api/v1/subjects/${id}/restore`, { method: 'POST' }).catch(() => null)
        )
      );
      setSelectedIds([]);
      await load();
    } catch (err: any) {
      alert('Bulk restore encountered an issue: ' + (err.message || 'Error'));
    } finally {
      setBulkLoading(false);
    }
  };

  // ─── Syllabus editor (subject-owned, shared by every offering) ───
  const openSyllabus = async (s: any) => {
    setSyllabusSubject(s);
    setSyllabusLoading(true);
    setSyllabus([]);
    try {
      const data = await fetchApi(`/api/v1/subjects/${s.id}/syllabus`);
      setSyllabus(Array.isArray(data?.modules) ? data.modules : []);
    } catch (err: any) { alert(err.message); } finally { setSyllabusLoading(false); }
  };

  const reloadSyllabus = async () => {
    if (!syllabusSubject) return;
    const data = await fetchApi(`/api/v1/subjects/${syllabusSubject.id}/syllabus`).catch(() => null);
    if (data) setSyllabus(Array.isArray(data.modules) ? data.modules : []);
  };

  const addSyllabusModule = async () => {
    if (!syllabusSubject) return;
    const title = prompt('Module title:');
    if (!title) return;
    try {
      await fetchApi('/api/v1/modules', {
        method: 'POST',
        body: JSON.stringify({ title, subject_id: syllabusSubject.id, sequence_no: syllabus.length + 1 }),
      });
      reloadSyllabus();
    } catch (err: any) { alert(err.message); }
  };

  const addSyllabusLesson = async (moduleId: string, moduleIndex: number) => {
    const title = prompt('Lesson title:');
    if (!title) return;
    try {
      await fetchApi('/api/v1/lessons', {
        method: 'POST',
        body: JSON.stringify({ title, module_id: moduleId, sequence_no: (syllabus[moduleIndex]?.lessons?.length || 0) + 1 }),
      });
      reloadSyllabus();
    } catch (err: any) { alert(err.message); }
  };

  const addSyllabusTopic = async (lessonId: string) => {
    const title = prompt('Topic title:');
    if (!title) return;
    try {
      await fetchApi('/api/v1/topics', { method: 'POST', body: JSON.stringify({ title, lesson_id: lessonId }) });
      reloadSyllabus();
    } catch (err: any) { alert(err.message); }
  };

  const deleteSyllabusModule = async (moduleId: string) => {
    if (!confirm('Delete this module from the subject syllabus?')) return;
    try {
      await fetchApi(`/api/v1/modules/${moduleId}`, { method: 'DELETE' });
      reloadSyllabus();
    } catch (err: any) { alert(err.message); }
  };

  return (
    <div className="animate-fade-in">
      <Topbar title="Subject Catalog" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '16px', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>All Subjects</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search subjects by code or name..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setSelectedIds([]); }}
            className="input-field"
            style={{ minWidth: '240px', maxWidth: '320px' }}
          />
          {isSuperAdmin && activeColleges.length > 0 && (
            <select className="input-field" style={{ maxWidth: '240px' }} value={collegeFilter} onChange={e => { setCollegeFilter(e.target.value); setSelectedIds([]); }}>
              <option value="">All colleges</option>
              {activeColleges.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button className="btn-secondary" onClick={() => { setShowArchived(!showArchived); setSelectedIds([]); }}>
            {showArchived ? ' Showing Archived' : 'View Archived'}
          </button>
          <button className="btn-primary" onClick={() => { setCreateCollegeId(collegeFilter); setDepartmentId(''); setBranchId(''); setModalOpen(true); }}>+ Add Subject</button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: 'var(--text-secondary)' }}>
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>ℹ️ Note on Catalog:</span>
        <span>
          <strong>Active subjects</strong> can be used to create new courses and enroll students. <strong>Archived subjects</strong> are safely retired from the active catalog without deleting historical student grades, past courses, or syllabus data.
        </span>
      </div>

      {selectedIds.length > 0 && (
        <div className="glass-panel animate-fade-in" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          marginBottom: '16px',
          background: 'rgba(56, 189, 248, 0.08)',
          border: '1px solid rgba(56, 189, 248, 0.3)',
          borderRadius: '8px',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 600, fontSize: '14px', color: '#38bdf8' }}>
              ✓ {selectedIds.length} subject{selectedIds.length > 1 ? 's' : ''} selected
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {showArchived ? (
              <>
                <button
                  className="btn-primary"
                  style={{ fontSize: '13px', padding: '6px 14px' }}
                  disabled={bulkLoading}
                  onClick={bulkRestoreSubjects}
                >
                  {bulkLoading ? 'Restoring...' : `Restore Selected (${selectedIds.length})`}
                </button>
                <button
                  className="btn-secondary"
                  style={{ fontSize: '13px', padding: '6px 14px', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}
                  disabled={bulkLoading}
                  onClick={bulkDeleteSubjects}
                >
                  {bulkLoading ? 'Deleting...' : `Delete Permanently (${selectedIds.length})`}
                </button>
              </>
            ) : (
              <button
                className="btn-secondary"
                style={{ fontSize: '13px', padding: '6px 14px', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}
                disabled={bulkLoading}
                onClick={bulkDeleteSubjects}
              >
                {bulkLoading ? 'Processing...' : `Delete / Archive Selected (${selectedIds.length})`}
              </button>
            )}
            <button
              className="btn-secondary"
              style={{ fontSize: '13px', padding: '6px 12px' }}
              onClick={() => setSelectedIds([])}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="glass-panel" style={{ padding: '15px', color: 'var(--danger-color)', border: '1px solid var(--danger-color)', marginBottom: '20px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {(() => {
        const filteredSubjects = subjects.filter((s: any) => {
          if (collegeFilter) {
            const col = activeColleges.find((x: any) => x.id === collegeFilter);
            if (col && s.tenant_id !== col.tenant_id) return false;
          }
          if (searchTerm.trim()) {
            const term = searchTerm.toLowerCase().trim();
            const nameMatch = (s.name || '').toLowerCase().includes(term);
            const codeMatch = (s.code || '').toLowerCase().includes(term);
            if (!nameMatch && !codeMatch) return false;
          }
          return true;
        });

        const allSelected = filteredSubjects.length > 0 && selectedIds.length === filteredSubjects.length;

        return (
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                  <th style={{ width: '40px', padding: '15px 12px 15px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                    <input
                      type="checkbox"
                      aria-label="Select all subjects"
                      checked={allSelected}
                      onChange={() => {
                        if (allSelected) setSelectedIds([]);
                        else setSelectedIds(filteredSubjects.map((s: any) => s.id));
                      }}
                      style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                    />
                  </th>
                  <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Code</th>
                  <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Name</th>
                  <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Credits</th>
                  <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Branch</th>
                  {isSuperAdmin && <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>College</th>}
                  <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Status</th>
                  <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} style={{ padding: '20px', textAlign: 'center' }}>Loading...</td></tr>
                ) : filteredSubjects.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '20px', textAlign: 'center' }}>
                      {searchTerm.trim()
                        ? `No subjects match "${searchTerm}".`
                        : showArchived ? 'No archived subjects.' : 'No subjects yet. Add the subjects your college teaches.'}
                    </td>
                  </tr>
                ) : (
                  filteredSubjects.map((s) => (
                    <tr key={s.id} className="table-row" style={{ transition: 'background 0.2s ease', background: selectedIds.includes(s.id) ? 'rgba(56, 189, 248, 0.05)' : undefined }}>
                      <td style={{ width: '40px', padding: '15px 12px 15px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                        <input
                          type="checkbox"
                          aria-label={`Select subject ${s.code}`}
                          checked={selectedIds.includes(s.id)}
                          onChange={() => {
                            setSelectedIds(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id]);
                          }}
                          style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                      </td>
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', fontFamily: 'monospace', fontSize: '0.9em' }}>{s.code}</td>
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', fontWeight: 500 }}>{s.name}</td>
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>{s.credits}</td>
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)' }}>{branchName(s.branch_id) || '—'}</td>
                      {isSuperAdmin && (
                        <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>{collegeNameByTenant(s.tenant_id) || '—'}</td>
                      )}
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px',
                          background: s.status === 'ARCHIVED' ? 'rgba(239,68,68,0.15)' : s.status === 'PUBLISHED' ? 'var(--success-color)' : 'rgba(255,255,255,0.1)',
                          color: s.status === 'ARCHIVED' ? '#f87171' : undefined }}>{s.status}</span>
                      </td>
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', textAlign: 'right' }}>
                        {s.deleted_at ? (
                          <>
                            <button className="btn-primary" style={{ padding: '4px 10px', fontSize: '12px', marginRight: '6px' }} onClick={() => restoreSubject(s.id)}>↩ Restore</button>
                            <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px', marginRight: '6px' }} onClick={() => openEdit(s)}>Edit</button>
                            <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }} onClick={() => deleteSubjectForever(s)}>Delete Forever</button>
                          </>
                        ) : (
                          <>
                            <button className="btn-primary" style={{ padding: '4px 10px', fontSize: '12px', marginRight: '6px' }} onClick={() => openSyllabus(s)}>Syllabus</button>
                            <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px', marginRight: '6px' }} onClick={() => openEdit(s)}>Edit</button>
                            <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px', marginRight: '6px' }} onClick={() => deleteSubject(s.id)}>Archive</button>
                            <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }} onClick={() => deleteWithCascade(s)}>Delete</button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* Syllabus editor modal — subject-owned, shared by all offerings */}
      {syllabusSubject && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '720px', maxWidth: '94vw', maxHeight: '88vh', overflowY: 'auto', padding: '26px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>Syllabus — {syllabusSubject.code} · {syllabusSubject.name}</h2>
              <button className="btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }} onClick={() => setSyllabusSubject(null)}> Close</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '14px' }}>
              This syllabus is owned by the <strong>subject</strong> — every section/batch that offers {syllabusSubject.name} shares it. Build it once here.
            </p>

            <div style={{ marginBottom: '14px' }}>
              <button className="btn-primary" style={{ fontSize: '13px', padding: '6px 14px' }} onClick={addSyllabusModule}>+ Add Module</button>
            </div>

            {syllabusLoading ? <p style={{ fontSize: '13px' }}>Loading syllabus...</p>
              : syllabus.length === 0 ? (
                <div className="panel" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  No modules yet. Add the first module of this subject&apos;s syllabus.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {syllabus.map((mod: any, modIdx: number) => (
                    <div key={mod.id} className="panel" style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '12px', background: 'var(--primary-color)', color: 'white', padding: '2px 8px', borderRadius: '4px' }}>Module {mod.sequence_no}</span>
                          <strong style={{ fontSize: '14px' }}>{mod.title}</strong>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button className="btn-secondary" style={{ padding: '3px 10px', fontSize: '11px' }} onClick={() => addSyllabusLesson(mod.id, modIdx)}>+ Lesson</button>
                          <button className="btn-secondary" style={{ padding: '3px 10px', fontSize: '11px', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }} onClick={() => deleteSyllabusModule(mod.id)}></button>
                        </div>
                      </div>
                      {(mod.lessons || []).map((lesson: any) => (
                        <div key={lesson.id} style={{ marginLeft: '16px', marginBottom: '6px', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '13px', fontWeight: '500' }}>└ Lesson {lesson.sequence_no} — {lesson.title}</span>
                            <button className="btn-secondary" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={() => addSyllabusTopic(lesson.id)}>+ Topic</button>
                          </div>
                          {(lesson.topics || []).map((topic: any) => (
                            <div key={topic.id} style={{ marginLeft: '20px', fontSize: '12px', color: 'var(--text-secondary)', padding: '3px 0' }}>
                              #{topic.sequence_no} {topic.title}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
          </div>
        </div>
      )}

      {(modalOpen || editingSubject) && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={editingSubject ? updateSubject : createSubject} className="glass-panel animate-fade-in" style={{ width: '460px', padding: '30px', maxHeight: '92vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '20px' }}>{editingSubject ? `Edit Subject — ${editingSubject.code || editingSubject.name}` : 'Add Subject'}</h2>
            {formError && (
              <div style={{ padding: '10px', background: 'rgba(239,68,68,0.2)', color: 'var(--danger-color)', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>{formError}</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {isSuperAdmin && !editingSubject && (
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>College *</label>
                  <select required className="input-field" value={createCollegeId} onChange={e => { setCreateCollegeId(e.target.value); setDepartmentId(''); setBranchId(''); }}>
                    <option value="">Select college…</option>
                    {activeColleges.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Subject Name *</label>
                <input required className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Data Structures" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Subject Code</label>
                  <input className="input-field" value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. CS201 (auto if blank)" />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Credits</label>
                  <input type="number" min={1} max={12} className="input-field" value={credits} onChange={e => setCredits(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Department</label>
                  <select className="input-field" value={departmentId} onChange={e => { setDepartmentId(e.target.value); setBranchId(''); }}>
                    <option value="">Select…</option>
                    {visibleDepartments.length === 0 ? <option value="" disabled>No departments for this college</option>
                      : visibleDepartments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Branch / Program</label>
                  <select className="input-field" value={branchId} onChange={e => setBranchId(e.target.value)}>
                    <option value="">Select…</option>
                    {visibleBranches.length === 0 ? <option value="" disabled>No branches yet</option>
                      : visibleBranches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>L-T-P</label>
                <input className="input-field" value={ltp} onChange={e => setLtp(e.target.value)} placeholder="e.g. 3-1-0 (optional)" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => { setModalOpen(false); setEditingSubject(null); }}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={creating}>{creating ? 'Saving...' : (editingSubject ? 'Save Changes' : 'Add Subject')}</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
