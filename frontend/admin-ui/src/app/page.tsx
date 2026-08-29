'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Topbar from "@/components/Topbar";
import { fetchApi } from "@/lib/api";
import { useRole } from "@/hooks/useRole";
import {
  Building2,
  Layers,
  BookOpen,
  Users,
  ArrowRight,
  TrendingUp,
  HelpCircle,
  CheckSquare,
  FileText,
  Award,
  MapPin,
  Video,
  Bell,
  Sparkles,
  Calendar
} from 'lucide-react';

export default function Home() {
  const { role, isTrainer } = useRole();
  const isCollegeAdmin = role === 'COLLEGE_ADMIN';
  const [stats, setStats] = useState<{ colleges: number | null; departments: number | null; courses: number | null; students: number | null }>({ colleges: null, departments: null, courses: null, students: null });
  const [recentCourses, setRecentCourses] = useState<any[]>([]);

  useEffect(() => {
    if (isTrainer) return;

    const load = async (url: string) => {
      try {
        const data = await fetchApi(url);
        if (data && typeof data === 'object' && !Array.isArray(data) && typeof (data as any).count === 'number') return (data as any).count;
        return Array.isArray(data) ? data.length : 0;
      } catch {
        return null;
      }
    };

    (async () => {
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
      } catch { }
      setStats({ colleges, departments, courses: courseCount, students });
    })();
  }, [isTrainer]);

  const fmt = (n: number | null) => n === null ? '—' : n.toLocaleString();

  if (isTrainer) {
    return <TrainerHome />;
  }

  return (
    <div>
      <Topbar title="Dashboard Overview" />

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <div className="panel" style={{ padding: '20px', borderRadius: '12px', background: 'rgba(17, 24, 39, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isCollegeAdmin ? 'Institution' : 'Total Colleges'}
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Building2 size={16} color="var(--accent-color)" />
            </div>
          </div>
          <div style={{ fontSize: '30px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>{fmt(stats.colleges)}</div>
          {isCollegeAdmin && <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Active institutional workspace</p>}
        </div>

        <div className="panel" style={{ padding: '20px', borderRadius: '12px', background: 'rgba(17, 24, 39, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Departments
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Layers size={16} color="#06b6d4" />
            </div>
          </div>
          <div style={{ fontSize: '30px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>{fmt(stats.departments)}</div>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Academic faculties</p>
        </div>

        <div className="panel" style={{ padding: '20px', borderRadius: '12px', background: 'rgba(17, 24, 39, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Courses
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={16} color="#10b981" />
            </div>
          </div>
          <div style={{ fontSize: '30px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>{fmt(stats.courses)}</div>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Curriculum modules</p>
        </div>

        <div className="panel" style={{ padding: '20px', borderRadius: '12px', background: 'rgba(17, 24, 39, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Enrollments
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={16} color="#f59e0b" />
            </div>
          </div>
          <div style={{ fontSize: '30px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>{fmt(stats.students)}</div>
          <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px' }}>Active student registrations</p>
        </div>
      </div>

      {/* Recent Courses List */}
      <div className="panel" style={{ padding: '24px', borderRadius: '12px', background: 'rgba(17, 24, 39, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={18} color="var(--accent-color)" />
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>Recently Added Courses</h3>
          </div>
          <Link href="/courses" style={{ fontSize: '12px', color: 'var(--accent-color)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
            View All Courses <ArrowRight size={13} />
          </Link>
        </div>

        {recentCourses.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', textAlign: 'center', padding: '24px 0' }}>No courses added yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {recentCourses.map((course: any, i: number) => (
              <div key={course.id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <div style={{ minWidth: 0 }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, margin: 0, color: '#ffffff' }}>{course.title}</h4>
                  {course.description && <p style={{ fontSize: '12px', margin: '2px 0 0 0', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.description}</p>}
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', flexShrink: 0, marginLeft: '16px' }}>
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
      } catch { } finally { setLoading(false); }
    })();
  }, []);

  const tools = [
    { label: 'Question Bank', href: '/assessments/questions', icon: HelpCircle },
    { label: 'Quizzes', href: '/assessments/quizzes', icon: CheckSquare },
    { label: 'Assignments', href: '/assessments/assignments', icon: FileText },
    { label: 'Gradebook', href: '/assessments/gradebook', icon: Award },
    { label: 'Attendance', href: '/attendance', icon: MapPin },
    { label: 'Live Classes', href: '/liveclasses', icon: Video },
    { label: 'Notifications', href: '/notifications', icon: Bell },
  ];

  return (
    <div>
      <Topbar title="Teaching Dashboard" />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '28px' }}>
        <div className="panel" style={{ padding: '20px', borderRadius: '12px', background: 'rgba(17, 24, 39, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              My Assigned Courses
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(99, 102, 241, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={16} color="var(--accent-color)" />
            </div>
          </div>
          <div style={{ fontSize: '30px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.02em' }}>{loading ? '…' : courses.length}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '28px' }}>
        {tools.map(t => {
          const Icon = t.icon;
          return (
            <Link key={t.href} href={t.href} className="btn-secondary" style={{ textDecoration: 'none', padding: '8px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Icon size={14} color="var(--accent-color)" />
              {t.label}
            </Link>
          );
        })}
      </div>

      <div className="panel" style={{ padding: '24px', borderRadius: '12px', background: 'rgba(17, 24, 39, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Courses I Teach</h3>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Loading courses...</p>
        ) : courses.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>You are not assigned to any courses yet. Please contact your college administrator.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {courses.map((c: any) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '12px 14px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '8px' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>{c.title}</div>
                  {c.description && <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description}</div>}
                </div>
                <Link href={`/courses/${c.id}`} className="btn-primary" style={{ textDecoration: 'none', padding: '6px 12px', fontSize: '12px', flexShrink: 0 }}>
                  Manage Course
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
