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

  // Upload Form
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadVisibility, setUploadVisibility] = useState('ALL');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedCollege = colleges.find((c: any) => c.id === collegeId);
  const selectedCourse = courses.find((c: any) => c.id === courseId);

  useEffect(() => {
    (async () => {
      try {
        const [cData, colData] = await Promise.all([
          fetchApi('/api/v1/courses').catch(() => []),
          isSuperAdmin ? fetchApi('/api/v1/colleges').catch(() => []) : Promise.resolve([])
        ]);
        if (Array.isArray(cData)) setCourses(cData);
        if (Array.isArray(colData)) setColleges(colData);
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

      await fetchApi(`/api/v1/courses/${courseId}/resources`, {
        method: 'POST',
        body: formData
      });

      setUploadTitle('');
      setUploadFile(null);
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', margin: 0 }}>
              Files for <strong>{selectedCourse?.title}</strong> ({resourcesList.length})
            </h2>
          </div>

          {resourcesList.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>📂</div>
              <p style={{ fontSize: '14px', marginBottom: '14px' }}>No reference materials uploaded for this course yet.</p>
              {(isSuperAdmin || isCollegeAdmin || isTrainer) && (
                <button className="btn-secondary" onClick={() => setShowUploadModal(true)}>
                  Upload First Document
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {resourcesList.map((r: any) => (
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
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div className="panel" style={{ width: '520px', maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto' }}>
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
                <label style={{ display: 'block', fontSize: '13px', marginBottom: '5px', fontWeight: 600 }}>File (PDF, PPT, DOCX, ZIP)</label>
                <input
                  ref={fileInputRef}
                  required
                  type="file"
                  className="input-field"
                  onChange={e => setUploadFile(e.target.files?.[0] || null)}
                />
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
