import React from 'react';
import { useAuth } from './context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function ControlCenter() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();

  const getDynamicUrl = (port: string, path: string = "") => {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:${port}${path}`;
  };

  return (
    <div className="app-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#090d16', color: '#e2e8f0', fontFamily: 'Inter, sans-serif' }}>
      <header className="header-banner" style={{ position: 'relative', textAlign: 'center', padding: '3rem 2rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1rem', backdropFilter: 'blur(16px)', maxWidth: '850px', width: '90%' }}>
        <span className="badge" style={{ background: 'rgba(6, 182, 212, 0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 600 }}>Multi-Tenant SaaS Platform</span>
        <h1 className="title" style={{ fontSize: '2.5rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: '1rem 0' }}>SannaLMS Architecture Control Center</h1>
        <p className="subtitle" style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '2.5rem' }}>
          Fully Integrated Multi-Tenant SaaS Platform (All 4 Parts Merged & Live)
        </p>

        {/* Auth & Navigation Integration */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {!isAuthenticated ? (
            <button 
              onClick={login}
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                color: 'white', border: 'none', padding: '12px 24px', 
                borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem',
                boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)'
              }}>
              Login with Enterprise SSO (Part 1 Demo)
            </button>
          ) : (
            <button 
              onClick={() => navigate('/dashboard')}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white', border: 'none', padding: '12px 24px', 
                borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem'
              }}>
              Go to Secure User Dashboard →
            </button>
          )}

          <button 
            onClick={() => window.open(getDynamicUrl("8086"), "_blank")}
            style={{
              background: 'linear-gradient(135deg, #a855f7, #7e22ce)',
              color: 'white', border: 'none', padding: '12px 24px', 
              borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem',
              boxShadow: '0 4px 14px rgba(168, 85, 247, 0.3)'
            }}>
            Go to Part 2 Admin Portal (Next.js) ↗
          </button>

          <button 
            onClick={() => navigate('/part3')}
            style={{
              background: 'linear-gradient(135deg, #14b8a6, #0f766e)',
              color: 'white', border: 'none', padding: '12px 24px', 
              borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem',
              boxShadow: '0 4px 14px rgba(20, 184, 166, 0.3)'
            }}>
            Go to Part 3 Sandbox Console →
          </button>

          <button 
            onClick={() => window.open(getDynamicUrl("8008", "/docs"), "_blank")}
            style={{
              background: 'linear-gradient(135deg, #ec4899, #be185d)',
              color: 'white', border: 'none', padding: '12px 24px', 
              borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem',
              boxShadow: '0 4px 14px rgba(236, 72, 153, 0.3)'
            }}>
            Go to Part 4 AI Swagger Docs ↗
          </button>
        </div>
      </header>
    </div>
  );
}
