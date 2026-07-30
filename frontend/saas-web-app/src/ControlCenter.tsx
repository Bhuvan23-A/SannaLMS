import React from 'react';
import { useAuth } from './context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function ControlCenter() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();



  return (
    <div className="app-container">
      <header className="header-banner" style={{ position: 'relative' }}>
        <span className="badge">Multi-Tenant SaaS Platform</span>
        <h1 className="title">SannaLMS Architecture Control Center</h1>
        <p className="subtitle">
          Part 1 Demo: Infrastructure, Security & User Identity (DevOps & Auth Lead)
        </p>

        {/* Auth Integration */}
        <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          {!isAuthenticated ? (
            <button 
              onClick={login}
              style={{
                background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
                color: 'white', border: 'none', padding: '12px 24px', 
                borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem'
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
            onClick={() => navigate('/part3')}
            style={{
              background: 'linear-gradient(135deg, #14b8a6, #0f766e)',
              color: 'white', border: 'none', padding: '12px 24px', 
              borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '1rem'
            }}>
            Go to Part 3 Sandbox Console →
          </button>
        </div>
      </header>


    </div>
  );
}
