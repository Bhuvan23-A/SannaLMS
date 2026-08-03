'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';

export default function CourseTrainersTab({ courseId }: { courseId: string }) {
  const { isAdmin } = useRole();
  const [trainers, setTrainers] = useState<any[]>([]);
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('PRIMARY_TRAINER');
  const [tenantId, setTenantId] = useState('');
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
        body: JSON.stringify({ course_id: courseId, user_id: userId, role, tenant_id: tenantId }),
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
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>User ID (From College System)</label>
            <input required className="input-field" value={userId} onChange={e => setUserId(e.target.value)} placeholder="e.g. u-12345" />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Role</label>
            <select className="input-field" value={role} onChange={e => setRole(e.target.value)}>
              <option value="PRIMARY_TRAINER">Primary Trainer</option>
              <option value="TEACHING_ASSISTANT">Teaching Assistant</option>
              <option value="GUEST_FACULTY">Guest Faculty</option>
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Tenant ID</label>
            <input required className="input-field" value={tenantId} onChange={e => setTenantId(e.target.value)} placeholder="e.g. stanford" />
          </div>
          <button type="submit" className="btn-primary" style={{ padding: '12px 20px', height: '44px' }}>Assign</button>
        </form>
      )}

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
            <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>User ID</th>
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
                <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>{t.user_id}</td>
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
