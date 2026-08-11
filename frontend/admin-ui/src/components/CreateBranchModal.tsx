'use client';
import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';

export default function CreateBranchModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [heldCollegeIds, setHeldCollegeIds] = useState<Set<string>>(new Set());
  const [departmentId, setDepartmentId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [depts, colleges] = await Promise.all([
          fetchApi('/api/v1/departments').catch(() => []),
          fetchApi('/api/v1/colleges').catch(() => []),
        ]);
        setDepartments(Array.isArray(depts) ? depts : []);
        // Held colleges are suspended — never build structure inside one.
        const held = new Set<string>((Array.isArray(colleges) ? colleges : [])
          .filter((c: any) => c.status === 'HELD').map((c: any) => c.id));
        setHeldCollegeIds(held);
      } catch { setDepartments([]); }
    })();
  }, []);

  const visibleDepartments = departments.filter((d: any) => !heldCollegeIds.has(d.college_id));
  const selectedDepartment = visibleDepartments.find((d: any) => d.id === departmentId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await fetchApi('/api/v1/branches', {
        method: 'POST',
        body: JSON.stringify({
          name,
          department_id: departmentId,
          tenant_id: selectedDepartment?.tenant_id || 'test-college',
        }),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
      width: '100vw', height: '100vh'
    }}>
      <div className="glass-panel animate-fade-in" style={{ width: '400px', padding: '30px' }}>
        <h2 style={{ marginBottom: '20px' }}>Add Branch</h2>

        {error && (
          <div style={{ padding: '10px', background: 'rgba(239,68,68,0.2)', color: 'var(--danger-color)', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Branch Name</label>
            <input
              required className="input-field" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Artificial Intelligence (AI)"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Department</label>
            <select required className="input-field" value={departmentId} onChange={e => setDepartmentId(e.target.value)}>
              <option value="">Select department…</option>
              {visibleDepartments.length === 0 ? <option value="" disabled>No active departments found — add one first</option>
                : visibleDepartments.map((d: any) => <option key={d.id} value={d.id}>{d.name}{d.tenant_id ? ` (${d.tenant_id})` : ''}</option>)}
            </select>
            {departments.length > visibleDepartments.length && (
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>Departments in held colleges are hidden.</p>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Branch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
