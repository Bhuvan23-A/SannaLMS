'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
import Link from 'next/link';

export default function QuestionsPage() {
  const { isAdmin, isTrainer, role } = useRole();
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Question bank differentiation (#fix): pick course, and (for admins) the
  // college / department / branch / semester the bank belongs to.
  const [courses, setCourses] = useState<any[]>([]);
  const [courseId, setCourseId] = useState('');
  const [colleges, setColleges] = useState<any[]>([]);
  const [collegeId, setCollegeId] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [deptId, setDeptId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [semId, setSemId] = useState('');

  const [form, setForm] = useState({ type: 'MCQ', title: '', content: '', marks: 1, answer_key: '' });
  const [options, setOptions] = useState([
    { id: 1, text: '', isCorrect: false },
    { id: 2, text: '', isCorrect: false },
    { id: 3, text: '', isCorrect: false },
    { id: 4, text: '', isCorrect: false },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load reference data once
  useEffect(() => {
    if (!isAdmin && !isTrainer) { setLoading(false); return; }
    (async () => {
      try {
        const [coursesData, collegesData, depts, brs, sems] = await Promise.all([
          fetchApi('/api/v1/courses').catch(() => []),
          isSuperAdmin ? fetchApi('/api/v1/colleges').catch(() => []) : Promise.resolve([]),
          isAdmin ? fetchApi('/api/v1/departments').catch(() => []) : Promise.resolve([]),
          isAdmin ? fetchApi('/api/v1/branches').catch(() => []) : Promise.resolve([]),
          isAdmin ? fetchApi('/api/v1/semesters').catch(() => []) : Promise.resolve([]),
        ]);
        setCourses(Array.isArray(coursesData) ? coursesData : []);
        setColleges(Array.isArray(collegesData) ? collegesData : []);
        setDepartments(Array.isArray(depts) ? depts : []);
        setBranches(Array.isArray(brs) ? brs : []);
        setSemesters(Array.isArray(sems) ? sems : []);
        if (Array.isArray(coursesData) && coursesData.length > 0) setCourseId(coursesData[0].id);
        if (isSuperAdmin && Array.isArray(collegesData) && collegesData.length > 0) setCollegeId(collegesData[0].id);
      } catch { /* reference data unavailable */ }
    })();
  }, [isAdmin, isTrainer, isSuperAdmin]);

  useEffect(() => {
    if (isAdmin || isTrainer) loadQuestions(); else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isTrainer, courseId, collegeId, deptId, branchId, semId]);

  const selectedCollege = colleges.find((c: any) => c.id === collegeId);

  // Options scoped to the selected college (super admin) or the caller's tenant.
  // Branches/semesters must ALSO respect the college so a college admin never
  // sees another college's org chart in their bank (#fix).
  const inCollege = (item: any) => !isSuperAdmin || !selectedCollege || !item.tenant_id || item.tenant_id === selectedCollege.tenant_id;
  const visibleDepartments = departments.filter((d: any) => inCollege(d));
  const visibleBranches = branches.filter((b: any) => inCollege(b) && (!deptId || b.department_id === deptId));
  const visibleSemesters = semesters.filter((s: any) => inCollege(s) && (!branchId || s.branch_id === branchId));
  const orgEmpty = visibleDepartments.length === 0;

  const importFromPdf = async (e: any) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-uploading the same file
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    if (courseId) formData.append('course_id', courseId);
    if (isSuperAdmin && selectedCollege?.tenant_id) formData.append('tenant_id', selectedCollege.tenant_id);
    if (deptId) formData.append('department_id', deptId);
    if (branchId) formData.append('branch_id', branchId);
    if (semId) formData.append('semester_id', semId);
    setImporting(true);
    setImportMessage(null);
    try {
      const res = await fetchApi('/api/v1/questions/import-pdf', { method: 'POST', body: formData });
      setImportMessage({ ok: true, text: res.message || `Imported ${res.imported} question(s).` });
      loadQuestions();
    } catch (err: any) {
      setImportMessage({ ok: false, text: err.message || 'PDF import failed.' });
    } finally {
      setImporting(false);
    }
  };

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (courseId) params.set('course_id', courseId);
      if (isSuperAdmin && selectedCollege?.tenant_id) params.set('tenant_id', selectedCollege.tenant_id);
      if (deptId) params.set('department_id', deptId);
      if (branchId) params.set('branch_id', branchId);
      if (semId) params.set('semester_id', semId);
      const qs = params.toString();
      const data = await fetchApi(`/api/v1/questions${qs ? `?${qs}` : ''}`);
      setQuestions(data || []);
    } catch { } finally { setLoading(false); }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ type: 'MCQ', title: '', content: '', marks: 1, answer_key: '' });
    setOptions([
      { id: 1, text: '', isCorrect: false },
      { id: 2, text: '', isCorrect: false },
      { id: 3, text: '', isCorrect: false },
      { id: 4, text: '', isCorrect: false },
    ]);
  };

  const startEdit = (q: any) => {
    const qOptions = Array.isArray(q.options) && q.options.length > 0 ? q.options : [
      { id: 1, text: '', isCorrect: false },
      { id: 2, text: '', isCorrect: false },
      { id: 3, text: '', isCorrect: false },
      { id: 4, text: '', isCorrect: false },
    ];
    setEditingId(q.id);
    setForm({ type: q.type || 'MCQ', title: q.title || '', content: q.content || '', marks: q.marks || 1, answer_key: q.answer_key || '' });
    setOptions(qOptions.map((o: any, i: number) => ({ id: i + 1, text: o.text || '', isCorrect: !!o.isCorrect })));
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (q: any) => {
    if (!window.confirm(`Delete question "${q.title}"? This cannot be undone.`)) return;
    try {
      await fetchApi(`/api/v1/questions/${q.id}`, { method: 'DELETE' });
      loadQuestions();
    } catch { alert('Failed to delete question'); }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const url = editingId ? `/api/v1/questions/${editingId}` : '/api/v1/questions';
    try {
      const body: any = {
        ...form,
        options: form.type === 'MCQ' ? options : undefined
      };
      if (courseId) body.course_id = courseId;
      if (isSuperAdmin && selectedCollege?.tenant_id) body.tenant_id = selectedCollege.tenant_id;
      if (deptId) body.department_id = deptId;
      if (branchId) body.branch_id = branchId;
      if (semId) body.semester_id = semId;
      await fetchApi(url, {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(body)
      });
      setShowForm(false);
      resetForm();
      loadQuestions();
    } catch { alert(editingId ? 'Failed to update question' : 'Failed to create question'); }
  };

  if (!isAdmin && !isTrainer) return (
    <div className="fade-in panel" style={{ textAlign: 'center', padding: '60px' }}>
      <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</div>
      <h2>Access Restricted</h2>
      <p style={{ color: 'var(--text-secondary)' }}>Only Trainers and Admins can manage the Question Bank.</p>
    </div>
  );

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <Link href="/assessments" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>← Assessments</Link>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>Question Bank</h1>
          <div style={{ marginTop: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {courses.length > 0 && (
              <>
                <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Course:</label>
                <select className="input-field" style={{ maxWidth: '260px' }} value={courseId} onChange={e => setCourseId(e.target.value)}>
                  {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </>
            )}
            {isSuperAdmin && colleges.length > 0 && (
              <>
                <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>College:</label>
                <select className="input-field" style={{ maxWidth: '220px' }} value={collegeId} onChange={e => { setCollegeId(e.target.value); setDeptId(''); setBranchId(''); setSemId(''); }}>
                  {colleges.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </>
            )}
            {isAdmin && (
              <>
                <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Department:</label>
                <select className="input-field" style={{ maxWidth: '180px' }} value={deptId} onChange={e => { setDeptId(e.target.value); setBranchId(''); setSemId(''); }}>
                  <option value="">All</option>
                  {visibleDepartments.length === 0 ? <option value="" disabled>No departments yet</option> : visibleDepartments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Branch:</label>
                <select className="input-field" style={{ maxWidth: '180px' }} value={branchId} onChange={e => { setBranchId(e.target.value); setSemId(''); }}>
                  <option value="">All</option>
                  {visibleBranches.length === 0 ? <option value="" disabled>No branches yet</option> : visibleBranches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Semester:</label>
                <select className="input-field" style={{ maxWidth: '180px' }} value={semId} onChange={e => setSemId(e.target.value)}>
                  <option value="">All</option>
                  {visibleSemesters.length === 0 ? <option value="" disabled>No semesters yet</option> : visibleSemesters.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                {orgEmpty && isSuperAdmin && (
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    ℹ️ No departments yet for this college — add them under Management → Departments / Branches / Semesters.
                  </span>
                )}
              </>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={importFromPdf} />
          <button className="btn-secondary" disabled={importing} onClick={() => fileInputRef.current?.click()}>
            {importing ? '⏳ Importing...' : '📄 Import from PDF'}
          </button>
          <button className="btn-primary" onClick={() => setShowForm(!showForm)}>+ Add Question</button>
        </div>
      </div>

      {importMessage && (
        <div className="glass-panel" style={{
          padding: '14px 18px',
          marginBottom: '20px',
          color: importMessage.ok ? 'var(--success-color)' : 'var(--danger-color)',
          border: `1px solid ${importMessage.ok ? 'var(--success-color)' : 'var(--danger-color)'}`
        }}>
          {importMessage.text}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="panel" style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>{editingId ? 'Edit Question' : 'New Question'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Type</label>
              <select className="input-field" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="MCQ">MCQ</option>
                <option value="ESSAY">Essay</option>
                <option value="CODING">Coding</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Marks</label>
              <input type="number" className="input-field" value={form.marks} onChange={e => setForm({ ...form, marks: parseInt(e.target.value) })} />
            </div>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Question Title</label>
            <input required className="input-field" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Content / Instructions</label>
            <textarea className="input-field" rows={3} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
          </div>
          <div style={{ marginBottom: '15px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            📍 Will be saved under: <strong>{courses.find((c: any) => c.id === courseId)?.title || 'course'}</strong>
            {isSuperAdmin && selectedCollege && <> · <strong>{selectedCollege.name}</strong></>}
            {deptId && <> · Dept: <strong>{visibleDepartments.find((d: any) => d.id === deptId)?.name}</strong></>}
            {branchId && <> · Branch: <strong>{visibleBranches.find((b: any) => b.id === branchId)?.name}</strong></>}
            {semId && <> · Sem: <strong>{visibleSemesters.find((s: any) => s.id === semId)?.name}</strong></>}
          </div>
          {form.type === 'MCQ' && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '10px' }}>Options</label>
              {options.map((opt, i) => (
                <div key={opt.id} style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'center' }}>
                  <input type="radio" name="correct" checked={opt.isCorrect}
                    onChange={() => setOptions(options.map((o, j) => ({ ...o, isCorrect: j === i })))}
                    title="Mark as correct answer" />
                  <input className="input-field" style={{ flex: 1 }} placeholder={`Option ${i + 1}`}
                    value={opt.text} onChange={e => setOptions(options.map((o, j) => j === i ? { ...o, text: e.target.value } : o))} />
                </div>
              ))}
              <small style={{ color: 'var(--text-secondary)' }}>Select the radio button next to the correct answer.</small>
            </div>
          )}
          {(form.type === 'ESSAY' || form.type === 'CODING') && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Answer Key / Expected Output</label>
              <textarea className="input-field" rows={3} value={form.answer_key} onChange={e => setForm({ ...form, answer_key: e.target.value })} />
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn-primary">{editingId ? 'Update Question' : 'Save Question'}</button>
            <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? <p>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {questions.length === 0 ? <div className="panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No questions yet for this selection. Add your first question above.</div>
            : questions.map(q => (
              <div className="panel" key={q.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className={`badge ${q.type === 'MCQ' ? 'badge-info' : q.type === 'CODING' ? 'badge-warning' : 'badge-success'}`}>{q.type}</span>
                      <strong>{q.title}</strong>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>({q.marks} mark{q.marks > 1 ? 's' : ''})</span>
                      {(q.department_id || q.branch_id || q.semester_id) && (
                        <span className="badge badge-secondary" style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd' }}>📍 scoped</span>
                      )}
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{q.content}</p>
                    {q.options && (
                      <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {(q.options as any[]).map((o: any) => (
                          <span key={o.id} style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '13px', background: o.isCorrect ? 'rgba(0,200,100,0.2)' : 'rgba(255,255,255,0.05)', border: o.isCorrect ? '1px solid #00c864' : '1px solid rgba(255,255,255,0.1)', color: o.isCorrect ? '#00c864' : 'inherit' }}>
                            {o.isCorrect ? '✓ ' : ''}{o.text}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                    <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '13px' }} onClick={() => startEdit(q)}>✏️ Edit</button>
                    <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '13px', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }} onClick={() => handleDelete(q)}>🗑 Delete</button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
