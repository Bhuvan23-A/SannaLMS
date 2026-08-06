'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
import Link from 'next/link';

export default function AssignmentsPage() {
  const { isAdmin, isTrainer, role } = useRole();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseId] = useState('c-1');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', due_date: '', max_marks: 100 });
  const [submitForm, setSubmitForm] = useState<{ id: string; text_content: string; file_url: string } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => { loadAssignments(); }, []);

  const loadAssignments = async () => {
    try { setLoading(true); const d = await fetchApi(`/api/v1/assignments?course_id=${courseId}`); setAssignments(d || []); }
    catch { } finally { setLoading(false); }
  };

  const createAssignment = async (e: any) => {
    e.preventDefault();
    try {
      // datetime-local gives "2026-08-10T12:00" (no timezone) — convert to ISO
      // with timezone so the backend's new Date() parses it correctly.
      const due_date = form.due_date ? new Date(form.due_date).toISOString() : null;
      await fetchApi('/api/v1/assignments', { method: 'POST', body: JSON.stringify({ ...form, due_date, course_id: courseId }) });
      setShowForm(false); setForm({ title: '', description: '', due_date: '', max_marks: 100 }); loadAssignments();
    } catch { alert('Failed to create assignment'); }
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
        </div>
        {(isAdmin || isTrainer) && <button className="btn-primary" onClick={() => setShowForm(!showForm)}>+ Create Assignment</button>}
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={submitAssignment} className="panel" style={{ width: '500px', maxWidth: '90vw' }}>
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
            <div className="panel" key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '18px', marginBottom: '8px' }}>{a.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '10px' }}>{a.description}</p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <span className="badge badge-warning">Max: {a.max_marks} marks</span>
                  {a.due_date && <span className="badge badge-info">Due: {new Date(a.due_date).toLocaleDateString()}</span>}
                </div>
              </div>
              {role === 'STUDENT' && (
                <button className="btn-primary" onClick={() => setSubmitForm({ id: a.id, text_content: '', file_url: '' })}>Submit Work</button>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
