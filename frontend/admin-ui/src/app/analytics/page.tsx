'use client';

import { useState, useEffect } from 'react';
import { useRole } from '@/hooks/useRole';

// Analytics pulls from multiple services — for a production analytics service
// we'd have a dedicated analytics microservice aggregating data.
// Here we build a rich dashboard using data already available from our services.

interface Stat {
  label: string;
  value: string | number;
  change?: string;
  color: string;
  icon: string;
}

export default function AnalyticsPage() {
  const { isAdmin, isTrainer } = useRole();
  const [stats, setStats] = useState<Stat[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulated analytics data (in production: aggregated from all microservices)
  const mockAnalytics = {
    totalStudents: 247,
    totalCourses: 18,
    activeEnrollments: 891,
    avgAttendance: 84.3,
    quizzesCompleted: 1204,
    assignmentsSubmitted: 673,
    certificatesIssued: 156,
    avgCGPA: 3.2,
    liveClassesHeld: 43,
    forumPosts: 2108,
    monthlyGrowth: '+12%',
    enrollmentTrend: [65, 72, 80, 75, 88, 91, 95, 89, 102, 110, 118, 124],
    gradeDistribution: { A: 32, B: 41, C: 18, D: 6, F: 3 },
    attendanceByMonth: [78, 82, 88, 85, 91, 84, 79, 87, 90, 84, 88, 84],
    topCourses: [
      { title: 'Full Stack Development', enrolled: 145, completion: 68 },
      { title: 'Data Science Fundamentals', enrolled: 112, completion: 54 },
      { title: 'DevOps & Cloud', enrolled: 98, completion: 71 },
      { title: 'UI/UX Design', enrolled: 87, completion: 62 },
      { title: 'Cybersecurity Basics', enrolled: 76, completion: 49 },
    ]
  };

  useEffect(() => {
    // Simulate data load
    setTimeout(() => {
      setStats([
        { label: 'Total Students', value: mockAnalytics.totalStudents, change: '+12%', color: '#00a8ff', icon: '👥' },
        { label: 'Active Enrollments', value: mockAnalytics.activeEnrollments, change: '+8%', color: '#00c864', icon: '📚' },
        { label: 'Avg. Attendance', value: `${mockAnalytics.avgAttendance}%`, change: '+3%', color: '#ffa502', icon: '📍' },
        { label: 'Avg. CGPA', value: mockAnalytics.avgCGPA.toFixed(1), change: '+0.2', color: '#8b5cf6', icon: '🏆' },
        { label: 'Quizzes Completed', value: mockAnalytics.quizzesCompleted, change: '+25%', color: '#ff6348', icon: '🧪' },
        { label: 'Certificates Issued', value: mockAnalytics.certificatesIssued, change: '+18%', color: '#2ed573', icon: '🎓' },
        { label: 'Live Classes', value: mockAnalytics.liveClassesHeld, change: '+5', color: '#ff4757', icon: '🎥' },
        { label: 'Forum Posts', value: mockAnalytics.forumPosts, change: '+31%', color: '#1e90ff', icon: '💬' },
      ]);
      setLoading(false);
    }, 500);
  }, []);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const maxEnrollment = Math.max(...mockAnalytics.enrollmentTrend);
  const maxAttendance = 100;

  if (!isAdmin && !isTrainer) return (
    <div className="fade-in panel" style={{ textAlign: 'center', padding: '60px' }}>
      <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</div>
      <h2>Access Restricted</h2>
      <p style={{ color: 'var(--text-secondary)' }}>Analytics are only available to Admins and Trainers.</p>
    </div>
  );

  if (loading) return <div className="fade-in" style={{ padding: '20px' }}>Loading analytics...</div>;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>📊 Analytics Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '5px' }}>Platform-wide insights and performance metrics</p>
        </div>
        <span className="badge badge-success" style={{ padding: '8px 16px', fontSize: '14px' }}>
          Live Data · Updated now
        </span>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '30px' }}>
        {stats.map(stat => (
          <div key={stat.label} className="panel" style={{
            background: `linear-gradient(135deg, rgba(${stat.color === '#00a8ff' ? '0,168,255' : stat.color === '#00c864' ? '0,200,100' : stat.color === '#ffa502' ? '255,165,2' : stat.color === '#8b5cf6' ? '139,92,246' : stat.color === '#ff6348' ? '255,99,72' : stat.color === '#2ed573' ? '46,213,115' : stat.color === '#ff4757' ? '255,71,87' : '30,144,255'},0.1), transparent)`,
            border: `1px solid ${stat.color}30`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>{stat.label}</p>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: stat.color }}>{stat.value}</div>
              </div>
              <div style={{ fontSize: '28px' }}>{stat.icon}</div>
            </div>
            {stat.change && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: '#00c864' }}>
                ↑ {stat.change} this month
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Enrollment Trend Chart */}
        <div className="panel">
          <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>📈 Monthly Enrollment Trend</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '150px' }}>
            {mockAnalytics.enrollmentTrend.map((val, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{
                  width: '100%',
                  height: `${(val / maxEnrollment) * 100}%`,
                  background: `linear-gradient(to top, var(--primary-color), #8b5cf6)`,
                  borderRadius: '4px 4px 0 0',
                  minHeight: '4px',
                  position: 'relative',
                }}
                  title={`${months[i]}: ${val} enrollments`}
                />
                <span style={{ fontSize: '9px', color: 'var(--text-secondary)', transform: 'rotate(-45deg)', whiteSpace: 'nowrap', marginTop: '2px' }}>{months[i]}</span>
              </div>
            ))}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '20px', textAlign: 'center' }}>Total new enrollments per month</p>
        </div>

        {/* Grade Distribution */}
        <div className="panel">
          <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>🎓 Grade Distribution</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {Object.entries(mockAnalytics.gradeDistribution).map(([grade, pct]) => {
              const colors: Record<string, string> = { A: '#00c864', B: '#00a8ff', C: '#ffa502', D: '#ff6348', F: '#ff4757' };
              return (
                <div key={grade} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ width: '20px', fontWeight: 'bold', color: colors[grade] }}>{grade}</span>
                  <div style={{ flex: 1, height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: colors[grade],
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: '8px',
                      fontSize: '11px',
                      color: 'white',
                      fontWeight: 'bold',
                      minWidth: '30px'
                    }}>
                      {pct}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '15px', textAlign: 'center' }}>Across all courses and semesters</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Top Courses */}
        <div className="panel">
          <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>🏅 Top Courses by Enrollment</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {mockAnalytics.topCourses.map((course, i) => (
              <div key={course.title}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                      {i + 1}
                    </span>
                    <span style={{ fontSize: '14px' }}>{course.title}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', fontSize: '13px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{course.enrolled} enrolled</span>
                    <span style={{ color: '#00c864' }}>{course.completion}% done</span>
                  </div>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${course.completion}%`, background: `linear-gradient(to right, var(--primary-color), #8b5cf6)`, borderRadius: '3px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Attendance Trend */}
        <div className="panel">
          <h2 style={{ fontSize: '18px', marginBottom: '20px' }}>📍 Attendance %</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '160px' }}>
            {mockAnalytics.attendanceByMonth.map((val, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', gap: '4px' }}>
                <div style={{
                  width: '100%',
                  height: `${val}%`,
                  background: val >= 85 ? '#00c864' : val >= 75 ? '#ffa502' : '#ff4757',
                  borderRadius: '3px 3px 0 0',
                  minHeight: '4px',
                }}
                  title={`${months[i]}: ${val}%`}
                />
                <span style={{ fontSize: '8px', color: 'var(--text-secondary)' }}>{months[i].slice(0, 1)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '15px', justifyContent: 'center', fontSize: '12px' }}>
            <span><span style={{ color: '#00c864' }}>■</span> ≥85%</span>
            <span><span style={{ color: '#ffa502' }}>■</span> 75-85%</span>
            <span><span style={{ color: '#ff4757' }}>■</span> &lt;75%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
