'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
import { useUserDirectory } from '@/hooks/useUserDirectory';
import CollegeCoursePicker from '@/components/CollegeCoursePicker';
import { useColleges } from '@/hooks/useColleges';

export default function CertificatesPage() {
  const { isAdmin, isTrainer, role } = useRole();
  // People resolver (#fix): pick the student by name, never by UUID
  const { users: studentUsers } = useUserDirectory();
  const students = studentUsers.filter((u: any) => u.role === 'STUDENT');
  const [certificates, setCertificates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyNo, setVerifyNo] = useState('');
  const [verifyResult, setVerifyResult] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [issueForm, setIssueForm] = useState({ course_id: 'c-1', user_id: '', course_title: '', student_name: '', grade: 'A', cgpa: 4.0 });
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [flash, setFlash] = useState('');
  // Certificate template upload per course (#17)
  const [courses, setCourses] = useState<any[]>([]);
  const [templateCourseId, setTemplateCourseId] = useState('');
  const [collegeId, setCollegeId] = useState('');
  // Issue-form college filter (super admin) — pick any college's students/courses.
  const [issueCollegeId, setIssueCollegeId] = useState('');
  // Super admin needs college context to tell colleges' courses/students apart
  const { colleges, activeColleges, isSuperAdmin, collegeNameByTenant } = useColleges();
  const selectedCollege = colleges.find((c: any) => c.id === collegeId);
  const visibleStudents = isSuperAdmin && selectedCollege
    ? students.filter((s: any) => !s.tenant_id || s.tenant_id === selectedCollege.tenant_id)
    : students;
  // Issue form: filter by the chosen college, or show every college's students
  // (with college labels) when "All colleges" is selected (#fix).
  const issueCollege = colleges.find((c: any) => c.id === issueCollegeId);
  const issueStudents = isSuperAdmin && issueCollege
    ? students.filter((s: any) => !s.tenant_id || s.tenant_id === issueCollege.tenant_id)
    : students;
  const issueCourses = isSuperAdmin && issueCollege
    ? courses.filter((c: any) => !c.tenant_id || c.tenant_id === issueCollege.tenant_id)
    : courses;
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateUploading, setTemplateUploading] = useState(false);
  const [templateStatus, setTemplateStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Batch issue state
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [batchCourseId, setBatchCourseId] = useState('');
  const [batchGrade, setBatchGrade] = useState('A');
  const [batchCgpa, setBatchCgpa] = useState(4.0);
  const [batchIssuing, setBatchIssuing] = useState(false);

  useEffect(() => {
    loadCertificates();
    (async () => {
      try {
        const data = await fetchApi('/api/v1/courses');
        if (Array.isArray(data)) setCourses(data);
      } catch { /* course list unavailable */ }
    })();
  }, []);

  const loadCertificates = async () => {
    try {
      // No setLoading(true) — the full-page flash unmounts the CollegeCoursePicker
      // and caused an endless reload blink (#fix).
      // Admins/trainers see the whole college's certificates; students only their own.
      const endpoint = (isAdmin || isTrainer) ? '/api/v1/certificates' : '/api/v1/certificates/my';
      const d = await fetchApi(endpoint);
      setCertificates(d || []);
    } catch { } finally { setLoading(false); }
  };

  const revokeCert = async (id: string) => {
    const reason = prompt('Reason for revoking this certificate:');
    if (reason === null) return;
    try {
      await fetchApi(`/api/v1/certificates/${id}/revoke`, { method: 'POST', body: JSON.stringify({ reason: reason || 'No reason given' }) });
      showFlash('🚫 Certificate revoked.');
      loadCertificates();
    } catch { alert('Failed to revoke certificate'); }
  };

  const issueCert = async (e: any) => {
    e.preventDefault();
    try {
      // The certificate belongs to the student's college — pass their tenant_id
      // so a super-admin-issued cert is visible to the college + the student (#fix).
      const selectedStudent = students.find((s: any) => s.id === issueForm.user_id);
      const body = { ...issueForm, tenant_id: selectedStudent?.tenant_id };
      await fetchApi('/api/v1/certificates/issue', { method: 'POST', body: JSON.stringify(body) });
      setShowIssueForm(false);
      showFlash('✅ Certificate issued successfully!');
      loadCertificates();
    } catch { alert('Failed to issue certificate'); }
  };

  const verifyCert = async (e: any) => {
    e.preventDefault();
    try {
      setVerifying(true);
      setVerifyResult(null);
      const data = await fetchApi(`/api/v1/certificates/verify/${verifyNo}`).catch(() => null);
      setVerifyResult(data);
    } catch { setVerifyResult(null); } finally { setVerifying(false); }
  };

  const uploadTemplate = async (e: any) => {
    e.preventDefault();
    if (!templateFile) { alert('Choose a file first'); return; }
    try {
      setTemplateUploading(true);
      const formData = new FormData();
      formData.append('file', templateFile);
      formData.append('course_id', templateCourseId);
      await fetchApi('/api/v1/certificates/template', { method: 'POST', body: formData });
      setShowTemplateForm(false);
      setTemplateFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTemplateStatus(`✅ Template saved for course ${templateCourseId}`);
      setTimeout(() => setTemplateStatus(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to upload template');
    } finally { setTemplateUploading(false); }
  };

  const showFlash = (msg: string) => { setFlash(msg); setTimeout(() => setFlash(''), 3000); };

  // Batch issue certificates for all enrolled students in a course
  const batchIssueCerts = async () => {
    if (!batchCourseId) { alert('Select a course first'); return; }
    try {
      setBatchIssuing(true);
      // Fetch enrolled students for the selected course
      const enrollments = await fetchApi(`/api/v1/enrollments/course/${batchCourseId}`);
      if (!Array.isArray(enrollments) || enrollments.length === 0) {
        alert('No enrolled students found for this course.');
        return;
      }
      const course = courses.find((c: any) => c.id === batchCourseId);
      const studentsData = enrollments.map((en: any) => {
        const user = students.find((s: any) => s.id === en.user_id) || {};
        return {
          course_id: batchCourseId,
          user_id: en.user_id,
          course_title: course?.title || '',
          student_name: [user.first_name, user.last_name].filter(Boolean).join(' ') || en.user_id,
          tenant_id: user.tenant_id || '',
          grade: batchGrade,
          cgpa: batchCgpa,
        };
      });
      const res = await fetchApi('/api/v1/certificates/batch-issue', {
        method: 'POST',
        body: JSON.stringify({ students: studentsData }),
      });
      setShowBatchForm(false);
      showFlash(`✅ Batch complete: ${res.issued} issued, ${res.skipped} skipped.`);
      loadCertificates();
    } catch (err: any) {
      alert(err.message || 'Failed to batch issue certificates');
    } finally { setBatchIssuing(false); }
  };

  if (loading) return <div className="fade-in" style={{ padding: '20px' }}>Loading certificates...</div>;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>🎓 Certificates</h1>
        {(isAdmin || isTrainer) && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" onClick={() => setShowTemplateForm(!showTemplateForm)}>Upload Course Template</button>
            <button className="btn-secondary" onClick={() => { setShowBatchForm(!showBatchForm); setShowIssueForm(false); }}>Batch Issue</button>
            <button className="btn-primary" onClick={() => { setShowIssueForm(!showIssueForm); setShowBatchForm(false); }}>+ Issue Certificate</button>
          </div>
        )}
      </div>

      {templateStatus && <div className="panel" style={{ marginBottom: '20px', borderLeft: '4px solid #00c864', background: 'rgba(0,200,100,0.1)', padding: '15px' }}>{templateStatus}</div>}

      {/* Template upload form (#17) */}
      {showTemplateForm && (
        <form onSubmit={uploadTemplate} className="panel" style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>Upload Certificate Template / Sample</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '15px' }}>Upload the sample certificate design for a course. Each course can have one template.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Course</label>
              <CollegeCoursePicker courses={courses} courseId={templateCourseId} onCourseChange={setTemplateCourseId} collegeId={collegeId} onCollegeChange={setCollegeId} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Template file (PDF / image)</label>
              <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.svg" className="input-field" onChange={e => setTemplateFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn-primary" disabled={templateUploading}>{templateUploading ? 'Uploading...' : 'Upload Template'}</button>
            <button type="button" className="btn-secondary" onClick={() => setShowTemplateForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {flash && <div className="panel" style={{ marginBottom: '20px', borderLeft: '4px solid #00c864', background: 'rgba(0,200,100,0.1)', padding: '15px' }}>{flash}</div>}

      {/* Batch Issue Form */}
      {showBatchForm && (isAdmin || isTrainer) && (
        <div className="panel" style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>Batch Issue Certificates</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '15px' }}>Issue certificates to ALL enrolled students in a course at once. Each student gets a unique certificate number.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Course</label>
              <select required className="input-field" value={batchCourseId} onChange={e => setBatchCourseId(e.target.value)}>
                <option value="">Select course...</option>
                {courses.map((c: any) => <option key={c.id} value={c.id}>{isSuperAdmin && collegeNameByTenant(c.tenant_id) ? `${collegeNameByTenant(c.tenant_id)} · ${c.title}` : c.title}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Grade</label>
              <select className="input-field" value={batchGrade} onChange={e => setBatchGrade(e.target.value)}>
                {['A', 'B', 'C', 'D'].map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>CGPA</label>
              <input type="number" step="0.1" min="0" max="4" className="input-field" value={batchCgpa} onChange={e => setBatchCgpa(parseFloat(e.target.value))} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-primary" disabled={batchIssuing} onClick={batchIssueCerts}>{batchIssuing ? 'Issuing...' : 'Issue to All Students'}</button>
            <button className="btn-secondary" onClick={() => setShowBatchForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Public Verify Panel */}
      <div className="panel" style={{ marginBottom: '30px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '15px' }}>🔍 Verify a Certificate</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '15px', fontSize: '14px' }}>Enter a certificate number to verify its authenticity.</p>
        <form onSubmit={verifyCert} style={{ display: 'flex', gap: '10px' }}>
          <input required className="input-field" style={{ flex: 1 }} placeholder="e.g. LMS-2026-12345" value={verifyNo} onChange={e => setVerifyNo(e.target.value)} />
          <button type="submit" className="btn-primary" disabled={verifying}>{verifying ? 'Verifying...' : 'Verify'}</button>
        </form>
        {verifyResult !== null && (
          <div style={{ marginTop: '20px', padding: '20px', borderRadius: '8px', background: verifyResult && !verifyResult.is_revoked ? 'rgba(0,200,100,0.1)' : 'rgba(255,71,87,0.1)', border: `1px solid ${verifyResult && !verifyResult.is_revoked ? '#00c864' : '#ff4757'}` }}>
            {verifyResult && !verifyResult.is_revoked ? (
              <div>
                <div style={{ fontSize: '24px', marginBottom: '10px' }}>✅ Valid Certificate</div>
                <p><strong>Student:</strong> {verifyResult.student_name}</p>
                <p><strong>Course:</strong> {verifyResult.course_title}</p>
                <p><strong>Grade:</strong> {verifyResult.grade} (CGPA: {verifyResult.cgpa?.toFixed(1)})</p>
                <p><strong>Issued:</strong> {new Date(verifyResult.issued_at).toLocaleDateString()}</p>
              </div>
            ) : verifyResult?.is_revoked ? (
              <div style={{ color: '#ff4757' }}>❌ This certificate has been revoked: {verifyResult.revoke_reason}</div>
            ) : (
              <div style={{ color: '#ff4757' }}>❌ Certificate not found. It may be invalid.</div>
            )}
          </div>
        )}
      </div>

      {/* Issue Certificate Form */}
      {showIssueForm && (isAdmin || isTrainer) && (
        <form onSubmit={issueCert} className="panel" style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>Issue New Certificate</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
              {isSuperAdmin && (
                <div>
                  <label style={{ display: 'block', marginBottom: '5px' }}>College</label>
                  <select className="input-field" value={issueCollegeId} onChange={e => { setIssueCollegeId(e.target.value); setIssueForm({ ...issueForm, user_id: '', student_name: '' }); }}>
                    <option value="">All colleges</option>
                    {activeColleges.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label style={{ display: 'block', marginBottom: '5px' }}>Student</label>
              <select
                required
                className="input-field"
                value={issueForm.user_id}
                onChange={e => {
                  const u = students.find((s: any) => s.id === e.target.value);
                  setIssueForm({ ...issueForm, user_id: e.target.value, student_name: u ? [u.first_name, u.last_name].filter(Boolean).join(' ') : '' });
                }}
              >
                <option value="">Select student…</option>
                {issueStudents.length === 0 ? <option value="" disabled>{isSuperAdmin ? 'No students in this college' : 'No students found'}</option>
                  : issueStudents.map((u: any) => (
                    <option key={u.id} value={u.id}>{[u.first_name, u.last_name].filter(Boolean).join(' ')} — {u.email}{isSuperAdmin && collegeNameByTenant(u.tenant_id) ? ` (${collegeNameByTenant(u.tenant_id)})` : ''}</option>
                  ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Course</label>
              <select
                required
                className="input-field"
                value={issueForm.course_id}
                onChange={e => {
                  const c = courses.find((x: any) => x.id === e.target.value);
                  setIssueForm({ ...issueForm, course_id: e.target.value, course_title: c?.title || '' });
                }}
              >
                <option value="">Select course…</option>
                {issueCourses.map((c: any) => <option key={c.id} value={c.id}>{isSuperAdmin && collegeNameByTenant(c.tenant_id) ? `${collegeNameByTenant(c.tenant_id)} · ${c.title}` : c.title}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Grade</label>
              <select className="input-field" value={issueForm.grade} onChange={e => setIssueForm({ ...issueForm, grade: e.target.value })}>
                {['A', 'B', 'C', 'D'].map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>CGPA</label>
              <input type="number" step="0.1" min="0" max="4" className="input-field" value={issueForm.cgpa} onChange={e => setIssueForm({ ...issueForm, cgpa: parseFloat(e.target.value) })} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn-primary">Issue Certificate</button>
            <button type="button" className="btn-secondary" onClick={() => setShowIssueForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {/* My Certificates */}
      <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>
        {(isAdmin || isTrainer) ? 'All Certificates' : 'My Certificates'}
      </h2>
      {certificates.length === 0 ? (
        <div className="panel" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🎓</div>
          <p>No certificates issued yet. Complete a course to earn one!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {certificates.map(c => (
            <div key={c.id} className="panel" style={{
              background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))',
              border: '1px solid rgba(139,92,246,0.3)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Decorative seal */}
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(139,92,246,0.2)', border: '2px solid rgba(139,92,246,0.4)' }} />
              <div style={{ position: 'absolute', top: '0px', right: '0px', fontSize: '40px', opacity: 0.3 }}>🏅</div>

              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                  <div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Certificate of Completion</p>
                    <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{c.course_title}</h3>
                  </div>
                </div>
                <p style={{ marginBottom: '5px' }}><strong>Awarded to:</strong> {c.student_name}</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '15px' }}>
                  Issued: {new Date(c.issued_at).toLocaleDateString()}
                </p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {c.grade && <span className="badge badge-success">Grade: {c.grade}</span>}
                  {c.cgpa && <span className="badge badge-info">CGPA: {c.cgpa.toFixed(1)}</span>}
                  {c.is_revoked && <span className="badge" style={{ background: 'rgba(255,71,87,0.15)', color: '#ff4757' }}>🚫 Revoked</span>}
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginLeft: 'auto' }}>#{c.certificate_no}</span>
                </div>
                {isAdmin && !c.is_revoked && (
                  <button
                    className="btn-secondary"
                    style={{ marginTop: '12px', width: '100%', borderColor: 'var(--danger-color)', color: 'var(--danger-color)', fontSize: '12px', padding: '6px' }}
                    onClick={() => revokeCert(c.id)}
                  >
                    🚫 Revoke Certificate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
