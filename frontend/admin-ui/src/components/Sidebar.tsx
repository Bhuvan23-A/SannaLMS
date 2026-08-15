'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useRole } from '@/hooks/useRole';
import { getRoleLabel, handleLogout } from '@/lib/auth';

export default function Sidebar() {
  const pathname = usePathname();
  const { role, isTrainer } = useRole();
  const [username, setUsername] = useState('User');
  const [email, setEmail] = useState('');
  const [initials, setInitials] = useState('U');

  useEffect(() => {
    const syncProfile = () => {
      const usr = localStorage.getItem('username') || 'User';
      setUsername(usr);
      setEmail(localStorage.getItem('userEmail') || '');
      setInitials(usr.substring(0, 2).toUpperCase());
    };
    syncProfile();
    window.addEventListener('roleChanged', syncProfile);
    return () => window.removeEventListener('roleChanged', syncProfile);
  }, []);

  const superAdminLinks = [
    { name: '🏠 Dashboard', href: '/' },
    { name: '📅 Calendar', href: '/calendar' },
    { name: '🔔 Notifications', href: '/notifications' },
    { name: '🔍 Search', href: '/search' },
    { name: '💬 Forums', href: '/forums' },
    { name: '🗨️ Chat', href: '/chat' },
    { divider: 'Management' },
    { name: '🏛️ Colleges', href: '/colleges' },
    { name: '👥 Bulk Import Users', href: '/users/import' },
    { name: '🏢 Departments', href: '/departments' },
    { name: '🌿 Branches', href: '/branches' },
    { name: '📆 Semesters', href: '/semesters' },
    { name: '📇 Subjects', href: '/subjects' },
    { name: '🎓 Academic Sessions', href: '/academic-sessions' },
    { name: '🗂️ Sections', href: '/sections' },
    { name: '📚 Courses', href: '/courses' },
    { divider: 'Assessment' },
    { name: '📝 Assessments', href: '/assessments' },
    { name: '📊 Question Bank', href: '/assessments/questions' },
    { name: '🧪 Quizzes', href: '/assessments/quizzes' },
    { name: '📋 Assignments', href: '/assessments/assignments' },
    { name: '🏆 Gradebook', href: '/assessments/gradebook' },
    { divider: 'Attendance' },
    { name: '📍 Attendance', href: '/attendance' },
    { divider: 'Live Classes' },
    { name: '🎥 Live Classes', href: '/liveclasses' },
    { divider: 'Certificates & Analytics' },
    { name: '🎓 Certificates', href: '/certificates' },
    { name: '📊 Analytics', href: '/analytics' },
  ];

  const collegeAdminLinks = [
    { name: '🏠 Dashboard', href: '/' },
    { name: '📅 Calendar', href: '/calendar' },
    { name: '🔔 Notifications', href: '/notifications' },
    { name: '🔍 Search', href: '/search' },
    { name: '💬 Forums', href: '/forums' },
    { name: '🗨️ Chat', href: '/chat' },
    { divider: 'College Structure' },
    { name: '👥 Bulk Import Users', href: '/users/import' },
    { name: '🏢 Departments', href: '/departments' },
    { name: '🌿 Branches', href: '/branches' },
    { name: '📆 Semesters', href: '/semesters' },
    { name: '📇 Subjects', href: '/subjects' },
    { name: '🎓 Academic Sessions', href: '/academic-sessions' },
    { name: '🗂️ Sections', href: '/sections' },
    { name: '📚 Courses', href: '/courses' },
    { divider: 'Assessment' },
    { name: '📝 Assessments', href: '/assessments' },
    { name: '📊 Question Bank', href: '/assessments/questions' },
    { name: '🧪 Quizzes', href: '/assessments/quizzes' },
    { name: '📋 Assignments', href: '/assessments/assignments' },
    { name: '🏆 Gradebook', href: '/assessments/gradebook' },
    { divider: 'Attendance' },
    { name: '📍 Attendance', href: '/attendance' },
    { divider: 'Live Classes' },
    { name: '🎥 Live Classes', href: '/liveclasses' },
    { divider: 'Certificates & Analytics' },
    { name: '🎓 Certificates', href: '/certificates' },
    { name: '📊 Analytics', href: '/analytics' },
  ];

  const studentLinks = [
    { name: '🏠 Dashboard', href: '/' },
    { name: '📅 Calendar', href: '/calendar' },
    { name: '🔔 Notifications', href: '/notifications' },
    { name: '🔍 Search', href: '/search' },
    { name: '💬 Forums', href: '/forums' },
    { name: '🗨️ Chat', href: '/chat' },
    { name: '📚 Courses', href: '/courses' },
    { divider: 'Assessment' },
    { name: '🧪 Quizzes', href: '/assessments/quizzes' },
    { name: '📋 Assignments', href: '/assessments/assignments' },
    { name: '🏆 My Grades', href: '/assessments/gradebook' },
    { divider: 'Attendance' },
    { name: '📍 My Attendance', href: '/attendance' },
    { divider: 'More' },
    { name: '🎥 Live Classes', href: '/liveclasses' },
    { name: '🎓 My Certificates', href: '/certificates' },
  ];

  // Trainers/assistant trainers see their teaching tools + communication
  // (notifications, forums, chat) — no platform dashboard, calendar, search,
  // certificates or analytics (#fix).
  const trainerLinks = [
    { name: '📚 My Courses', href: '/courses' },
    { name: '🔔 Notifications', href: '/notifications' },
    { name: '💬 Forums', href: '/forums' },
    { name: '🗨️ Chat', href: '/chat' },
    { divider: 'Assessment' },
    { name: '📊 Question Bank', href: '/assessments/questions' },
    { name: '🧪 Quizzes', href: '/assessments/quizzes' },
    { name: '📋 Assignments', href: '/assessments/assignments' },
    { name: '🏆 Gradebook', href: '/assessments/gradebook' },
    { divider: 'Attendance' },
    { name: '📍 Attendance', href: '/attendance' },
    { divider: 'More' },
    { name: '🎥 Live Classes', href: '/liveclasses' },
  ];

  const links = role === 'SUPER_ADMIN' ? superAdminLinks : role === 'COLLEGE_ADMIN' ? collegeAdminLinks : isTrainer ? trainerLinks : studentLinks;

  return (
    <nav className="sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div>
        <h2 style={{ color: 'var(--accent-color)', fontWeight: 700, fontSize: '22px', marginBottom: '30px', padding: '0 8px' }}>
          LMS <span style={{ color: 'var(--text-primary)' }}>Platform</span>
        </h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {links.map((link, idx) => {
          if ('divider' in link) {
            return (
              <div key={`div-${idx}`} style={{
                padding: '16px 8px 6px',
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.3)'
              }}>
                {link.divider}
              </div>
            );
          }
          const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                textDecoration: 'none',
                color: isActive ? 'white' : 'var(--text-secondary)',
                background: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                borderLeft: isActive ? '3px solid var(--accent-color)' : '3px solid transparent',
                fontSize: '14px',
                transition: 'all 0.15s ease',
                display: 'block',
              }}
            >
              {link.name}
            </Link>
          );
        })}
      </div>

      {/* User Profile Card (pinned to bottom of sidebar) */}
      <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--panel-border)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)'
        }}>
          <div style={{
            width: '38px',
            height: '38px',
            minWidth: '38px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            color: 'white',
            fontSize: '13px',
            boxShadow: '0 0 12px rgba(59, 130, 246, 0.35)'
          }}>
            {initials}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {username}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '1px' }}>
              {email || 'Signed in via SSO'}
            </div>
            <span style={{ display: 'inline-block', marginTop: '5px', fontSize: '10px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
              {getRoleLabel(role)}
            </span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: '100%',
            marginTop: '10px',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#f87171',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.22)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.45)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)'; }}
        >
          🚪 Logout
        </button>
      </div>
    </nav>
  );
}
