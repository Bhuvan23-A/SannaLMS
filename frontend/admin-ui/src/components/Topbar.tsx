'use client';
import { useState, useEffect, useRef } from 'react';
import { getRoleLabel, handleLogout, storeTokenFromUrl } from '@/lib/auth';

export default function Topbar({ title }: { title: string }) {
  const [role, setRole] = useState('SUPER_ADMIN');
  const [initials, setInitials] = useState('U');
  const [username, setUsername] = useState('User');
  const [email, setEmail] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Handle ?token= redirect from the main portal (only runs once on mount)
    const { role: parsedRole } = storeTokenFromUrl();

    // Read final role from storage (possibly just written above)
    const savedRole = localStorage.getItem('mockRole') || 'SUPER_ADMIN';
    const savedUsername = localStorage.getItem('username') || 'User';
    const savedEmail = localStorage.getItem('userEmail') || '';

    setRole(parsedRole || savedRole);
    setUsername(savedUsername);
    setEmail(savedEmail);
    setInitials(savedUsername.substring(0, 2).toUpperCase());

    if (parsedRole) {
      // Fire event so Sidebar updates immediately
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
    <div className="topbar" style={{ position: 'relative' }}>
      <h2>{title}</h2>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '5px 15px', borderRadius: '20px' }}>
          <span style={{ fontSize: '12px', color: 'var(--accent-color)', fontWeight: 'bold' }}>
            Role: {getRoleLabel(role)}
          </span>
        </div>
        
        <a href="/notifications" style={{ textDecoration: 'none', position: 'relative', fontSize: '24px', marginRight: '5px' }}>
          🔔
        </a>

        {/* User Profile Avatar with Clickable Dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <div 
            onClick={() => setShowDropdown(!showDropdown)} 
            style={{ 
              width: '42px', 
              height: '42px', 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontWeight: 'bold', 
              color: 'white', 
              fontSize: '14px',
              cursor: 'pointer',
              boxShadow: showDropdown ? '0 0 0 3px rgba(59, 130, 246, 0.5)' : 'none',
              transition: 'all 0.2s ease'
            }}
            title="Click to view profile & settings"
          >
            {initials}
          </div>

          {showDropdown && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '52px',
              width: '260px',
              background: '#1e293b',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
              padding: '16px',
              zIndex: 1000,
              backdropFilter: 'blur(10px)',
              animation: 'fadeIn 0.15s ease-out'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white' }}>
                  {initials}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 'bold', color: '#f8fafc', fontSize: '14px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {username}
                  </div>
                  {email && (
                    <div style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {email}
                    </div>
                  )}
                  <span style={{ display: 'inline-block', marginTop: '4px', fontSize: '10px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                    {getRoleLabel(role)}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <button 
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'rgba(239, 68, 68, 0.15)',
                    color: '#f87171',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    transition: 'background 0.2s ease'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)')}
                  onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)')}
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
