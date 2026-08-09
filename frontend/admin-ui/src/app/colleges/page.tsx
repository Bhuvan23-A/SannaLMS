'use client';
import { useState, useEffect } from 'react';
import Topbar from "@/components/Topbar";
import CreateCollegeModal from "@/components/CreateCollegeModal";
import RoleGuard from "@/components/RoleGuard";
import { fetchApi } from "@/lib/api";

export default function CollegesPage() {
  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [editSubdomain, setEditSubdomain] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [flash, setFlash] = useState('');

  const showFlash = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(''), 4000); };

  const loadColleges = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/api/v1/colleges');
      setColleges(data);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadColleges();
  }, []);

  const openEdit = (college: any) => {
    setEditing(college);
    setEditName(college.name);
    setEditSubdomain(college.subdomain || '');
    setEditError('');
  };

  const saveEdit = async (e: any) => {
    e.preventDefault();
    if (!editing) return;
    try {
      setEditSaving(true);
      await fetchApi(`/api/v1/colleges/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: editName, subdomain: editSubdomain }),
      });
      setEditing(null);
      showFlash('✅ College updated');
      loadColleges();
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditSaving(false);
    }
  };

  const deleteCollege = async (college: any) => {
    if (!window.confirm(`Delete "${college.name}"?\n\nThis soft-deletes the college and its admin can no longer access the platform. This cannot be undone.`)) return;
    try {
      await fetchApi(`/api/v1/colleges/${college.id}`, { method: 'DELETE' });
      showFlash(`🗑 "${college.name}" deleted`);
      loadColleges();
    } catch (err: any) {
      alert(err.message || 'Failed to delete college');
    }
  };

  return (
    <RoleGuard allowedRoles={['SUPER_ADMIN']}>
    <div className="animate-fade-in">
      <Topbar title="Colleges Management" />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 style={{ margin: 0 }}>All Colleges</h3>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>+ Add College</button>
      </div>

      {flash && (
        <div className="glass-panel" style={{ padding: '14px 18px', marginBottom: '18px', borderLeft: '4px solid #00c864', background: 'rgba(0,200,100,0.1)' }}>
          {flash}
        </div>
      )}

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
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Subdomain</th>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>College Admin</th>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Created By</th>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center' }}>Loading...</td></tr>
            ) : colleges.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center' }}>No colleges found.</td></tr>
            ) : (
              colleges.map((college) => {
                const admin = (college.users || []).find((ur: any) => ur.role === 'COLLEGE_ADMIN');
                return (
                <tr key={college.id} style={{ transition: 'background 0.2s ease' }} className="table-row">
                  <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>{college.name}</td>
                  <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>{college.subdomain}</td>
                  <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                    {admin?.user?.email ? (
                      <span style={{ color: 'var(--primary-color)' }}>{admin.user.email}</span>
                    ) : (
                      <span style={{ color: 'var(--text-secondary)' }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)' }}>{college.created_by}</td>
                  <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '12px', marginRight: '8px' }} onClick={() => openEdit(college)}>✏️ Edit</button>
                    <button
                      className="btn-secondary"
                      style={{ padding: '5px 12px', fontSize: '12px', color: 'var(--danger-color)', borderColor: 'rgba(239,68,68,0.4)' }}
                      onClick={() => deleteCollege(college)}
                    >🗑 Delete</button>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <CreateCollegeModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            loadColleges();
          }}
        />
      )}

      {editing && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <form onSubmit={saveEdit} className="panel" style={{
            width: '440px', maxWidth: '92vw', padding: '28px',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            boxShadow: '0 0 40px rgba(59, 130, 246, 0.2), 0 24px 60px rgba(0,0,0,0.6)',
            background: '#0f172a'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>✏️ Edit College</h2>
              <button type="button" onClick={() => setEditing(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
            {editError && (
              <div style={{ padding: '10px', background: 'rgba(239,68,68,0.2)', color: 'var(--danger-color)', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>
                {editError}
              </div>
            )}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>College Name</label>
              <input required className="input-field" value={editName} onChange={e => setEditName(e.target.value)} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Subdomain</label>
              <input required className="input-field" value={editSubdomain} onChange={e => setEditSubdomain(e.target.value)} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn-secondary" onClick={() => setEditing(null)} disabled={editSaving}>Cancel</button>
              <button type="submit" className="btn-primary" disabled={editSaving}>{editSaving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
    </RoleGuard>
  );
}
