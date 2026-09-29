'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
import { 
  Users, Key, Search, Building2, Shield, Eye, EyeOff, Lock, 
  RefreshCw, Check, X, UserPlus, UserCheck, AlertCircle, Copy
} from 'lucide-react';

export default function UsersDirectoryPage() {
  const { role } = useRole();
  const isCollegeAdmin = role === 'COLLEGE_ADMIN';

  const [users, setUsers] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCollege, setSelectedCollege] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');

  // Password reset modal state
  const [resetModalUser, setResetModalUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('Student@123');
  const [showPassword, setShowPassword] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');
  const [resetError, setResetError] = useState('');
  const [copied, setCopied] = useState(false);

  // Role change modal state
  const [roleModalUser, setRoleModalUser] = useState<any | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState('PRIMARY_TRAINER');
  const [roleUpdating, setRoleUpdating] = useState(false);
  const [roleSuccess, setRoleSuccess] = useState('');
  const [roleError, setRoleError] = useState('');

  useEffect(() => {
    loadData();
  }, [selectedCollege, selectedRole]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [collegesData, usersData] = await Promise.all([
        fetchApi('/api/v1/colleges').catch(() => []),
        fetchApi(`/api/v1/users?${selectedCollege ? `college_id=${selectedCollege}&` : ''}${selectedRole !== 'ALL' ? `role=${selectedRole.toLowerCase()}&` : ''}`).catch(() => [])
      ]);
      const clgs = Array.isArray(collegesData) ? collegesData : [];
      setColleges(clgs);
      if (clgs.length === 1 && !selectedCollege) {
        setSelectedCollege(clgs[0].id);
      }
      setUsers(Array.isArray(usersData) ? usersData : []);
    } catch (err) {
      console.error('Failed to load user directory', err);
    } finally {
      setLoading(false);
    }
  };

  const openRoleModal = (user: any) => {
    setRoleModalUser(user);
    setSelectedNewRole(user.role || 'PRIMARY_TRAINER');
    setRoleSuccess('');
    setRoleError('');
  };

  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleModalUser) return;
    setRoleUpdating(true);
    setRoleError('');
    setRoleSuccess('');
    try {
      const res = await fetchApi(`/api/v1/users/${roleModalUser.id}/role`, {
        method: 'POST',
        body: JSON.stringify({ role: selectedNewRole })
      });
      setRoleSuccess(res.message || 'User role updated successfully!');
      setUsers(prev => prev.map(u => u.id === roleModalUser.id ? { ...u, role: selectedNewRole } : u));
    } catch (err: any) {
      setRoleError(err.message || 'Failed to update role');
    } finally {
      setRoleUpdating(false);
    }
  };

  const openResetModal = (user: any) => {
    setResetModalUser(user);
    setNewPassword(user.role === 'STUDENT' ? 'Student@123' : 'Admin@123');
    setShowPassword(false);
    setResetSuccess('');
    setResetError('');
    setCopied(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;
    if (!newPassword || newPassword.length < 6) {
      setResetError('Password must be at least 6 characters long');
      return;
    }
    setResetting(true);
    setResetError('');
    setResetSuccess('');
    try {
      const res = await fetchApi(`/api/v1/users/${resetModalUser.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password: newPassword })
      });
      setResetSuccess(res.message || 'Password reset successfully!');
    } catch (err: any) {
      setResetError(err.message || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  const copyCredentials = () => {
    if (!resetModalUser) return;
    const text = `SannaLMS Credentials:\nEmail: ${resetModalUser.email}\nPassword: ${newPassword}\nPortal: https://sannalms.sannainnovations.com`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredUsers = users.filter((u: any) => {
    const q = search.toLowerCase();
    const fullName = `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase();
    const email = (u.email || '').toLowerCase();
    const matchesSearch = !q || fullName.includes(q) || email.includes(q);
    return matchesSearch;
  });

  const studentsCount = users.filter((u: any) => u.role === 'STUDENT').length;
  const facultyCount = users.filter((u: any) => ['PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'INSTRUCTOR'].includes(u.role)).length;
  const adminsCount = users.filter((u: any) => ['SUPER_ADMIN', 'COLLEGE_ADMIN'].includes(u.role)).length;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: '#fff' }}>
            {isCollegeAdmin ? 'Institution Student Directory & Password Control' : 'User Directory & Password Management'}
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
            {isCollegeAdmin ? 'Manage your institution student and faculty accounts, control login credentials, and reset passwords' : 'Manage student & faculty accounts, recover credentials, and set secure passwords'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button 
            onClick={loadData}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
          <Link
            href="/users/import"
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', textDecoration: 'none' }}
          >
            <UserPlus size={14} /> Bulk Import Users
          </Link>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1.25rem', background: 'rgba(10, 27, 53, 0.75)', border: '1px solid rgba(56, 189, 248, 0.22)', borderTop: '2px solid #38bdf8', borderRadius: '12px', boxShadow: '0 8px 24px rgba(2, 12, 27, 0.5)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Total Users</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginTop: '4px' }}>{users.length}</div>
        </div>
        <div className="card" style={{ padding: '1.25rem', background: 'rgba(10, 27, 53, 0.75)', border: '1px solid rgba(56, 189, 248, 0.22)', borderTop: '2px solid #38bdf8', borderRadius: '12px', boxShadow: '0 8px 24px rgba(2, 12, 27, 0.5)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Students</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#38bdf8', marginTop: '4px' }}>{studentsCount}</div>
        </div>
        <div className="card" style={{ padding: '1.25rem', background: 'rgba(10, 27, 53, 0.75)', border: '1px solid rgba(56, 189, 248, 0.22)', borderTop: '2px solid #38bdf8', borderRadius: '12px', boxShadow: '0 8px 24px rgba(2, 12, 27, 0.5)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Faculty / Trainers</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#7dd3fc', marginTop: '4px' }}>{facultyCount}</div>
        </div>
        <div className="card" style={{ padding: '1.25rem', background: 'rgba(10, 27, 53, 0.75)', border: '1px solid rgba(56, 189, 248, 0.22)', borderTop: '2px solid #38bdf8', borderRadius: '12px', boxShadow: '0 8px 24px rgba(2, 12, 27, 0.5)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700 }}>Administrators</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>{adminsCount}</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card" style={{ padding: '1.25rem', marginBottom: '1.5rem', background: 'rgba(10, 27, 53, 0.75)', border: '1px solid rgba(56, 189, 248, 0.22)', borderRadius: '12px', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            className="input-field"
            placeholder="Search by student or faculty name, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '38px', width: '100%' }}
          />
        </div>

        {isCollegeAdmin && colleges.length <= 1 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(14, 165, 233, 0.15)', border: '1px solid rgba(56, 189, 248, 0.35)', padding: '8px 14px', borderRadius: '8px', color: '#38bdf8', fontSize: '13px', fontWeight: 600 }}>
            <Building2 size={14} /> {colleges[0]?.name || 'My Institution'}
          </div>
        ) : (
          colleges.length > 0 && (
            <div style={{ minWidth: '200px' }}>
              <select
                className="input-field"
                value={selectedCollege}
                onChange={(e) => setSelectedCollege(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">All Colleges / Institutions</option>
                {colleges.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )
        )}

        <div style={{ minWidth: '160px' }}>
          <select
            className="input-field"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            style={{ width: '100%' }}
          >
            <option value="ALL">All Roles</option>
            <option value="STUDENT">Students</option>
            <option value="PRIMARY_TRAINER">Trainers / Faculty</option>
            <option value="COLLEGE_ADMIN">College Admins</option>
            <option value="SUPER_ADMIN">Super Admins</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="card" style={{ overflow: 'hidden', padding: 0, background: 'rgba(10, 27, 53, 0.75)', border: '1px solid rgba(56, 189, 248, 0.22)', borderTop: '2px solid #38bdf8', borderRadius: '12px', boxShadow: '0 8px 24px rgba(2, 12, 27, 0.5)' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <RefreshCw size={28} className="animate-spin" style={{ margin: '0 auto 1rem', color: '#38bdf8' }} />
            <p>Loading user directory...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            <Users size={32} style={{ margin: '0 auto 1rem', color: 'var(--text-secondary)' }} />
            <p>No users matching the selected filters.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'rgba(14, 165, 233, 0.1)', borderBottom: '1px solid rgba(56, 189, 248, 0.2)' }}>
                  <th style={{ padding: '14px 16px', color: '#7dd3fc', fontWeight: 600 }}>User / Candidate</th>
                  <th style={{ padding: '14px 16px', color: '#7dd3fc', fontWeight: 600 }}>Role</th>
                  <th style={{ padding: '14px 16px', color: '#7dd3fc', fontWeight: 600 }}>Institution / Cohort</th>
                  <th style={{ padding: '14px 16px', color: '#7dd3fc', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u: any) => {
                  const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email.split('@')[0];
                  const initials = fullName.slice(0, 2).toUpperCase();
                  const collegeName = colleges.find((c: any) => c.id === u.college_id)?.name || u.tenant_id || '—';

                  let roleBadge = 'badge-secondary';
                  if (u.role === 'STUDENT') roleBadge = 'badge-info';
                  if (['PRIMARY_TRAINER', 'TEACHING_ASSISTANT'].includes(u.role)) roleBadge = 'badge-warning';
                  if (['SUPER_ADMIN', 'COLLEGE_ADMIN'].includes(u.role)) roleBadge = 'badge-success';

                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid rgba(56, 189, 248, 0.08)', transition: 'background 0.15s' }}>
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '34px', height: '34px', borderRadius: '8px', background: 'rgba(14, 165, 233, 0.18)', border: '1px solid rgba(56, 189, 248, 0.35)', color: '#38bdf8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#fff' }}>{fullName}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px' }}>
                        <span className={`badge ${roleBadge}`} style={{ fontSize: '11px', textTransform: 'capitalize' }}>
                          {u.role ? u.role.replace(/_/g, ' ').toLowerCase() : 'student'}
                        </span>
                      </td>
                      <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Building2 size={13} color="var(--text-secondary)" />
                          <span>{collegeName}</span>
                        </div>
                      </td>
                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(14, 165, 233, 0.15)', border: '1px solid rgba(56, 189, 248, 0.35)', color: '#38bdf8', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                            onClick={() => openRoleModal(u)}
                            title="Change User Role / RBAC"
                          >
                            <Shield size={13} color="#38bdf8" /> Change Role
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', color: 'var(--text-secondary)', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                            onClick={() => openResetModal(u)}
                            title="Reset Password"
                          >
                            <Key size={13} /> Reset Password
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Password Reset Modal */}
      {resetModalUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ background: '#07152b', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '1.25rem', width: '100%', maxWidth: '480px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.9), 0 0 25px rgba(14, 165, 233, 0.2)' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(56, 189, 248, 0.15)', background: 'rgba(14, 165, 233, 0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ background: 'rgba(14, 165, 233, 0.18)', border: '1px solid rgba(56, 189, 248, 0.35)', padding: '8px', borderRadius: '8px', color: '#38bdf8' }}>
                  <Key size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: 0 }}>Reset User Password</h3>
                  <span style={{ fontSize: '0.75rem', color: '#7dd3fc' }}>Update credential for student or faculty</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetModalUser(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleResetPassword} style={{ padding: '1.5rem' }}>
              
              {/* User info callout */}
              <div style={{ background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>
                  {[resetModalUser.first_name, resetModalUser.last_name].filter(Boolean).join(' ') || resetModalUser.email}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#38bdf8' }}>{resetModalUser.email}</div>
              </div>

              {resetError && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={15} /> {resetError}
                </div>
              )}

              {resetSuccess && (
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', padding: '1rem', borderRadius: '8px', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.85rem', marginBottom: '6px' }}>
                    <Check size={16} /> {resetSuccess}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 10px 0' }}>
                    The password has been synced directly with Keycloak SSO. Share the new credentials with the user:
                  </p>
                  <button
                    type="button"
                    onClick={copyCredentials}
                    style={{ background: 'rgba(14, 165, 233, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                  >
                    {copied ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                    {copied ? 'Copied to Clipboard!' : 'Copy Credentials'}
                  </button>
                </div>
              )}

              {!resetSuccess && (
                <>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      New Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="input-field"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new secure password"
                        style={{ width: '100%', paddingRight: '40px' }}
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Preset quick buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setNewPassword('Student@123')}
                      style={{ background: 'rgba(14, 165, 233, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', color: '#38bdf8', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Use "Student@123"
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewPassword('Admin@123')}
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)', fontSize: '0.75rem', padding: '4px 10px', borderRadius: '6px', cursor: 'pointer' }}
                    >
                      Use "Admin@123"
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setResetModalUser(null)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={resetting}
                      className="btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Lock size={14} />
                      {resetting ? 'Updating...' : 'Save & Update Password'}
                    </button>
                  </div>
                </>
              )}

              {resetSuccess && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setResetModalUser(null)}
                    className="btn-primary"
                  >
                    Done
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Role Change Modal */}
      {roleModalUser && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ background: '#07152b', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '1.25rem', width: '100%', maxWidth: '480px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.9), 0 0 25px rgba(14, 165, 233, 0.2)' }}>
            
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(56, 189, 248, 0.15)', background: 'linear-gradient(to right, rgba(14, 165, 233, 0.15), rgba(7, 21, 43, 0.8))', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(14, 165, 233, 0.2)', border: '1px solid rgba(56, 189, 248, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={18} color="#38bdf8" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, color: '#fff' }}>Change User Role / RBAC</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0 }}>Assign permissions across LMS &amp; Keycloak</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRoleModalUser(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdateRole} style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.25rem', background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '10px', padding: '12px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Target User</div>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem' }}>
                  {[roleModalUser.first_name, roleModalUser.last_name].filter(Boolean).join(' ') || roleModalUser.email}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#7dd3fc' }}>{roleModalUser.email}</div>
                <div style={{ marginTop: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Current Role:</span>
                  <span className="badge badge-info" style={{ textTransform: 'capitalize' }}>
                    {roleModalUser.role ? roleModalUser.role.replace(/_/g, ' ').toLowerCase() : 'student'}
                  </span>
                </div>
              </div>

              {roleSuccess ? (
                <div style={{ background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.4)', borderRadius: '10px', padding: '14px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Check size={20} color="#10b981" />
                  <div>
                    <div style={{ fontWeight: 600, color: '#10b981', fontSize: '0.85rem' }}>Success</div>
                    <div style={{ fontSize: '0.8rem', color: '#a7f3d0' }}>{roleSuccess}</div>
                  </div>
                </div>
              ) : (
                <>
                  {roleError && (
                    <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', borderRadius: '10px', padding: '12px', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <AlertCircle size={18} color="#ef4444" />
                      <div style={{ fontSize: '0.8rem', color: '#fca5a5' }}>{roleError}</div>
                    </div>
                  )}

                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#7dd3fc', marginBottom: '6px' }}>
                      Select New Role:
                    </label>
                    <select
                      className="input-field"
                      value={selectedNewRole}
                      onChange={(e) => setSelectedNewRole(e.target.value)}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', background: 'rgba(15, 23, 42, 0.9)', color: '#fff', border: '1px solid rgba(56, 189, 248, 0.3)' }}
                    >
                      <option value="PRIMARY_TRAINER">Trainer / Faculty (Teaching Tools, Attendance, Live Classes, Quizzes)</option>
                      <option value="STUDENT">Student (Course Learning, Assignments, Tests)</option>
                      <option value="TEACHING_ASSISTANT">Teaching Assistant (Assist courses &amp; grading)</option>
                      {!isCollegeAdmin && <option value="COLLEGE_ADMIN">College Admin (Institutional administrator)</option>}
                    </select>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => setRoleModalUser(null)}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={roleUpdating}
                      className="btn-primary"
                      style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Shield size={14} />
                      {roleUpdating ? 'Saving...' : 'Apply Role'}
                    </button>
                  </div>
                </>
              )}

              {roleSuccess && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setRoleModalUser(null)}
                    className="btn-primary"
                  >
                    Done
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
