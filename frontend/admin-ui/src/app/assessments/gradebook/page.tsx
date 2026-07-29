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
  const [courseId] = useState('c-1');
  const [calculating, setCalculating] = useState(false);

  useEffect(() => { loadGrades(); }, [role]);

  const loadGrades = async () => {
    try {
      setLoading(true);
      if (isAdmin || isTrainer) {
        const d = await fetchApi(`/api/v1/gradebook/${courseId}`);
        setGrades(d || []);
      } else {
        const d = await fetchApi(`/api/v1/gradebook/${courseId}/student/u-1`);
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

  const gradeColor = (grade: string) => {
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
        </div>
        {(isAdmin || isTrainer) && (
          <button className="btn-primary" disabled={calculating} onClick={() => recalculate('u-1')}>
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
                    <td style={{ padding: '12px' }}>{g.user_id}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{g.total_score} / {g.max_score}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '18px', color: gradeColor(g.grade) }}>{g.grade}</span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>{g.cgpa?.toFixed(1)}</td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <span className={`badge ${g.grade !== 'F' ? 'badge-success' : 'badge-danger'}`}>
                        {g.grade !== 'F' ? 'PASS' : 'FAIL'}
                      </span>
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
