'use client';

import { useState, use, useEffect, useRef } from 'react';
import CourseTrainersTab from '@/components/CourseTrainersTab';
import CoursePrerequisitesTab from '@/components/CoursePrerequisitesTab';
import CourseEnrollmentsTab from '@/components/CourseEnrollmentsTab';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';

interface Topic {
  id: string;
  title: string;
  sequence_no: number;
  content?: string;
  asset?: { type: string; status: string; physical_path?: string };
}

interface Lesson {
  id: string;
  title: string;
  sequence_no: number;
  topics: Topic[];
  expanded?: boolean;
}

interface Module {
  id: string;
  title: string;
  sequence_no: number;
  lessons: Lesson[];
  expanded?: boolean;
}

export default function CourseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const [activeTab, setActiveTab] = useState('builder');
  const { id: courseId } = use(params);
  const { isTrainer, isAdmin } = useRole();

  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragItem, setDragItem] = useState<{ type: 'module' | 'lesson'; id: string; moduleId?: string } | null>(null);
  const [uploadingTopic, setUploadingTopic] = useState<string | null>(null);
  const [newModule, setNewModule] = useState('');
  const [course, setCourse] = useState<any>(null);

  const loadCourse = async () => {
    try {
      const [c, mods] = await Promise.all([
        fetchApi(`/api/v1/courses/${courseId}`),
        fetchApi(`/api/v1/modules/course/${courseId}`)
      ]);
      setCourse(c);
      // Load lessons for each module
      const modulesWithLessons = await Promise.all(
        (mods || []).map(async (mod: Module) => {
          const lessons = await fetchApi(`/api/v1/lessons/module/${mod.id}`).catch(() => []);
          const lessonsWithTopics = await Promise.all(
            (lessons || []).map(async (lesson: Lesson) => {
              const topics = await fetchApi(`/api/v1/topics/lesson/${lesson.id}`).catch(() => []);
              return { ...lesson, topics: topics || [], expanded: true };
            })
          );
          return { ...mod, lessons: lessonsWithTopics, expanded: true };
        })
      );
      setModules(modulesWithLessons.sort((a: Module, b: Module) => a.sequence_no - b.sequence_no));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCourse(); }, [courseId]);

  const addModule = async () => {
    if (!newModule.trim()) return;
    await fetchApi('/api/v1/modules', { method: 'POST', body: JSON.stringify({ title: newModule, course_id: courseId, sequence_no: modules.length + 1 }) });
    setNewModule('');
    loadCourse();
  };

  const addLesson = async (moduleId: string, moduleIndex: number) => {
    const title = prompt('Lesson title:');
    if (!title) return;
    await fetchApi('/api/v1/lessons', { method: 'POST', body: JSON.stringify({ title, module_id: moduleId, sequence_no: modules[moduleIndex].lessons.length + 1 }) });
    loadCourse();
  };

  const addTopic = async (lessonId: string) => {
    const title = prompt('Topic title:');
    if (!title) return;
    await fetchApi('/api/v1/topics', { method: 'POST', body: JSON.stringify({ title, lesson_id: lessonId }) });
    loadCourse();
  };

  const uploadFile = async (topicId: string, file: File, courseId: string) => {
    setUploadingTopic(topicId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(
        `/api/v1/content/upload/${topicId}?course_id=${courseId}`,
        {
          method: 'POST',
          headers: { 
            'Authorization': localStorage.getItem('access_token') ? `Bearer ${localStorage.getItem('access_token')}` : '',
            'x-mock-roles': localStorage.getItem('mockRole') || 'PRIMARY_TRAINER', 
            'x-mock-tenant-id': localStorage.getItem('tenantId') || 'stanford', 
            'x-mock-user-id': localStorage.getItem('userId') || 'u-1' 
          },
          body: formData,
        }
      );
      const data = await res.json();
      if (res.ok) {
        alert(`✅ ${data.type} uploaded! Asset ID: ${data.asset_id}`);
        loadCourse();
      } else {
        alert(`❌ Upload failed: ${data.message}`);
      }
    } finally {
      setUploadingTopic(null);
    }
  };

  // Drag and drop for modules
  const handleModuleDragStart = (e: React.DragEvent, modId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    setDragItem({ type: 'module', id: modId });
  };

  const handleModuleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragItem || dragItem.type !== 'module' || dragItem.id === targetId) return;
    const reordered = [...modules];
    const fromIdx = reordered.findIndex(m => m.id === dragItem.id);
    const toIdx = reordered.findIndex(m => m.id === targetId);
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setModules(reordered);
    // Persist new order
    await Promise.all(
      reordered.map((m, i) => fetchApi(`/api/v1/modules/${m.id}`, { method: 'PUT', body: JSON.stringify({ sequence_no: i + 1 }) }).catch(() => {}))
    );
    setDragItem(null);
  };

  const tabs = [
    { id: 'builder', label: '🏗️ Course Builder' },
    { id: 'trainers', label: '👨‍🏫 Trainers' },
    { id: 'prerequisites', label: '📋 Prerequisites' },
    { id: 'enrollments', label: '👥 Enrollments' },
  ];

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '4px' }}>
            {course ? `📚 ${course.title}` : 'Course Management'}
          </h1>
          <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--primary-color)' }}>{courseId}</span>
          {course && <span className={`badge badge-${course.status === 'PUBLISHED' ? 'success' : 'warning'}`} style={{ marginLeft: '12px' }}>{course.status}</span>}
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '0' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding: '10px 20px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px',
            color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
            borderBottom: activeTab === tab.id ? '2px solid var(--primary-color)' : '2px solid transparent',
            fontWeight: activeTab === tab.id ? '600' : '400', transition: 'all 0.15s ease',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Course Builder Tab */}
      {activeTab === 'builder' && (
        <div>
          {(isTrainer || isAdmin) && (
            <div className="panel" style={{ marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '12px' }}>➕ Add Module</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  className="form-input" style={{ flex: 1 }}
                  placeholder="Module title (e.g. 'Introduction to React')"
                  value={newModule}
                  onChange={e => setNewModule(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addModule()}
                />
                <button className="btn-primary" onClick={addModule}>Add Module</button>
              </div>
            </div>
          )}

          {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading curriculum...</p> : (
            modules.length === 0 ? (
              <div className="panel" style={{ textAlign: 'center', padding: '60px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
                <h3>No modules yet</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Add a module above to start building your course curriculum.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {modules.map((mod, modIdx) => (
                  <div
                    key={mod.id}
                    draggable={isTrainer || isAdmin}
                    onDragStart={(e) => handleModuleDragStart(e, mod.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleModuleDrop(e, mod.id)}
                    className="panel"
                    style={{ cursor: 'grab', border: dragItem?.id === mod.id ? '2px dashed var(--primary-color)' : undefined }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: mod.expanded ? '16px' : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ color: 'var(--text-secondary)', cursor: 'grab' }}>⠿</span>
                        <span style={{ fontSize: '12px', background: 'var(--primary-color)', color: 'white', padding: '2px 8px', borderRadius: '4px' }}>
                          Module {mod.sequence_no}
                        </span>
                        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>{mod.title}</h3>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{mod.lessons.length} lesson{mod.lessons.length !== 1 ? 's' : ''}</span>
                        {(isTrainer || isAdmin) && (
                          <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }} onClick={() => addLesson(mod.id, modIdx)}>+ Lesson</button>
                        )}
                        <button onClick={() => setModules(prev => prev.map(m => m.id === mod.id ? { ...m, expanded: !m.expanded } : m))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '18px' }}>
                          {mod.expanded ? '▲' : '▼'}
                        </button>
                      </div>
                    </div>

                    {mod.expanded && mod.lessons.map((lesson, lessonIdx) => (
                      <div key={lesson.id} style={{ marginLeft: '20px', marginBottom: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: lesson.expanded ? '12px' : 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>└</span>
                            <span style={{ fontSize: '11px', color: 'var(--primary-color)' }}>Lesson {lesson.sequence_no}</span>
                            <span style={{ fontSize: '14px', fontWeight: '500' }}>{lesson.title}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{lesson.topics.length} topics</span>
                            {(isTrainer || isAdmin) && (
                              <button className="btn-secondary" style={{ padding: '3px 10px', fontSize: '11px' }} onClick={() => addTopic(lesson.id)}>+ Topic</button>
                            )}
                            <button onClick={() => setModules(prev => prev.map(m => m.id === mod.id ? { ...m, lessons: m.lessons.map(l => l.id === lesson.id ? { ...l, expanded: !l.expanded } : l) } : m))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '14px' }}>
                              {lesson.expanded ? '▲' : '▼'}
                            </button>
                          </div>
                        </div>

                        {lesson.expanded && lesson.topics.map(topic => (
                          <div key={topic.id} style={{ marginLeft: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', marginBottom: '6px' }}>
                            <div>
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginRight: '8px' }}>#{topic.sequence_no}</span>
                              <span style={{ fontSize: '13px' }}>{topic.title}</span>
                              {topic.asset && (
                                <span className={`badge badge-${topic.asset.status === 'READY' ? 'success' : 'warning'}`} style={{ marginLeft: '8px', fontSize: '10px' }}>
                                  {topic.asset.type} · {topic.asset.status}
                                </span>
                              )}
                            </div>
                            {(isTrainer || isAdmin) && (
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <label style={{ cursor: 'pointer' }}>
                                  <input type="file" style={{ display: 'none' }} accept="video/*,.pdf,.docx,.pptx,.zip"
                                    onChange={e => { if (e.target.files?.[0]) uploadFile(topic.id, e.target.files[0], courseId); e.target.value = ''; }}
                                    disabled={uploadingTopic === topic.id}
                                  />
                                  <span className="btn-secondary" style={{ padding: '3px 10px', fontSize: '11px', display: 'inline-block' }}>
                                    {uploadingTopic === topic.id ? '⏳ Uploading...' : '📤 Upload'}
                                  </span>
                                </label>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {activeTab !== 'builder' && (
        <div className="panel">
          {activeTab === 'trainers' && <CourseTrainersTab courseId={courseId} />}
          {activeTab === 'prerequisites' && <CoursePrerequisitesTab courseId={courseId} />}
          {activeTab === 'enrollments' && <CourseEnrollmentsTab courseId={courseId} />}
        </div>
      )}
    </div>
  );
}
