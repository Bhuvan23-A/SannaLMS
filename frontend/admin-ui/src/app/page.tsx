'use client';
import { useState, useEffect } from 'react';
import Topbar from "@/components/Topbar";
import { fetchApi } from "@/lib/api";
import { useRole } from "@/hooks/useRole";

export default function Home() {
  const { role } = useRole();
  const isCollegeAdmin = role === 'COLLEGE_ADMIN';
  const [stats, setStats] = useState<{ colleges: number | null; departments: number | null; courses: number | null; students: number | null }>({ colleges: null, departments: null, courses: null, students: null });
  const [recentCourses, setRecentCourses] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      // All fetches are independent — load whatever the backend exposes; null means "unavailable".
      const load = async (url: string) => {
        try {
          const data = await fetchApi(url);
          return Array.isArray(data) ? data.length : 0;
        } catch {
          return null;
        }
      };
      const [colleges, departments, courses, students] = await Promise.all([
        load('/api/v1/colleges'),
        load('/api/v1/departments'),
        load('/api/v1/courses'),
        load('/api/v1/enrollments'),
      ]);
      setStats({ colleges, departments, courses, students });
      try {
        const coursesData = await fetchApi('/api/v1/courses');
        if (Array.isArray(coursesData)) {
          setRecentCourses(
            [...coursesData]
              .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
              .slice(0, 5)
          );
        }
      } catch { /* no courses endpoint available */ }
    })();
  }, []);

  const fmt = (n: number | null) => n === null ? '—' : n.toLocaleString();

  return (
    <div className="animate-fade-in">
      <Topbar title="Dashboard Overview" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '40px' }}>
        <div className="glass-card">
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px', textTransform: 'uppercase' }}>{isCollegeAdmin ? 'My College' : 'Total Colleges'}</h3>
          <p style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '10px' }}>{fmt(stats.colleges)}</p>
          {isCollegeAdmin && <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Scoped to your college only</p>}
        </div>
        <div className="glass-card">
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px', textTransform: 'uppercase' }}>Total Departments</h3>
          <p style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '10px' }}>{fmt(stats.departments)}</p>
        </div>
        <div className="glass-card">
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px', textTransform: 'uppercase' }}>Active Courses</h3>
          <p style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '10px' }}>{fmt(stats.courses)}</p>
        </div>
        <div className="glass-card">
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px', textTransform: 'uppercase' }}>Total Enrollments</h3>
          <p style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '10px' }}>{fmt(stats.students)}</p>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '30px' }}>
        <h3 style={{ marginBottom: '20px' }}>Recently Created Courses</h3>
        {recentCourses.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>No courses yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {recentCourses.map((course: any, i: number) => (
              <div key={course.id || i} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '15px', borderBottom: i < recentCourses.length - 1 ? '1px solid var(--panel-border)' : 'none' }}>
                <div>
                  <h4 style={{ fontSize: '16px', margin: 0 }}>{course.title}</h4>
                  <p style={{ fontSize: '14px', margin: '5px 0 0 0', color: 'var(--text-secondary)' }}>{course.description || ''}</p>
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', flexShrink: 0, marginLeft: '16px' }}>
                  {course.created_at ? new Date(course.created_at).toLocaleDateString() : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
