'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
import Link from 'next/link';

export default function QuizzesPage() {
  const { isAdmin, isTrainer, role } = useRole();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseId] = useState('c-1');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', duration_mins: 30, question_ids: [] as string[] });
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState<any>(null);

  useEffect(() => { loadData(); }, []);

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

  const createQuiz = async (e: any) => {
    e.preventDefault();
    try {
      await fetchApi('/api/v1/quizzes', { method: 'POST', body: JSON.stringify({ ...form, course_id: courseId }) });
      setShowForm(false);
      setForm({ title: '', description: '', duration_mins: 30, question_ids: [] });
      loadData();
    } catch { alert('Failed to create quiz'); }
  };

  const toggleQuestion = (id: string) => {
    setForm(f => ({
      ...f,
      question_ids: f.question_ids.includes(id) ? f.question_ids.filter(q => q !== id) : [...f.question_ids, id]
    }));
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
        </div>
        {(isAdmin || isTrainer) && <button className="btn-primary" onClick={() => setShowForm(!showForm)}>+ Create Quiz</button>}
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
            <label style={{ display: 'block', marginBottom: '10px' }}>Select Questions</label>
            {questions.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No questions found. Add some in the Question Bank first.</p>
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
            <div className="panel" key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '18px', marginBottom: '5px' }}>{q.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '8px' }}>{q.description}</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <span className="badge badge-info">{q.questions?.length || 0} Questions</span>
                  {q.duration_mins && <span className="badge badge-success">⏱ {q.duration_mins} mins</span>}
                </div>
              </div>
              {role === 'STUDENT' && (
                <button className="btn-primary" onClick={() => { setActiveQuiz(q); setAnswers({}); }}>Take Quiz</button>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
