'use client';
import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';

export default function CreateBranchModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const { role } = useRole();
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const [name, setName] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [heldCollegeIds, setHeldCollegeIds] = useState<Set<string>>(new Set());
  const [collegeId, setCollegeId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [totalSemesters, setTotalSemesters] = useState('8');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [depts, collegeList] = await Promise.all([
          fetchApi('/api/v1/departments').catch(() => []),
          fetchApi('/api/v1/colleges').catch(() => []),
        ]);
        setDepartments(Array.isArray(depts) ? depts : []);
        const list = Array.isArray(collegeList) ? collegeList : [];
        setColleges(list);
        // Held colleges are suspended — never build structure inside one.
        const held = new Set<string>(list.filter((c: any) => c.status === 'HELD').map((c: any) => c.id));
        setHeldCollegeIds(held);
        // A single college admin's modal is already tenant-scoped; prefill the
        // only active college for super admins so the dropdown is never empty.
        const active = list.filter((c: any) => c.status !== 'HELD');
        if (active.length === 1) setCollegeId(active[0].id);
      } catch { setDepartments([]); }
    })();
  }, []);

  const activeColleges = colleges.filter((c: any) => c.status !== 'HELD');
  const visibleDepartments = departments.filter((d: any) =>
    !heldCollegeIds.has(d.college_id) &&
    (!isSuperAdmin || !collegeId || d.college_id === collegeId)
  );
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
          total_semesters: totalSemesters ? Number(totalSemesters) : 8,
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
      display: 'flex', justifyContent: 'center', overflowY: 'auto', padding: '20px',
      zIndex: 1000,
      width: '100vw', height: '100vh'
    }}>
      <div className="glass-panel animate-fade-in" style={{ width: '400px', padding: '30px', margin: 'auto', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}>
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
          {isSuperAdmin && (
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>College *</label>
              <select required className="input-field" value={collegeId} onChange={e => { setCollegeId(e.target.value); setDepartmentId(''); }}>
                <option value="">Select college…</option>
                {activeColleges.length === 0 ? <option value="" disabled>No active colleges found</option>
                  : activeColleges.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Department</label>
            <select required className="input-field" value={departmentId} onChange={e => setDepartmentId(e.target.value)}>
              <option value="">Select department…</option>
              {visibleDepartments.length === 0 ? <option value="" disabled>No active departments found — add one first</option>
                : visibleDepartments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            {departments.length > visibleDepartments.length && (
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>Departments in held colleges are hidden.</p>
            )}
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Total Semesters (program length)</label>
            <input
              type="number" min={1} max={12} className="input-field" value={totalSemesters} onChange={e => setTotalSemesters(e.target.value)}
              placeholder="e.g. 8 (B.Tech), 6 (BBA), 4 (MBA)"
            />
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>The program timeline runs Sem 1 – Sem {totalSemesters || 'N'} for this branch. The last semester alone is marked Final.</p>
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
