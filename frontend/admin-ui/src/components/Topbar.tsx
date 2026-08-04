'use client';
import { useState, useEffect } from 'react';

function decodeJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export default function Topbar({ title }: { title: string }) {
  const [role, setRole] = useState('SUPER_ADMIN');
  const [initials, setInitials] = useState('U');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (token) {
      localStorage.setItem('access_token', token);
      const payload = decodeJwt(token);
      if (payload) {
        const roles = payload.realm_access?.roles || [];
        let resolvedRole = 'STUDENT';
        if (roles.includes('superadmin')) {
          resolvedRole = 'SUPER_ADMIN';
        } else if (roles.includes('tenantadmin') || roles.includes('instructor')) {
          resolvedRole = 'COLLEGE_ADMIN';
        }
        localStorage.setItem('mockRole', resolvedRole);
        
        const username = payload.preferred_username || payload.name || 'User';
        localStorage.setItem('username', username);
        if (payload.sub) {
          localStorage.setItem('userId', payload.sub);
        }
      }
      
      // Clean token from URL
      params.delete('token');
      const newRelativePathQuery = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
      window.history.replaceState({}, '', newRelativePathQuery);
      window.dispatchEvent(new Event('roleChanged'));
    }

    const savedRole = localStorage.getItem('mockRole') || 'SUPER_ADMIN';
    setRole(savedRole);

    const savedUsername = localStorage.getItem('username') || 'User';
    setInitials(savedUsername.substring(0, 2).toUpperCase());

    const handleStorageChange = () => {
      setRole(localStorage.getItem('mockRole') || 'SUPER_ADMIN');
      const usr = localStorage.getItem('username') || 'User';
      setInitials(usr.substring(0, 2).toUpperCase());
    };
    
    window.addEventListener('roleChanged', handleStorageChange);
    return () => window.removeEventListener('roleChanged', handleStorageChange);
  }, []);

  return (
    <div className="topbar">
      <h2>{title}</h2>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '5px 15px', borderRadius: '20px' }}>
          <span style={{ fontSize: '12px', color: 'var(--accent-color)', fontWeight: 'bold' }}>
            Role: {role === 'SUPER_ADMIN' ? 'Super Admin' : role === 'COLLEGE_ADMIN' ? 'College Admin' : role === 'PRIMARY_TRAINER' ? 'Trainer' : 'Student'}
          </span>
        </div>
        
        <a href="/notifications" style={{ textDecoration: 'none', position: 'relative', fontSize: '24px', marginRight: '10px' }}>
          🔔
        </a>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-color), #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white', fontSize: '14px' }}>
          {initials}
        </div>
      </div>
    </div>
  );
}
