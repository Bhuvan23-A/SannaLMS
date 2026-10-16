'use client';
import { useState, useEffect } from 'react';
import Topbar from "@/components/Topbar";
import { fetchApi } from "@/lib/api";
import { useColleges } from "@/hooks/useColleges";
import CreateDepartmentModal from "@/components/CreateDepartmentModal";

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // College context (#fix): super admins see every college mixed together, so
  // let them filter by college and show which college each department belongs to.
  const { isSuperAdmin, activeColleges, collegeName } = useColleges();
  const [collegeFilter, setCollegeFilter] = useState('');

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/api/v1/departments');
      setDepartments(data);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteDepartment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      await fetchApi(`/api/v1/departments/${id}`, { method: 'DELETE' });
      loadDepartments();
    } catch (err: any) {
      alert(err.message);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredDepts = departments
    .filter((d: any) => !collegeFilter || d.college_id === collegeFilter)
    .filter((d: any) => !searchQuery || d.name?.toLowerCase().includes(searchQuery.toLowerCase()) || d.code?.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="animate-fade-in">
      <Topbar title="Departments Management" />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ margin: 0 }}>Academic Departments</h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Showing {filteredDepts.length} of {departments.length} departments
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            className="input-field"
            placeholder="🔍 Search department..."
            style={{ width: '220px' }}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {isSuperAdmin && activeColleges.length > 0 && (
            <select className="input-field" style={{ maxWidth: '200px' }} value={collegeFilter} onChange={e => setCollegeFilter(e.target.value)}>
              <option value="">All colleges</option>
              {activeColleges.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>+ Add Department</button>
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
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Department Name</th>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>College / Scope</th>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Created By</th>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Identifier</th>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '25px', textAlign: 'center' }}>Loading departments...</td></tr>
            ) : filteredDepts.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '25px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                {searchQuery || collegeFilter ? 'No departments match your filter.' : 'No departments found. Create a department to get started.'}
              </td></tr>
            ) : (
              filteredDepts.map((dept) => {
                const creator = !dept.created_by || dept.created_by === 'system-user' ? 'Super Administrator' : dept.created_by.includes('@') ? dept.created_by : 'Institutional Admin';
                return (
                  <tr key={dept.id} style={{ transition: 'background 0.2s ease' }} className="table-row">
                    <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                      <div style={{ fontWeight: 600 }}>{dept.name}</div>
                      {dept.code && <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>Code: {dept.code}</div>}
                    </td>
                    <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                      <span className="badge" style={{ fontSize: '11px', padding: '3px 8px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                        {isSuperAdmin ? collegeName(dept.college_id) : 'My College'}
                      </span>
                    </td>
                    <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                      <span title={dept.created_by || 'system'}>👤 {creator}</span>
                      {dept.created_at && (
                        <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>
                          {new Date(dept.created_at).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                      <button
                        onClick={() => copyId(dept.id)}
                        title={`Click to copy UUID: ${dept.id}`}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid var(--panel-border)',
                          borderRadius: '4px',
                          padding: '2px 8px',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          cursor: 'pointer',
                          color: copiedId === dept.id ? '#10b981' : 'var(--text-secondary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        {dept.id.substring(0, 8)}... {copiedId === dept.id ? '✓ Copied' : '📋'}
                      </button>
                    </td>
                    <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', textAlign: 'right' }}>
                      <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }} onClick={() => deleteDepartment(dept.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <CreateDepartmentModal 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => {
            setIsModalOpen(false);
            loadDepartments();
          }} 
        />
      )}
    </div>
  );
}
