'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
import { useUserDirectory } from '@/hooks/useUserDirectory';
import GradeCard from '@/components/GradeCard';
import CollegeCoursePicker from '@/components/CollegeCoursePicker';
import Link from 'next/link';

export default function GradebookPage() {
  const { isAdmin, isTrainer, role } = useRole();
  const [grades, setGrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [courseId, setCourseId] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [calculating, setCalculating] = useState(false);

  // People resolver (#fix): show student names instead of raw Keycloak UUIDs
  const { nameOf, emailOf } = useUserDirectory();

  // Real logged-in user id (Keycloak sub) — NOT the hardcoded mock 'u-1'
  const myUserId = (typeof window !== 'undefined' && localStorage.getItem('userId')) || '';

  // Super admin sees which college each student belongs to — resolved from the
  // college-service user links (user_id -> college name).
  const [collegeByUser, setCollegeByUser] = useState<Record<string, string>>({});
  const isSuperAdmin = role === 'SUPER_ADMIN';

  // Per-student grade card modal state
  const [cardStudent, setCardStudent] = useState<any>(null);
  const [cardData, setCardData] = useState<{ grades: any[]; courses: any[] } | null>(null);
  const [cardLoading, setCardLoading] = useState(false);

  // Load available courses once so the gradebook can be filtered course-wise (#14)
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchApi('/api/v1/courses');
        if (Array.isArray(data)) setCourses(data);
      } catch { /* course list unavailable */ }
      try {
        const sems = await fetchApi('/api/v1/semesters');
        setSemesters(Array.isArray(sems) ? sems : []);
      } catch { /* semester list unavailable */ }
      // No courses yet (new college) or API failure — resolve loading so the
      // page shows an empty state instead of hanging on "Loading..." forever.
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (courseId) loadGrades();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, courseId]);

  // Build the user_id -> college map once (super admin only)
  useEffect(() => {
    if (!isSuperAdmin) return;
    (async () => {
      try {
        const data = await fetchApi('/api/v1/colleges');
        const map: Record<string, string> = {};
        (Array.isArray(data) ? data : []).forEach((col: any) => {
          (col.users || []).forEach((ur: any) => {
            if (ur.user_id && !map[ur.user_id]) map[ur.user_id] = col.name;
          });
        });
        setCollegeByUser(map);
      } catch { /* college mapping unavailable */ }
    })();
  }, [isSuperAdmin]);

  const loadGrades = async () => {
    if (!courseId) return;
    try {
      // No setLoading(true) — the full-page flash unmounts the CollegeCoursePicker
      // and caused an endless reload blink (#fix).
      if (isAdmin || isTrainer) {
        const d = await fetchApi(`/api/v1/gradebook/${courseId}`);
        setGrades(d || []);
      }
    } catch { } finally { setLoading(false); }
  };

  const recalculate = async (userId: string) => {
    try {
      setCalculating(true);
      await fetchApi(`/api/v1/gradebook/${courseId}/calculate/${userId}`, { method: 'POST' });
      loadGrades();
    } catch { alert('Failed to calculate grade'); } finally { setCalculating(false); }
  };

  // Recalculate for every student currently listed (no more hardcoded u-1)
  const recalculateAll = async () => {
    try {
      setCalculating(true);
      const rows = grades.length > 0 ? grades : await fetchApi(`/api/v1/gradebook/${courseId}`).catch(() => []);
      const ids = (rows || []).map((g: any) => g.user_id);
      if (ids.length === 0) { alert('No students with grades yet. Create quiz/assignment submissions first.'); return; }
      for (const id of ids) {
        await fetchApi(`/api/v1/gradebook/${courseId}/calculate/${id}`, { method: 'POST' }).catch(() => {});
      }
      loadGrades();
    } catch { alert('Failed to calculate grades'); } finally { setCalculating(false); }
  };

  const openGradeCard = async (user: any) => {
    setCardStudent(user);
    setCardData(null);
    setCardLoading(true);
    try {
      const [g, enr] = await Promise.all([
        fetchApi(`/api/v1/gradebook/student/${user.user_id || user.id}`).catch(() => []),
        fetchApi(`/api/v1/enrollments/user/${user.user_id || user.id}`).catch(() => []),
      ]);
      const enrCourses = (Array.isArray(enr) ? enr : []).map((e: any) => e.course).filter(Boolean);
      setCardData({ grades: Array.isArray(g) ? g : [], courses: enrCourses });
    } catch { alert('Failed to load grade card'); } finally { setCardLoading(false); }
  };

  const gradeColor = (grade: string | null) => {
    if (grade === 'A') return '#00c864';
    if (grade === 'B') return '#00a8ff';
    if (grade === 'C') return '#ffa502';
    if (grade === 'D') return '#ff6348';
    return '#ff4757';
  };

  if (loading) return <div className="fade-in" style={{ padding: '20px' }}>Loading gradebook...</div>;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <Link href="/assessments" style={{ color: 'var(--primary-color)', textDecoration: 'none' }}>← Assessments</Link>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '8px' }}>Gradebook</h1>
          {(isAdmin || isTrainer) && (
            <div style={{ marginTop: '12px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <CollegeCoursePicker courses={courses} courseId={courseId} onCourseChange={setCourseId} collegeId={collegeId} onCollegeChange={setCollegeId} />
            </div>
          )}
        </div>
        {(isAdmin || isTrainer) && (
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-primary" disabled={calculating} onClick={recalculateAll}>
              {calculating ? 'Calculating...' : 'Recalculate Grades'}
            </button>
            {courseId && (
              <a href={`${process.env.NEXT_PUBLIC_API_URL || ''}/api/v1/gradebook/${courseId}/export`} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                Export CSV
              </a>
            )}
          </div>
        )}
      </div>

      {/* Student view - full semester grade card */}
      {role === 'STUDENT' && <StudentGradeCard userId={myUserId} semesters={semesters} />}

      {/* Admin/Trainer view - all students */}
      {(isAdmin || isTrainer) && (
        <div className="panel">
          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Student Grades Overview</h2>
          {grades.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0' }}>
              No grades calculated yet. Click "Recalculate Grades" to generate them.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)' }}>Student</th>
                  {isSuperAdmin && <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)' }}>College</th>}
                  <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)' }}>Score</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)' }}>Grade</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)' }}>CGPA</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)' }}>Result</th>
                  <th style={{ padding: '12px', textAlign: 'center', color: 'var(--text-secondary)' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {grades.map(g => (
                  <tr key={g.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>{nameOf(g.user_id)}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{emailOf(g.user_id)}</div>
                      {g.pending && <span className="badge badge-warning" style={{ fontSize: '10px' }}>no grade yet</span>}
                    </td>
                    {isSuperAdmin && (
                      <td style={{ padding: '12px' }}>
                        {collegeByUser[g.user_id] ? (
                          <span className="badge badge-info">{collegeByUser[g.user_id]}</span>
                        ) : (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>—</span>
                        )}
                      </td>
                    )}
                    <td style={{ padding: '12px', textAlign: 'center' }}>{g.pending ? '—' : `${g.total_score} / ${g.max_score}`}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {g.pending ? <span style={{ color: 'var(--text-secondary)' }}>—</span> : (
                        <span style={{ fontWeight: 'bold', fontSize: '18px', color: gradeColor(g.grade) }}>{g.grade}</span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{g.pending ? '—' : g.cgpa?.toFixed(1)}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {g.pending ? <span className="badge badge-warning">PENDING</span> : (
                        <span className={`badge ${g.grade !== 'F' ? 'badge-success' : 'badge-danger'}`}>
                          {g.grade !== 'F' ? 'PASS' : 'FAIL'}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                        <button className="btn-secondary" style={{ fontSize: '12px', padding: '5px 10px' }} onClick={() => openGradeCard(g)}>
                          🎓 Grade Card
                        </button>
                        <button className="btn-secondary" style={{ fontSize: '12px', padding: '5px 10px' }} onClick={() => recalculate(g.user_id)}>
                          Recalc
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Admin grade-card modal */}
      {cardStudent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }} onClick={() => setCardStudent(null)}>
          <div className="glass-panel" style={{ maxWidth: '860px', width: '100%', maxHeight: '90vh', overflow: 'auto', padding: '24px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '18px' }}>Grade Card</h3>
              <button className="btn-secondary" style={{ fontSize: '13px', padding: '5px 12px' }} onClick={() => setCardStudent(null)}>✕ Close</button>
            </div>
            {cardLoading ? (
              <p style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}>Loading grade card...</p>
            ) : cardData ? (
              <GradeCard
                grades={cardData.grades}
                courses={cardData.courses}
                semesters={semesters}
                studentName={`${nameOf(cardStudent.user_id || cardStudent.id)} — ${emailOf(cardStudent.user_id || cardStudent.id)}`}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

// Student's own grade card: their courses (incl. completed semesters) + grades.
function StudentGradeCard({ userId, semesters }: { userId: string; semesters: any[] }) {
  const [data, setData] = useState<{ grades: any[]; courses: any[] } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [g, c] = await Promise.all([
          userId ? fetchApi('/api/v1/gradebook/my').catch(() => []) : Promise.resolve([]),
          fetchApi('/api/v1/courses?include_completed=1').catch(() => []),
        ]);
        setData({ grades: Array.isArray(g) ? g : [], courses: Array.isArray(c) ? c : [] });
      } catch { } finally { setLoading(false); }
    })();
  }, [userId]);

  if (loading) return <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>Loading your grade card...</div>;

  if (!data || (data.grades.length === 0 && data.courses.length === 0)) {
    return (
      <div className="panel" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
        No grade card available yet. Complete your assignments and quizzes first.
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', margin: 0 }}>My Grade Card</h2>
      </div>
      <GradeCard grades={data.grades} courses={data.courses} semesters={semesters} />
    </div>
  );
}
