'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
import { useUserDirectory } from '@/hooks/useUserDirectory';
import CollegeCoursePicker from '@/components/CollegeCoursePicker';
import { useColleges } from '@/hooks/useColleges';

export default function CertificatesPage() {
  const { isAdmin, isTrainer } = useRole();
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
  const [courses, setCourses] = useState<any[]>([]);
  const [templateCourseId, setTemplateCourseId] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [issueCollegeId, setIssueCollegeId] = useState('');
  const { colleges, activeColleges, isSuperAdmin, collegeNameByTenant } = useColleges();

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
  const [batchStudentsList, setBatchStudentsList] = useState<any[]>([]);
  const [batchLoadingRoster, setBatchLoadingRoster] = useState(false);
  const [batchSelectedIds, setBatchSelectedIds] = useState<string[]>([]);
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

  // When a course is selected for batch issuance, fetch enrolled students + their Gradebook calculations
  const loadBatchRoster = async (courseId: string) => {
    setBatchCourseId(courseId);
    if (!courseId) {
      setBatchStudentsList([]);
      setBatchSelectedIds([]);
      return;
    }
    try {
      setBatchLoadingRoster(true);
      const [enrollments, grades] = await Promise.all([
        fetchApi(`/api/v1/enrollments/course/${courseId}`).catch(() => []),
        fetchApi(`/api/v1/gradebook/${courseId}`).catch(() => []),
      ]);

      const enList = Array.isArray(enrollments) ? enrollments : [];
      const gradeList = Array.isArray(grades) ? grades : [];
      const gradeByUserId = Object.fromEntries(gradeList.map((g: any) => [g.user_id, g]));

      const course = courses.find((c: any) => c.id === courseId);
      const mapped = enList.map((en: any) => {
        const user = students.find((s: any) => s.id === en.user_id) || {};
        const gEntry = gradeByUserId[en.user_id];
        const studentName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || en.user_id;
        
        // Use real Gradebook grade & CGPA if calculated, else default to A (4.0)
        const calcGrade = gEntry?.grade || 'A';
        const calcCgpa = gEntry?.cgpa ? Number(gEntry.cgpa) : (gEntry?.total_score && gEntry?.max_score ? Number(((gEntry.total_score / gEntry.max_score) * 4).toFixed(1)) : 4.0);

        return {
          user_id: en.user_id,
          course_id: courseId,
          course_title: course?.title || '',
          student_name: studentName,
          tenant_id: user.tenant_id || course?.tenant_id || '',
          grade: calcGrade,
          cgpa: calcCgpa,
          is_from_gradebook: Boolean(gEntry),
          total_score: gEntry?.total_score,
          max_score: gEntry?.max_score,
        };
      });

      setBatchStudentsList(mapped);
      setBatchSelectedIds(mapped.map((s: any) => s.user_id));
    } catch {
      setBatchStudentsList([]);
      setBatchSelectedIds([]);
    } finally {
      setBatchLoadingRoster(false);
    }
  };

  const updateStudentBatchField = (userId: string, field: 'grade' | 'cgpa', value: any) => {
    setBatchStudentsList(prev => prev.map(s => s.user_id === userId ? { ...s, [field]: value } : s));
  };

  const toggleSelectAllBatch = () => {
    if (batchSelectedIds.length === batchStudentsList.length) {
      setBatchSelectedIds([]);
    } else {
      setBatchSelectedIds(batchStudentsList.map((s: any) => s.user_id));
    }
  };

  const toggleSelectStudentBatch = (userId: string) => {
    setBatchSelectedIds(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  // Batch issue certificates with individualized grades and CGPAs
  const batchIssueCerts = async () => {
    if (!batchCourseId) { alert('Select a course first'); return; }
    const toIssue = batchStudentsList.filter((s: any) => batchSelectedIds.includes(s.user_id));
    if (toIssue.length === 0) { alert('Select at least one student'); return; }

    try {
      setBatchIssuing(true);
      const res = await fetchApi('/api/v1/certificates/batch-issue', {
        method: 'POST',
        body: JSON.stringify({ students: toIssue }),
      });
      setShowBatchForm(false);
      showFlash(`✅ Batch complete: ${res.issued} certificates issued with individualized grades and CGPAs (${res.skipped} skipped).`);
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

      {/* Template upload form */}
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

      {/* Enhanced Batch Issue Form with Auto-Gradebook Calculation & Student Preview Table */}
      {showBatchForm && (isAdmin || isTrainer) && (
        <div className="panel" style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '10px', fontSize: '18px', fontWeight: '600' }}>🎓 Batch Issue Certificates</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px' }}>
            Select a course to auto-calculate each enrolled student&apos;s <strong>Grade and CGPA</strong> from the Gradebook. Review and adjust grades individually before issuing.
          </p>

          <div style={{ marginBottom: '20px', maxWidth: '400px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500' }}>Select Course</label>
            <select
              required
              className="input-field"
              value={batchCourseId}
              onChange={e => loadBatchRoster(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="">Choose course to load enrolled students…</option>
              {courses.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {isSuperAdmin && collegeNameByTenant(c.tenant_id) ? `${collegeNameByTenant(c.tenant_id)} · ${c.title}` : c.title}
                </option>
              ))}
            </select>
          </div>

          {batchLoadingRoster && (
            <p style={{ color: 'var(--text-secondary)', margin: '20px 0' }}>⏳ Loading enrolled students and calculating Gradebook scores…</p>
          )}

          {!batchLoadingRoster && batchCourseId && batchStudentsList.length === 0 && (
            <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No enrolled students found for this course. Enroll students first.
            </div>
          )}

          {!batchLoadingRoster && batchStudentsList.length > 0 && (
            <div style={{ marginTop: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>
                  👥 Enrolled Students ({batchSelectedIds.length} of {batchStudentsList.length} selected)
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="button" className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={toggleSelectAllBatch}>
                    {batchSelectedIds.length === batchStudentsList.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid var(--panel-border)', borderRadius: '8px', marginBottom: '20px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--panel-border)' }}>
                      <th style={{ padding: '10px 15px', width: '40px' }}>
                        <input
                          type="checkbox"
                          checked={batchSelectedIds.length === batchStudentsList.length && batchStudentsList.length > 0}
                          onChange={toggleSelectAllBatch}
                        />
                      </th>
                      <th style={{ padding: '10px 15px' }}>Student Name</th>
                      <th style={{ padding: '10px 15px' }}>Gradebook Score</th>
                      <th style={{ padding: '10px 15px' }}>Grade</th>
                      <th style={{ padding: '10px 15px' }}>CGPA (0 - 4.0)</th>
                      <th style={{ padding: '10px 15px' }}>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchStudentsList.map((stu: any) => {
                      const isSelected = batchSelectedIds.includes(stu.user_id);
                      return (
                        <tr key={stu.user_id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: isSelected ? 'rgba(59,130,246,0.04)' : 'transparent' }}>
                          <td style={{ padding: '10px 15px' }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectStudentBatch(stu.user_id)}
                            />
                          </td>
                          <td style={{ padding: '10px 15px', fontWeight: '500' }}>
                            {stu.student_name}
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{stu.user_id.slice(0, 12)}…</div>
                          </td>
                          <td style={{ padding: '10px 15px', color: 'var(--text-secondary)' }}>
                            {stu.total_score != null ? `${stu.total_score} / ${stu.max_score || 100}` : 'No submissions'}
                          </td>
                          <td style={{ padding: '8px 15px' }}>
                            <select
                              className="input-field"
                              style={{ padding: '4px 8px', fontSize: '12px', width: '85px' }}
                              value={stu.grade}
                              onChange={e => updateStudentBatchField(stu.user_id, 'grade', e.target.value)}
                            >
                              {['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F'].map(g => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '8px 15px' }}>
                            <input
                              type="number"
                              step="0.1"
                              min="0"
                              max="4.0"
                              className="input-field"
                              style={{ padding: '4px 8px', fontSize: '12px', width: '80px' }}
                              value={stu.cgpa}
                              onChange={e => updateStudentBatchField(stu.user_id, 'cgpa', parseFloat(e.target.value) || 0)}
                            />
                          </td>
                          <td style={{ padding: '10px 15px' }}>
                            {stu.is_from_gradebook ? (
                              <span className="badge badge-success" style={{ fontSize: '11px' }}>📊 Gradebook</span>
                            ) : (
                              <span className="badge" style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)' }}>Default</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  className="btn-primary"
                  disabled={batchIssuing || batchSelectedIds.length === 0}
                  onClick={batchIssueCerts}
                >
                  {batchIssuing ? 'Issuing Certificates…' : `🎓 Issue ${batchSelectedIds.length} Personalized Certificates`}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowBatchForm(false)}>Cancel</button>
              </div>
            </div>
          )}
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

      {/* Single Issue Certificate Form */}
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
                {['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'D', 'F'].map(g => <option key={g} value={g}>{g}</option>)}
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

      {/* All Certificates List */}
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
