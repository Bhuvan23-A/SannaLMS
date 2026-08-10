'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useUserDirectory } from '@/hooks/useUserDirectory';

export default function CourseEnrollmentsTab({ courseId }: { courseId: string }) {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [userId, setUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const { nameOf, emailOf } = useUserDirectory();

  const loadRoster = async () => {
    try {
      setLoading(true);
      const data = await fetchApi(`/api/v1/enrollments/course/${courseId}`).catch(() => []);
      setEnrollments(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRoster();
  }, [courseId]);

  const enrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) return;
    try {
      await fetchApi('/api/v1/enrollments', {
        method: 'POST',
        body: JSON.stringify({ course_id: courseId, user_id: userId.trim() }),
      });
      alert('Successfully enrolled!');
      setUserId('');
      loadRoster();
    } catch (err: any) {
      alert(`Enrollment Failed: ${err?.message || err}`);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Course Enrollments</h2>

      <div className="panel" style={{ background: 'rgba(0,0,0,0.1)', border: '1px solid var(--primary-color)' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '10px', color: 'var(--primary-color)' }}>Enroll a Student</h3>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          Paste the student&apos;s user ID to enroll them in this course. The college is applied automatically.
        </p>

        <form onSubmit={enrollStudent} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Student User ID</label>
            <input required className="input-field" value={userId} onChange={e => setUserId(e.target.value)} placeholder="Paste the student's user ID" />
          </div>
          <button type="submit" className="btn-primary" style={{ padding: '12px 20px', height: '44px' }}>
            Enroll Student
          </button>
        </form>
      </div>

      <h3 style={{ fontSize: '16px', margin: '25px 0 12px', color: 'var(--text-secondary)' }}>Enrolled Students ({enrollments.length})</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
            <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Student</th>
            <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Status</th>
            <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Enrolled At</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center' }}>Loading...</td></tr>
          ) : enrollments.length === 0 ? (
            <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>No students enrolled yet.</td></tr>
          ) : (
            enrollments.map((en) => (
              <tr key={en.id} className="table-row">
                <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                  <div style={{ color: '#f8fafc' }}>{nameOf(en.user_id)}</div>
                  {emailOf(en.user_id) && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{emailOf(en.user_id)}</div>}
                </td>
                <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                  <span className="badge badge-success">{en.status || 'ACTIVE'}</span>
                </td>
                <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)' }}>
                  {en.enrolled_at ? new Date(en.enrolled_at).toLocaleDateString() : '—'}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
