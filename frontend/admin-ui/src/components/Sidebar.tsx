'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRole } from '@/hooks/useRole';

export default function Sidebar() {
  const pathname = usePathname();
  const { isAdmin, isTrainer } = useRole();

  const adminLinks = [
    { name: '🏠 Dashboard', href: '/' },
    { name: '📅 Calendar', href: '/calendar' },
    { name: '🔔 Notifications', href: '/notifications' },
    { name: '🔍 Search', href: '/search' },
    { name: '💬 Forums', href: '/forums' },
    { name: '🗨️ Chat', href: '/chat' },
    { divider: 'Management' },
    { name: '🏛️ Colleges', href: '/colleges' },
    { name: '🏢 Departments', href: '/departments' },
    { name: '🌿 Branches', href: '/branches' },
    { name: '📆 Semesters', href: '/semesters' },
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

  const trainerLinks = [
    { name: '🏠 Dashboard', href: '/' },
    { name: '📅 Calendar', href: '/calendar' },
    { name: '🔔 Notifications', href: '/notifications' },
    { name: '🔍 Search', href: '/search' },
    { name: '💬 Forums', href: '/forums' },
    { name: '🗨️ Chat', href: '/chat' },
    { name: '📚 Courses', href: '/courses' },
    { divider: 'Assessment' },
    { name: '📊 Question Bank', href: '/assessments/questions' },
    { name: '🧪 Quizzes', href: '/assessments/quizzes' },
    { name: '📋 Assignments', href: '/assessments/assignments' },
    { name: '🏆 Gradebook', href: '/assessments/gradebook' },
    { divider: 'Attendance' },
    { name: '📍 Attendance', href: '/attendance' },
    { divider: 'More' },
    { name: '🎥 Live Classes', href: '/liveclasses' },
    { name: '🎓 Certificates', href: '/certificates' },
    { name: '📊 Analytics', href: '/analytics' },
  ];

  const links = isAdmin ? adminLinks : isTrainer ? trainerLinks : studentLinks;

  return (
    <nav className="sidebar" style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto' }}>
      <div>
        <h2 style={{ color: 'var(--accent-color)', fontWeight: 700, fontSize: '22px', marginBottom: '30px', padding: '0 8px' }}>
          LMS <span style={{ color: 'var(--text-primary)' }}>Platform</span>
        </h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
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
    </nav>
  );
}
