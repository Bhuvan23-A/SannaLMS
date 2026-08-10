'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
import { useUserDirectory } from '@/hooks/useUserDirectory';

export default function CourseTrainersTab({ courseId }: { courseId: string }) {
  const { isAdmin } = useRole();
  const { nameOf, emailOf } = useUserDirectory();
  const [trainers, setTrainers] = useState<any[]>([]);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('PRIMARY_TRAINER');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrainers();
  }, [courseId]);

  const loadTrainers = async () => {
    try {
      setLoading(true);
      const data = await fetchApi(`/api/v1/course-trainers/course/${courseId}`);
      setTrainers(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const assignTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetchApi('/api/v1/course-trainers', {
        method: 'POST',
        body: JSON.stringify({ course_id: courseId, user_id: userId, role }),
      });
      setUserId('');
      loadTrainers();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Course Trainers</h2>
      
      {isAdmin && (
        <form onSubmit={assignTrainer} style={{ display: 'flex', gap: '15px', marginBottom: '30px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Trainer User ID</label>
            <input required className="input-field" value={userId} onChange={e => setUserId(e.target.value)} placeholder="Paste the trainer's user ID" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Role</label>
            <select className="input-field" value={role} onChange={e => setRole(e.target.value)}>
              <option value="PRIMARY_TRAINER">Primary Trainer</option>
              <option value="TEACHING_ASSISTANT">Teaching Assistant</option>
              <option value="GUEST_FACULTY">Guest Faculty</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" style={{ padding: '12px 20px', height: '44px' }}>Assign</button>
        </form>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
            <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Trainer</th>
            <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Role</th>
            <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Assigned At</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center' }}>Loading...</td></tr>
          ) : trainers.length === 0 ? (
            <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center' }}>No trainers assigned yet.</td></tr>
          ) : (
            trainers.map((t) => (
              <tr key={t.id} style={{ transition: 'background 0.2s ease' }} className="table-row">
                <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                  <div style={{ color: '#f8fafc' }}>{nameOf(t.user_id)}</div>
                  {emailOf(t.user_id) && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{emailOf(t.user_id)}</div>}
                </td>
                <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                  <span className="badge badge-success">{t.role}</span>
                </td>
                <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)' }}>{new Date(t.created_at).toLocaleDateString()}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
