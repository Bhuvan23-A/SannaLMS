'use client';
import { useState, useEffect } from 'react';
import Topbar from "@/components/Topbar";
import CreateCollegeModal from "@/components/CreateCollegeModal";
import RoleGuard from "@/components/RoleGuard";
import { fetchApi } from "@/lib/api";
import { Eye, EyeOff, Copy, Check, AlertTriangle, ShieldAlert, Trash2, Power } from 'lucide-react';

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
  // College-admin access: assign an admin and/or reset their password
  const [assignAdminCollege, setAssignAdminCollege] = useState<any>(null);
  const [assignAdminEmail, setAssignAdminEmail] = useState('');
  const [assignAdminSaving, setAssignAdminSaving] = useState(false);
  const [assignAdminError, setAssignAdminError] = useState('');
  const [assignAdminResult, setAssignAdminResult] = useState<any>(null);
  const [assignCopied, setAssignCopied] = useState(false);

  const [resetPasswordCollege, setResetPasswordCollege] = useState<any>(null);
  const [resetPasswordSaving, setResetPasswordSaving] = useState(false);
  const [resetPasswordError, setResetPasswordError] = useState('');
  const [resetPasswordResult, setResetPasswordResult] = useState<any>(null);
  const [resetCopied, setResetCopied] = useState(false);

  const [showAssignPassword, setShowAssignPassword] = useState(true);
  const [showResetPassword, setShowResetPassword] = useState(true);
  const [busy, setBusy] = useState(''); // college id currently being held/restored/deleted

  // Danger Zone state
  const [dangerCollege, setDangerCollege] = useState<any>(null);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

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
      showFlash('College updated');
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
      showFlash(` "${college.name}" held — all logins blocked, data kept`);
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
      showFlash(`"${college.name}" restored`);
      loadColleges();
    } catch (err: any) {
      alert(err.message || 'Failed to restore college');
    } finally {
      setBusy('');
    }
  };

  const deleteCollegeForever = async (college: any) => {
    if (!window.confirm(`PERMANENTLY DELETE "${college.name}"?\n\nThis deletes the college, ALL its data (departments, branches, semesters, courses, students, grades, attendance, question banks, notifications) and permanently removes every user account.\n\nThis CANNOT be undone. Type the college name to confirm:\n\n"${college.name}"`)) return;
    const typed = window.prompt(`Type "${college.name}" to confirm permanent deletion:`);
    if (typed !== college.name) { alert('Deletion cancelled — name did not match.'); return; }
    try {
      setBusy(college.id);
      await fetchApi(`/api/v1/colleges/${college.id}`, { method: 'DELETE' });
      showFlash(`"${college.name}" permanently deleted`);
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
                      <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}> ON HOLD</span>
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
                    <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '12px', marginRight: '6px' }} onClick={() => openEdit(college)}>Edit</button>
                    <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '12px', marginRight: '6px' }} onClick={() => openAssignAdmin(college)}>Admin</button>
                    <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '12px', marginRight: '6px' }} onClick={() => openResetPassword(college)} disabled={resetPasswordSaving}>Reset Pwd</button>
                    {held && (
                      <button className="btn-secondary" style={{ padding: '5px 12px', fontSize: '12px', marginRight: '6px', color: '#00c864', borderColor: '#00c864' }} onClick={() => restoreCollege(college)} disabled={isBusy}>
                        Restore
                      </button>
                    )}
                    <button
                      className="btn-secondary"
                      style={{ padding: '5px 12px', fontSize: '12px', color: '#f87171', borderColor: 'rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.06)' }}
                      onClick={() => { setDangerCollege(college); setDeleteConfirmInput(''); }}
                      disabled={isBusy}
                    >
                      ⚠️ Danger Zone
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
        <CreateCollegeModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            loadColleges();
          }}
        />
      )}

      {/* Danger Zone Modal */}
      {dangerCollege && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', overflowY: 'auto', padding: '20px',
          zIndex: 1000
        }}>
          <div className="panel animate-fade-in" style={{ width: '520px', maxWidth: '92vw', padding: '28px', border: '1px solid rgba(239, 68, 68, 0.5)', background: '#0f172a', margin: 'auto', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--danger-color)' }}>
                <AlertTriangle size={22} />
                <h2 style={{ margin: 0, fontSize: '18px' }}>Danger Zone: {dangerCollege.name}</h2>
              </div>
              <button type="button" onClick={() => setDangerCollege(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px' }}>
              Destructive tenant management actions for <strong>{dangerCollege.name}</strong> ({dangerCollege.tenant_id || dangerCollege.id}).
            </p>

            {/* Action 1: Hold / Restore */}
            <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>
                    {dangerCollege.status === 'HELD' ? 'Restore College Access' : 'Hold College Access'}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', maxWidth: '300px' }}>
                    {dangerCollege.status === 'HELD'
                      ? 'Re-enables student/faculty logins and restores the college on the platform.'
                      : 'Blocks all logins (admin, faculty, students) and hides college from standard directory. Reversible.'}
                  </div>
                </div>
                {dangerCollege.status === 'HELD' ? (
                  <button
                    className="btn-primary"
                    style={{ background: '#059669', borderColor: '#059669', fontSize: '12px', padding: '6px 14px' }}
                    onClick={() => {
                      const c = dangerCollege;
                      setDangerCollege(null);
                      restoreCollege(c);
                    }}
                  >
                    Restore
                  </button>
                ) : (
                  <button
                    className="btn-secondary"
                    style={{ borderColor: '#f59e0b', color: '#f59e0b', fontSize: '12px', padding: '6px 14px' }}
                    onClick={() => {
                      const c = dangerCollege;
                      setDangerCollege(null);
                      holdCollege(c);
                    }}
                  >
                    Hold College
                  </button>
                )}
              </div>
            </div>

            {/* Action 2: Delete Forever with typed confirmation */}
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--danger-color)', marginBottom: '4px' }}>
                Permanently Delete College
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 12px', lineHeight: 1.4 }}>
                This will <strong>irreversibly purge</strong> all departments, sections, course offerings, attendance, gradebooks, assessments, and user accounts belonging to this institution.
              </p>
              <label style={{ display: 'block', fontSize: '12px', marginBottom: '6px', color: 'var(--text-primary)' }}>
                To confirm, type <strong>{dangerCollege.name}</strong> below:
              </label>
              <input
                type="text"
                className="input-field"
                style={{ width: '100%', fontSize: '13px', marginBottom: '12px' }}
                placeholder={`Type "${dangerCollege.name}"`}
                value={deleteConfirmInput}
                onChange={e => setDeleteConfirmInput(e.target.value)}
              />
              <button
                className="btn-secondary"
                disabled={deleteConfirmInput !== dangerCollege.name || busy === dangerCollege.id}
                onClick={async () => {
                  const c = dangerCollege;
                  setDangerCollege(null);
                  try {
                    setBusy(c.id);
                    await fetchApi(`/api/v1/colleges/${c.id}`, { method: 'DELETE' });
                    showFlash(`"${c.name}" permanently deleted`);
                    loadColleges();
                  } catch (err: any) {
                    alert(err.message || 'Failed to delete college');
                  } finally {
                    setBusy('');
                  }
                }}
                style={{
                  width: '100%',
                  background: deleteConfirmInput === dangerCollege.name ? 'rgba(239,68,68,0.85)' : 'rgba(239,68,68,0.2)',
                  borderColor: 'var(--danger-color)',
                  color: '#fff',
                  padding: '8px 14px',
                  fontSize: '13px',
                  cursor: deleteConfirmInput === dangerCollege.name ? 'pointer' : 'not-allowed'
                }}
              >
                Permanently Delete This Tenant
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn-secondary" onClick={() => setDangerCollege(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Assign College Admin modal */}
      {assignAdminCollege && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', overflowY: 'auto', padding: '20px',
          zIndex: 1000
        }}>
          <form onSubmit={submitAssignAdmin} className="panel" style={{ width: '460px', maxWidth: '92vw', padding: '28px', border: '1px solid rgba(59, 130, 246, 0.4)', background: '#0f172a', margin: 'auto', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>College Admin Access</h2>
              <button type="button" onClick={() => setAssignAdminCollege(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              College: <strong>{assignAdminCollege.name}</strong>
            </p>
            {assignAdminError && (
              <div style={{ padding: '10px', background: 'rgba(239,68,68,0.2)', color: 'var(--danger-color)', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>{assignAdminError}</div>
            )}
            {assignAdminResult ? (
              <div style={{ background: 'rgba(0,200,100,0.08)', border: '1px solid rgba(0,200,100,0.3)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.15)', color: '#34d399', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    Temporary Password
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const text = `College: ${assignAdminCollege.name}\nUsername: ${assignAdminResult.admin_username}\nTemporary Password: ${assignAdminResult.admin_password}\nLogin URL: ${window.location.origin}\nNote: Password must be changed upon first login.`;
                      navigator.clipboard.writeText(text);
                      setAssignCopied(true);
                      setTimeout(() => setAssignCopied(false), 3000);
                    }}
                    className="btn-secondary"
                    style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {assignCopied ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                    {assignCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Username: <strong>{assignAdminResult.admin_username}</strong>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Password: <strong style={{ color: '#60a5fa' }}>{showAssignPassword ? assignAdminResult.admin_password : '••••••••••••'}</strong></span>
                  <button
                    type="button"
                    onClick={() => setShowAssignPassword(!showAssignPassword)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                    title={showAssignPassword ? 'Hide password' : 'Show password'}
                  >
                    {showAssignPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: '#fef08a', background: 'rgba(234,179,8,0.1)', padding: '8px', borderRadius: '4px', marginTop: '10px' }}>
                  Keycloak will require the admin to set their own permanent password on their first login.
                </div>
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

      {/* Reset admin password modal */}
      {resetPasswordCollege && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', overflowY: 'auto', padding: '20px',
          zIndex: 1000
        }}>
          <div className="panel" style={{ width: '460px', maxWidth: '92vw', padding: '28px', border: '1px solid rgba(59, 130, 246, 0.4)', background: '#0f172a', margin: 'auto', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px' }}>Reset Admin Password</h2>
              <button type="button" onClick={() => setResetPasswordCollege(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}>&times;</button>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              College: <strong>{resetPasswordCollege.name}</strong>
            </p>
            {resetPasswordError && (
              <div style={{ padding: '10px', background: 'rgba(239,68,68,0.2)', color: 'var(--danger-color)', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>{resetPasswordError}</div>
            )}
            {resetPasswordResult ? (
              <div style={{ background: 'rgba(0,200,100,0.08)', border: '1px solid rgba(0,200,100,0.3)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.15)', color: '#34d399', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    Temporary Password
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const text = `College: ${resetPasswordCollege.name}\nUsername: ${resetPasswordResult.admin_username}\nTemporary Password: ${resetPasswordResult.admin_password}\nLogin URL: ${window.location.origin}\nNote: Password must be changed upon first login.`;
                      navigator.clipboard.writeText(text);
                      setResetCopied(true);
                      setTimeout(() => setResetCopied(false), 3000);
                    }}
                    className="btn-secondary"
                    style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    {resetCopied ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                    {resetCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Username: <strong>{resetPasswordResult.admin_username}</strong>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>Password: <strong style={{ color: '#60a5fa' }}>{showResetPassword ? resetPasswordResult.admin_password : '••••••••••••'}</strong></span>
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                    title={showResetPassword ? 'Hide password' : 'Show password'}
                  >
                    {showResetPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <div style={{ fontSize: '12px', color: '#fef08a', background: 'rgba(234,179,8,0.1)', padding: '8px', borderRadius: '4px', marginTop: '10px' }}>
                  Temporary password reset. The admin will be prompted by Keycloak to choose a new password on login.
                </div>
              </div>
            ) : (
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>{resetPasswordSaving ? 'Generating secure credentials...' : 'This generates a secure temporary password and requires password reset on next login.'}</p>
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
            background: '#0f172a', margin: 'auto', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>Edit College</h2>
              <button type="button" onClick={() => setEditing(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}></button>
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
