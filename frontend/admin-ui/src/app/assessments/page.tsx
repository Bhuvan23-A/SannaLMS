'use client';

import Link from 'next/link';
import { useRole } from '@/hooks/useRole';
import { HelpCircle, CheckSquare, FileText, Award, ArrowRight } from 'lucide-react';

export default function AssessmentsPage() {
  const { isAdmin, isTrainer } = useRole();

  const modules = [
    {
      icon: HelpCircle,
      title: 'Question Bank',
      description: 'Create, categorize, and manage MCQ, Coding, and Essay questions across your course subjects.',
      href: '/assessments/questions',
      roles: 'Trainers & Admins',
      badge: 'admin',
      restricted: !isAdmin && !isTrainer
    },
    {
      icon: CheckSquare,
      title: 'Quiz & Exam Builder',
      description: 'Build online tests and quizzes, schedule start/end timestamps, and attach question papers.',
      href: '/assessments/quizzes',
      roles: 'All Roles',
      badge: 'all',
      restricted: false
    },
    {
      icon: FileText,
      title: 'Assignments & Projects',
      description: 'Assign coursework, set submission deadlines, review student uploads, and provide feedback.',
      href: '/assessments/assignments',
      roles: 'All Roles',
      badge: 'all',
      restricted: false
    },
    {
      icon: Award,
      title: 'Consolidated Gradebook',
      description: 'View consolidated grades, calculate CGPAs, and generate student semester performance summaries.',
      href: '/assessments/gradebook',
      roles: 'All Roles',
      badge: 'all',
      restricted: false
    },
  ];

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 700, margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>Assessment & Evaluation Center</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
          Manage online examinations, question banks, coursework assignments, and gradebook evaluations.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {modules.map((m) => {
          const Icon = m.icon;
          return (
            <Link href={m.restricted ? '#' : m.href} key={m.title} style={{ textDecoration: 'none', color: 'inherit', opacity: m.restricted ? 0.5 : 1 }}>
              <div className="panel" style={{
                cursor: m.restricted ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                background: 'rgba(15,23,42,0.75)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '24px'
              }}
                onMouseEnter={e => { if (!m.restricted) { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.transform = 'translateY(-2px)'; } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div>
                  <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                    <Icon size={20} color="var(--accent-color)" />
                  </div>
                  <h2 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '8px', color: '#ffffff' }}>{m.title}</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5', marginBottom: '16px' }}>{m.description}</p>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={`badge ${m.badge === 'admin' ? 'badge-warning' : 'badge-info'}`}>
                    {m.roles}
                  </span>
                  <span style={{ color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600 }}>
                    Open Module <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
