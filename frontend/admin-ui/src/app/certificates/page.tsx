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
  // Super admin needs college context to tell colleges' courses/students apart
  const { colleges, activeColleges, isSuperAdmin, collegeNameByTenant } = useColleges();
  const selectedCollege = colleges.find((c: any) => c.id === collegeId);
  const visibleStudents = isSuperAdmin && selectedCollege
    ? students.filter((s: any) => !s.tenant_id || s.tenant_id === selectedCollege.tenant_id)
    : students;
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [templateUploading, setTemplateUploading] = useState(false);
  const [templateStatus, setTemplateStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      setLoading(true);
      const d = await fetchApi('/api/v1/certificates/my');
      setCertificates(d || []);
    } catch { } finally { setLoading(false); }
  };

  const issueCert = async (e: any) => {
    e.preventDefault();
    try {
      await fetchApi('/api/v1/certificates/issue', { method: 'POST', body: JSON.stringify(issueForm) });
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

  if (loading) return <div className="fade-in" style={{ padding: '20px' }}>Loading certificates...</div>;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>🎓 Certificates</h1>
        {(isAdmin || isTrainer) && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" onClick={() => setShowTemplateForm(!showTemplateForm)}>🖼 Upload Course Template</button>
            <button className="btn-primary" onClick={() => setShowIssueForm(!showIssueForm)}>+ Issue Certificate</button>
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
                {visibleStudents.length === 0 ? <option value="" disabled>{isSuperAdmin ? 'No students in this college' : 'No students found'}</option>
                  : visibleStudents.map((u: any) => (
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
                {(isSuperAdmin && selectedCollege ? courses.filter((c: any) => !c.tenant_id || c.tenant_id === selectedCollege.tenant_id) : courses).map((c: any) => <option key={c.id} value={c.id}>{isSuperAdmin && collegeNameByTenant(c.tenant_id) ? `${collegeNameByTenant(c.tenant_id)} · ${c.title}` : c.title}</option>)}
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
                  <span style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginLeft: 'auto' }}>#{c.certificate_no}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
