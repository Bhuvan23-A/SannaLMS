'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';

export default function CoursePrerequisitesTab({ courseId }: { courseId: string }) {
  const { isAdmin } = useRole();
  const [courses, setCourses] = useState<any[]>([]);
  const [prerequisites, setPrerequisites] = useState<any[]>([]);
  const [requiredCourseId, setRequiredCourseId] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const loadPrerequisites = async () => {
    try {
      const data = await fetchApi(`/api/v1/prerequisites/course/${courseId}`);
      setPrerequisites(Array.isArray(data) ? data : []);
    } catch { setPrerequisites([]); }
  };

  useEffect(() => {
    loadAllCourses();
    loadPrerequisites();
  }, [courseId]);

  const loadAllCourses = async () => {
    try {
      const data = await fetchApi('/api/v1/courses');
      // Filter out the current course so you can't make a course a prerequisite of itself
      setCourses((data || []).filter((c: any) => c.id !== courseId));
    } catch (err) {
      console.error(err);
    }
  };

  const assignPrerequisite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/api/v1/prerequisites', {
        method: 'POST',
        body: JSON.stringify({ course_id: courseId, required_course_id: requiredCourseId }),
      });
      alert('Prerequisite linked successfully!');
      setRequiredCourseId('');
      loadPrerequisites();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Remove a mistaken prerequisite link (#fix).
  const removePrerequisite = async (p: any) => {
    const required = courses.find((c: any) => c.id === p.required_course_id);
    if (!confirm(`Remove "${required?.title || p.required_course_id}" as a prerequisite of this course?`)) return;
    setRemovingId(p.id);
    try {
      await fetchApi(`/api/v1/prerequisites/course/${courseId}/required/${p.required_course_id}`, { method: 'DELETE' });
      loadPrerequisites();
    } catch (err: any) {
      alert(err.message || 'Failed to remove prerequisite');
    } finally {
      setRemovingId(null);
    }
  };

  const titleOf = (id: string) => courses.find((c: any) => c.id === id)?.title || id;

  return (
    <div>
      <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Course Prerequisites</h2>

      {isAdmin && (
        <div className="panel" style={{ background: 'rgba(0,0,0,0.1)', border: '1px solid var(--primary-color)' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '10px', color: 'var(--primary-color)' }}>Add Prerequisite</h3>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Select a foundation course that students must complete before they can take this course.
          </p>

          <form onSubmit={assignPrerequisite} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Foundation Course</label>
              <select required className="input-field" value={requiredCourseId} onChange={e => setRequiredCourseId(e.target.value)}>
                <option value="">-- Select a Course --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary" style={{ padding: '12px 20px', height: '44px' }}>Link Course</button>
          </form>
        </div>
      )}

      <div style={{ marginTop: '24px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '12px', color: 'var(--text-secondary)' }}>Linked prerequisites ({prerequisites.length})</h3>
        {prerequisites.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No prerequisites linked yet. Students can enroll in this course without completing any other course.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {prerequisites.map((p) => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                <span style={{ fontSize: '14px' }}>
                  <strong>{titleOf(p.required_course_id)}</strong>
                </span>
                {isAdmin && (
                  <button
                    className="btn-secondary"
                    style={{ padding: '4px 12px', fontSize: '12px', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}
                    disabled={removingId === p.id}
                    onClick={() => removePrerequisite(p)}
                  >
                    {removingId === p.id ? 'Removing...' : 'Remove'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
