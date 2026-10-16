'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useUserDirectory } from '@/hooks/useUserDirectory';
import UserSearchPicker from '@/components/UserSearchPicker';

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

  // Unenroll a student (#fix): corrects mistaken enrollments (e.g. a student
  // added to the wrong course). Works for both manual and section enrollments.
  const removeStudent = async (en: any) => {
    if (!confirm(`Remove ${nameOf(en.user_id)} from this course?`)) return;
    try {
      await fetchApi(`/api/v1/enrollments/course/${courseId}/user/${en.user_id}`, { method: 'DELETE' });
      loadRoster();
    } catch (err: any) {
      alert(`Failed to remove: ${err?.message || err}`);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Course Enrollments</h2>

      <div className="panel" style={{ background: 'rgba(0,0,0,0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '6px', color: '#38bdf8' }}>Enroll Student into Course</h3>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Select a registered student by searching their name or email. Institutional scope is applied automatically.
        </p>

        <form onSubmit={enrollStudent} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 2, minWidth: '280px' }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Select Student *</label>
            <UserSearchPicker
              value={userId}
              onChange={setUserId}
              roleFilter="STUDENT"
              placeholder="Search student by name or email..."
            />
          </div>
          <button type="submit" className="btn-primary" disabled={!userId} style={{ padding: '10px 24px', height: '42px', fontWeight: 600 }}>
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
            <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', textAlign: 'right' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center' }}>Loading...</td></tr>
          ) : enrollments.length === 0 ? (
            <tr><td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>No students enrolled yet.</td></tr>
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
                <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', textAlign: 'right' }}>
                  <button
                    className="btn-secondary"
                    style={{ padding: '4px 12px', fontSize: '12px', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}
                    onClick={() => removeStudent(en)}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
