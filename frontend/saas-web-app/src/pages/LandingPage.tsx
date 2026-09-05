import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, BookOpen, ShieldCheck, Zap, Key, Eye, EyeOff, Check, X, AlertCircle, Phone, Mail, GraduationCap } from 'lucide-react';
import axios from 'axios';
import { getBrandConfig } from '../utils/branding';

export const LandingPage: React.FC = () => {
  const { login } = useAuth();
  const brand = getBrandConfig();

  useEffect(() => {
    document.title = brand.portalTitle;
  }, [brand.portalTitle]);

  // Forgot password modal state
  const [forgotModal, setForgotModal] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier) {
      setError('Please enter your registered email address or username');
      return;
    }
    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword && newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await axios.post('/api/v1/users/forgot-password', {
        identifier,
        phone,
        new_password: newPassword || phone
      });
      setSuccess(res.data?.message || 'Password reset successfully! You can now log in.');
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Failed to reset password. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex-center" style={{ minHeight: '100vh', flexDirection: 'column', position: 'relative' }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '3rem', textAlign: 'center', maxWidth: '800px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <div style={{ background: brand.primaryColor, padding: '1.25rem', borderRadius: '50%', boxShadow: `0 0 25px ${brand.primaryColor}80` }}>
            <GraduationCap size={48} color="white" />
          </div>
        </div>
        
        <h1 style={{ fontSize: '2.8rem', fontWeight: 800, marginBottom: '1rem', background: 'linear-gradient(to right, #fff, #cbd5e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {brand.welcomeMessage}
        </h1>
        
        <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', marginBottom: '1rem', lineHeight: '1.6' }}>
          {brand.tagline}
        </p>

        <p style={{ fontSize: '0.95rem', color: '#94a3b8', marginBottom: '2.5rem', fontStyle: 'italic' }}>
          {brand.slogan}
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

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn-primary" onClick={login} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.1rem', padding: '14px 32px' }}>
            <LogIn size={20} />
            Login with Enterprise SSO
          </button>

          <button
            type="button"
            onClick={() => { setForgotModal(true); setError(''); setSuccess(''); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem', padding: '14px 24px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-secondary)', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s' }}
          >
            <Key size={18} />
            Forgot Password?
          </button>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
          <div style={{ background: '#0b0f19', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1.25rem', width: '100%', maxWidth: '460px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.8)', textAlign: 'left' }}>
            
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{ background: 'rgba(99,102,241,0.15)', padding: '8px', borderRadius: '8px', color: '#818cf8' }}>
                  <Key size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff', margin: 0 }}>Reset Student Password</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Recover access using registered email & phone</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForgotModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleForgotPassword} style={{ padding: '1.5rem' }}>
              
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '0.75rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={15} /> {error}
                </div>
              )}

              {success && (
                <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#34d399', padding: '0.85rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={16} /> {success}
                </div>
              )}

              {!success ? (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Registered Email Address / Username *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="e.g. poojitha.k@avit.ac.in"
                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.75rem 0.85rem 0.75rem 2.5rem', color: '#fff', fontSize: '0.9rem' }}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Registered Phone Number *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Phone size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                      <input
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 9876543210 (Default initial password)"
                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.75rem 0.85rem 0.75rem 2.5rem', color: '#fff', fontSize: '0.9rem' }}
                        required
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Set New Password (Optional, leave blank to use phone)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter new password (min 6 characters)"
                        style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.75rem 2.5rem 0.75rem 0.85rem', color: '#fff', fontSize: '0.9rem' }}
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      >
                        {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {newPassword && (
                    <div style={{ marginBottom: '1.25rem' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        Confirm New Password
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showConfirmPass ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                          style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.75rem 2.5rem 0.75rem 0.85rem', color: '#fff', fontSize: '0.9rem' }}
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        >
                          {showConfirmPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setForgotModal(false)}
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)', padding: '0.65rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{ background: 'var(--accent-indigo)', border: 'none', color: '#fff', padding: '0.65rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <Key size={14} />
                      {loading ? 'Resetting...' : 'Reset Password'}
                    </button>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => { setForgotModal(false); login(); }}
                    className="btn-primary"
                    style={{ fontSize: '0.85rem' }}
                  >
                    Proceed to Login
                  </button>
                </div>
              )}

            </form>
          </div>
        </div>
      {/* Dynamic Brand Footer */}
      <footer style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <p style={{ margin: 0 }}>{brand.footerText}</p>
        <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'center', gap: '1.5rem', fontSize: '0.8rem' }}>
          <a href={brand.websiteUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
            Official Website
          </a>
          <span>•</span>
          <a href={`mailto:${brand.supportEmail}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
            Help & Support
          </a>
        </div>
      </footer>

    </div>
  );
};
