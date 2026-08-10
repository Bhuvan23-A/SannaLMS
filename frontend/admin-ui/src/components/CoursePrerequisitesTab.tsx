'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';

export default function CoursePrerequisitesTab({ courseId }: { courseId: string }) {
  const { isAdmin } = useRole();
  const [courses, setCourses] = useState<any[]>([]);
  const [requiredCourseId, setRequiredCourseId] = useState('');

  useEffect(() => {
    loadAllCourses();
  }, []);

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
    } catch (err: any) {
      alert(err.message);
    }
  };

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
    </div>
  );
}
