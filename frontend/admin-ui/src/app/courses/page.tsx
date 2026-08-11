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
          {isCollegeAdmin && <button className="btn-primary" onClick={() => setIsModalOpen(true)}>+ Create Course</button>}
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
              <th style={{ padding: '15px 20px', borderBottom: '1px solid var(--panel-border)' }}>Dept / Branch / Sem / Year</th>
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
                    {course.department_id || course.branch_id || course.semester_id || course.year
                      ? [course.department_id && 'D', course.branch_id && 'B', course.semester_id && 'S'].filter(Boolean).join('·') + (course.year ? ` · Yr ${course.year}` : '')
                      : '—'}
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
