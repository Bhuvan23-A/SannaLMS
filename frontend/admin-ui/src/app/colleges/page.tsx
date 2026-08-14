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
  // College-admin access: assign an admin and/or reset their password (#fix)
  const [assignAdminCollege, setAssignAdminCollege] = useState<any>(null);
  const [assignAdminEmail, setAssignAdminEmail] = useState('');
  const [assignAdminSaving, setAssignAdminSaving] = useState(false);
  const [assignAdminError, setAssignAdminError] = useState('');
  const [assignAdminResult, setAssignAdminResult] = useState<any>(null);
  const [resetPasswordCollege, setResetPasswordCollege] = useState<any>(null);
  const [resetPasswordSaving, setResetPasswordSaving] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [resetPasswordResult, setResetPasswordResult] = useState<any>(null);
  const [busy, setBusy] = useState(''); // college id currently being held/restored/deleted

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

  const holdCollege = async (college: any) => {
    if (!window.confirm(`Hold "${college.name}"?\n\nThe college is hidden from the platform and ALL its users (admin, trainers, students) are blocked from logging in. No data is deleted — you can Restore it anytime.`)) return;
    try {
      setBusy(college.id);
      await fetchApi(`/api/v1/colleges/${college.id}/hold`, { method: 'POST' });
      showFlash(`⏸ "${college.name}" held — all logins blocked, data kept`);
      loadColleges();
    } catch (err: any) {
      alert(err.message || 'Failed to hold college');
    } finally {
      setBusy('');
    }
  };

  const restoreCollege = async (college: any) => {
    if (!window.confirm(`Restore "${college.name}"?\n\nThe college reappears on the platform and all its users can log in again.`)) return;
    try {
      setBusy(college.id);
      await fetchApi(`/api/v1/colleges/${college.id}/restore`, { method: 'POST' });
      showFlash(`✅ "${college.name}" restored`);
      loadColleges();
    } catch (err: any) {
      alert(err.message || 'Failed to restore college');
    } finally {
      setBusy('');
    }
  };

  const deleteCollegeForever = async (college: any) => {
    if (!window.confirm(`⚠️ PERMANENTLY DELETE "${college.name}"?\n\nThis deletes the college, ALL its data (departments, branches, semesters, courses, students, grades, attendance, question banks, notifications) and permanently removes every user account.\n\nThis CANNOT be undone. Type the college name to confirm:\n\n"${college.name}"`)) return;
    const typed = window.prompt(`Type "${college.name}" to confirm permanent deletion:`);
    if (typed !== college.name) { alert('Deletion cancelled — name did not match.'); return; }
    try {
      setBusy(college.id);
      await fetchApi(`/api/v1/colleges/${college.id}`, { method: 'DELETE' });
      showFlash(`🗑 "${college.name}" permanently deleted`);
      loadColleges();
    } catch (err: any) {
      alert(err.message || 'Failed to delete college');
    } finally {
      setBusy('');
    }
  };

  const openAssignAdmin = (college: any) => {
    setAssignAdminCollege(college);
    setAssignAdminEmail('');
    setAssignAdminError('');
    setAssignAdminResult(null);
  };

  const submitAssignAdmin = async (e: any) => {
    e.preventDefault();
    if (!assignAdminCollege) return;
    try {
      setAssignAdminSaving(true);
      setAssignAdminError('');
      const res = await fetchApi(`/api/v1/colleges/${assignAdminCollege.id}/admin`, {
        method: 'POST',
        body: JSON.stringify({ email: assignAdminEmail.trim() }),
      });
      setAssignAdminResult(res);
      loadColleges();
    } catch (err: any) {
      setAssignAdminError(err.message);
    } finally {
      setAssignAdminSaving(false);
    }
  };

  const openResetPassword = async (college: any) => {
    setResetPasswordCollege(college);
    setResetPasswordError('');
    setResetPasswordResult(null);
    try {
      setResetPasswordSaving(true);
      const res = await fetchApi(`/api/v1/colleges/${college.id}/admin/reset-password`, { method: 'POST' });
      setResetPasswordResult(res);
    } catch (err: any) {
      setResetPasswordError(err.message);
    } finally {
      setResetPasswordSaving(false);
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
                const held = college.status === 'HELD';
                const isBusy = busy === college.id;
                return (
                <tr key={college.id} style={{ transition: 'background 0.2s ease', opacity: held ? 0.65 : 1 }} className="table-row">
                  <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                    {college.name}{" "}
                    {held ? (
                      <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>⏸ ON HOLD</span>
                    ) : (
                      <span style={{ background: 'rgba(0,200,100,0.12)', color: '#00c864', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>● ACTIVE</span>
                    )}
                  </td>
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
                    {held ? (
                      <>
                        <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '12px', marginRight: '8px' }} onClick={() => restoreCollege(college)} disabled={isBusy}>✅ Restore</button>
                        <button
                          className="btn-secondary"
                          style={{ padding: '5px 12px', fontSize: '12px', color: 'var(--danger-color)', borderColor: 'rgba(239,68,68,0.4)' }}
                          onClick={() => deleteCollegeForever(college)}
                          disabled={isBusy}
                        >🗑 Delete Forever</button>
                      </>
                    ) : (
                      <>
                        <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '12px', marginRight: '8px' }} onClick={() => openEdit(college)}>✏️ Edit</button>
                        <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '12px', marginRight: '8px' }} onClick={() => openAssignAdmin(college)}>👤 Admin</button>
                        <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '12px', marginRight: '8px' }} onClick={() => openResetPassword(college)} disabled={resetPasswordSaving}>🔑 Reset Pwd</button>
                        <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '12px', marginRight: '8px' }} onClick={() => holdCollege(college)} disabled={isBusy}>⏸ Hold</button>
                        <button
                          className="btn-secondary"
                          style={{ padding: '5px 12px', fontSize: '12px', color: 'var(--danger-color)', borderColor: 'rgba(239,68,68,0.4)' }}
                          onClick={() => deleteCollegeForever(college)}
                          disabled={isBusy}
                        >🗑 Delete Forever</button>
                      </>
                    )}
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

      {/* Assign College Admin modal — how a super admin hands access to a college (#fix) */}
      {assignAdminCollege && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', overflowY: 'auto', padding: '20px',
          zIndex: 1000
        }}>
          <form onSubmit={submitAssignAdmin} className="panel" style={{ width: '440px', maxWidth: '92vw', padding: '28px', border: '1px solid rgba(59, 130, 246, 0.4)', background: '#0f172a', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>👤 College Admin Access</h2>
              <button type="button" onClick={() => setAssignAdminCollege(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              College: <strong>{assignAdminCollege.name}</strong>
            </p>
            {assignAdminError && (
              <div style={{ padding: '10px', background: 'rgba(239,68,68,0.2)', color: 'var(--danger-color)', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>{assignAdminError}</div>
            )}
            {assignAdminResult ? (
              <div style={{ background: 'rgba(0,200,100,0.08)', border: '1px solid rgba(0,200,100,0.3)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', marginBottom: '8px' }}>✅ Admin created / linked. Share these credentials with the college admin:</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Username: <strong>{assignAdminResult.admin_username}</strong>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Password: <strong>{assignAdminResult.admin_password}</strong>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '8px' }}>Sign in at the student portal — the platform routes admins to the admin dashboard automatically.</div>
              </div>
            ) : (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Admin email</label>
                <input required type="email" className="input-field" placeholder="admin@college.edu" value={assignAdminEmail} onChange={e => setAssignAdminEmail(e.target.value)} />
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {!assignAdminResult && (
                <button type="submit" className="btn-primary" disabled={assignAdminSaving}>{assignAdminSaving ? 'Creating...' : 'Create Admin & Get Credentials'}</button>
              )}
              <button type="button" className="btn-secondary" onClick={() => setAssignAdminCollege(null)}>Close</button>
            </div>
          </form>
        </div>
      )}

      {/* Reset admin password modal — shows the fresh credentials once (#fix) */}
      {resetPasswordCollege && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', overflowY: 'auto', padding: '20px',
          zIndex: 1000
        }}>
          <div className="panel" style={{ width: '440px', maxWidth: '92vw', padding: '28px', border: '1px solid rgba(59, 130, 246, 0.4)', background: '#0f172a', margin: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>🔑 Reset Admin Password</h2>
              <button type="button" onClick={() => setResetPasswordCollege(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>✕</button>
            </div>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              College: <strong>{resetPasswordCollege.name}</strong>
            </p>
            {resetPasswordError && (
              <div style={{ padding: '10px', background: 'rgba(239,68,68,0.2)', color: 'var(--danger-color)', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>{resetPasswordError}</div>
            )}
            {resetPasswordResult ? (
              <div style={{ background: 'rgba(0,200,100,0.08)', border: '1px solid rgba(0,200,100,0.3)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                <div style={{ fontSize: '14px', marginBottom: '8px' }}>✅ Password reset. Share these credentials with the college admin:</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Username: <strong>{resetPasswordResult.admin_username}</strong>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Password: <strong>{resetPasswordResult.admin_password}</strong>
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>{resetPasswordSaving ? 'Resetting...' : 'This resets the college admin password to the default and shows it here once.'}</p>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn-secondary" onClick={() => setResetPasswordCollege(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', overflowY: 'auto', padding: '20px',
          zIndex: 1000
        }}>
          <form onSubmit={saveEdit} className="panel" style={{
            width: '440px', maxWidth: '92vw', padding: '28px',
            border: '1px solid rgba(59, 130, 246, 0.4)',
            boxShadow: '0 0 40px rgba(59, 130, 246, 0.2), 0 24px 60px rgba(0,0,0,0.6)',
            background: '#0f172a', margin: 'auto'
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
