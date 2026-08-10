'use client';
import { useState, useEffect } from 'react';
import Topbar from "@/components/Topbar";
import { fetchApi } from "@/lib/api";
import CreateSemesterModal from "@/components/CreateSemesterModal";

export default function SemestersPage() {
  const [semesters, setSemesters] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editBranchId, setEditBranchId] = useState('');
  const [saving, setSaving] = useState(false);

  const loadSemesters = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/api/v1/semesters');
      setSemesters(Array.isArray(data) ? data : []);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSemesters();
    fetchApi('/api/v1/branches').then(d => setBranches(Array.isArray(d) ? d : [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = (s: any) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditBranchId(s.branch_id || '');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await fetchApi(`/api/v1/semesters/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName, branch_id: editBranchId || undefined }),
      });
      setEditingId(null);
      loadSemesters();
    } catch (err: any) {
      alert('Failed to update semester: ' + (err.message || 'error'));
    } finally {
      setSaving(false);
    }
  };

  const deleteSemester = async (s: any) => {
    if (!confirm(`Delete semester "${s.name}"? This cannot be undone.`)) return;
    try {
      await fetchApi(`/api/v1/semesters/${s.id}`, { method: 'DELETE' });
      loadSemesters();
    } catch (err: any) {
      alert('Failed to delete semester: ' + (err.message || 'error'));
    }
  };

  const branchName = (id: string) => branches.find(b => b.id === id)?.name || id;

  const filtered = semesters.filter(s => {
    if (branchFilter && s.branch_id !== branchFilter) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="animate-fade-in">
      <Topbar title="Semesters Management" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>All Semesters</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            className="input-field"
            placeholder="🔍 Search semesters..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '220px' }}
          />
          <select className="input-field" style={{ maxWidth: '220px' }} value={branchFilter} onChange={e => setBranchFilter(e.target.value)}>
            <option value="">All branches</option>
            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>+ Add Semester</button>
        </div>
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '15px', color: 'var(--danger-color)', border: '1px solid var(--danger-color)', marginBottom: '20px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="glass-panel" style={{ overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Name</th>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Branch</th>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center' }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center' }}>No semesters found.</td></tr>
            ) : (
              filtered.map((semester) => (
                <tr key={semester.id} style={{ transition: 'background 0.2s ease' }} className="table-row">
                  {editingId === semester.id ? (
                    <>
                      <td style={{ padding: '12px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                        <input className="input-field" value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%' }} />
                      </td>
                      <td style={{ padding: '12px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                        <select className="input-field" value={editBranchId} onChange={e => setEditBranchId(e.target.value)} style={{ width: '100%' }}>
                          <option value="">Select branch</option>
                          {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '12px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-primary" style={{ fontSize: '13px', padding: '5px 12px' }} disabled={saving} onClick={saveEdit}>
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                          <button className="btn-secondary" style={{ fontSize: '13px', padding: '5px 12px' }} onClick={() => setEditingId(null)}>Cancel</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>{semester.name}</td>
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>{branchName(semester.branch_id)}</td>
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-secondary" style={{ fontSize: '13px', padding: '5px 12px' }} onClick={() => startEdit(semester)}>✏️ Edit</button>
                          <button className="btn-secondary" style={{ fontSize: '13px', padding: '5px 12px', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }} onClick={() => deleteSemester(semester)}>🗑 Delete</button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <CreateSemesterModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            loadSemesters();
          }}
        />
      )}
    </div>
  );
}
