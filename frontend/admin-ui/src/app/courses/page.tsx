'use client';
import { useState, useEffect, useRef } from 'react';
import Topbar from "@/components/Topbar";
import { fetchApi } from "@/lib/api";
import CreateCourseModal from "@/components/CreateCourseModal";
import { useColleges } from "@/hooks/useColleges";
import Link from 'next/link';
import { useRole } from '@/hooks/useRole';
import { useUserDirectory } from '@/hooks/useUserDirectory';

export default function CoursesPage() {
  const { isAdmin, isTrainer, role } = useRole();
  // Only the college admin can create courses and assign trainers/students (#fix)
  const isCollegeAdmin = role === 'COLLEGE_ADMIN';
  // College context (#fix): super admins see every college's courses mixed
  // together — filter by college and show which college each course belongs to.
  const { isSuperAdmin, activeColleges, collegeNameByTenant, collegeName } = useColleges();
  const [collegeFilter, setCollegeFilter] = useState('');
  // People resolver (#fix): pick students/trainers by name, never by UUID
  const { users, nameOf, emailOf } = useUserDirectory();
  const studentUsers = users.filter((u: any) => u.role === 'STUDENT');
  const trainerUsers = users.filter((u: any) => ['PRIMARY_TRAINER', 'TEACHING_ASSISTANT', 'GUEST_FACULTY'].includes(u.role));
  const [courses, setCourses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Stage-2 lookups: resolve subject/section/session names for the table
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const [subs, secs, brs, sess] = await Promise.all([
        fetchApi('/api/v1/subjects').catch(() => []),
        fetchApi('/api/v1/sections').catch(() => []),
        fetchApi('/api/v1/branches').catch(() => []),
        fetchApi('/api/v1/academic-sessions').catch(() => []),
      ]);
      setSubjects(Array.isArray(subs) ? subs : []);
      setSections(Array.isArray(secs) ? secs : []);
      setBranches(Array.isArray(brs) ? brs : []);
      setSessions(Array.isArray(sess) ? sess : []);
    })();
  }, []);
  // Course resources (#6) + add student (#5)
  const [resourcesCourse, setResourcesCourse] = useState<any>(null);
  const [resourcesList, setResourcesList] = useState<any[]>([]);
  const [resourceTitle, setResourceTitle] = useState('');
  const [resourceFile, setResourceFile] = useState<File | null>(null);
  const [resourceUploading, setResourceUploading] = useState(false);
  const resourceFileRef = useRef<HTMLInputElement>(null);
  const [studentCourse, setStudentCourse] = useState<any>(null);
  const [studentUserId, setStudentUserId] = useState('');
  const [studentAdding, setStudentAdding] = useState(false);
  // Assign trainers (#fix): college admin picks a trainer user + role per course
  const [trainerCourse, setTrainerCourse] = useState<any>(null);
  const [trainerUserId, setTrainerUserId] = useState('');
  const [trainerRole, setTrainerRole] = useState('PRIMARY_TRAINER');
  const [trainerAdding, setTrainerAdding] = useState(false);
  const [trainersList, setTrainersList] = useState<any[]>([]);
  const [trainersLoading, setTrainersLoading] = useState(false);
  // Bulk enroll (#bulk): enroll many students into every course of a
  // branch+semester in one action instead of per-course clicks.
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkBranches, setBulkBranches] = useState<any[]>([]);
  const [bulkSemesters, setBulkSemesters] = useState<any[]>([]);
  const [bulkBranchId, setBulkBranchId] = useState('');
  const [bulkSemesterId, setBulkSemesterId] = useState('');
  const [bulkCourseIds, setBulkCourseIds] = useState<string[]>([]);
  const [bulkSelectedStudents, setBulkSelectedStudents] = useState<string[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkResult, setBulkResult] = useState<any>(null);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/api/v1/courses');
      setCourses(data);
      setError('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openResources = async (course: any) => {
    setResourcesCourse(course);
    setResourcesList([]);
    setResourceTitle('');
    setResourceFile(null);
    if (resourceFileRef.current) resourceFileRef.current.value = '';
    try {
      const d = await fetchApi(`/api/v1/courses/${course.id}/resources`);
      setResourcesList(Array.isArray(d) ? d : []);
    } catch { setResourcesList([]); }
  };

  const uploadResource = async (e: any) => {
    e.preventDefault();
    if (!resourcesCourse || !resourceFile) { alert('Choose a file first'); return; }
    try {
      setResourceUploading(true);
      const formData = new FormData();
      formData.append('file', resourceFile);
      if (resourceTitle.trim()) formData.append('title', resourceTitle.trim());
      await fetchApi(`/api/v1/courses/${resourcesCourse.id}/resources`, { method: 'POST', body: formData });
      setResourceTitle('');
      setResourceFile(null);
      if (resourceFileRef.current) resourceFileRef.current.value = '';
      openResources(resourcesCourse);
    } catch (err: any) { alert(err.message || 'Failed to upload resource'); } finally { setResourceUploading(false); }
  };

  const deleteResource = async (id: string) => {
    if (!resourcesCourse) return;
    if (!confirm('Delete this resource?')) return;
    try {
      await fetchApi(`/api/v1/courses/${resourcesCourse.id}/resources/${id}`, { method: 'DELETE' });
      openResources(resourcesCourse);
    } catch (err: any) { alert(err.message || 'Failed to delete resource'); }
  };

  const addStudent = async (e: any) => {
    e.preventDefault();
    if (!studentCourse || !studentUserId.trim()) { alert('Enter a student user ID'); return; }
    try {
      setStudentAdding(true);
      await fetchApi('/api/v1/enrollments', { method: 'POST', body: JSON.stringify({ user_id: studentUserId.trim(), course_id: studentCourse.id }) });
      setStudentUserId('');
      setStudentCourse(null);
      alert('✅ Student added to course');
    } catch (err: any) { alert(err.message || 'Failed to add student'); } finally { setStudentAdding(false); }
  };

  const openAssignTrainer = async (course: any) => {
    setTrainerCourse(course);
    setTrainerUserId('');
    setTrainerRole('PRIMARY_TRAINER');
    setTrainersLoading(true);
    try {
      const d = await fetchApi(`/api/v1/courses/${course.id}/trainers`);
      setTrainersList(Array.isArray(d) ? d : []);
    } catch { setTrainersList([]); } finally { setTrainersLoading(false); }
  };

  const assignTrainer = async (e: any) => {
    e.preventDefault();
    if (!trainerCourse || !trainerUserId.trim()) { alert('Enter a trainer user ID'); return; }
    try {
      setTrainerAdding(true);
      await fetchApi(`/api/v1/courses/${trainerCourse.id}/trainers`, {
        method: 'POST',
        body: JSON.stringify({ user_id: trainerUserId.trim(), role: trainerRole }),
      });
      setTrainerUserId('');
      openAssignTrainer(trainerCourse);
      alert('✅ Trainer assigned to course');
    } catch (err: any) { alert(err.message || 'Failed to assign trainer'); } finally { setTrainerAdding(false); }
  };

  const subjectById = Object.fromEntries(subjects.map((s: any) => [s.id, s]));
  const branchName = (id: string) => branches.find((b: any) => b.id === id)?.name;
  const sessionName = (id: string) => sessions.find((s: any) => s.id === id)?.name;
  const sectionLabel = (secId: string) => {
    const s = sections.find((x: any) => x.id === secId);
    if (!s) return null;
    return `${branchName(s.branch_id) || ''} · ${sessionName(s.academic_session_id) || ''} · Sem ${s.semester_number}${s.name ? ` · Sec ${s.name}` : ''}`.replace(/^ · /, '');
  };

  const deleteCourse = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    try {
      await fetchApi(`/api/v1/courses/${id}`, { method: 'DELETE' });
      loadCourses();
    } catch (err: any) {
      alert(err.message);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  // Org data for the bulk-enroll modal (branch -> semester cascade)
  const openBulkEnroll = async () => {
    setBulkOpen(true);
    setBulkBranchId('');
    setBulkSemesterId('');
    setBulkCourseIds([]);
    setBulkSelectedStudents([]);
    setBulkResult(null);
    try {
      const [brs, sems] = await Promise.all([
        fetchApi('/api/v1/branches').catch(() => []),
        fetchApi('/api/v1/semesters').catch(() => []),
      ]);
      setBulkBranches(Array.isArray(brs) ? brs : []);
      setBulkSemesters(Array.isArray(sems) ? sems : []);
    } catch { /* org data unavailable */ }
  };

  // Every course of the selected branch+semester (all get enrolled into)
  const bulkTargetCourses = courses.filter((c: any) =>
    (!bulkBranchId || c.branch_id === bulkBranchId) &&
    (!bulkSemesterId || c.semester_id === bulkSemesterId)
  );
  const bulkVisibleSemesters = bulkSemesters.filter((s: any) => !bulkBranchId || s.branch_id === bulkBranchId);

  const toggleBulkStudent = (uid: string) => {
    setBulkSelectedStudents(prev => prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]);
  };

  const runBulkEnroll = async () => {
    if (bulkSelectedStudents.length === 0) { alert('Select at least one student'); return; }
    if (bulkTargetCourses.length === 0) { alert('No courses found for this branch + semester — create them first'); return; }
    setBulkRunning(true);
    setBulkResult(null);
    try {
      const res = await fetchApi('/api/v1/enrollments/bulk', {
        method: 'POST',
        body: JSON.stringify({
          user_ids: bulkSelectedStudents,
          course_ids: bulkTargetCourses.map((c: any) => c.id),
        }),
      });
      setBulkResult(res);
      loadCourses();
    } catch (err: any) { alert(err.message || 'Bulk enroll failed'); } finally { setBulkRunning(false); }
  };

  return (
    <div className="animate-fade-in">
      <Topbar title="Courses Management" />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '16px', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>All Courses</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {isSuperAdmin && activeColleges.length > 0 && (
            <select className="input-field" style={{ maxWidth: '240px' }} value={collegeFilter} onChange={e => setCollegeFilter(e.target.value)}>
              <option value="">All colleges</option>
              {activeColleges.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {/* Only the college admin creates courses in their college (#fix) */}
          {isCollegeAdmin && (
            <>
              <button className="btn-secondary" onClick={openBulkEnroll}>⚡ Bulk Enroll</button>
              <button className="btn-primary" onClick={() => setIsModalOpen(true)}>+ Create Course</button>
            </>
          )}
          {!isCollegeAdmin && (isAdmin || isTrainer) && (
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Only college admins can create courses</span>
          )}
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
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Title</th>
              {isSuperAdmin && <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>College</th>}
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Status</th>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Subject / Section / Session / Yr</th>
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={isSuperAdmin ? 5 : 4} style={{ padding: '20px', textAlign: 'center' }}>Loading...</td></tr>
            ) : courses.length === 0 ? (
              <tr><td colSpan={isSuperAdmin ? 5 : 4} style={{ padding: '20px', textAlign: 'center' }}>No courses found.</td></tr>
            ) : (
              courses.filter((course: any) => {
                if (!collegeFilter) return true;
                const col = activeColleges.find((x: any) => x.id === collegeFilter);
                return col ? course.tenant_id === col.tenant_id : true;
              }).map((course) => (
                <tr key={course.id} style={{ transition: 'background 0.2s ease' }} className="table-row">
                  <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>{course.title}</td>
                  {isSuperAdmin && (
                    <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                      {collegeNameByTenant(course.tenant_id) || collegeName(course.college_id) || '—'}
                    </td>
                  )}
                  <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>
                    <span style={{ padding: '4px 8px', borderRadius: '12px', fontSize: '12px', background: course.status === 'PUBLISHED' ? 'var(--success-color)' : 'rgba(255,255,255,0.1)' }}>
                      {course.status}
                    </span>
                  </td>
                  <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    {(() => {
                      const parts: string[] = [];
                      const subj = subjectById[course.subject_id];
                      if (subj?.code) parts.push(subj.code);
                      else if (course.subject_code) parts.push(course.subject_code);
                      else if (course.department_id || course.branch_id || course.semester_id) {
                        parts.push([course.department_id && 'D', course.branch_id && 'B', course.semester_id && 'S'].filter(Boolean).join('·'));
                      }
                      const secLabel = course.section_id ? sectionLabel(course.section_id) : null;
                      if (secLabel) parts.push(secLabel);
                      else {
                        if (course.section) parts.push(`Sec ${course.section}`);
                        if (course.academic_session) parts.push(course.academic_session);
                        if (course.year_of_study) parts.push(`Yr ${course.year_of_study}`);
                        else if (course.year) parts.push(`Yr ${course.year}`);
                      }
                      return parts.length > 0 ? parts.join(' · ') : '—';
                    })()}
                  </td>
                  <td style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)', textAlign: 'right' }}>
                    <Link href={`/courses/${course.id}`} className="btn-primary" style={{ padding: '6px 12px', fontSize: '12px', textDecoration: 'none', marginRight: '10px' }}>
                      {(isAdmin || isTrainer) ? 'Manage' : 'View'}
                    </Link>
                    {(isCollegeAdmin) && (
                      <>
                        <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', marginRight: '6px' }} onClick={() => openResources(course)}>📎 Resources</button>
                        <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', marginRight: '6px' }} onClick={() => openAssignTrainer(course)}>👨‍🏫 Assign Trainer</button>
                        <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', marginRight: '6px' }} onClick={() => setStudentCourse(course)}>➕ Add Student</button>
                      </>
                    )}
                    {isAdmin && <button className="btn-secondary" style={{ padding: '4px 8px', fontSize: '12px', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }} onClick={() => deleteCourse(course.id)}>Delete</button>}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <CreateCourseModal 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={() => {
            setIsModalOpen(false);
            loadCourses();
          }} 
        />
      )}

      {/* Bulk Enroll modal (#bulk) — one action enrolls many students into every course of a branch+semester */}
      {bulkOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 120 }}>
          <div className="panel" style={{ width: '640px', maxWidth: '94vw', maxHeight: '88vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>⚡ Bulk Enroll Students</h3>
              <button className="btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }} onClick={() => setBulkOpen(false)}>✕ Close</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
              Pick a branch + semester, then select students — every student is enrolled into all{' '}
              <strong>{bulkTargetCourses.length}</strong> course(s) of that semester in one click.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Branch</label>
                <select className="input-field" value={bulkBranchId} onChange={e => { setBulkBranchId(e.target.value); setBulkSemesterId(''); }}>
                  <option value="">All branches</option>
                  {bulkBranches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px' }}>Semester</label>
                <select className="input-field" value={bulkSemesterId} onChange={e => setBulkSemesterId(e.target.value)}>
                  <option value="">All semesters</option>
                  {bulkVisibleSemesters.length === 0 ? <option value="" disabled>No semesters yet</option>
                    : bulkVisibleSemesters.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            {bulkTargetCourses.length > 0 && (
              <div style={{ marginBottom: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                📚 Target courses: {bulkTargetCourses.map((c: any) => c.title).join(', ')}
              </div>
            )}

            <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '13px' }}>Select students ({bulkSelectedStudents.length} selected)</label>
              <button className="btn-secondary" style={{ fontSize: '11px', padding: '2px 10px' }} onClick={() => setBulkSelectedStudents(bulkSelectedStudents.length === studentUsers.length ? [] : studentUsers.map((u: any) => u.id))}>
                {bulkSelectedStudents.length === studentUsers.length ? 'Clear all' : 'Select all'}
              </button>
            </div>
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px', marginBottom: '16px' }}>
              {studentUsers.length === 0 ? <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No students in your college yet — use Bulk Import Users first.</p>
                : studentUsers.map((u: any) => (
                  <label key={u.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', padding: '5px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={bulkSelectedStudents.includes(u.id)} onChange={() => toggleBulkStudent(u.id)} />
                    <span style={{ fontSize: '13px' }}>{[u.first_name, u.last_name].filter(Boolean).join(' ')} — {u.email}</span>
                  </label>
                ))}
            </div>

            {bulkResult && (
              <div className="panel" style={{ padding: '12px', marginBottom: '14px', background: 'rgba(0,200,100,0.08)', border: '1px solid rgba(0,200,100,0.3)' }}>
                ✅ <strong>{bulkResult.enrolled}</strong> new enrollment(s) created · <strong>{bulkResult.skipped}</strong> already enrolled
                {bulkResult.failed > 0 && ` · ${bulkResult.failed} failed`}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setBulkOpen(false)}>Cancel</button>
              <button className="btn-primary" disabled={bulkRunning || bulkSelectedStudents.length === 0} onClick={runBulkEnroll}>
                {bulkRunning ? 'Enrolling...' : `Enroll ${bulkSelectedStudents.length} students into ${bulkTargetCourses.length} course(s)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resources modal (#6) */}
      {resourcesCourse && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="panel" style={{ width: '560px', maxWidth: '92vw', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>📎 Resources — {resourcesCourse.title}</h3>
              <button className="btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }} onClick={() => setResourcesCourse(null)}>✕ Close</button>
            </div>
            <form onSubmit={uploadResource} style={{ marginBottom: '16px' }}>
              <input className="input-field" placeholder="Title (optional)" style={{ marginBottom: '8px' }} value={resourceTitle} onChange={e => setResourceTitle(e.target.value)} />
              <div style={{ display: 'flex', gap: '8px' }}>
                <input ref={resourceFileRef} type="file" className="input-field" style={{ flex: 1 }} onChange={e => setResourceFile(e.target.files?.[0] || null)} />
                <button type="submit" className="btn-primary" disabled={resourceUploading}>{resourceUploading ? 'Uploading...' : 'Upload'}</button>
              </div>
            </form>
            {resourcesList.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No resources yet. Upload a PDF or document above.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {resourcesList.map((r: any) => (
                  <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{r.file_name} · {Math.round(r.file_size / 1024)} KB</div>
                    </div>
                    <button className="btn-secondary" style={{ fontSize: '12px', padding: '3px 10px', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }} onClick={() => deleteResource(r.id)}>Delete</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Student modal (#5) */}
      {studentCourse && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={addStudent} className="panel" style={{ width: '420px', maxWidth: '92vw' }}>
            <h3 style={{ marginBottom: '8px' }}>➕ Add Student</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>Course: <strong>{studentCourse.title}</strong></p>
            <label style={{ display: 'block', marginBottom: '5px' }}>Student</label>
            <select required className="input-field" style={{ marginBottom: '16px' }} value={studentUserId} onChange={e => setStudentUserId(e.target.value)}>
              <option value="">Select student…</option>
              {studentUsers.length === 0 ? <option value="" disabled>No students in your college yet — use Bulk Import Users first</option>
                : studentUsers.map((u: any) => (
                  <option key={u.id} value={u.id}>{[u.first_name, u.last_name].filter(Boolean).join(' ')} — {u.email}</option>
                ))}
            </select>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" className="btn-primary" disabled={studentAdding}>{studentAdding ? 'Adding...' : 'Add Student'}</button>
              <button type="button" className="btn-secondary" onClick={() => setStudentCourse(null)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Assign Trainer modal (#fix) — college admin assigns trainer/TA to a course */}
      {trainerCourse && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <form onSubmit={assignTrainer} className="panel" style={{ width: '440px', maxWidth: '92vw' }}>
            <h3 style={{ marginBottom: '8px' }}>👨‍🏫 Assign Trainer</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>Course: <strong>{trainerCourse.title}</strong></p>
            <label style={{ display: 'block', marginBottom: '5px' }}>Trainer / TA</label>
            <select required className="input-field" style={{ marginBottom: '12px' }} value={trainerUserId} onChange={e => setTrainerUserId(e.target.value)}>
              <option value="">Select trainer…</option>
              {trainerUsers.length === 0 ? <option value="" disabled>No trainers in your college yet — use Bulk Import Users first</option>
                : trainerUsers.map((u: any) => (
                  <option key={u.id} value={u.id}>{[u.first_name, u.last_name].filter(Boolean).join(' ')} — {u.email} ({u.role.replace('_', ' ')})</option>
                ))}
            </select>
            <label style={{ display: 'block', marginBottom: '5px' }}>Role</label>
            <select className="input-field" style={{ marginBottom: '16px' }} value={trainerRole} onChange={e => setTrainerRole(e.target.value)}>
              <option value="PRIMARY_TRAINER">Primary Trainer</option>
              <option value="TEACHING_ASSISTANT">Teaching Assistant</option>
              <option value="GUEST_FACULTY">Guest Faculty</option>
            </select>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <button type="submit" className="btn-primary" disabled={trainerAdding}>{trainerAdding ? 'Assigning...' : 'Assign Trainer'}</button>
              <button type="button" className="btn-secondary" onClick={() => setTrainerCourse(null)}>Cancel</button>
            </div>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Assigned trainers ({trainersList.length})</div>
              {trainersLoading ? <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Loading...</p>
                : trainersList.length === 0 ? <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No trainers assigned yet.</p>
                : trainersList.map((t: any) => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', marginBottom: '6px', fontSize: '12px' }}>
                    <span>
                      <strong>{nameOf(t.user_id)}</strong>
                      {emailOf(t.user_id) && <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>{emailOf(t.user_id)}</span>}
                    </span>
                    <span className="badge badge-info">{t.role}</span>
                  </div>
                ))}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
