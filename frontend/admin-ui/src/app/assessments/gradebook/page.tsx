'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
import Link from 'next/link';

export default function GradebookPage() {
  const { isAdmin, isTrainer, role } = useRole();
  const [grades, setGrades] = useState<any[]>([]);
  const [myGrade, setMyGrade] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [courseId, setCourseId] = useState('');
  const [calculating, setCalculating] = useState(false);

  // Real logged-in user id (Keycloak sub) — NOT the hardcoded mock 'u-1'
  const myUserId = (typeof window !== 'undefined' && localStorage.getItem('userId')) || '';

  // Super admin sees which college each student belongs to — resolved from the
  // college-service user links (user_id -> college name).
  const [collegeByUser, setCollegeByUser] = useState<Record<string, string>>({});
  const isSuperAdmin = role === 'SUPER_ADMIN';

  // Load available courses once so the gradebook can be filtered course-wise (#14)
  useEffect(() => {
    (async () => {
      try {
        const data = await fetchApi('/api/v1/courses');
        if (Array.isArray(data) && data.length > 0) {
          setCourses(data);
          setCourseId(data[0].id);
        }
      } catch { /* course list unavailable */ }
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
      setLoading(true);
      if (isAdmin || isTrainer) {
        const d = await fetchApi(`/api/v1/gradebook/${courseId}`);
        setGrades(d || []);
      } else if (myUserId) {
        const d = await fetchApi(`/api/v1/gradebook/${courseId}/student/${myUserId}`);
        setMyGrade(d);
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
          {courses.length > 0 && (
            <div style={{ marginTop: '12px', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Course:</label>
              <select className="input-field" style={{ maxWidth: '380px' }} value={courseId} onChange={e => setCourseId(e.target.value)}>
                {courses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          )}
        </div>
        {(isAdmin || isTrainer) && (
          <button className="btn-primary" disabled={calculating} onClick={recalculateAll}>
            {calculating ? 'Calculating...' : '🔄 Recalculate Grades'}
          </button>
        )}
      </div>

      {/* Student view - my grade card */}
      {role === 'STUDENT' && (
        <div>
          {myGrade ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div className="panel" style={{ textAlign: 'center', padding: '30px' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>Your Grade</p>
                <div style={{ fontSize: '64px', fontWeight: 'bold', color: gradeColor(myGrade.grade) }}>{myGrade.grade || 'N/A'}</div>
              </div>
              <div className="panel" style={{ textAlign: 'center', padding: '30px' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>CGPA</p>
                <div style={{ fontSize: '48px', fontWeight: 'bold', color: 'var(--primary-color)' }}>{myGrade.cgpa?.toFixed(1) || '0.0'}</div>
              </div>
              <div className="panel" style={{ textAlign: 'center', padding: '30px' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>Score</p>
                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{myGrade.total_score} / {myGrade.max_score}</div>
              </div>
              <div className="panel" style={{ textAlign: 'center', padding: '30px' }}>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>Result</p>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: myGrade.grade !== 'F' ? '#00c864' : '#ff4757' }}>
                  {myGrade.grade !== 'F' ? '✅ PASS' : '❌ FAIL'}
                </div>
              </div>
            </div>
          ) : (
            <div className="panel" style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
              No grade calculated yet. Complete your assignments and quizzes first.
            </div>
          )}
        </div>
      )}

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
                  <th style={{ padding: '12px', textAlign: 'left', color: 'var(--text-secondary)' }}>Student ID</th>
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
                    <td style={{ padding: '12px' }}>{g.user_id} {g.pending && <span className="badge badge-warning" style={{ fontSize: '10px' }}>no grade yet</span>}</td>
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
                      <button className="btn-secondary" style={{ fontSize: '12px', padding: '5px 10px' }} onClick={() => recalculate(g.user_id)}>
                        Recalc
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
