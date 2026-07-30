'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
import Link from 'next/link';

export default function QuestionsPage() {
  const { isAdmin, isTrainer } = useRole();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseId] = useState('c-1');
  const [form, setForm] = useState({ type: 'MCQ', title: '', content: '', marks: 1, answer_key: '' });
  const [options, setOptions] = useState([
    { id: 1, text: '', isCorrect: false },
    { id: 2, text: '', isCorrect: false },
    { id: 3, text: '', isCorrect: false },
    { id: 4, text: '', isCorrect: false },
  ]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => { if (isAdmin || isTrainer) loadQuestions(); else setLoading(false); }, [isAdmin, isTrainer]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const data = await fetchApi(`/api/v1/questions?course_id=${courseId}`);
      setQuestions(data || []);
    } catch { } finally { setLoading(false); }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    try {
      await fetchApi('/api/v1/questions', {
        method: 'POST',
        body: JSON.stringify({
          course_id: courseId,
          ...form,
          options: form.type === 'MCQ' ? options : undefined
        })
      });
      setShowForm(false);
      setForm({ type: 'MCQ', title: '', content: '', marks: 1, answer_key: '' });
      loadQuestions();
    } catch { alert('Failed to create question'); }
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
        </div>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>+ Add Question</button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="panel" style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>New Question</h3>
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
            <button type="submit" className="btn-primary">Save Question</button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? <p>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {questions.length === 0 ? <div className="panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No questions yet. Add your first question above.</div>
            : questions.map(q => (
              <div className="panel" key={q.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'center' }}>
                      <span className={`badge ${q.type === 'MCQ' ? 'badge-info' : q.type === 'CODING' ? 'badge-warning' : 'badge-success'}`}>{q.type}</span>
                      <strong>{q.title}</strong>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>({q.marks} mark{q.marks > 1 ? 's' : ''})</span>
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
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
