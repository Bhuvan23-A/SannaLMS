'use client';

import { useState, useEffect } from 'react';
import { useRole } from '@/hooks/useRole';
import { useColleges } from '@/hooks/useColleges';
import { fetchApi } from '@/lib/api';

interface Stat {
  label: string;
  value: string | number;
  color: string;
  icon: string;
}

export default function AnalyticsPage() {
  const { isAdmin, isTrainer, role } = useRole();
  const isCollegeAdmin = role === 'COLLEGE_ADMIN';
  // Super admin sees every college's courses in the list — tag them (#fix)
  const { isSuperAdmin, colleges: collegeList, collegeNameByTenant } = useColleges();
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      // Count endpoints that return arrays. A failed fetch yields null
      // ("unavailable") and is recorded so the banner names the failing APIs.
      const failed: string[] = [];
      // Counts must be cheap: colleges/enrollments lists are multi-MB (they
      // embed users/courses), so use the lightweight ?count=1 mode (#perf).
      const count = async (url: string, label: string): Promise<number | null> => {
        try {
          const data = await fetchApi(url);
          if (data && typeof data === 'object' && !Array.isArray(data) && typeof (data as any).count === 'number') return (data as any).count;
          return Array.isArray(data) ? data.length : 0;
        } catch (err: any) {
          failed.push(`${label} (${err?.message || 'error'})`);
          return null;
        }
      };
      const [coursesData, colleges, departments, liveclasses, forums, quizzes, certificates, enrollments] = await Promise.all([
        count('/api/v1/courses?count=1', 'Courses'),
        count('/api/v1/colleges?count=1', 'Colleges'),
        count('/api/v1/departments', 'Departments'),
        count('/api/v1/liveclasses', 'Live Classes'),
        count('/api/v1/forums', 'Forum Topics'),
        count('/api/v1/quizzes', 'Quizzes'),
        count('/api/v1/certificates', 'Certificates'),
        count('/api/v1/enrollments?count=1', 'Enrollments'),
      ]);
      const fmt = (n: number | null) => n === null ? '—' : n.toLocaleString();
      setStats([
        { label: 'Courses', value: fmt(coursesData), color: '#00a8ff', icon: '' },        {label: isCollegeAdmin ? 'My College' : 'Colleges', value: fmt(colleges), color: '#00c864', icon: '' },
        { label: 'Departments', value: fmt(departments), color: '#8b5cf6', icon: '' },
        { label: 'Live Classes', value: fmt(liveclasses), color: '#ff4757', icon: '' },
        { label: 'Forum Topics', value: fmt(forums), color: '#1e90ff', icon: '' },
        { label: 'Quizzes', value: fmt(quizzes), color: '#ff6348', icon: '' },
        { label: 'Certificates', value: fmt(certificates), color: '#2ed573', icon: '' },
        { label: 'Enrollments', value: fmt(enrollments), color: '#ffa502', icon: '' },
      ]);
      try {
        const data = await fetchApi('/api/v1/courses');
        if (Array.isArray(data)) {
          setCourses(
            [...data]
              .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
              .slice(0, 5)
          );
        }
      } catch (err: any) {
        if (!failed.some(f => f.startsWith('Courses'))) failed.push(`Courses (${err?.message || 'error'})`);
      } finally {
        if (failed.length > 0) setError(failed.join(', '));
        setLoading(false);
      }
    })();
  }, []);

  if (!isAdmin && !isTrainer) return (
    <div className="fade-in panel" style={{ textAlign: 'center', padding: '60px' }}>
      <div style={{ fontSize: '48px', marginBottom: '20px' }}></div>
      <h2>Access Restricted</h2>
      <p style={{ color: 'var(--text-secondary)' }}>Analytics are only available to Admins and Trainers.</p>
    </div>
  );

  if (loading) return <div className="fade-in" style={{ padding: '20px' }}>Loading analytics...</div>;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>Analytics Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '5px' }}>
            {isCollegeAdmin ? 'Counts for your college from live services' : 'Platform-wide counts from live services'}
          </p>
        </div>
        <span className="badge badge-success" style={{ padding: '8px 16px', fontSize: '14px' }}>
          Real data · loaded from APIs
        </span>
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '15px', color: 'var(--danger-color)', border: '1px solid var(--danger-color)', marginBottom: '20px' }}>
          <strong>Note:</strong> some endpoints were unavailable ({error}). Unavailable metrics show as "—".
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '30px' }}>
        {stats.map(stat => (
          <div key={stat.label} className="panel" style={{
            border: `1px solid ${stat.color}30`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{stat.label}</p>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
              </div>
              <div style={{ fontSize: '28px' }}>{stat.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Top Courses */}
      <div className="panel" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>Recently Created Courses</h2>
        {courses.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No courses yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {courses.map((course, i) => (
              <div key={course.id || i}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: '14px' }}>{course.title}</span>
                    {isSuperAdmin && collegeNameByTenant(course.tenant_id) && (
                      <span className="badge badge-info" style={{ marginLeft: '8px' }}>{collegeNameByTenant(course.tenant_id)}</span>
                    )}
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {course.status} · {course.created_at ? new Date(course.created_at).toLocaleDateString() : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
