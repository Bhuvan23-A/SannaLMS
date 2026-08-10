'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
import { useUserDirectory } from '@/hooks/useUserDirectory';
import Link from 'next/link';

export default function QuizzesPage() {
  const { isAdmin, isTrainer, role } = useRole();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Course-aware quizzes: choose the course from the real list, not 'c-1'.
  const [courses, setCourses] = useState<any[]>([]);
  const [courseId, setCourseId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', duration_mins: 30, question_ids: [] as string[] });
  // Assign-to targeting (#11): whole course or specific enrolled students
  const [assignType, setAssignType] = useState<'ALL' | 'INDIVIDUALS'>('ALL');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  // Submissions review (#10)
  const [submissionsQuizId, setSubmissionsQuizId] = useState<string | null>(null);
  const [submissionsData, setSubmissionsData] = useState<any[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  // Inline quick-add question (so questions don't have to pre-exist in the bank)
  const [quickAdd, setQuickAdd] = useState(false);
  const [newQ, setNewQ] = useState({ title: '', content: '', marks: 1, answer_key: '' });
  const [newQOptions, setNewQOptions] = useState(['', '', '', '']);
  const [newQCorrect, setNewQCorrect] = useState(0);
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState<any>(null);

  // People resolver (#fix): show student names instead of raw Keycloak UUIDs
  const { nameOf, emailOf } = useUserDirectory();

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchApi('/api/v1/courses');
        if (Array.isArray(data) && data.length > 0) {
          setCourses(data);
          setCourseId(data[0].id);
          return;
        }
      } catch { /* course list unavailable */ }
      // No courses yet (new college) or API failure — resolve loading so the
      // page shows an empty state instead of hanging on "Loading..." forever.
      setLoading(false);
    })();
  }, []);

  useEffect(() => { if (courseId) loadData(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [courseId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [qData, qnData] = await Promise.all([
        fetchApi(`/api/v1/quizzes?course_id=${courseId}`),
        (isAdmin || isTrainer) ? fetchApi(`/api/v1/questions?course_id=${courseId}`) : Promise.resolve([])
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
      setSubmissionsData(Array.isArray(d) ? d : []);
    } catch { setSubmissionsData([]); } finally { setSubmissionsLoading(false); }
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
      await fetchApi('/api/v1/quizzes', { method: 'POST', body: JSON.stringify({ ...form, course_id: courseId, assigned_to }) });
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

  // Create a question inline and add it to the quiz's question list
  const addQuestionInline = async () => {
    try {
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
          answer_key: String(newQCorrect + 1)
        })
      });
      const qid = res?.id;
      if (qid) {
        setForm(f => ({ ...f, question_ids: f.question_ids.includes(qid) ? f.question_ids : [...f.question_ids, qid] }));
        setQuestions(prev => [...prev, res]);
      }
      setQuickAdd(false);
      setNewQ({ title: '', content: '', marks: 1, answer_key: '' });
      setNewQOptions(['', '', '', '']);
      setNewQCorrect(0);
    } catch { alert('Failed to create question'); }
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
          {courses.length > 0 && (
            <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Course:</label>
              <select className="input-field" style={{ maxWidth: '380px' }} value={courseId} onChange={e => setCourseId(e.target.value)}>
                {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          )}
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
                {newQOptions.map((opt, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                    <input type="radio" name="newq-correct" checked={newQCorrect === i}
                      onChange={() => setNewQCorrect(i)} title="Correct answer" />
                    <input className="input-field" placeholder={`Option ${i + 1}`} value={opt}
                      onChange={e => setNewQOptions(newQOptions.map((o, j) => j === i ? e.target.value : o))} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button type="button" className="btn-primary" style={{ fontSize: '12px', padding: '6px 14px' }} onClick={addQuestionInline}>Add to Quiz</button>
                </div>
              </div>
            )}

            {questions.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No questions found. Click "New Question" to add one inline.</p>
              : questions.map(q => (
                <label key={q.id} style={{ display: 'flex', gap: '10px', padding: '10px', marginBottom: '8px', background: form.question_ids.includes(q.id) ? 'rgba(0,168,255,0.1)' : 'rgba(0,0,0,0.2)', borderRadius: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.question_ids.includes(q.id)} onChange={() => toggleQuestion(q.id)} />
                  <span><strong>{q.title}</strong> <span className={`badge ${q.type === 'MCQ' ? 'badge-info' : 'badge-warning'}`}>{q.type}</span> ({q.marks}M)</span>
                </label>
              ))}
          </div>
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
                  {role === 'STUDENT' && (
                    <button className="btn-primary" onClick={() => { setActiveQuiz(q); setAnswers({}); }}>Take Quiz</button>
                  )}
                </div>
              </div>
              {submissionsQuizId === q.id && (
                <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '14px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>Student Submissions & Scores</h4>
                  {submissionsLoading ? <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
                    : submissionsData.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No submissions yet.</p>
                    : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {submissionsData.map((sub: any) => (
                          <div key={sub.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                            <span style={{ fontSize: '13px' }}>
                              <strong>{nameOf(sub.user_id)}</strong>
                              {emailOf(sub.user_id) && <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>{emailOf(sub.user_id)}</span>}
                            </span>
                            <span>
                              {sub.score !== null && sub.score !== undefined
                                ? <span className="badge badge-success">Score: {sub.score}</span>
                                : <span className="badge badge-warning">Pending review</span>}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : ''}
                            </span>
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
