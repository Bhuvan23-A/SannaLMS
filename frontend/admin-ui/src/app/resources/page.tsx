'use client';
import { useState, useEffect, useRef } from 'react';
import { fetchApi, downloadFile } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
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

  // Hierarchy & Batch metadata
  const [departments, setDepartments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);

  // Filtering on main list
  const [filterSem, setFilterSem] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Upload Form
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadVisibility, setUploadVisibility] = useState('ALL');
  const [uploadBatchType, setUploadBatchType] = useState<'ALL' | 'BATCH'>('ALL');
  const [uploadDept, setUploadDept] = useState('');
  const [uploadBranch, setUploadBranch] = useState('');
  const [uploadSem, setUploadSem] = useState('');
  const [uploadSection, setUploadSection] = useState('');
  const [uploadBatchName, setUploadBatchName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId) { alert('Please select a course first'); return; }
    if (!uploadFile) { alert('Please select a file to upload'); return; }

    setUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      if (uploadTitle.trim()) formData.append('title', uploadTitle.trim());
      formData.append('visibility', uploadVisibility);

      const assigned_to = uploadBatchType === 'ALL'
        ? JSON.stringify({ type: 'ALL' })
        : JSON.stringify({
            type: 'BATCH',
            department_id: uploadDept || undefined,
            branch_id: uploadBranch || undefined,
            semester: uploadSem || undefined,
            section_id: uploadSection || undefined,
            batch_name: uploadBatchName.trim() || undefined,
          });
      formData.append('assigned_to', assigned_to);

      await fetchApi(`/api/v1/courses/${courseId}/resources`, {
        method: 'POST',
        body: formData
      });

      setUploadTitle('');
      setUploadFile(null);
      setUploadBatchType('ALL');
      setUploadDept('');
      setUploadBranch('');
      setUploadSem('');
      setUploadSection('');
      setUploadBatchName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowUploadModal(false);
      loadResources(courseId);
    } catch (err: any) {
      setUploadError(err.message || 'Failed to upload resource');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Delete "${title || 'this file'}"?`)) return;
    try {
      await fetchApi(`/api/v1/courses/${courseId}/resources/${id}`, { method: 'DELETE' });
      loadResources(courseId);
    } catch (err: any) {
      alert(err.message || 'Failed to delete resource');
    }
  };

  const handleDownload = async (resource: any) => {
    try {
      const filename = resource.file_name || resource.title || 'document.pdf';
      await downloadFile(`/api/v1/courses/${courseId}/resources/${resource.id}/download`, filename);
    } catch (err: any) {
      // If direct API download endpoint isn't routed, download from file_url
      if (resource.file_url) {
        window.open(resource.file_url, '_blank');
      } else {
        alert('Download error: ' + (err.message || 'Failed'));
      }
    }
  };

  const getFileIcon = (filename: string = '') => {
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 'bold', margin: 0 }}>📚 Reference Materials & Documents</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>
            Central repository for course syllabus, lecture slides, lab manuals, solution keys, and study materials.
          </p>
        </div>
        {(isSuperAdmin || isCollegeAdmin || isTrainer) && courseId && (
          <button className="btn-primary" onClick={() => setShowUploadModal(true)}>
            ➕ Upload Reference Material
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
          <p style={{ fontSize: '14px' }}>Choose a course from the dropdown above to manage and download its reference documents.</p>
        </div>
      ) : resourcesLoading ? (
        <div className="panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
          Loading reference materials...
        </div>
      ) : (
        <div>
          {/* Batch & Semester Filter Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '14px', marginBottom: '20px', alignItems: 'center' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Filter by Semester / Batch</label>
              <select className="input-field" style={{ padding: '6px 10px', fontSize: '13px' }} value={filterSem} onChange={e => setFilterSem(e.target.value)}>
                <option value="">All Semesters / Batches</option>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={String(n)}>Semester {n}</option>)}
                {semesters.map((s: any) => <option key={s.id} value={s.id}>{s.name || `Semester ${s.number}`}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Filter by Department</label>
              <select className="input-field" style={{ padding: '6px 10px', fontSize: '13px' }} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                <option value="">All Departments</option>
                {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Search Material</label>
              <input className="input-field" style={{ padding: '6px 10px', fontSize: '13px' }} placeholder="Search title or file..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            {(filterSem || filterDept || searchQuery) && (
              <div style={{ alignSelf: 'flex-end' }}>
                <button type="button" className="btn-secondary" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={() => { setFilterSem(''); setFilterDept(''); setSearchQuery(''); }}>
                  ✕ Reset Filters
                </button>
              </div>
            )}
          </div>

          {(() => {
            const filteredResources = resourcesList.filter((r: any) => {
              let parsedBatch: any = null;
              if (r.assigned_to) {
                try { parsedBatch = typeof r.assigned_to === 'string' ? JSON.parse(r.assigned_to) : r.assigned_to; } catch {}
              }
              if (filterSem) {
                if (parsedBatch && parsedBatch.type === 'BATCH') {
                  if (String(parsedBatch.semester) !== String(filterSem)) return false;
                }
              }
              if (filterDept) {
                if (parsedBatch && parsedBatch.type === 'BATCH' && parsedBatch.department_id) {
                  if (parsedBatch.department_id !== filterDept) return false;
                }
              }
              if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const title = (r.title || '').toLowerCase();
                const fname = (r.file_name || '').toLowerCase();
                if (!title.includes(q) && !fname.includes(q)) return false;
              }
              return true;
            });

            return (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '18px', margin: 0 }}>
                    Files for <strong>{selectedCourse?.title}</strong> ({filteredResources.length} of {resourcesList.length})
                  </h2>
                </div>

                {filteredResources.length === 0 ? (
                  <div className="panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    <div style={{ fontSize: '32px', marginBottom: '10px' }}>📂</div>
                    <p style={{ fontSize: '14px', marginBottom: '14px' }}>
                      {resourcesList.length === 0 ? 'No reference materials uploaded for this course yet.' : 'No materials match the selected batch/semester filter.'}
                    </p>
                    {(isSuperAdmin || isCollegeAdmin || isTrainer) && (
                      <button className="btn-secondary" onClick={() => setShowUploadModal(true)}>
                        Upload Document
                      </button>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    {filteredResources.map((r: any) => {
                      let parsedBatch: any = null;
                      if (r.assigned_to) {
                        try { parsedBatch = typeof r.assigned_to === 'string' ? JSON.parse(r.assigned_to) : r.assigned_to; } catch {}
                      }

                      return (
                        <div key={r.id} className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '18px', transition: 'transform 0.15s ease' }}>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
                              <span style={{ fontSize: '28px', lineHeight: 1 }}>{getFileIcon(r.file_name)}</span>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 4px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.title || r.file_name}>
                                  {r.title || r.file_name}
                                </h3>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {r.file_name}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                              <span className="badge badge-info">{Math.round((r.file_size || 0) / 1024)} KB</span>
                              {r.visibility === 'STAFF_ONLY' ? (
                                <span className="badge badge-warning" style={{ background: 'rgba(234,179,8,0.15)', color: '#eab308' }}>🔒 Faculty Only</span>
                              ) : r.visibility === 'STUDENT_ONLY' ? (
                                <span className="badge badge-secondary">🎓 Students Only</span>
                              ) : (
                                <span className="badge badge-success">🌐 All (Staff & Students)</span>
                              )}

                              {/* Batch / Semester Badge */}
                              {parsedBatch && parsedBatch.type === 'BATCH' ? (() => {
                                const deptObj = departments.find((d: any) => d.id === parsedBatch.department_id);
                                const labelParts = [
                                  parsedBatch.semester ? `Sem ${parsedBatch.semester}` : '',
                                  deptObj ? deptObj.name : '',
                                  parsedBatch.batch_name || ''
                                ].filter(Boolean);
                                return (
                                  <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#60a5fa', border: '1px solid rgba(59,130,246,0.3)' }}>
                                    🎓 {labelParts.length > 0 ? labelParts.join(' · ') : 'Specific Batch'}
                                  </span>
                                );
                              })() : (
                                <span className="badge" style={{ background: 'rgba(16,185,129,0.12)', color: '#34d399' }}>
                                  🌐 All Batches
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
                              style={{ flex: 1, fontSize: '13px', padding: '6px 12px' }}
                              onClick={() => handleDownload(r)}
                            >
                              📥 Download File
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
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="panel" style={{ width: '560px', maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>➕ Upload Reference Material</h3>
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

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', fontWeight: 600 }}>Document Title</label>
                <input
                  required
                  className="input-field"
                  placeholder="e.g. Unit 1 Lecture Slides & Formulas"
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                />
              </div>

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

              {/* Batch Selection for Reference Material */}
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
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
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
                )}
              </div>

              <div style={{ marginBottom: '20px' }}>
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

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={uploading}>
                  {uploading ? '⏳ Uploading Document...' : 'Upload Resource'}
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
