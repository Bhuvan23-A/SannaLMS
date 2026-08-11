'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';

type TargetType = 'COLLEGE' | 'DEPARTMENT' | 'BRANCH' | 'SEMESTER' | 'COURSE' | 'ROLE' | 'USER';

export default function NotificationsPage() {
  const { isAdmin, role } = useRole();
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isCollegeAdmin = role === 'COLLEGE_ADMIN';
  const isTrainer = role === 'PRIMARY_TRAINER' || role === 'TEACHING_ASSISTANT';
  const [preferences, setPreferences] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendForm, setSendForm] = useState({ title: '', body: '', type: 'SYSTEM' });
  const [sendMsg, setSendMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sending, setSending] = useState(false);

  // Targeting state (role-scoped)
  const [targetType, setTargetType] = useState<TargetType>('USER');
  const [userIds, setUserIds] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [roleTarget, setRoleTarget] = useState('student');

  // Reference data
  const [colleges, setColleges] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);

  // Super admin sees every college's org rows mixed — scope them to the
  // selected college so targets are unambiguous (#fix)
  const selectedCollege = colleges.find((c: any) => c.id === collegeId);
  const collegeNameByTenant = (tid?: string) => colleges.find((c: any) => c.tenant_id === tid)?.name || '';
  const visibleCourses = courses.filter((c: any) => !isSuperAdmin || !selectedCollege || !c.tenant_id || c.tenant_id === selectedCollege.tenant_id);
  const visibleDepartments = departments.filter((d: any) => !isSuperAdmin || !selectedCollege || !d.tenant_id || d.tenant_id === selectedCollege.tenant_id);
  const visibleBranches = branches.filter((b: any) => !isSuperAdmin || !selectedCollege || !b.tenant_id || b.tenant_id === selectedCollege.tenant_id);
  const visibleSemesters = semesters.filter((s: any) => !isSuperAdmin || !selectedCollege || !s.tenant_id || s.tenant_id === selectedCollege.tenant_id);

  // Keep the selected course inside the selected college (super admin)
  useEffect(() => {
    if (visibleCourses.length === 0) return;
    if (!visibleCourses.some((c: any) => c.id === courseId)) setCourseId(visibleCourses[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCourses, courseId]);

  // Role-scoped target options (per requirement):
  //  Super admin: college / department / branch / semester / course / role / user
  //  College admin: department / branch / semester / course / role / user
  //  Primary trainer: course / user
  const allowedTargets: TargetType[] = isSuperAdmin
    ? ['COLLEGE', 'DEPARTMENT', 'BRANCH', 'SEMESTER', 'COURSE', 'ROLE', 'USER']
    : isCollegeAdmin
      ? ['DEPARTMENT', 'BRANCH', 'SEMESTER', 'COURSE', 'ROLE', 'USER']
      : ['COURSE', 'USER'];

  useEffect(() => {
    const initial = allowedTargets[0] || 'USER';
    setTargetType(initial);
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [histData, prefData, collegesData, depts, brs, sems, coursesData] = await Promise.all([
        fetchApi('/api/v1/notifications/history'),
        isAdmin ? fetchApi('/api/v1/notifications/preferences').catch(() => null) : Promise.resolve(null),
        isSuperAdmin ? fetchApi('/api/v1/colleges').catch(() => []) : Promise.resolve([]),
        (isSuperAdmin || isCollegeAdmin) ? fetchApi('/api/v1/departments').catch(() => []) : Promise.resolve([]),
        (isSuperAdmin || isCollegeAdmin) ? fetchApi('/api/v1/branches').catch(() => []) : Promise.resolve([]),
        (isSuperAdmin || isCollegeAdmin) ? fetchApi('/api/v1/semesters').catch(() => []) : Promise.resolve([]),
        fetchApi('/api/v1/courses').catch(() => []),
      ]);
      setPreferences(prefData);
      setHistory(histData || []);
      setColleges(Array.isArray(collegesData) ? collegesData : []);
      setDepartments(Array.isArray(depts) ? depts : []);
      setBranches(Array.isArray(brs) ? brs : []);
      setSemesters(Array.isArray(sems) ? sems : []);
      setCourses(Array.isArray(coursesData) ? coursesData : []);
      if (Array.isArray(collegesData) && collegesData.length > 0) setCollegeId(collegesData[0].id);
      if (Array.isArray(depts) && depts.length > 0) setDepartmentId(depts[0].id);
      if (Array.isArray(coursesData) && coursesData.length > 0) setCourseId(coursesData[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const buildTarget = () => {
    switch (targetType) {
      case 'USER':
        return { type: 'USER', user_ids: userIds.split(',').map(s => s.trim()).filter(Boolean) };
      case 'COLLEGE':
        return { type: 'COLLEGE', college_id: collegeId };
      case 'DEPARTMENT': {
        const dept = departments.find((d: any) => d.id === departmentId);
        return { type: 'DEPARTMENT', department: dept?.name, college_id: isSuperAdmin ? collegeId : undefined };
      }
      case 'BRANCH': {
        const branch = branches.find((b: any) => b.id === branchId);
        return { type: 'BRANCH', branch: branch?.name, college_id: isSuperAdmin ? collegeId : undefined };
      }
      case 'SEMESTER':
        return { type: 'SEMESTER', semester_id: semesterId, college_id: isSuperAdmin ? collegeId : undefined };
      case 'COURSE':
        return { type: 'COURSE', course_id: courseId };
      case 'ROLE':
        return { type: 'ROLE', role: roleTarget, college_id: isSuperAdmin ? collegeId : undefined };
      default:
        return null;
    }
  };

  const sendNotification = async (e: any) => {
    e.preventDefault();
    setSendMsg(null);
    const target = buildTarget();
    if (!target) { setSendMsg({ ok: false, text: 'Select a target first.' }); return; }
    if (targetType === 'USER' && (!Array.isArray(target.user_ids) || target.user_ids.length === 0)) {
      setSendMsg({ ok: false, text: 'Enter at least one user ID.' }); return;
    }
    try {
      setSending(true);
      const res = await fetchApi('/api/v1/notifications/send', {
        method: 'POST',
        body: JSON.stringify({ ...sendForm, channels: ['WEB'], target })
      });
      setSendMsg({ ok: true, text: `✅ Notification sent to ${res.recipients || 0} recipient(s).` });
      setSendForm({ title: '', body: '', type: 'SYSTEM' });
      loadData();
    } catch (err: any) {
      setSendMsg({ ok: false, text: err.message || 'Failed to send notification.' });
    } finally {
      setSending(false);
    }
  };

  const togglePreference = async (key: string) => {
    if (!preferences) return;
    const updated = { ...preferences, [key]: !preferences[key] };
    setPreferences(updated);
    try {
      await fetchApi('/api/v1/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify(updated),
      });
    } catch (err) {
      console.error(err);
      alert('Failed to update preferences');
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetchApi(`/api/v1/notifications/${id}/read`, { method: 'PUT' });
      setHistory(history.map(h => h.id === id ? { ...h, read: true } : h));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="fade-in" style={{ padding: '20px' }}>Loading notifications...</div>;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>Notifications Center</h1>
      </div>

      <div style={{ display: 'flex', gap: '30px', flexWrap: 'wrap' }}>
        {(isAdmin || isTrainer) && (
          <div className="panel" style={{ flex: 1, minWidth: '320px' }}>
            <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Send Notification</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
              {isSuperAdmin && 'Target any college, department, branch, semester, course, role, or specific users.'}
              {isCollegeAdmin && 'Target your college’s departments, branches, semesters, courses, roles, or specific users.'}
              {isTrainer && 'Trainers can target a course or specific students.'}
            </p>
            {sendMsg && (
              <div style={{ marginBottom: '15px', fontSize: '13px', color: sendMsg.ok ? 'var(--success-color)' : 'var(--danger-color)', background: sendMsg.ok ? 'rgba(0,200,100,0.1)' : 'rgba(239,68,68,0.1)', padding: '10px 12px', borderRadius: '8px' }}>
                {sendMsg.text}
              </div>
            )}
            <form onSubmit={sendNotification} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}>Target</label>
                <select className="input-field" value={targetType} onChange={e => setTargetType(e.target.value as TargetType)}>
                  {allowedTargets.map(t => (
                    <option key={t} value={t}>
                      {t === 'COLLEGE' ? '🏛️ Whole college' : t === 'DEPARTMENT' ? '🏢 Department' : t === 'BRANCH' ? '🌿 Branch' : t === 'SEMESTER' ? '📆 Semester' : t === 'COURSE' ? '📚 Course (students + trainers)' : t === 'ROLE' ? '👥 Role' : '👤 Specific users'}
                    </option>
                  ))}
                </select>
              </div>

              {targetType === 'USER' && (
                <input className="input-field" placeholder="User IDs (comma-separated)" value={userIds}
                  onChange={e => setUserIds(e.target.value)} />
              )}

              {targetType === 'COLLEGE' && colleges.length > 0 && (
                <select className="input-field" value={collegeId} onChange={e => { setCollegeId(e.target.value); setCourseId(''); setDepartmentId(''); setBranchId(''); setSemesterId(''); }}>
                  {colleges.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}

              {targetType === 'DEPARTMENT' && (
                <select className="input-field" value={departmentId} onChange={e => setDepartmentId(e.target.value)}>
                  {visibleDepartments.length === 0 && <option value="">{isSuperAdmin ? 'No departments in this college' : 'No departments'}</option>}
                  {visibleDepartments.map((d: any) => <option key={d.id} value={d.id}>{isSuperAdmin ? `${collegeNameByTenant(d.tenant_id) ? `${collegeNameByTenant(d.tenant_id)} · ` : ''}${d.name}` : d.name}</option>)}
                </select>
              )}

              {targetType === 'BRANCH' && (
                <select className="input-field" value={branchId} onChange={e => setBranchId(e.target.value)}>
                  {visibleBranches.length === 0 && <option value="">{isSuperAdmin ? 'No branches in this college' : 'No branches'}</option>}
                  {visibleBranches.map((b: any) => <option key={b.id} value={b.id}>{isSuperAdmin ? `${collegeNameByTenant(b.tenant_id) ? `${collegeNameByTenant(b.tenant_id)} · ` : ''}${b.name}` : b.name}</option>)}
                </select>
              )}

              {targetType === 'SEMESTER' && (
                <select className="input-field" value={semesterId} onChange={e => setSemesterId(e.target.value)}>
                  {visibleSemesters.length === 0 && <option value="">{isSuperAdmin ? 'No semesters in this college' : 'No semesters'}</option>}
                  {visibleSemesters.map((s: any) => <option key={s.id} value={s.id}>{isSuperAdmin ? `${collegeNameByTenant(s.tenant_id) ? `${collegeNameByTenant(s.tenant_id)} · ` : ''}${s.name}` : s.name}</option>)}
                </select>
              )}

              {targetType === 'COURSE' && (
                <select className="input-field" value={courseId} onChange={e => setCourseId(e.target.value)}>
                  {visibleCourses.length === 0 && <option value="">{isSuperAdmin ? 'No courses in this college' : 'No courses'}</option>}
                  {visibleCourses.map((c: any) => <option key={c.id} value={c.id}>{isSuperAdmin && collegeNameByTenant(c.tenant_id) ? `${collegeNameByTenant(c.tenant_id)} · ${c.title}` : c.title}</option>)}
                </select>
              )}

              {targetType === 'ROLE' && (
                <div style={{ display: 'flex', gap: '10px' }}>
                  <select className="input-field" value={roleTarget} onChange={e => setRoleTarget(e.target.value)}>
                    <option value="student">Students</option>
                    <option value="professor">Primary Trainers</option>
                    <option value="teaching_assistant">Teaching Assistants</option>
                  </select>
                  {isSuperAdmin && colleges.length > 0 && (
                    <select className="input-field" value={collegeId} onChange={e => { setCollegeId(e.target.value); setCourseId(''); setDepartmentId(''); setBranchId(''); setSemesterId(''); }}>
                      {colleges.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                </div>
              )}

              <input className="input-field" required placeholder="Title" value={sendForm.title}
                onChange={e => setSendForm({ ...sendForm, title: e.target.value })} />
              <textarea className="input-field" required rows={3} placeholder="Message body..." value={sendForm.body}
                onChange={e => setSendForm({ ...sendForm, body: e.target.value })} />
              <button type="submit" className="btn-primary" disabled={sending}>
                {sending ? 'Sending...' : '📨 Send'}
              </button>
            </form>

            {isAdmin && (
              <>
                <h2 style={{ fontSize: '20px', margin: '30px 0 20px' }}>Your Preferences</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
                  Choose how you want to receive alerts and updates.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {['email', 'sms', 'push', 'web'].map(channel => (
                    <label key={channel} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', padding: '15px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                      <input
                        type="checkbox"
                        checked={preferences?.[channel] || false}
                        onChange={() => togglePreference(channel)}
                        style={{ width: '20px', height: '20px', accentColor: 'var(--primary-color)' }}
                      />
                      <span style={{ textTransform: 'capitalize', fontSize: '16px' }}>{channel} Notifications</span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="panel" style={{ flex: isAdmin || isTrainer ? 2 : 1, minWidth: '400px' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Recent History</h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {history.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No notifications yet.</p>
            ) : history.map((item) => (
              <div key={item.id} style={{
                padding: '15px',
                background: item.read ? 'rgba(0,0,0,0.1)' : 'rgba(0, 168, 255, 0.1)',
                borderLeft: item.read ? '3px solid transparent' : '3px solid var(--primary-color)',
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '5px' }}>
                    <span className="badge badge-info">{item.type}</span>
                    <strong style={{ fontSize: '16px' }}>{item.title}</strong>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '5px 0' }}>{item.body}</p>
                  <small style={{ color: '#888' }}>{new Date(item.created_at).toLocaleString()} via {item.channel}</small>
                </div>
                {!item.read && (
                  <button className="btn-secondary" onClick={() => markAsRead(item.id)}>Mark Read</button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
