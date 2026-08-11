'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Topbar from "@/components/Topbar";
import { fetchApi } from "@/lib/api";
import { useRole } from "@/hooks/useRole";

export default function Home() {
  const { role, isTrainer } = useRole();
  const isCollegeAdmin = role === 'COLLEGE_ADMIN';
  const [stats, setStats] = useState<{ colleges: number | null; departments: number | null; courses: number | null; students: number | null }>({ colleges: null, departments: null, courses: null, students: null });
  const [recentCourses, setRecentCourses] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      // Trainers land on their own teaching view — the platform-wide stats are
      // admin information and mean nothing to a trainer (#fix).
      if (isTrainer) return;

      // All fetches are independent — load whatever the backend exposes; null means "unavailable".
      // Colleges/enrollments lists are multi-MB (users/courses embedded), so use
      // the lightweight ?count=1 mode and count courses from the recent list (#perf).
      const load = async (url: string) => {
        try {
          const data = await fetchApi(url);
          if (data && typeof data === 'object' && !Array.isArray(data) && typeof (data as any).count === 'number') return (data as any).count;
          return Array.isArray(data) ? data.length : 0;
        } catch {
          return null;
        }
      };
      const [colleges, departments, students] = await Promise.all([
        load('/api/v1/colleges?count=1'),
        load('/api/v1/departments'),
        load('/api/v1/enrollments?count=1'),
      ]);
      let courseCount: number | null = null;
      try {
        const coursesData = await fetchApi('/api/v1/courses');
        if (Array.isArray(coursesData)) {
          courseCount = coursesData.length;
          setRecentCourses(
            [...coursesData]
              .sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
              .slice(0, 5)
          );
        }
      } catch { /* no courses endpoint available */ }
      setStats({ colleges, departments, courses: courseCount, students });
    })();
  }, [isTrainer]);

  const fmt = (n: number | null) => n === null ? '—' : n.toLocaleString();

  // Trainers/assistant trainers: a focused teaching panel, not platform stats.
  if (isTrainer) {
    return <TrainerHome />;
  }

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

// Trainer landing: the courses they teach + quick links to their teaching tools.
function TrainerHome() {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const d = await fetchApi('/api/v1/courses');
        setCourses(Array.isArray(d) ? d : []);
      } catch { /* course list unavailable */ } finally { setLoading(false); }
    })();
  }, []);

  const tools = [
    { label: '📊 Question Bank', href: '/assessments/questions' },
    { label: '🧪 Quizzes', href: '/assessments/quizzes' },
    { label: '📋 Assignments', href: '/assessments/assignments' },
    { label: '🏆 Gradebook', href: '/assessments/gradebook' },
    { label: '📍 Attendance', href: '/attendance' },
    { label: '🎥 Live Classes', href: '/liveclasses' },
    { label: '🔔 Notifications', href: '/notifications' },
  ];

  return (
    <div className="animate-fade-in">
      <Topbar title="My Teaching" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '30px' }}>
        <div className="glass-card">
          <h3 style={{ color: 'var(--text-secondary)', fontSize: '14px', textTransform: 'uppercase' }}>My Courses</h3>
          <p style={{ fontSize: '36px', fontWeight: 'bold', color: 'var(--text-primary)', marginTop: '10px' }}>{loading ? '…' : courses.length}</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '30px' }}>
        {tools.map(t => (
          <Link key={t.href} href={t.href} className="btn-secondary" style={{ textDecoration: 'none', padding: '10px 16px' }}>
            {t.label}
          </Link>
        ))}
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ marginBottom: '16px' }}>Courses I Teach</h3>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        ) : courses.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)' }}>You are not assigned to any course yet. Ask your college admin to assign you.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {courses.map((c: any) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '15px', fontWeight: 600 }}>{c.title}</div>
                  {c.description && <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description}</div>}
                </div>
                <Link href={`/courses/${c.id}`} className="btn-primary" style={{ textDecoration: 'none', padding: '6px 14px', fontSize: '13px', flexShrink: 0 }}>
                  Manage
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
