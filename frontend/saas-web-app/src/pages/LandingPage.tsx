import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, BookOpen, ShieldCheck, Zap } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { login } = useAuth();

  return (
    <div className="container flex-center" style={{ minHeight: '100vh', flexDirection: 'column' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '3rem', textAlign: 'center', maxWidth: '800px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ background: 'var(--primary)', padding: '1rem', borderRadius: '50%', boxShadow: '0 0 20px rgba(79,70,229,0.5)' }}>
            <BookOpen size={48} color="white" />
          </div>
        </div>
        
        <h1 style={{ fontSize: '3rem', marginBottom: '1rem', background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Welcome to SannaLMS
        </h1>
        
        <p style={{ fontSize: '1.2rem', color: 'var(--text-muted)', marginBottom: '2.5rem', lineHeight: '1.6' }}>
          The next-generation, cloud-native Learning Management System built for scale. 
          Experience seamless identity management, real-time analytics, and secure multi-tenant architecture.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '3rem', textAlign: 'left' }}>
          <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <ShieldCheck size={24} color="var(--accent)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>Enterprise Security</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Powered by Keycloak SSO and mandatory TOTP for all users.</p>
          </div>
          <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Zap size={24} color="var(--accent)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>Lightning Fast</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Microservice architecture backed by Redis caching and Kong Gateway.</p>
          </div>
        </div>

        <button className="btn-primary" onClick={login} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', padding: '14px 32px' }}>
          <LogIn size={20} />
          Login with Enterprise SSO
        </button>
      </div>
    </div>
  );
};
