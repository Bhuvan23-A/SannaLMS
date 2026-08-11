'use client';
import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';

export default function CreateSemesterModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [semesterNumber, setSemesterNumber] = useState('');
  const [branches, setBranches] = useState<any[]>([]);
  const [heldCollegeIds, setHeldCollegeIds] = useState<Set<string>>(new Set());
  const [branchId, setBranchId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [brs, colleges] = await Promise.all([
          fetchApi('/api/v1/branches').catch(() => []),
          fetchApi('/api/v1/colleges').catch(() => []),
        ]);
        setBranches(Array.isArray(brs) ? brs : []);
        // Held colleges are suspended — never build structure inside one.
        // Branches carry their department, which carries the college_id.
        const held = new Set<string>((Array.isArray(colleges) ? colleges : [])
          .filter((c: any) => c.status === 'HELD').map((c: any) => c.id));
        setHeldCollegeIds(held);
      } catch { setBranches([]); }
    })();
  }, []);

  const visibleBranches = branches.filter((b: any) => !heldCollegeIds.has(b.department?.college_id));
  const selectedBranch = visibleBranches.find((b: any) => b.id === branchId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await fetchApi('/api/v1/semesters', {
        method: 'POST',
        body: JSON.stringify({
          name,
          branch_id: branchId,
          tenant_id: selectedBranch?.tenant_id || 'test-college',
          // Auto-derive the semester number from the name if the user left it blank
          semester_number: semesterNumber ? Number(semesterNumber) : (() => { const m = /(\d+)/.exec(name || ''); return m ? Number(m[1]) : undefined; })(),
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
        <h2 style={{ marginBottom: '20px' }}>Add Semester</h2>

        {error && (
          <div style={{ padding: '10px', background: 'rgba(239,68,68,0.2)', color: 'var(--danger-color)', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Semester Name</label>
            <input
              required className="input-field" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Semester 1 (2026)"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Semester Number</label>
            <input
              type="number" min={1} max={12} className="input-field" value={semesterNumber} onChange={e => setSemesterNumber(e.target.value)}
              placeholder="Auto from name if blank (e.g. 3)"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Branch</label>
            <select required className="input-field" value={branchId} onChange={e => setBranchId(e.target.value)}>
              <option value="">Select branch…</option>
              {visibleBranches.length === 0 ? <option value="" disabled>No active branches found — add one first</option>
                : visibleBranches.map((b: any) => <option key={b.id} value={b.id}>{b.name}{b.tenant_id ? ` (${b.tenant_id})` : ''}</option>)}
            </select>
            {branches.length > visibleBranches.length && (
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>Branches in held colleges are hidden.</p>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Adding...' : 'Add Semester'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
