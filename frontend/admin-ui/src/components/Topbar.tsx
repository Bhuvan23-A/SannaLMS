'use client';
import { useState, useEffect } from 'react';

export default function Topbar({ title }: { title: string }) {
  const [role, setRole] = useState('SUPER_ADMIN');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRole = params.get('role');
    if (urlRole) {
      setRole(urlRole);
      localStorage.setItem('mockRole', urlRole);
      window.dispatchEvent(new Event('roleChanged'));
      return;
    }

    const saved = localStorage.getItem('mockRole');
    if (saved) setRole(saved);
  }, []);

  const handleRoleChange = (e: any) => {
    setRole(e.target.value);
    localStorage.setItem('mockRole', e.target.value);
    window.dispatchEvent(new Event('roleChanged'));
    // Optionally trigger a refresh to show/hide admin panels
  };

  return (
    <div className="topbar">
      <h2>{title}</h2>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.05)', padding: '5px 15px', borderRadius: '20px' }}>
          <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Simulate Role:</span>
          <select 
            value={role} 
            onChange={handleRoleChange}
            style={{ 
              background: 'transparent', 
              color: 'var(--accent-color)', 
              border: 'none', 
              outline: 'none', 
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            <option style={{ background: '#0b0f19' }} value="SUPER_ADMIN">Super Admin</option>
            <option style={{ background: '#0b0f19' }} value="COLLEGE_ADMIN">College Admin</option>
            <option style={{ background: '#0b0f19' }} value="PRIMARY_TRAINER">Trainer</option>
            <option style={{ background: '#0b0f19' }} value="STUDENT">Student</option>
          </select>
        </div>
        
        <a href="/notifications" style={{ textDecoration: 'none', position: 'relative', fontSize: '24px', marginRight: '10px' }}>
          🔔
        </a>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-color), #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
          SA
        </div>
      </div>
    </div>
  );
}
