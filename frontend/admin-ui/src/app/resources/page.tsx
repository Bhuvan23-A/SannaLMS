'use client';
import { useState, useEffect, useRef } from 'react';
import { fetchApi, downloadFile } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
import { useUserDirectory } from '@/hooks/useUserDirectory';
import CollegeCoursePicker from '@/components/CollegeCoursePicker';

export default function ResourcesPage() {
  const { role, isAdmin, isTrainer } = useRole();
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isCollegeAdmin = role === 'COLLEGE_ADMIN';
  const [colleges, setColleges] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [collegeId, setCollegeId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [resourcesList, setResourcesList] = useState<any[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  const [filterSemester, setFilterSemester] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadSourceType, setUploadSourceType] = useState<'LINK' | 'FILE'>('LINK');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadLinkUrl, setUploadLinkUrl] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadVisibility, setUploadVisibility] = useState('ALL');
  const [uploadBatchType, setUploadBatchType] = useState<'ALL' | 'BATCH'>('ALL');
  const [uploadDept, setUploadDept] = useState('');
  const [uploadBranch, setUploadBranch] = useState('');
  const [uploadSem, setUploadSem] = useState('');
  const [uploadSection, setUploadSection] = useState('');
  const [uploadBatchName, setUploadBatchName] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [departments, setDepartments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);

  const { users, nameOf, emailOf } = useUserDirectory();

  const selectedCollege = colleges.find((c: any) => c.id === collegeId);
  const selectedCourse = courses.find((c: any) => c.id === courseId);

  useEffect(() => {
    (async () => {
      try {
        const [cData, colData, dData, bData, semData, secData] = await Promise.all([
          fetchApi('/api/v1/courses').catch(() => []),
          isSuperAdmin ? fetchApi('/api/v1/colleges').catch(() => []) : Promise.resolve([]),
          fetchApi('/api/v1/departments').catch(() => []),
          fetchApi('/api/v1/branches').catch(() => []),
          fetchApi('/api/v1/semesters').catch(() => []),
          fetchApi('/api/v1/sections').catch(() => [])
        ]);
        if (Array.isArray(cData)) setCourses(cData);
        if (Array.isArray(colData)) setColleges(colData);
        if (Array.isArray(dData)) setDepartments(dData);
        if (Array.isArray(bData)) setBranches(bData);
        if (Array.isArray(semData)) setSemesters(semData);
        if (Array.isArray(secData)) setSections(secData);
      } catch { } finally {
        setLoading(false);
      }
    })();
  }, [isSuperAdmin]);

  useEffect(() => {
    if (courseId) {
      loadResources(courseId);
    } else {
      setResourcesList([]);
    }
  }, [courseId]);

  const loadResources = async (cId: string) => {
    setResourcesLoading(true);
    try {
      const d = await fetchApi(`/api/v1/courses/${cId}/resources`);
      setResourcesList(Array.isArray(d) ? d : []);
    } catch {
      setResourcesList([]);
    } finally {
      setResourcesLoading(false);
    }
  };

  const loadEnrolledStudents = async (cId: string) => {
    if (!cId) return;
    try {
      const r = await fetchApi(`/api/v1/enrollments/course/${cId}`);
      setEnrolledStudents(Array.isArray(r) ? r : []);
    } catch {
      setEnrolledStudents([]);
    }
  };

  const openUploadModal = () => {
    setUploadTitle('');
    setUploadLinkUrl('');
    setUploadFile(null);
    setUploadSourceType('LINK');
    setUploadVisibility('ALL');
    setUploadBatchType('ALL');
    setUploadDept('');
    setUploadBranch('');
    setUploadSem('');
    setUploadSection('');
    setUploadBatchName('');
    setSelectedStudents([]);
    setStudentSearch('');
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowUploadModal(true);
    if (courseId) loadEnrolledStudents(courseId);
  };

  const toggleStudent = (uid: string) => {
    setSelectedStudents(prev => prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) { alert('Please select a course first'); return; }

    if (uploadSourceType === 'FILE' && !uploadFile) {
      alert('Please select a file to upload');
      return;
    }
    if (uploadSourceType === 'LINK' && !uploadLinkUrl.trim()) {
      alert('Please enter a valid Google Drive or cloud resource link');
      return;
    }

    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      if (uploadFile) formData.append('file', uploadFile);
      if (uploadTitle.trim()) formData.append('title', uploadTitle.trim());
      formData.append('visibility', uploadVisibility);

      if (uploadSourceType === 'LINK' && uploadLinkUrl.trim()) {
        formData.append('link_url', uploadLinkUrl.trim());
      }

      let assigned_to: any = { type: 'ALL' };
      if (uploadBatchType === 'BATCH') {
        assigned_to = {
          type: selectedStudents.length > 0 ? 'INDIVIDUALS' : 'BATCH',
          department_id: uploadDept || undefined,
          branch_id: uploadBranch || undefined,
          semester: uploadSem || undefined,
          section_id: uploadSection || undefined,
          batch_name: uploadBatchName.trim() || undefined,
          user_ids: selectedStudents.length > 0 ? selectedStudents : undefined
        };
      }
      formData.append('assigned_to', JSON.stringify(assigned_to));

      await fetchApi(`/api/v1/courses/${courseId}/resources`, {
        method: 'POST',
        body: formData
      });

      setShowUploadModal(false);
      loadResources(courseId);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to add reference resource');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title || 'this resource'}"?`)) return;
    try {
      await fetchApi(`/api/v1/courses/${courseId}/resources/${id}`, { method: 'DELETE' });
      loadResources(courseId);
    } catch (err: any) {
      alert(err.message || 'Failed to delete resource');
    }
  };

  const handleOpenOrDownload = async (resource: any) => {
    const isLink = Boolean(resource.link_url || resource.content_type === 'link' || resource.file_path?.startsWith('http'));
    if (isLink) {
      const url = resource.link_url || resource.file_path;
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }

    try {
      const filename = resource.file_name || resource.title || 'document.pdf';
      await downloadFile(`/api/v1/courses/${courseId}/resources/${resource.id}/download`, filename);
    } catch (err: any) {
      if (resource.file_url) {
        window.open(resource.file_url, '_blank');
      } else {
        alert('Download error: ' + (err.message || 'Failed'));
      }
    }
  };

  const getFileIcon = (filename: string = '', linkUrl?: string) => {
    if (linkUrl || filename.includes('Google Drive') || filename.includes('drive.google')) {
      return '🔗';
    }
    const ext = filename.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return '📄';
      case 'doc':
      case 'docx': return '📝';
      case 'ppt':
      case 'pptx': return '📊';
      case 'xls':
      case 'xlsx':
      case 'csv': return '📈';
      case 'zip':
      case 'rar': return '🗜️';
      case 'jpg':
      case 'jpeg':
      case 'png': return '🖼️';
      default: return '📎';
    }
  };

  const parseTarget = (assigned_to: any) => {
    if (!assigned_to) return null;
    if (typeof assigned_to === 'string') {
      try { return JSON.parse(assigned_to); } catch { return null; }
    }
    return assigned_to;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 'bold', margin: 0 }}>📚 Reference Materials & Documents</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>
            Central repository for course syllabus, Google Drive folders, lecture slides, lab manuals, solution keys, and study materials.
          </p>
        </div>
        {(isSuperAdmin || isCollegeAdmin || isTrainer) && courseId && (
          <button className="btn-primary" onClick={openUploadModal}>
            ➕ Add Reference Material
          </button>
        )}
      </div>

      <div style={{ marginBottom: '25px' }}>
        <CollegeCoursePicker
          courses={courses}
          courseId={courseId}
          onCourseChange={setCourseId}
          collegeId={collegeId}
          onCollegeChange={setCollegeId}
        />
      </div>

      {!courseId ? (
        <div className="panel" style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '40px', marginBottom: '12px' }}>📚</div>
          <h3 style={{ fontSize: '18px', marginBottom: '6px', color: 'var(--text-primary)' }}>Select a Course to View Reference Materials</h3>
          <p style={{ fontSize: '14px' }}>Choose a course from the dropdown above to manage and access its reference documents.</p>
        </div>
      ) : resourcesLoading ? (
        <div className="panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          Loading reference materials...
        </div>
      ) : (() => {
        const filteredList = resourcesList.filter((r: any) => {
          const target = parseTarget(r.assigned_to);
          if (filterSemester && target?.semester && String(target.semester) !== String(filterSemester)) return false;
          if (filterDepartment && target?.department_id && target.department_id !== filterDepartment) return false;
          if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const titleMatch = (r.title || '').toLowerCase().includes(q);
            const fileMatch = (r.file_name || '').toLowerCase().includes(q);
            const linkMatch = (r.link_url || '').toLowerCase().includes(q);
            if (!titleMatch && !fileMatch && !linkMatch) return false;
          }
          return true;
        });

        return (
          <div>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ minWidth: '160px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Filter by Semester / Batch</label>
                <select className="input-field" style={{ padding: '6px 10px', fontSize: '13px' }} value={filterSemester} onChange={e => setFilterSemester(e.target.value)}>
                  <option value="">All Semesters / Batches</option>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={String(n)}>Semester {n}</option>)}
                </select>
              </div>
              <div style={{ minWidth: '160px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Filter by Department</label>
                <select className="input-field" style={{ padding: '6px 10px', fontSize: '13px' }} value={filterDepartment} onChange={e => setFilterDepartment(e.target.value)}>
                  <option value="">All Departments</option>
                  {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '3px' }}>Search Material</label>
                <input
                  className="input-field"
                  style={{ padding: '6px 10px', fontSize: '13px' }}
                  placeholder="Search title, link or file name…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
              {(filterSemester || filterDepartment || searchQuery) && (
                <button
                  className="btn-secondary"
                  style={{ alignSelf: 'flex-end', padding: '6px 12px', fontSize: '12px', height: '36px' }}
                  onClick={() => { setFilterSemester(''); setFilterDepartment(''); setSearchQuery(''); }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', margin: 0 }}>
                Files & Links for <strong>{selectedCourse?.title}</strong> ({filteredList.length} of {resourcesList.length})
              </h2>
            </div>

            {filteredList.length === 0 ? (
              <div className="panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>📂</div>
                <p style={{ fontSize: '14px', marginBottom: '14px' }}>
                  {resourcesList.length === 0 ? 'No reference materials added for this course yet.' : 'No materials match the selected filters.'}
                </p>
                {(isSuperAdmin || isCollegeAdmin || isTrainer) && resourcesList.length === 0 && (
                  <button className="btn-secondary" onClick={openUploadModal}>
                    Add First Reference Material
                  </button>
                )}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                {filteredList.map((r: any) => {
                  const target = parseTarget(r.assigned_to);
                  const isLink = Boolean(r.link_url || r.content_type === 'link' || r.file_path?.startsWith('http'));
                  const deptName = target?.department_id ? departments.find((d: any) => d.id === target.department_id)?.name : null;

                  return (
                    <div key={r.id} className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '18px', transition: 'transform 0.15s ease' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
                          <span style={{ fontSize: '28px', lineHeight: 1 }}>{getFileIcon(r.file_name, r.link_url)}</span>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.title || r.file_name}>
                              {r.title || r.file_name}
                            </h3>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {isLink ? (r.link_url || r.file_path) : r.file_name}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
                          {isLink ? (
                            <span className="badge" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', border: '1px solid rgba(16,185,129,0.3)' }}>
                              🔗 Google Drive / Cloud Link
                            </span>
                          ) : (
                            <span className="badge badge-info">{Math.round((r.file_size || 0) / 1024)} KB</span>
                          )}

                          {r.visibility === 'STAFF_ONLY' ? (
                            <span className="badge badge-warning" style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308' }}>🔒 Faculty Only</span>
                          ) : r.visibility === 'STUDENT_ONLY' ? (
                            <span className="badge badge-secondary">🎓 Students Only</span>
                          ) : (
                            <span className="badge badge-success">🌐 All (Staff & Students)</span>
                          )}

                          {target?.semester && (
                            <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
                              Sem {target.semester}
                            </span>
                          )}
                          {deptName && (
                            <span className="badge badge-secondary">{deptName}</span>
                          )}
                          {target?.batch_name && (
                            <span className="badge badge-info">{target.batch_name}</span>
                          )}
                          {target?.user_ids?.length > 0 && (
                            <span className="badge" style={{ background: 'rgba(56,189,248,0.15)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.3)' }}>
                              👥 {target.user_ids.length} Students
                            </span>
                          )}
                          {r.created_at && (
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', alignSelf: 'center' }}>
                              {new Date(r.created_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '12px' }}>
                        <button
                          className="btn-primary"
                          style={{ flex: 1, fontSize: '13px', padding: '6px 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                          onClick={() => handleOpenOrDownload(r)}
                        >
                          {isLink ? '🚀 Open in Drive / Link ↗' : '📥 Download File'}
                        </button>
                        {(isSuperAdmin || isCollegeAdmin || isTrainer) && (
                          <button
                            className="btn-secondary"
                            style={{ fontSize: '13px', padding: '6px 10px', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }}
                            onClick={() => handleDelete(r.id, r.title || r.file_name)}
                          >
                            ✕ Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="panel" style={{ width: '680px', maxWidth: '94vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>➕ Add Reference Material</h3>
              <button className="btn-secondary" style={{ fontSize: '12px', padding: '4px 10px' }} onClick={() => setShowUploadModal(false)}>✕ Close</button>
            </div>

            {uploadError && (
              <div style={{ padding: '10px 14px', background: 'rgba(244,63,94,0.15)', border: '1px solid var(--danger-color)', color: 'var(--danger-color)', borderRadius: '6px', marginBottom: '14px', fontSize: '13px' }}>
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUpload}>
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', fontWeight: 600 }}>Selected Course</label>
                <div className="input-field" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)', fontSize: '13px' }}>
                  {selectedCourse?.title || 'No course selected'}
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', fontWeight: 600 }}>Storage / Source Type</label>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: uploadSourceType === 'LINK' ? '2px solid var(--primary-color)' : '1px solid rgba(255,255,255,0.1)',
                      background: uploadSourceType === 'LINK' ? 'rgba(0,168,255,0.15)' : 'rgba(255,255,255,0.02)',
                      color: uploadSourceType === 'LINK' ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onClick={() => setUploadSourceType('LINK')}
                  >
                    <span>🔗</span> Google Drive / Cloud Link <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.2)', color: '#10b981', padding: '2px 6px', borderRadius: '4px' }}>Saves Storage</span>
                  </button>

                  <button
                    type="button"
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: uploadSourceType === 'FILE' ? '2px solid var(--primary-color)' : '1px solid rgba(255,255,255,0.1)',
                      background: uploadSourceType === 'FILE' ? 'rgba(0,168,255,0.15)' : 'rgba(255,255,255,0.02)',
                      color: uploadSourceType === 'FILE' ? '#fff' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px'
                    }}
                    onClick={() => setUploadSourceType('FILE')}
                  >
                    <span>📁</span> Upload Direct File (PDF, PPT)
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', fontWeight: 600 }}>Document Title</label>
                <input
                  required
                  className="input-field"
                  placeholder="e.g. Unit 1-4 Complete Lecture Slides & Formulas"
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                />
              </div>

              {uploadSourceType === 'LINK' ? (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', fontWeight: 600 }}>
                    Google Drive / Cloud Folder Link
                  </label>
                  <input
                    required
                    type="url"
                    className="input-field"
                    placeholder="https://drive.google.com/drive/folders/... or https://docs.google.com/..."
                    value={uploadLinkUrl}
                    onChange={e => setUploadLinkUrl(e.target.value)}
                  />
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px' }}>
                    💡 <em>Tip: In Google Drive, click <strong>Share → Anyone with the link can view</strong> so enrolled students can open this resource.</em>
                  </div>
                </div>
              ) : (
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', fontWeight: 600 }}>File (PDF, PPT, DOCX, ZIP, XLS)</label>
                  <input
                    ref={fileInputRef}
                    required
                    type="file"
                    className="input-field"
                    onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  />
                </div>
              )}

              <div style={{ marginBottom: '16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '8px', fontWeight: 600 }}>Batch & Semester Scope</label>
                <div style={{ display: 'flex', gap: '20px', marginBottom: '10px' }}>
                  <label style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="radio" name="batch-type" checked={uploadBatchType === 'ALL'} onChange={() => setUploadBatchType('ALL')} />
                    🌐 All Batches (Course-wide)
                  </label>
                  <label style={{ display: 'flex', gap: '6px', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
                    <input type="radio" name="batch-type" checked={uploadBatchType === 'BATCH'} onChange={() => setUploadBatchType('BATCH')} />
                    🎓 Specific Batch / Semester
                  </label>
                </div>

                {uploadBatchType === 'BATCH' && (
                  <div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px', marginBottom: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Semester</label>
                        <select className="input-field" style={{ padding: '6px 8px', fontSize: '13px' }} value={uploadSem} onChange={e => setUploadSem(e.target.value)}>
                          <option value="">Choose Semester…</option>
                          {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={String(n)}>Semester {n}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Department</label>
                        <select className="input-field" style={{ padding: '6px 8px', fontSize: '13px' }} value={uploadDept} onChange={e => setUploadDept(e.target.value)}>
                          <option value="">All Departments</option>
                          {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Branch (optional)</label>
                        <select className="input-field" style={{ padding: '6px 8px', fontSize: '13px' }} value={uploadBranch} onChange={e => setUploadBranch(e.target.value)}>
                          <option value="">All Branches</option>
                          {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Batch / Year Label (optional)</label>
                        <input className="input-field" style={{ padding: '6px 8px', fontSize: '13px' }} placeholder="e.g. 2024-28 Batch" value={uploadBatchName} onChange={e => setUploadBatchName(e.target.value)} />
                      </div>
                    </div>

                    {(() => {
                      const currentTenant = isSuperAdmin && selectedCollege?.tenant_id ? selectedCollege.tenant_id : undefined;
                      const allStudents = users.filter((u: any) => {
                        const isStud = String(u.role || '').toUpperCase() === 'STUDENT';
                        if (!isStud) return false;
                        if (currentTenant && u.tenant_id && u.tenant_id !== currentTenant) return false;
                        return true;
                      });
                      const pool = allStudents.length > 0 ? allStudents : enrolledStudents.map((e: any) => ({ id: e.user_id, ...e }));

                      const filtered = pool.filter((st: any) => {
                        const uid = st.id || st.user_id;
                        const userObj = users.find((u: any) => u.id === uid) || st;
                        if (uploadDept && userObj.department_id && userObj.department_id !== uploadDept) return false;
                        if (uploadBranch && userObj.branch_id && userObj.branch_id !== uploadBranch) return false;
                        if (uploadSem && String(userObj.semester_number || userObj.semester_id) !== String(uploadSem)) return false;
                        if (uploadSection && userObj.section_id && userObj.section_id !== uploadSection) return false;
                        if (studentSearch) {
                          const q = studentSearch.toLowerCase();
                          const name = `${userObj.first_name || ''} ${userObj.last_name || ''}`.toLowerCase();
                          const email = (userObj.email || '').toLowerCase();
                          if (!name.includes(q) && !email.includes(q)) return false;
                        }
                        return true;
                      });

                      const selectAllFiltered = () => {
                        const idsToAdd = filtered.map((s: any) => s.id || s.user_id).filter(Boolean);
                        setSelectedStudents(prev => Array.from(new Set([...prev, ...idsToAdd])));
                      };

                      const clearFiltered = () => {
                        const idsToRemove = new Set(filtered.map((s: any) => s.id || s.user_id));
                        setSelectedStudents(prev => prev.filter(id => !idsToRemove.has(id)));
                      };

                      return (
                        <div style={{ marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600 }}>Target Specific Students (Optional · {selectedStudents.length} selected):</span>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button type="button" className="btn-secondary" style={{ padding: '2px 6px', fontSize: '11px' }} onClick={selectAllFiltered}>
                                Select All ({filtered.length})
                              </button>
                              <button type="button" className="btn-secondary" style={{ padding: '2px 6px', fontSize: '11px', color: 'var(--danger-color)' }} onClick={clearFiltered}>
                                Clear
                              </button>
                            </div>
                          </div>

                          <input
                            className="input-field"
                            style={{ padding: '4px 8px', fontSize: '12px', marginBottom: '8px' }}
                            placeholder="Filter students by name or email..."
                            value={studentSearch}
                            onChange={e => setStudentSearch(e.target.value)}
                          />

                          <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '4px' }}>
                            {filtered.length === 0 ? (
                              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'center', padding: '8px' }}>No students match the criteria.</p>
                            ) : filtered.map((st: any) => {
                              const uid = st.id || st.user_id;
                              const userObj = users.find((u: any) => u.id === uid) || st;
                              const dept = departments.find((d: any) => d.id === userObj.department_id)?.name;
                              const sem = userObj.semester_number || semesters.find((s: any) => s.id === userObj.semester_id)?.number;
                              return (
                                <label key={uid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 6px', borderRadius: '4px', cursor: 'pointer', background: selectedStudents.includes(uid) ? 'rgba(0,168,255,0.12)' : 'transparent', marginBottom: '2px' }}>
                                  <span style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '12px' }}>
                                    <input type="checkbox" checked={selectedStudents.includes(uid)} onChange={() => toggleStudent(uid)} />
                                    <strong>{nameOf(uid)}</strong>
                                    {emailOf(uid) && <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>({emailOf(uid)})</span>}
                                  </span>
                                  <span style={{ display: 'flex', gap: '4px', fontSize: '10px' }}>
                                    {dept && <span className="badge badge-secondary">{dept}</span>}
                                    {sem && <span className="badge badge-info">Sem {sem}</span>}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', fontWeight: 600 }}>Audience / Visibility</label>
                <select
                  className="input-field"
                  value={uploadVisibility}
                  onChange={e => setUploadVisibility(e.target.value)}
                >
                  <option value="ALL">🌐 All (Both Students & Staff)</option>
                  <option value="STUDENT_ONLY">🎓 Students Only (Learning Materials)</option>
                  <option value="STAFF_ONLY">🔒 Staff Only (Faculty Keys & Rubrics)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={uploading}>
                  {uploading ? '⏳ Saving Resource...' : (uploadSourceType === 'LINK' ? '🚀 Save Google Drive Link' : 'Upload Resource')}
                </button>
                <button type="button" className="btn-secondary" onClick={() => setShowUploadModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
