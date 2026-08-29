'use client';

import Link from 'next/link';
import { useRole } from '@/hooks/useRole';

export default function AssessmentsPage() {
  const { isAdmin, isTrainer } = useRole();

  const modules = [
    {
      icon: '',
      title: 'Question Bank',
      description: 'Create and manage MCQ, Coding, and Essay questions for your courses.',
      href: '/assessments/questions',
      roles: 'Trainers & Admins',
      badge: 'admin',
      restricted: !isAdmin && !isTrainer
    },
    {
      icon: '',
      title: 'Quiz Builder',
      description: 'Build quizzes from your question bank and publish them to students.',
      href: '/assessments/quizzes',
      roles: 'All Roles',
      badge: 'all',
      restricted: false
    },
    {
      icon: '',
      title: 'Assignments',
      description: 'Create assignments, review submissions, and provide feedback.',
      href: '/assessments/assignments',
      roles: 'All Roles',
      badge: 'all',
      restricted: false
    },
    {
      icon: '',
      title: 'Gradebook',
      description: 'View consolidated grades, CGPA, and semester results for all students.',
      href: '/assessments/gradebook',
      roles: 'All Roles',
      badge: 'all',
      restricted: false
    },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>Assessment & Gradebook Engine</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Manage quizzes, assignments, evaluations, and student grades.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
        {modules.map((m) => (
          <Link href={m.restricted ? '#' : m.href} key={m.title} style={{ textDecoration: 'none', color: 'inherit', opacity: m.restricted ? 0.5 : 1 }}>
            <div className="panel" style={{
              cursor: m.restricted ? 'not-allowed' : 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              height: '100%',
            }}
              onMouseEnter={e => { if (!m.restricted) e.currentTarget.style.transform = 'translateY(-4px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ fontSize: '40px', marginBottom: '15px' }}>{m.icon}</div>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '10px', color: 'var(--primary-color)' }}>{m.title}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '15px' }}>{m.description}</p>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className={`badge ${m.badge === 'admin' ? 'badge-warning' : 'badge-info'}`}>
                  {m.roles}
                </span>
                {m.restricted && <span className="badge" style={{ background: 'rgba(255,0,0,0.2)', color: '#ff6b6b' }}>No Access</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
