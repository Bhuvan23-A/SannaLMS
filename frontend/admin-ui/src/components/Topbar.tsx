'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { getRoleLabel, handleLogout, storeTokenFromUrl, ADMIN_DOMAIN, PORTAL_URL } from '@/lib/auth';
import { Bell, Settings, LogOut, Shield, User, ExternalLink } from 'lucide-react';

export default function Topbar({ title }: { title: string }) {
  const [role, setRole] = useState('SUPER_ADMIN');
  const [initials, setInitials] = useState('U');
  const [username, setUsername] = useState('User');
  const [email, setEmail] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Handle ?token= redirect from the main portal (only runs once on mount)
    const { token: urlToken, role: parsedRole } = storeTokenFromUrl();
    const storedToken = localStorage.getItem('access_token');
    const token = urlToken || storedToken;

    const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);

    if (!isLocalDev && window.location.origin !== ADMIN_DOMAIN) {
      window.location.replace(token ? `${ADMIN_DOMAIN}/?token=${encodeURIComponent(token)}` : PORTAL_URL);
      return;
    }

    if (!isLocalDev && !token) {
      window.location.replace(PORTAL_URL);
      return;
    }

    const savedRole = localStorage.getItem('mockRole') || 'SUPER_ADMIN';
    const savedUsername = localStorage.getItem('username') || 'User';
    const savedEmail = localStorage.getItem('userEmail') || '';

    setRole(parsedRole || savedRole);
    setUsername(savedUsername);
    setEmail(savedEmail);
    setInitials(savedUsername.substring(0, 2).toUpperCase());

    if (parsedRole) {
      window.dispatchEvent(new Event('roleChanged'));
    }

    const handleStorageChange = () => {
      setRole(localStorage.getItem('mockRole') || 'SUPER_ADMIN');
      const usr = localStorage.getItem('username') || 'User';
      setUsername(usr);
      setEmail(localStorage.getItem('userEmail') || '');
      setInitials(usr.substring(0, 2).toUpperCase());
    };

    window.addEventListener('roleChanged', handleStorageChange);
    return () => window.removeEventListener('roleChanged', handleStorageChange);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="topbar" style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
      <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>{title}</h2>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'rgba(99, 102, 241, 0.12)',
          border: '1px solid rgba(99, 102, 241, 0.25)',
          padding: '4px 12px',
          borderRadius: '20px'
        }}>
          <Shield size={12} color="var(--accent-color)" />
          <span style={{ fontSize: '12px', color: 'var(--accent-color)', fontWeight: 600 }}>
            {getRoleLabel(role)}
          </span>
        </div>
        
        <Link
          href="/notifications"
          style={{
            textDecoration: 'none',
            position: 'relative',
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            transition: 'all 0.15s ease'
          }}
          title="Notifications"
        >
          <Bell size={16} />
        </Link>

        {/* User Profile Avatar with Clickable Dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div 
            onClick={() => setShowDropdown(!showDropdown)} 
            style={{ 
              width: '38px', 
              height: '38px', 
              borderRadius: '8px', 
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: 700, 
              color: '#ffffff', 
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: showDropdown ? '0 0 0 2px rgba(99, 102, 241, 0.5)' : 'none',
              transition: 'all 0.15s ease'
            }}
            title="Account Menu"
          >
            {initials}
          </div>

          {showDropdown && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '46px',
              width: '260px',
              background: '#0f172a',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
              padding: '14px',
              zIndex: 1000,
              backdropFilter: 'blur(16px)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ width: '36px', height: '36px', minWidth: '36px', borderRadius: '8px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#ffffff', fontSize: '13px' }}>
                  {initials}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {username}
                  </div>
                  {email && (
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {email}
                    </div>
                  )}
                  <span style={{ display: 'inline-block', marginTop: '2px', fontSize: '10px', background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                    {getRoleLabel(role)}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <a
                  href={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/realms/sannalms/account/`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'rgba(99, 102, 241, 0.12)',
                    color: '#a5b4fc',
                    fontWeight: 600,
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textDecoration: 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Settings size={14} /> Account Settings
                  </span>
                  <ExternalLink size={12} />
                </a>
                <button 
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    marginTop: '4px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(244, 63, 94, 0.25)',
                    background: 'rgba(244, 63, 94, 0.1)',
                    color: '#f43f5e',
                    fontWeight: 600,
                    fontSize: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
