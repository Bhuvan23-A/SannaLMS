'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
import { useUserDirectory } from '@/hooks/useUserDirectory';
import CollegeCoursePicker from '@/components/CollegeCoursePicker';
import { useColleges } from '@/hooks/useColleges';
import Link from 'next/link';

export default function QuizzesPage() {
  const { isAdmin, isTrainer, role } = useRole();
  const { colleges, isSuperAdmin } = useColleges();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Course-aware quizzes: choose the course from the real list, not 'c-1'.
  const [courses, setCourses] = useState<any[]>([]);
  const [courseId, setCourseId] = useState('');
  const [collegeId, setCollegeId] = useState('');
  // Super admins browse per college — pass the selected college's tenant_id
  // so the API returns that college's quizzes (not the empty master).
  const selectedCollege = colleges.find((c: any) => c.id === collegeId);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', duration_mins: 30, question_ids: [] as string[] });
  // Assign-to targeting (#11): whole course or specific enrolled students
  const [assignType, setAssignType] = useState<'ALL' | 'INDIVIDUALS'>('ALL');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  // Submissions review (#10)
  const [submissionsQuizId, setSubmissionsQuizId] = useState<string | null>(null);
  const [submissionsData, setSubmissionsData] = useState<any[]>([]);
  const [submissionsQuestions, setSubmissionsQuestions] = useState<any[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  // Manual grading of essay/coding answers (#grading): score + feedback per submission
  const [quizGradeInputs, setQuizGradeInputs] = useState<Record<string, string>>({});
  const [quizFeedbackInputs, setQuizFeedbackInputs] = useState<Record<string, string>>({});
  const [gradingId, setGradingId] = useState<string | null>(null);
  // Inline quick-add question (so questions don't have to pre-exist in the bank)
  const [quickAdd, setQuickAdd] = useState(false);
  const [newQ, setNewQ] = useState({ title: '', content: '', marks: 1, answer_key: '', image_url: '' });
  const [newQOptions, setNewQOptions] = useState(['', '', '', '']);
  const [newQCorrect, setNewQCorrect] = useState(0);
  const [addingQ, setAddingQ] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState<any>(null);

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
    if (courseId || isSuperAdmin) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, collegeId, isSuperAdmin]);

  const loadData = async () => {
    try {
      // No setLoading(true): flashing the full-page "Loading..." screen unmounts
      // the CollegeCoursePicker and caused the endless reload blink (#fix).
      const tenantQ = isSuperAdmin && selectedCollege?.tenant_id ? `&tenant_id=${selectedCollege.tenant_id}` : '';
      // Subject-first question bank (#fix): questions live under a SUBJECT, not
      // a course. Pass the selected course's subject_id too so the quiz builder
      // shows the subject bank (the API matches course_id OR subject_id).
      const selCourse = courses.find((c: any) => c.id === courseId);
      const subjectQ = selCourse?.subject?.id ? `&subject_id=${selCourse.subject.id}` : '';
      const [qData, qnData] = await Promise.all([
        fetchApi(`/api/v1/quizzes?course_id=${courseId}${tenantQ}`),
        (isAdmin || isTrainer) ? fetchApi(`/api/v1/questions?course_id=${courseId}${subjectQ}${tenantQ}`) : Promise.resolve([])
      ]);
      setQuizzes(qData || []);
      setQuestions(qnData || []);
    } catch { } finally { setLoading(false); }
  };

  // Load the enrolled students for the course so trainers can assign to individuals (#11)
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

  const loadSubmissions = async (quizId: string) => {
    if (submissionsQuizId === quizId) { setSubmissionsQuizId(null); return; }
    setSubmissionsQuizId(quizId);
    setSubmissionsLoading(true);
    try {
      const d = await fetchApi(`/api/v1/quizzes/${quizId}/submissions`);
      setSubmissionsData(Array.isArray(d?.submissions) ? d.submissions : Array.isArray(d) ? d : []);
      setSubmissionsQuestions(Array.isArray(d?.questions) ? d.questions : []);
    } catch { setSubmissionsData([]); setSubmissionsQuestions([]); } finally { setSubmissionsLoading(false); }
  };

  // Release a score + feedback for an essay/coding submission so the gradebook picks it up
  const gradeQuizSubmission = async (submissionId: string, maxMarks: number) => {
    const score = parseFloat(quizGradeInputs[submissionId]);
    if (isNaN(score) || score < 0) { alert('Enter a valid score'); return; }
    if (score > maxMarks) { alert(`Score cannot exceed ${maxMarks}`); return; }
    setGradingId(submissionId);
    try {
      await fetchApi(`/api/v1/quizzes/submissions/${submissionId}/grade`, {
        method: 'PUT',
        body: JSON.stringify({ score, feedback: quizFeedbackInputs[submissionId] || '' })
      });
      alert('✅ Grade saved');
      loadSubmissions(submissionsQuizId || '');
    } catch (err: any) { alert(err.message || 'Failed to grade'); } finally { setGradingId(null); }
  };

  const toggleStudent = (uid: string) => {
    setSelectedStudents(prev => prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]);
  };

  const createQuiz = async (e: any) => {
    e.preventDefault();
    try {
      const assigned_to = assignType === 'ALL'
        ? { type: 'ALL' }
        : { type: 'INDIVIDUALS', user_ids: selectedStudents };
      // Super admin: scope the quiz to the selected college's tenant so the
      // college's students actually see it (otherwise it lands in 'master').
      const body: any = { ...form, course_id: courseId, assigned_to };
      const selectedCollege = colleges.find((c: any) => c.id === collegeId);
      if (isSuperAdmin && selectedCollege?.tenant_id) body.tenant_id = selectedCollege.tenant_id;
      await fetchApi('/api/v1/quizzes', { method: 'POST', body: JSON.stringify(body) });
      setShowForm(false);
      setForm({ title: '', description: '', duration_mins: 30, question_ids: [] });
      setAssignType('ALL'); setSelectedStudents([]);
      loadData();
    } catch { alert('Failed to create quiz'); }
  };

  const toggleQuestion = (id: string) => {
    setForm(f => ({
      ...f,
      question_ids: f.question_ids.includes(id) ? f.question_ids.filter(q => q !== id) : [...f.question_ids, id]
    }));
  };

  // Remove a question from the quiz being built (#fix: there was no way to
  // undo a mistaken add — checkboxes hid it, so this makes it obvious).
  const removeFromQuiz = (qid: string) => {
    setForm(f => ({ ...f, question_ids: f.question_ids.filter(x => x !== qid) }));
  };

  // Create a question inline and add it to the quiz's question list.
  // (#fix) Double-clicking "Add to Quiz" used to create duplicate questions:
  // the button is now disabled while saving, and if a question with the same
  // title already exists in the bank it is reused instead of re-created.
  const addQuestionInline = async () => {
    if (addingQ) return;
    if (!newQ.title.trim()) { alert('Enter a question title'); return; }
    setAddingQ(true);
    try {
      const existing = questions.find((q: any) => q.title?.trim().toLowerCase() === newQ.title.trim().toLowerCase());
      if (existing) {
        setForm(f => ({ ...f, question_ids: f.question_ids.includes(existing.id) ? f.question_ids : [...f.question_ids, existing.id] }));
      } else {
        const options = newQOptions.map((text, i) => ({ id: i + 1, text, isCorrect: i === newQCorrect }));
        const res = await fetchApi('/api/v1/questions', {
          method: 'POST',
          body: JSON.stringify({
            course_id: courseId,
            type: 'MCQ',
            title: newQ.title,
            content: newQ.content || newQ.title,
            marks: newQ.marks,
            options,
            answer_key: String(newQCorrect + 1),
            image_url: newQ.image_url || undefined,
          })
        });
        const qid = res?.id;
        if (qid) {
          setForm(f => ({ ...f, question_ids: f.question_ids.includes(qid) ? f.question_ids : [...f.question_ids, qid] }));
          setQuestions(prev => [...prev, res]);
        }
      }
      setQuickAdd(false);
      setNewQ({ title: '', content: '', marks: 1, answer_key: '', image_url: '' });
      setNewQOptions(['', '', '', '']);
      setNewQCorrect(0);
    } catch { alert('Failed to create question'); } finally { setAddingQ(false); }
  };

  // Delete a quiz (#fix): a wrongly-created quiz can be removed; submissions
  // and question links cascade with it.
  const deleteQuiz = async (quizId: string) => {
    if (!confirm('Delete this quiz? Its submissions will be removed too.')) return;
    try {
      await fetchApi(`/api/v1/quizzes/${quizId}`, { method: 'DELETE' });
      loadData();
    } catch { alert('Failed to delete quiz'); }
  };

  const submitQuiz = async () => {
    if (!activeQuiz) return;
    try {
      const res = await fetchApi(`/api/v1/quizzes/${activeQuiz.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers })
      });
      setSubmitted(res);
      setActiveQuiz(null);
    } catch { alert('Failed to submit quiz'); }
  };

  if (loading) return <div className="fade-in" style={{ padding: '20px' }}>Loading...</div>;

  // Quiz taking view
  if (activeQuiz) {
    const quizQs = activeQuiz.questions || [];
    return (
      <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>{activeQuiz.title}</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" onClick={() => setActiveQuiz(null)}>Cancel</button>
            <button className="btn-primary" onClick={submitQuiz}>Submit Quiz</button>
          </div>
        </div>
        {quizQs.length === 0 ? (
          <div className="panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            This quiz has no questions yet.
          </div>
        ) : quizQs.map((qq: any, i: number) => {
          const q = qq.question;
          return (
            <div className="panel" key={qq.question_id} style={{ marginBottom: '16px' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Q{i + 1}: {q?.title}</p>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '15px', fontSize: '14px' }}>{q?.content}</p>
              {q?.image_url && (
                <div style={{ marginBottom: '15px' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={q.image_url} alt="Question diagram" style={{ maxWidth: '100%', maxHeight: '260px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
              )}
              {q?.type === 'MCQ' && q?.options && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(q.options as any[]).map((opt: any) => (
                    <label key={opt.id} style={{ display: 'flex', gap: '10px', cursor: 'pointer', padding: '10px', background: answers[qq.question_id] === opt.id ? 'rgba(0,168,255,0.15)' : 'rgba(0,0,0,0.2)', borderRadius: '8px', border: answers[qq.question_id] === opt.id ? '1px solid var(--primary-color)' : '1px solid transparent' }}>
                      <input type="radio" name={qq.question_id} value={opt.id}
                        checked={answers[qq.question_id] === opt.id}
                        onChange={() => setAnswers({ ...answers, [qq.question_id]: opt.id })} />
                      {opt.text}
                    </label>
                  ))}
                </div>
              )}
              {(q?.type === 'ESSAY' || q?.type === 'CODING') && (
                <textarea className="input-field" rows={5} placeholder={q.type === 'CODING' ? 'Write your code here...' : 'Write your essay answer...'}
                  value={answers[qq.question_id] || ''}
                  onChange={e => setAnswers({ ...answers, [qq.question_id]: e.target.value })} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="fade-in">
        <div className="panel" style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>🎉</div>
          <h2 style={{ fontSize: '28px', marginBottom: '15px' }}>Quiz Submitted!</h2>
          {submitted.score !== null && submitted.score !== undefined ? (
            <p style={{ fontSize: '20px', color: 'var(--primary-color)' }}>Your Score: <strong>{submitted.score}</strong></p>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>Your answers have been submitted. They will be manually reviewed by your trainer.</p>
          )}
          <button className="btn-primary" style={{ marginTop: '30px' }} onClick={() => { setSubmitted(null); loadData(); }}>Back to Quizzes</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <Link href="/assessments" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>← Assessments</Link>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>Quizzes</h1>
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <CollegeCoursePicker courses={courses} courseId={courseId} onCourseChange={setCourseId} collegeId={collegeId} onCollegeChange={setCollegeId} />
          </div>
        </div>
        {(isAdmin || isTrainer) && <button className="btn-primary" onClick={openCreateForm}>+ Create Quiz</button>}
      </div>

      {showForm && (
        <form onSubmit={createQuiz} className="panel" style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>New Quiz</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Quiz Title</label>
              <input required className="input-field" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Duration (mins)</label>
              <input type="number" className="input-field" value={form.duration_mins} onChange={e => setForm({ ...form, duration_mins: parseInt(e.target.value) })} />
            </div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Description</label>
            <textarea className="input-field" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
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
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <label style={{ display: 'block' }}>Select Questions</label>
              <button type="button" className="btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }} onClick={() => setQuickAdd(!quickAdd)}>
                {quickAdd ? '✕ Cancel' : '➕ New Question'}
              </button>
            </div>

            {quickAdd && (
              <div className="panel" style={{ padding: '15px', marginBottom: '15px' }}>
                <h4 style={{ marginBottom: '12px', fontSize: '14px' }}>Quick Add MCQ</h4>
                <input required className="input-field" placeholder="Question title" style={{ marginBottom: '8px' }}
                  value={newQ.title} onChange={e => setNewQ({ ...newQ, title: e.target.value })} />
                <input className="input-field" placeholder="Content / instructions (optional)" style={{ marginBottom: '8px' }}
                  value={newQ.content} onChange={e => setNewQ({ ...newQ, content: e.target.value })} />
                <input className="input-field" placeholder="Image URL (optional — diagram, chart or formula picture)" style={{ marginBottom: '8px' }}
                  value={newQ.image_url} onChange={e => setNewQ({ ...newQ, image_url: e.target.value })} />
                {newQOptions.map((opt, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                    <input type="radio" name="newq-correct" checked={newQCorrect === i}
                      onChange={() => setNewQCorrect(i)} title="Correct answer" />
                    <input className="input-field" placeholder={`Option ${i + 1}`} value={opt}
                      onChange={e => setNewQOptions(newQOptions.map((o, j) => j === i ? e.target.value : o))} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button type="button" className="btn-primary" style={{ fontSize: '12px', padding: '6px 14px' }} disabled={addingQ} onClick={addQuestionInline}>
                    {addingQ ? 'Adding...' : 'Add to Quiz'}
                  </button>
                </div>
              </div>
            )}

            {questions.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No questions found. Click "New Question" to add one inline.</p>
              : questions.map(q => (
                <label key={q.id} style={{ display: 'flex', gap: '10px', padding: '10px', marginBottom: '8px', background: form.question_ids.includes(q.id) ? 'rgba(0,168,255,0.1)' : 'rgba(0,0,0,0.2)', borderRadius: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.question_ids.includes(q.id)} onChange={() => toggleQuestion(q.id)} />
                  <span>
                    <strong>{q.title}</strong> <span className={`badge ${q.type === 'MCQ' ? 'badge-info' : 'badge-warning'}`}>{q.type}</span> ({q.marks}M)
                    {q.image_url && <span style={{ color: 'var(--text-secondary)', marginLeft: '6px', fontSize: '12px' }}>🖼️ has image</span>}
                  </span>
                </label>
              ))}
          </div>

          {/* Selected questions with an explicit Remove (#fix) — a mistaken
              add can be undone right here, not just by unchecking. */}
          {form.question_ids.length > 0 && (
            <div style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Added to quiz ({form.question_ids.length}) — click ✕ to remove:</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {form.question_ids.map(qid => {
                  const q = questions.find((x: any) => x.id === qid);
                  return (
                    <div key={qid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'rgba(0,168,255,0.12)', borderRadius: '6px', fontSize: '13px' }}>
                      <span style={{ minWidth: 0 }}>
                        <strong>{q?.title || qid}</strong>
                        {q && <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>({q.marks}M · {q.type})</span>}
                      </span>
                      <button type="button" className="btn-secondary" style={{ padding: '2px 8px', fontSize: '12px', color: 'var(--danger-color)', borderColor: 'var(--danger-color)', flexShrink: 0 }} onClick={() => removeFromQuiz(qid)}>✕ Remove</button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn-primary">Create Quiz</button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {quizzes.length === 0 ? <div className="panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No quizzes available yet.</div>
          : quizzes.map(q => (
            <div className="panel" key={q.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '18px', marginBottom: '5px' }}>{q.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>{q.description}</p>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <span className="badge badge-info">{q.questions?.length || 0} Questions</span>
                    {q.duration_mins && <span className="badge badge-success">⏱ {q.duration_mins} mins</span>}
                    {q.assigned_to && <span className="badge badge-warning">Assigned to specific students</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(isAdmin || isTrainer) && (
                    <button className="btn-secondary" style={{ fontSize: '13px' }} onClick={() => loadSubmissions(q.id)}>
                      {submissionsQuizId === q.id ? 'Hide Submissions' : '📊 View Submissions'}
                    </button>
                  )}
                  {(isAdmin || isTrainer) && (
                    <button className="btn-secondary" style={{ fontSize: '13px', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }} onClick={() => deleteQuiz(q.id)}>Delete</button>
                  )}
                  {role === 'STUDENT' && (
                    <button className="btn-primary" onClick={() => { setActiveQuiz(q); setAnswers({}); }}>Take Quiz</button>
                  )}
                </div>
              </div>                  {submissionsQuizId === q.id && (
                <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '14px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>Student Submissions & Scores</h4>
                  {submissionsLoading ? <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
                    : submissionsData.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No submissions yet.</p>
                    : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {submissionsData.map((sub: any) => {
                          const ans = (sub.answers && typeof sub.answers === 'object') ? sub.answers : {};
                          const totalMarks = submissionsQuestions.reduce((s: number, qq: any) => s + (qq.marks || 0), 0);
                          return (
                          <div key={sub.id} style={{ padding: '10px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                              <span style={{ fontSize: '13px' }}>
                                <strong>{nameOf(sub.user_id)}</strong>
                                {emailOf(sub.user_id) && <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>{emailOf(sub.user_id)}</span>}
                              </span>
                              <span>
                                {sub.score !== null && sub.score !== undefined
                                  ? <span className="badge badge-success">Score: {sub.score} / {totalMarks}</span>
                                  : <span className="badge badge-warning">Pending review</span>}
                              </span>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                                {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : ''}
                              </span>
                            </div>
                            {/* The student's answers, next to the question they answered (#grading) */}
                            {submissionsQuestions.length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
                                {submissionsQuestions.map((qq: any) => {
                                  const answer = ans[qq.question_id];
                                  if (answer === undefined || answer === null || answer === '') return null;
                                  return (
                                    <div key={qq.question_id} style={{ fontSize: '13px', background: 'rgba(0,0,0,0.2)', padding: '8px 10px', borderRadius: '6px' }}>
                                      <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>
                                        <strong style={{ color: 'var(--text-primary)' }}>{qq.title}</strong>
                                        {qq.type === 'ESSAY' || qq.type === 'CODING' ? ` (${qq.marks}M)` : ''}
                                      </div>
                                      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                        {qq.type === 'MCQ'
                                          ? (() => { const s = String(answer); const idx = s.match(/^\d+$/); return idx ? `Option ${s}` : s; })()
                                          : String(answer)}
                                      </div>
                                    </div>
                                  );
                                })}
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
                                  style={{ width: '90px', padding: '4px 8px' }}
                                  placeholder={`0-${totalMarks}`}
                                  value={quizGradeInputs[sub.id] || ''}
                                  onChange={e => setQuizGradeInputs({ ...quizGradeInputs, [sub.id]: e.target.value })}
                                />
                                <input
                                  className="input-field"
                                  style={{ flex: 1, minWidth: '160px', padding: '4px 8px' }}
                                  placeholder="Feedback for the student (optional)"
                                  value={quizFeedbackInputs[sub.id] || ''}
                                  onChange={e => setQuizFeedbackInputs({ ...quizFeedbackInputs, [sub.id]: e.target.value })}
                                />
                                <button className="btn-primary" style={{ fontSize: '12px', padding: '4px 12px' }} disabled={gradingId === sub.id} onClick={() => gradeQuizSubmission(sub.id, totalMarks)}>
                                  {gradingId === sub.id ? 'Saving...' : 'Grade'}
                                </button>
                              </div>
                            )}
                          </div>
                          );
                        })}
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
