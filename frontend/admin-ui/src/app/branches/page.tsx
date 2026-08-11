'use client';
import { useState, useEffect } from 'react';
import Topbar from "@/components/Topbar";
import { fetchApi } from "@/lib/api";
import { useColleges } from "@/hooks/useColleges";
import CreateBranchModal from "@/components/CreateBranchModal";

export default function BranchesPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  // College context (#fix): super admin filters by college; the department
  // dropdown cascades to the selected college's departments only.
  const { isSuperAdmin, activeColleges, collegeName } = useColleges();
  const [collegeFilter, setCollegeFilter] = useState('');
  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDepartmentId, setEditDepartmentId] = useState('');
  const [saving, setSaving] = useState(false);

  const loadBranches = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/api/v1/branches');
      setBranches(Array.isArray(data) ? data : []);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
    fetchApi('/api/v1/departments').then(d => setDepartments(Array.isArray(d) ? d : [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startEdit = (b: any) => {
    setEditingId(b.id);
    setEditName(b.name);
    setEditDepartmentId(b.department_id || '');
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    try {
      await fetchApi(`/api/v1/branches/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName, department_id: editDepartmentId || undefined }),
      });
      setEditingId(null);
      loadBranches();
    } catch (err: any) {
      alert('Failed to update branch: ' + (err.message || 'error'));
    } finally {
      setSaving(false);
    }
  };

  const deleteBranch = async (b: any) => {
    if (!confirm(`Delete branch "${b.name}"? This cannot be undone.`)) return;
    try {
      await fetchApi(`/api/v1/branches/${b.id}`, { method: 'DELETE' });
      loadBranches();
    } catch (err: any) {
      alert('Failed to delete branch: ' + (err.message || 'error'));
    }
  };

  const deptName = (id: string) => departments.find(d => d.id === id)?.name || id;

  // Branches carry their department (getBranches includes department), so the
  // college of a branch is department.college_id.
  const visibleDepartments = departments.filter((d: any) => !collegeFilter || d.college_id === collegeFilter);

  const filtered = branches.filter(b => {
    const bCollegeId = b.department?.college_id;
    if (collegeFilter && bCollegeId !== collegeFilter) return false;
    if (departmentFilter && b.department_id !== departmentFilter) return false;
    if (search && !b.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="animate-fade-in">
      <Topbar title="Branches Management" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>All Branches</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            className="input-field"
            placeholder="🔍 Search branches..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '200px' }}
          />
          {isSuperAdmin && activeColleges.length > 0 && (
            <select className="input-field" style={{ maxWidth: '220px' }} value={collegeFilter} onChange={e => { setCollegeFilter(e.target.value); setDepartmentFilter(''); }}>
              <option value="">All colleges</option>
              {activeColleges.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <select className="input-field" style={{ maxWidth: '220px' }} value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)}>
            <option value="">All departments</option>
            {visibleDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>+ Add Branch</button>
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
              {isSuperAdmin && <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>College</th>}
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Department</th>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Semesters</th>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center' }}>Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center' }}>No branches found.</td></tr>
            ) : (
              filtered.map((branch) => (
                <tr key={branch.id} style={{ transition: 'background 0.2s ease' }} className="table-row">
                  {editingId === branch.id ? (
                    <>
                      <td style={{ padding: '12px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                        <input className="input-field" value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%' }} />
                      </td>
                      {isSuperAdmin && <td style={{ padding: '12px 20px', borderBottom: '1px solid var(--panel-border)' }}>{collegeName(branch.department?.college_id)}</td>}
                      <td style={{ padding: '12px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                        <select className="input-field" value={editDepartmentId} onChange={e => setEditDepartmentId(e.target.value)} style={{ width: '100%' }}>
                          <option value="">Select department</option>
                          {visibleDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '12px 20px', borderBottom: '1px solid var(--panel-border)' }}>{branch.semesters?.length || 0}</td>
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
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>{branch.name}</td>
                      {isSuperAdmin && <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>{collegeName(branch.department?.college_id)}</td>}
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>{deptName(branch.department_id)}</td>
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                        <span className="badge badge-info">{branch.semesters?.length || 0}</span>
                      </td>
                      <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn-secondary" style={{ fontSize: '13px', padding: '5px 12px' }} onClick={() => startEdit(branch)}>✏️ Edit</button>
                          <button className="btn-secondary" style={{ fontSize: '13px', padding: '5px 12px', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }} onClick={() => deleteBranch(branch)}>🗑 Delete</button>
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
        <CreateBranchModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            loadBranches();
          }}
        />
      )}
    </div>
  );
}
