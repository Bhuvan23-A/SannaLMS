'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useRole } from '@/hooks/useRole';
import { getRoleLabel, handleLogout } from '@/lib/auth';
import {
  LayoutDashboard,
  Calendar,
  Bell,
  Search,
  MessagesSquare,
  MessageSquare,
  Building2,
  Users,
  Layers,
  GitBranch,
  CalendarDays,
  FileCode2,
  GraduationCap,
  FolderTree,
  BookOpen,
  FolderOpen,
  FileCheck2,
  HelpCircle,
  CheckSquare,
  FileText,
  Award,
  MapPin,
  Video,
  BarChart3,
  LogOut,
  ChevronDown,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: any;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const { role, isTrainer } = useRole();
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isCollegeAdmin = role === 'COLLEGE_ADMIN';

  const [username, setUsername] = useState('User');
  const [email, setEmail] = useState('');
  const [initials, setInitials] = useState('U');

  // Collapsible section states
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setCollapsedSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

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

  const getNavSections = (): NavSection[] => {
    if (isSuperAdmin || isCollegeAdmin) {
      return [
        {
          title: 'Overview',
          items: [
            { name: 'Dashboard', href: '/', icon: LayoutDashboard },
            { name: 'Calendar', href: '/calendar', icon: Calendar },
            { name: 'Notifications', href: '/notifications', icon: Bell },
            { name: 'Search', href: '/search', icon: Search },
          ]
        },
        {
          title: 'Academics',
          items: [
            { name: 'Courses', href: '/courses', icon: BookOpen },
            { name: 'Reference Materials', href: '/resources', icon: FolderOpen },
            { name: 'Subjects', href: '/subjects', icon: FileCode2 },
            { name: 'Academic Sessions', href: '/academic-sessions', icon: CalendarDays },
          ]
        },
        {
          title: 'Assessments',
          items: [
            { name: 'Overview', href: '/assessments', icon: FileCheck2 },
            { name: 'Question Bank', href: '/assessments/questions', icon: HelpCircle },
            { name: 'Quizzes', href: '/assessments/quizzes', icon: CheckSquare },
            { name: 'Assignments', href: '/assessments/assignments', icon: FileText },
            { name: 'Gradebook', href: '/assessments/gradebook', icon: Award },
          ]
        },
        {
          title: 'Engagement & Live',
          items: [
            { name: 'Live Classes', href: '/liveclasses', icon: Video },
            { name: 'Attendance', href: '/attendance', icon: MapPin },
            { name: 'Forums', href: '/forums', icon: MessagesSquare },
            { name: 'Chat', href: '/chat', icon: MessageSquare },
          ]
        },
        {
          title: isSuperAdmin ? 'Institutional Structure' : 'College Structure',
          items: [
            ...(isSuperAdmin ? [{ name: 'Colleges', href: '/colleges', icon: Building2 }] : []),
            { name: 'Departments', href: '/departments', icon: Layers },
            { name: 'Branches', href: '/branches', icon: GitBranch },
            { name: 'Semesters', href: '/semesters', icon: GraduationCap },
            { name: 'Sections', href: '/sections', icon: FolderTree },
            { name: 'Bulk Import Users', href: '/users/import', icon: Users },
          ]
        },
        {
          title: 'Analytics & Rewards',
          items: [
            { name: 'Certificates', href: '/certificates', icon: Award },
            { name: 'Analytics', href: '/analytics', icon: BarChart3 },
          ]
        }
      ];
    }

    if (isTrainer) {
      return [
        {
          title: 'Teaching Tools',
          items: [
            { name: 'My Courses', href: '/courses', icon: BookOpen },
            { name: 'Reference Materials', href: '/resources', icon: FolderOpen },
            { name: 'Live Classes', href: '/liveclasses', icon: Video },
            { name: 'Attendance', href: '/attendance', icon: MapPin },
          ]
        },
        {
          title: 'Assessments',
          items: [
            { name: 'Question Bank', href: '/assessments/questions', icon: HelpCircle },
            { name: 'Quizzes', href: '/assessments/quizzes', icon: CheckSquare },
            { name: 'Assignments', href: '/assessments/assignments', icon: FileText },
            { name: 'Gradebook', href: '/assessments/gradebook', icon: Award },
          ]
        },
        {
          title: 'Communication',
          items: [
            { name: 'Notifications', href: '/notifications', icon: Bell },
            { name: 'Calendar', href: '/calendar', icon: Calendar },
            { name: 'Forums', href: '/forums', icon: MessagesSquare },
            { name: 'Chat', href: '/chat', icon: MessageSquare },
          ]
        }
      ];
    }

    // Default / Student Links
    return [
      {
        title: 'Learning',
        items: [
          { name: 'Dashboard', href: '/', icon: LayoutDashboard },
          { name: 'Courses', href: '/courses', icon: BookOpen },
          { name: 'Reference Materials', href: '/resources', icon: FolderOpen },
          { name: 'Calendar', href: '/calendar', icon: Calendar },
        ]
      },
      {
        title: 'Assessments',
        items: [
          { name: 'Quizzes', href: '/assessments/quizzes', icon: CheckSquare },
          { name: 'Assignments', href: '/assessments/assignments', icon: FileText },
          { name: 'My Grades', href: '/assessments/gradebook', icon: Award },
          { name: 'Attendance', href: '/attendance', icon: MapPin },
        ]
      },
      {
        title: 'Community',
        items: [
          { name: 'Live Classes', href: '/liveclasses', icon: Video },
          { name: 'Forums', href: '/forums', icon: MessagesSquare },
          { name: 'Chat', href: '/chat', icon: MessageSquare },
          { name: 'Certificates', href: '/certificates', icon: Award },
        ]
      }
    ];
  };

  const sections = getNavSections();

  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '20px 16px 16px', background: 'rgba(11, 15, 25, 0.95)', borderRight: '1px solid rgba(255, 255, 255, 0.08)' }}>
      {/* Brand Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px', marginBottom: '24px' }}>
        <div style={{
          width: '34px',
          height: '34px',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, #6366f1, #06b6d4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(99, 102, 241, 0.35)'
        }}>
          <Sparkles size={18} color="#fff" />
        </div>
        <div>
          <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '18px', margin: 0, letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            Sanna<span style={{ color: 'var(--accent-color)' }}>LMS</span>
          </h2>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
            {isSuperAdmin ? 'Master Portal' : isCollegeAdmin ? 'Institution Portal' : 'Workspace'}
          </span>
        </div>
      </div>

      {/* Nav List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
        {sections.map((sec, secIdx) => {
          const isCollapsed = Boolean(collapsedSections[sec.title]);
          return (
            <div key={`sec-${secIdx}`}>
              <div
                onClick={() => toggleSection(sec.title)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '4px 8px 6px',
                  fontSize: '11px',
                  fontWeight: '700',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  color: 'rgba(148, 163, 184, 0.7)',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
              >
                <span>{sec.title}</span>
                {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              </div>

              {!isCollapsed && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {sec.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          textDecoration: 'none',
                          color: isActive ? '#ffffff' : 'var(--text-secondary)',
                          background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                          border: isActive ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
                          fontSize: '13px',
                          fontWeight: isActive ? 600 : 500,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Icon size={16} color={isActive ? 'var(--accent-color)' : 'currentColor'} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* User Profile Card (pinned to bottom of sidebar) */}
      <div style={{ marginTop: 'auto', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 12px',
          borderRadius: '10px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.07)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div style={{
              width: '34px',
              height: '34px',
              minWidth: '34px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '13px',
              color: '#ffffff'
            }}>
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {username}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {getRoleLabel(role)}
              </div>
            </div>
          </div>

          <button
            onClick={() => handleLogout()}
            title="Sign Out"
            style={{
              background: 'rgba(244, 63, 94, 0.1)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              color: '#f43f5e',
              borderRadius: '6px',
              padding: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );
}
