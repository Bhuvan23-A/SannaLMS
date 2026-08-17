'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
import { useUserDirectory } from '@/hooks/useUserDirectory';
import CollegeCoursePicker from '@/components/CollegeCoursePicker';
import { useColleges } from '@/hooks/useColleges';
import Link from 'next/link';

export default function AssignmentsPage() {
  const { isAdmin, isTrainer, role } = useRole();
  const { colleges, isSuperAdmin } = useColleges();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Course-aware assignments (#fix): the course is chosen from the real course
  // list instead of a hardcoded 'c-1', so trainers/admin pick the right course.
  const [courses, setCourses] = useState<any[]>([]);
  const [courseId, setCourseId] = useState('');
  const [collegeId, setCollegeId] = useState('');
  // Super admins browse per college — pass the selected college's tenant_id
  // so the API returns that college's assignments (not the empty master).
  const selectedCollege = colleges.find((c: any) => c.id === collegeId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', due_date: '', max_marks: 100 });
  // Assign-to targeting (#12): whole course or specific enrolled students
  const [assignType, setAssignType] = useState<'ALL' | 'INDIVIDUALS'>('ALL');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  // Submissions review + grading (#13)
  const [submissionsAssignmentId, setSubmissionsAssignmentId] = useState<string | null>(null);
  const [submissionsData, setSubmissionsData] = useState<any[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({});
  const [submitForm, setSubmitForm] = useState<{ id: string; text_content: string; file_url: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // People resolver (#fix): show student names instead of raw Keycloak UUIDs
  const { nameOf, emailOf } = useUserDirectory();

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

  useEffect(() => {
    // Reload when the course changes (and for super admins, when the selected
    // college changes — different college = different tenant = different list).
    if (courseId || isSuperAdmin) loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, collegeId, isSuperAdmin]);

  const loadAssignments = async () => {
    try {
      // No setLoading(true) here: flashing the full-page "Loading..." screen
      // unmounts the CollegeCoursePicker, which restarts its auto-select and
      // caused the endless reload blink on this page (#fix). The initial
      // useState(true) already shows the loader on first mount.
      const tenantQ = isSuperAdmin && selectedCollege?.tenant_id ? `&tenant_id=${selectedCollege.tenant_id}` : '';
      const d = await fetchApi(`/api/v1/assignments?course_id=${courseId}${tenantQ}`);
      setAssignments(d || []);
    }
    catch { } finally { setLoading(false); }
  };

  const loadEnrolledStudents = async () => {
    try {
      const r = await fetchApi(`/api/v1/enrollments/course/${courseId}`);
      setEnrolledStudents(Array.isArray(r) ? r : []);
    } catch { setEnrolledStudents([]); }
  };

  const openCreateForm = async () => {
    setShowForm(!showForm);
    if (!showForm) {
      setAssignType('ALL');
      setSelectedStudents([]);
      loadEnrolledStudents();
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

  const toggleStudent = (uid: string) => {
    setSelectedStudents(prev => prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]);
  };

  // Feedback per submission (#grading) — the trainer's written remarks are
  // stored on the submission and shown back to the student with their score.
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({});

  const gradeSubmission = async (submissionId: string, maxMarks: number) => {
    const score = parseFloat(gradeInputs[submissionId]);
    if (isNaN(score) || score < 0) { alert('Enter a valid score'); return; }
    if (score > maxMarks) { alert(`Score cannot exceed ${maxMarks}`); return; }
    try {
      await fetchApi(`/api/v1/assignments/submissions/${submissionId}/grade`, {
        method: 'PUT',
        body: JSON.stringify({ score, feedback: feedbackInputs[submissionId] || '' })
      });
      alert('✅ Grade saved');
      loadSubmissions(submissionsAssignmentId || submissionId);
    } catch (err: any) { alert(err.message || 'Failed to grade'); }
  };

  const createAssignment = async (e: any) => {
    e.preventDefault();
    try {
      // datetime-local gives "2026-08-10T12:00" (no timezone) — convert to ISO
      // with timezone so the backend's new Date() parses it correctly.
      const due_date = form.due_date ? new Date(form.due_date).toISOString() : null;
      const assigned_to = assignType === 'ALL'
        ? { type: 'ALL' }
        : { type: 'INDIVIDUALS', user_ids: selectedStudents };
      // Super admin: scope the assignment to the selected college's tenant so
      // the college's students actually see it (otherwise it lands in 'master').
      const body: any = { ...form, due_date, course_id: courseId, assigned_to };
      const selectedCollege = colleges.find((c: any) => c.id === collegeId);
      if (isSuperAdmin && selectedCollege?.tenant_id) body.tenant_id = selectedCollege.tenant_id;
      await fetchApi('/api/v1/assignments', { method: 'POST', body: JSON.stringify(body) });
      setShowForm(false); setForm({ title: '', description: '', due_date: '', max_marks: 100 });
      setAssignType('ALL'); setSelectedStudents([]);
      loadAssignments();
    } catch { alert('Failed to create assignment'); }
  };

  // Delete an assignment (#fix): a wrongly-created assignment can be removed;
  // its submissions cascade with it.
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

  if (loading) return <div className="fade-in" style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <Link href="/assessments" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>← Assessments</Link>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>Assignments</h1>
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <CollegeCoursePicker courses={courses} courseId={courseId} onCourseChange={setCourseId} collegeId={collegeId} onCollegeChange={setCollegeId} />
          </div>
        </div>
        {(isAdmin || isTrainer) && <button className="btn-primary" onClick={openCreateForm}>+ Create Assignment</button>}
      </div>

      {submitted && <div className="panel" style={{ marginBottom: '20px', background: 'rgba(0,200,100,0.1)', borderLeft: '4px solid #00c864', padding: '15px' }}>✅ Assignment submitted successfully!</div>}

      {showForm && (
        <form onSubmit={createAssignment} className="panel" style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>New Assignment</h3>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Title</label>
            <input required className="input-field" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Description</label>
            <textarea required className="input-field" rows={4} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Assign To</label>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
                <input type="radio" name="assign-to" checked={assignType === 'ALL'} onChange={() => setAssignType('ALL')} />
                Whole course (all enrolled students)
              </label>
              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
                <input type="radio" name="assign-to" checked={assignType === 'INDIVIDUALS'} onChange={() => setAssignType('INDIVIDUALS')} />
                Specific students
              </label>
            </div>
            {assignType === 'INDIVIDUALS' && (
              <div style={{ maxHeight: '160px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', marginBottom: '10px' }}>
                {enrolledStudents.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No enrolled students found for this course yet.</p>
                ) : enrolledStudents.map((en: any) => (
                  <label key={en.user_id} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '6px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={selectedStudents.includes(en.user_id)} onChange={() => toggleStudent(en.user_id)} />
                    <span style={{ fontSize: '13px' }}>
                      {nameOf(en.user_id)}
                      {emailOf(en.user_id) && <span style={{ color: 'var(--text-secondary)', marginLeft: '6px', fontSize: '12px' }}>{emailOf(en.user_id)}</span>}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Due Date</label>
              <input type="datetime-local" className="input-field" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Max Marks</label>
              <input type="number" className="input-field" value={form.max_marks} onChange={e => setForm({ ...form, max_marks: parseInt(e.target.value) })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn-primary">Create Assignment</button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {submitForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', overflowY: 'auto', padding: '20px', zIndex: 100 }}>
          <form onSubmit={submitAssignment} className="panel" style={{ width: '500px', maxWidth: '90vw', margin: 'auto', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}>
            <h3 style={{ marginBottom: '20px' }}>Submit Assignment</h3>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>File URL (Google Drive, GitHub, etc.)</label>
              <input className="input-field" placeholder="https://drive.google.com/..." value={submitForm.file_url} onChange={e => setSubmitForm({ ...submitForm, file_url: e.target.value })} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Or type your answer here</label>
              <textarea className="input-field" rows={6} placeholder="Write your answer..." value={submitForm.text_content} onChange={e => setSubmitForm({ ...submitForm, text_content: e.target.value })} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn-primary">Submit</button>
              <button type="button" className="btn-secondary" onClick={() => setSubmitForm(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {assignments.length === 0 ? <div className="panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No assignments yet.</div>
          : assignments.map(a => (
            <div className="panel" key={a.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>{a.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '10px' }}>{a.description}</p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <span className="badge badge-warning">Max: {a.max_marks} marks</span>
                    {a.due_date && <span className="badge badge-info">Due: {new Date(a.due_date).toLocaleDateString()}</span>}
                    {a.assigned_to && <span className="badge badge-warning">Assigned to specific students</span>}
                    {courses.find((c: any) => c.id === a.course_id) && (
                      <span className="badge badge-info">📚 {courses.find((c: any) => c.id === a.course_id)?.title}</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  {(isAdmin || isTrainer) && (
                    <button className="btn-secondary" style={{ fontSize: '13px' }} onClick={() => loadSubmissions(a.id)}>
                      {submissionsAssignmentId === a.id ? 'Hide Submissions' : '📊 View Submissions'}
                    </button>
                  )}
                  {(isAdmin || isTrainer) && (
                    <button className="btn-secondary" style={{ fontSize: '13px', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }} onClick={() => deleteAssignment(a.id)}>Delete</button>
                  )}
                  {role === 'STUDENT' && (
                    <button className="btn-primary" onClick={() => setSubmitForm({ id: a.id, text_content: '', file_url: '' })}>Submit Work</button>
                  )}
                </div>
              </div>
              {submissionsAssignmentId === a.id && (
                <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '14px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>Student Submissions & Marks</h4>
                  {submissionsLoading ? <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
                    : submissionsData.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No submissions yet.</p>
                    : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {submissionsData.map((sub: any) => (
                          <div key={sub.id} style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                              <span style={{ fontSize: '13px' }}>
                                <strong>{nameOf(sub.user_id)}</strong>
                                {emailOf(sub.user_id) && <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>{emailOf(sub.user_id)}</span>}
                              </span>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : ''}
                              </span>
                              {sub.score !== null && sub.score !== undefined ? (
                                <span className="badge badge-success">Score: {sub.score} / {a.max_marks}</span>
                              ) : null}
                            </div>
                            {/* The submitted work — trainers grade with full context (#grading) */}
                            {sub.text_content && (
                              <div style={{ marginBottom: '8px' }}>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Submitted answer</div>
                                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, fontSize: '13px', background: 'rgba(0,0,0,0.25)', padding: '8px 10px', borderRadius: '6px', maxHeight: '220px', overflowY: 'auto' }}>{sub.text_content}</pre>
                              </div>
                            )}
                            {sub.file_url && (
                              <div style={{ marginBottom: '8px' }}>
                                {sub.file_url.startsWith('http') || sub.file_url.startsWith('/') ? (
                                  <a href={sub.file_url.startsWith('http') ? sub.file_url : `https://admin.sannalms.sannainnovations.com${sub.file_url}`}
                                     target="_blank" rel="noopener noreferrer"
                                     style={{ fontSize: '12px', color: 'var(--primary-color)' }}>📎 Submitted file: {sub.file_url.split('/').pop()}</a>
                                ) : (
                                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>📎 Submitted file: {sub.file_url} — file not attached (older submission without an uploaded file)</span>
                                )}
                              </div>
                            )}
                            {sub.score !== null && sub.score !== undefined ? (
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {sub.feedback ? `💬 Feedback: ${sub.feedback}` : 'No written feedback.'}
                              </div>
                            ) : (
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                <input
                                  type="number"
                                  className="input-field"
                                  style={{ width: '80px', padding: '4px 8px' }}
                                  placeholder={`0-${a.max_marks}`}
                                  value={gradeInputs[sub.id] || ''}
                                  onChange={e => setGradeInputs({ ...gradeInputs, [sub.id]: e.target.value })}
                                />
                                <input
                                  className="input-field"
                                  style={{ flex: 1, minWidth: '160px', padding: '4px 8px' }}
                                  placeholder="Feedback for the student (optional)"
                                  value={feedbackInputs[sub.id] || ''}
                                  onChange={e => setFeedbackInputs({ ...feedbackInputs, [sub.id]: e.target.value })}
                                />
                                <button className="btn-primary" style={{ fontSize: '12px', padding: '4px 12px' }} onClick={() => gradeSubmission(sub.id, a.max_marks)}>
                                  Grade
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
