'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
import { useUserDirectory } from '@/hooks/useUserDirectory';
import CollegeCoursePicker from '@/components/CollegeCoursePicker';
import { useColleges } from '@/hooks/useColleges';
import Link from 'next/link';
import {
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  Award,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  Check,
  Eye
} from 'lucide-react';

export default function AssignmentsPage() {
  const { isAdmin, isTrainer, role } = useRole();
  const { colleges, isSuperAdmin } = useColleges();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [courseId, setCourseId] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const selectedCollege = colleges.find((c: any) => c.id === collegeId);
  const [showForm, setShowForm] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', due_date: '', max_marks: 100 });
  
  // Assign-to targeting
  const [assignType, setAssignType] = useState<'ALL' | 'INDIVIDUALS'>('ALL');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  
  // Hierarchy & Batch filtering
  const [departments, setDepartments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [filterDept, setFilterDept] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterSem, setFilterSem] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  
  // Submissions review + grading
  const [submissionsAssignmentId, setSubmissionsAssignmentId] = useState<string | null>(null);
  const [submissionsData, setSubmissionsData] = useState<any[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({});
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [submitForm, setSubmitForm] = useState<{ id: string; text_content: string; file_url: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const { users, nameOf, emailOf } = useUserDirectory();

  useEffect(() => {
    (async () => {
      try {
        const [cData, dData, bData, semData, secData] = await Promise.all([
          fetchApi('/api/v1/courses').catch(() => []),
          fetchApi('/api/v1/departments').catch(() => []),
          fetchApi('/api/v1/branches').catch(() => []),
          fetchApi('/api/v1/semesters').catch(() => []),
          fetchApi('/api/v1/sections').catch(() => [])
        ]);
        if (Array.isArray(cData)) setCourses(cData);
        if (Array.isArray(dData)) setDepartments(dData);
        if (Array.isArray(bData)) setBranches(bData);
        if (Array.isArray(semData)) setSemesters(semData);
        if (Array.isArray(secData)) setSections(secData);
      } catch { }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (courseId || isSuperAdmin) loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, collegeId, isSuperAdmin]);

  const loadAssignments = async () => {
    try {
      const tenantQ = isSuperAdmin && selectedCollege?.tenant_id ? `&tenant_id=${selectedCollege.tenant_id}` : '';
      const d = await fetchApi(`/api/v1/assignments?course_id=${courseId}${tenantQ}`);
      setAssignments(d || []);
    } catch { } finally { setLoading(false); }
  };

  const loadEnrolledStudents = async () => {
    try {
      const r = await fetchApi(`/api/v1/enrollments/course/${courseId}`);
      setEnrolledStudents(Array.isArray(r) ? r : []);
    } catch { setEnrolledStudents([]); }
  };

  const toggleStudent = (uid: string) => {
    setSelectedStudents(prev => prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]);
  };

  const openCreateForm = async () => {
    setEditingAssignmentId(null);
    setForm({ title: '', description: '', due_date: '', max_marks: 100 });
    setAssignType('ALL');
    setSelectedStudents([]);
    setShowForm(true);
    loadEnrolledStudents();
  };

  const openEditModal = (a: any) => {
    setEditingAssignmentId(a.id);
    if (a.course_id) setCourseId(a.course_id);

    const toLocalDatetime = (dStr?: string) => {
      if (!dStr) return '';
      try {
        const d = new Date(dStr);
        if (isNaN(d.getTime())) return '';
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      } catch { return ''; }
    };

    setForm({
      title: a.title || '',
      description: a.description || '',
      due_date: toLocalDatetime(a.due_date),
      max_marks: a.max_marks || 100,
    });
    if (a.assigned_to) {
      let parsed = a.assigned_to;
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch { parsed = { type: 'ALL' }; }
      }
      if (parsed.type === 'INDIVIDUALS' && Array.isArray(parsed.user_ids)) {
        setAssignType('INDIVIDUALS');
        setSelectedStudents(parsed.user_ids);
      } else {
        setAssignType('ALL');
        setSelectedStudents([]);
      }
    } else {
      setAssignType('ALL');
      setSelectedStudents([]);
    }
    setShowForm(true);
    loadEnrolledStudents();
  };

  const saveAssignment = async (e: any) => {
    e.preventDefault();
    try {
      const due_date = form.due_date ? new Date(form.due_date).toISOString() : null;
      const assigned_to = assignType === 'ALL'
        ? { type: 'ALL' }
        : { type: 'INDIVIDUALS', user_ids: selectedStudents };
      const body: any = { ...form, due_date, course_id: courseId, assigned_to };
      const selectedCollege = colleges.find((c: any) => c.id === collegeId);
      if (isSuperAdmin && selectedCollege?.tenant_id) body.tenant_id = selectedCollege.tenant_id;

      if (editingAssignmentId) {
        await fetchApi(`/api/v1/assignments/${editingAssignmentId}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await fetchApi('/api/v1/assignments', { method: 'POST', body: JSON.stringify(body) });
      }

      setShowForm(false);
      setEditingAssignmentId(null);
      setForm({ title: '', description: '', due_date: '', max_marks: 100 });
      setAssignType('ALL'); setSelectedStudents([]);
      loadAssignments();
    } catch (err: any) {
      alert(err.message || (editingAssignmentId ? 'Failed to update assignment' : 'Failed to create assignment'));
    }
  };

  const loadSubmissions = async (assignmentId: string) => {
    if (submissionsAssignmentId === assignmentId) { setSubmissionsAssignmentId(null); return; }
    setSubmissionsAssignmentId(assignmentId);
    setSubmissionsLoading(true);
    try {
      const d = await fetchApi(`/api/v1/assignments/${assignmentId}/submissions`);
      setSubmissionsData(Array.isArray(d) ? d : []);
    } catch { setSubmissionsData([]); } finally { setSubmissionsLoading(false); }
  };

  const gradeSubmission = async (submissionId: string, maxMarks: number) => {
    const score = parseFloat(gradeInputs[submissionId]);
    if (isNaN(score) || score < 0) { alert('Enter a valid score'); return; }
    if (score > maxMarks) { alert(`Score cannot exceed ${maxMarks}`); return; }
    setGradingId(submissionId);
    try {
      await fetchApi(`/api/v1/assignments/submissions/${submissionId}/grade`, {
        method: 'PUT',
        body: JSON.stringify({ score, feedback: feedbackInputs[submissionId] || '' })
      });
      alert('Grade saved successfully');
      loadSubmissions(submissionsAssignmentId || '');
    } catch (err: any) { alert(err.message || 'Failed to grade'); } finally { setGradingId(null); }
  };

  const deleteAssignment = async (assignmentId: string) => {
    if (!confirm('Delete this assignment? Its submissions will be removed too.')) return;
    try {
      await fetchApi(`/api/v1/assignments/${assignmentId}`, { method: 'DELETE' });
      loadAssignments();
    } catch { alert('Failed to delete assignment'); }
  };

  const submitAssignment = async (e: any) => {
    e.preventDefault();
    if (!submitForm) return;
    try {
      await fetchApi(`/api/v1/assignments/${submitForm.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ text_content: submitForm.text_content, file_url: submitForm.file_url })
      });
      setSubmitForm(null); setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch { alert('Failed to submit assignment'); }
  };

  if (loading) return <div className="animate-fade-in" style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <Link href="/assessments" style={{ color: 'var(--accent-color)', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
            ← Back to Assessments Overview
          </Link>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Course Assignments & Submissions</h1>
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <CollegeCoursePicker courses={courses} courseId={courseId} onCourseChange={setCourseId} collegeId={collegeId} onCollegeChange={setCollegeId} />
          </div>
        </div>
        {(isAdmin || isTrainer) && (
          <button className="btn-primary" onClick={openCreateForm} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={15} /> Create Assignment
          </button>
        )}
      </div>

      {submitted && (
        <div className="panel" style={{ marginBottom: '20px', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#10b981', padding: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CheckCircle2 size={16} /> Assignment submitted successfully!
        </div>
      )}

      {showForm && (
        <form onSubmit={saveAssignment} className="panel" style={{ marginBottom: '30px', background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(99,102,241,0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {editingAssignmentId ? <Pencil size={18} color="var(--accent-color)" /> : <Plus size={18} color="var(--accent-color)" />}
              {editingAssignmentId ? 'Edit Assignment Schedule & Max Marks' : 'Create New Assignment'}
            </h3>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Assignment Title *</label>
            <input required className="input-field" placeholder="e.g. Binary Search Tree Implementation Project" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Description & Problem Statement *</label>
            <textarea required className="input-field" rows={4} placeholder="Describe the assignment objectives, deliverables, instructions, and rubrics..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          {/* Schedule & Marks */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Due Date & Deadline *</label>
              <input type="datetime-local" className="input-field" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>Submissions are accepted until this date and time</span>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Maximum Marks *</label>
              <input type="number" className="input-field" value={form.max_marks} onChange={e => setForm({ ...form, max_marks: parseInt(e.target.value) || 100 })} />
            </div>
          </div>

          {/* Cohort Targeting */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 700 }}>Assign Assignment To</label>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
                <input type="radio" name="assign-to" checked={assignType === 'ALL'} onChange={() => setAssignType('ALL')} />
                All Enrolled Students in Course
              </label>
              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
                <input type="radio" name="assign-to" checked={assignType === 'INDIVIDUALS'} onChange={() => setAssignType('INDIVIDUALS')} />
                Specific Batch / Semester / Students ({selectedStudents.length} selected)
              </label>
            </div>
            {assignType === 'INDIVIDUALS' && (() => {
              const currentTenant = isSuperAdmin && selectedCollege?.tenant_id ? selectedCollege.tenant_id : undefined;
              const allStudents = users.filter((u: any) => {
                const isStud = String(u.role || '').toUpperCase() === 'STUDENT';
                if (!isStud) return false;
                if (currentTenant && u.tenant_id && u.tenant_id !== currentTenant) return false;
                return true;
              });
              const pool = allStudents.length > 0 ? allStudents : enrolledStudents.map((e: any) => ({ id: e.user_id, ...e }));

              const filtered = pool.filter((st: any) => {
                const uid = st.id || st.user_id;
                const userObj = users.find((u: any) => u.id === uid) || st;
                if (filterDept && userObj.department_id && userObj.department_id !== filterDept) return false;
                if (filterBranch && userObj.branch_id && userObj.branch_id !== filterBranch) return false;
                if (filterSem && String(userObj.semester_number || userObj.semester_id) !== String(filterSem)) return false;
                if (filterSection && userObj.section_id && userObj.section_id !== filterSection) return false;
                if (studentSearch) {
                  const q = studentSearch.toLowerCase();
                  const name = `${userObj.first_name || ''} ${userObj.last_name || ''}`.toLowerCase();
                  const email = (userObj.email || '').toLowerCase();
                  if (!name.includes(q) && !email.includes(q)) return false;
                }
                return true;
              });

              const selectAllFiltered = () => {
                const idsToAdd = filtered.map((s: any) => s.id || s.user_id).filter(Boolean);
                setSelectedStudents(prev => Array.from(new Set([...prev, ...idsToAdd])));
              };

              const clearFiltered = () => {
                const idsToRemove = new Set(filtered.map((s: any) => s.id || s.user_id));
                setSelectedStudents(prev => prev.filter(id => !idsToRemove.has(id)));
              };

              return (
                <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '14px', marginBottom: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Department</label>
                      <select className="input-field" style={{ padding: '6px 8px', fontSize: '12px' }} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                        <option value="">All Departments</option>
                        {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Branch</label>
                      <select className="input-field" style={{ padding: '6px 8px', fontSize: '12px' }} value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
                        <option value="">All Branches</option>
                        {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Semester / Batch</label>
                      <select className="input-field" style={{ padding: '6px 8px', fontSize: '12px' }} value={filterSem} onChange={e => setFilterSem(e.target.value)}>
                        <option value="">All Semesters</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={String(n)}>Semester {n}</option>)}
                        {semesters.map((s: any) => <option key={s.id} value={s.id}>{s.name || `Semester ${s.number}`}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Section</label>
                      <select className="input-field" style={{ padding: '6px 8px', fontSize: '12px' }} value={filterSection} onChange={e => setFilterSection(e.target.value)}>
                        <option value="">All Sections</option>
                        {sections.map((sec: any) => <option key={sec.id} value={sec.id}>{sec.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Search Student</label>
                      <input className="input-field" style={{ padding: '6px 8px', fontSize: '12px' }} placeholder="Name or email..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '12px' }}>
                      Matching Students: <strong>{filtered.length}</strong> · <span style={{ color: 'var(--accent-color)' }}><strong>{selectedStudents.length}</strong> assigned</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" className="btn-secondary" style={{ padding: '3px 10px', fontSize: '11px' }} onClick={selectAllFiltered}>
                        Select All Filtered ({filtered.length})
                      </button>
                      <button type="button" className="btn-secondary" style={{ padding: '3px 10px', fontSize: '11px', color: 'var(--danger-color)' }} onClick={clearFiltered}>
                        Deselect Filtered
                      </button>
                    </div>
                  </div>

                  <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '6px' }}>
                    {filtered.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'center', padding: '12px' }}>No students match the selected batch filters.</p>
                    ) : filtered.map((st: any) => {
                      const uid = st.id || st.user_id;
                      const userObj = users.find((u: any) => u.id === uid) || st;
                      const deptName = departments.find((d: any) => d.id === userObj.department_id)?.name;
                      const semNumber = userObj.semester_number || semesters.find((s: any) => s.id === userObj.semester_id)?.number;
                      return (
                        <label key={uid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', background: selectedStudents.includes(uid) ? 'rgba(99,102,241,0.12)' : 'transparent', marginBottom: '2px' }}>
                          <span style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px' }}>
                            <input type="checkbox" checked={selectedStudents.includes(uid)} onChange={() => toggleStudent(uid)} />
                            <strong>{nameOf(uid)}</strong>
                            {emailOf(uid) && <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>({emailOf(uid)})</span>}
                          </span>
                          <span style={{ display: 'flex', gap: '6px', fontSize: '10px' }}>
                            {deptName && <span className="badge badge-secondary">{deptName}</span>}
                            {semNumber && <span className="badge badge-info">Sem {semNumber}</span>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
            <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={14} /> {editingAssignmentId ? 'Save & Update Assignment' : 'Publish Assignment'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setEditingAssignmentId(null); }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Student Submit Modal */}
      {submitForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', overflowY: 'auto', padding: '20px', zIndex: 100 }}>
          <form onSubmit={submitAssignment} className="panel" style={{ width: '500px', maxWidth: '90vw', margin: 'auto', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '20px', fontSize: '18px', fontWeight: 700 }}>Submit Assignment Work</h3>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>File URL (Google Drive link, GitHub repository, Cloud link)</label>
              <input className="input-field" placeholder="https://drive.google.com/..." value={submitForm.file_url} onChange={e => setSubmitForm({ ...submitForm, file_url: e.target.value })} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Or type / paste your written solution</label>
              <textarea className="input-field" rows={6} placeholder="Write your solution, code, or essay..." value={submitForm.text_content} onChange={e => setSubmitForm({ ...submitForm, text_content: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn-primary">Submit Assignment</button>
              <button type="button" className="btn-secondary" onClick={() => setSubmitForm(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Assignment List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {assignments.length === 0 ? (
          <div className="panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            No assignments created for this course yet. Click "+ Create Assignment" above to add one.
          </div>
        ) : assignments.map(a => (
          <div className="panel" key={a.id} style={{ background: 'rgba(15,23,42,0.75)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ flex: 1, minWidth: '280px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 6px 0', color: '#ffffff' }}>{a.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 10px 0' }}>{a.description}</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Award size={11} /> Max Marks: {a.max_marks}
                  </span>
                  {a.due_date && (
                    <span className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={11} /> Deadline: {new Date(a.due_date).toLocaleString()}
                    </span>
                  )}
                  {a.assigned_to && <span className="badge badge-secondary">Targeted Cohort</span>}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {(isAdmin || isTrainer) && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', borderColor: 'var(--accent-color)', color: 'var(--accent-color)' }}
                    onClick={() => openEditModal(a)}
                    title="Edit assignment deadline, max marks, and details"
                  >
                    <Pencil size={13} /> Edit Details
                  </button>
                )}
                {(isAdmin || isTrainer) && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                    onClick={() => loadSubmissions(a.id)}
                  >
                    <Eye size={13} /> {submissionsAssignmentId === a.id ? 'Hide Submissions' : 'Submissions'}
                  </button>
                )}
                {(isAdmin || isTrainer) && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '12px', color: 'var(--danger-color)', borderColor: 'rgba(244,63,94,0.3)', display: 'flex', alignItems: 'center', gap: '5px' }}
                    onClick={() => deleteAssignment(a.id)}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                )}
                {role === 'STUDENT' && (
                  <button className="btn-primary" onClick={() => setSubmitForm({ id: a.id, text_content: '', file_url: '' })}>
                    Submit Work
                  </button>
                )}
              </div>
            </div>

            {/* Submissions Review and Grading Drawer */}
            {submissionsAssignmentId === a.id && (
              <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Student Submissions & Evaluation</h4>
                {submissionsLoading ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Loading submissions...</p>
                ) : submissionsData.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No student submissions received yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {submissionsData.map((sub: any) => (
                      <div key={sub.id} style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.25)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
                          <div>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>{nameOf(sub.user_id)}</span>
                            {emailOf(sub.user_id) && <span style={{ color: 'var(--text-secondary)', marginLeft: '8px', fontSize: '12px' }}>({emailOf(sub.user_id)})</span>}
                            <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              Submitted: {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : 'N/A'}
                            </span>
                          </div>
                          <div>
                            {sub.score !== null && sub.score !== undefined ? (
                              <span className="badge badge-success">Graded: {sub.score} / {a.max_marks}</span>
                            ) : (
                              <span className="badge badge-warning">Needs Review</span>
                            )}
                          </div>
                        </div>

                        {sub.file_url && (
                          <div style={{ marginBottom: '8px' }}>
                            <a href={sub.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--accent-color)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <FileText size={13} /> View Attached Solution File
                            </a>
                          </div>
                        )}

                        {sub.text_content && (
                          <div style={{ fontSize: '12px', color: '#e2e8f0', background: 'rgba(0,0,0,0.3)', padding: '8px 10px', borderRadius: '6px', marginBottom: '10px', whiteSpace: 'pre-wrap' }}>
                            {sub.text_content}
                          </div>
                        )}

                        {/* Grading Inputs for Instructor */}
                        {(isAdmin || isTrainer) && (
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px' }}>
                            <input
                              type="number"
                              className="input-field"
                              style={{ width: '90px', padding: '5px 8px', fontSize: '12px' }}
                              placeholder={`/ ${a.max_marks}`}
                              value={gradeInputs[sub.id] ?? (sub.score !== null ? String(sub.score) : '')}
                              onChange={e => setGradeInputs({ ...gradeInputs, [sub.id]: e.target.value })}
                            />
                            <input
                              type="text"
                              className="input-field"
                              style={{ flex: 1, minWidth: '160px', padding: '5px 8px', fontSize: '12px' }}
                              placeholder="Feedback notes..."
                              value={feedbackInputs[sub.id] ?? (sub.feedback || '')}
                              onChange={e => setFeedbackInputs({ ...feedbackInputs, [sub.id]: e.target.value })}
                            />
                            <button
                              type="button"
                              className="btn-primary"
                              style={{ fontSize: '11px', padding: '5px 12px' }}
                              disabled={gradingId === sub.id}
                              onClick={() => gradeSubmission(sub.id, a.max_marks)}
                            >
                              {gradingId === sub.id ? 'Saving...' : 'Save Grade'}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
