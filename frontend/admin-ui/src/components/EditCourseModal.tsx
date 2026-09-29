'use client';
import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { Edit3, X, Check } from 'lucide-react';

interface EditCourseModalProps {
  course: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditCourseModal({ course, onClose, onSuccess }: EditCourseModalProps) {
  const [title, setTitle] = useState(course?.title || '');
  const [description, setDescription] = useState(course?.description || '');
  const [credits, setCredits] = useState(course?.credits ? String(course.credits) : '');
  const [status, setStatus] = useState(course?.status || 'DRAFT');
  const [section, setSection] = useState(course?.section || '');
  const [academicSession, setAcademicSession] = useState(course?.academic_session || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (course) {
      setTitle(course.title || '');
      setDescription(course.description || '');
      setCredits(course.credits ? String(course.credits) : '');
      setStatus(course.status || 'DRAFT');
      setSection(course.section || '');
      setAcademicSession(course.academic_session || '');
    }
  }, [course]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Course title is required');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await fetchApi(`/api/v1/courses/${course.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          credits: credits ? Number(credits) : null,
          status,
          section: section.trim() || null,
          academic_session: academicSession.trim() || null,
        }),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to update course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}>
      <div className="panel" style={{ width: '560px', maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto', borderRadius: '14px', background: '#091e3a', border: '1px solid rgba(56, 189, 248, 0.3)', boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 24px', borderBottom: '1px solid rgba(56, 189, 248, 0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(14, 165, 233, 0.15)', border: '1px solid rgba(56, 189, 248, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Edit3 size={16} color="#38bdf8" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#fff' }}>Edit Course</h3>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>ID: {course?.id}</span>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px 24px' }}>
          {error && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#fca5a5', fontSize: '13px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#e2e8f0' }}>Course Title *</label>
            <input
              type="text"
              className="input-field"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Data Structures and Algorithms"
              required
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#e2e8f0' }}>Description</label>
            <textarea
              className="input-field"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Overview of syllabus, prerequisites and course outcomes..."
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#e2e8f0' }}>Credits</label>
              <input
                type="number"
                step="1"
                min="0"
                max="30"
                className="input-field"
                value={credits}
                onChange={(e) => setCredits(e.target.value)}
                placeholder="e.g. 4"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#e2e8f0' }}>Status</label>
              <select className="input-field" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="DRAFT">DRAFT (Hidden from Students)</option>
                <option value="PUBLISHED">PUBLISHED (Active &amp; Visible)</option>
                <option value="ARCHIVED">ARCHIVED</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#e2e8f0' }}>Section</label>
              <input
                type="text"
                className="input-field"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                placeholder="e.g. A, B, CS-1"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#e2e8f0' }}>Academic Session</label>
              <input
                type="text"
                className="input-field"
                value={academicSession}
                onChange={(e) => setAcademicSession(e.target.value)}
                placeholder="e.g. 2024-2025 Even Sem"
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', paddingTop: '14px', borderTop: '1px solid rgba(56, 189, 248, 0.15)' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={14} /> {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
