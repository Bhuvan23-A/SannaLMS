'use client';
import { useState } from 'react';
import { fetchApi } from '@/lib/api';

export default function CreateCollegeModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetchApi('/api/v1/colleges', {
        method: 'POST',
        body: JSON.stringify({
          name,
          subdomain: domain.split('.')[0],
          tenant_id: tenantId,
          ...(adminEmail.trim() ? { admin_email: adminEmail.trim() } : {}),
          ...(adminName.trim() ? { admin_first_name: adminName.trim().split(' ')[0], admin_last_name: adminName.trim().split(' ').slice(1).join(' ') } : {}),
        }),
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Success screen — shows the college admin's login credentials (the ONLY
  // moment they are revealed; the password is never shown again afterwards).
  if (result) {
    const creds = result.admin_credentials;
    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000
      }}>
        <div className="panel" style={{
          width: '480px', maxWidth: '92vw', padding: '30px',
          border: '1px solid rgba(59, 130, 246, 0.4)',
          boxShadow: '0 0 40px rgba(59, 130, 246, 0.25), 0 24px 60px rgba(0,0,0,0.6)',
          background: '#0f172a'
        }}>
          <div style={{ fontSize: '44px', textAlign: 'center', marginBottom: '12px' }}>✅</div>
          <h2 style={{ textAlign: 'center', marginBottom: '6px' }}>College Created!</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
            <strong>{result.name}</strong> is ready. Its college admin can log in right now with these credentials.
          </p>

          {creds ? (
            <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '18px', marginBottom: '16px' }}>
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</div>
                <code style={{ fontSize: '15px', wordBreak: 'break-all' }}>{creds.admin_username}</code>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</div>
                <code style={{ fontSize: '15px', wordBreak: 'break-all' }}>{creds.admin_password}</code>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '12px' }}>
                ⚠️ Save this now — the password is only shown once at creation.
              </p>
            </div>
          ) : (
            <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '16px', marginBottom: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              No admin email was provided, so no college admin account was created.
              {result.default_password && (
                <div style={{ marginTop: '8px' }}>
                  The default password for any user created later is{' '}
                  <code style={{ fontSize: '14px' }}>{result.default_password}</code>.
                </div>
              )}
            </div>
          )}

          {result.admin_error && (
            <div style={{ padding: '10px', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
              ⚠️ College created, but the admin account could not be created: {result.admin_error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button className="btn-primary" onClick={onSuccess}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, overflowY: 'auto', padding: '20px'
    }}>
      <div className="panel" style={{
        width: '480px', maxWidth: '92vw', padding: '30px',
        border: '1px solid rgba(59, 130, 246, 0.4)',
        boxShadow: '0 0 40px rgba(59, 130, 246, 0.2), 0 24px 60px rgba(0,0,0,0.6)',
        background: '#0f172a'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <h2 style={{ margin: 0 }}>🏛️ Create College</h2>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}
            aria-label="Close"
          >✕</button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
          Registers the college as a separate tenant. If you supply an admin email, the college admin account is created automatically.
        </p>

        {error && (
          <div style={{ padding: '10px', background: 'rgba(239,68,68,0.2)', color: 'var(--danger-color)', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>College Name</label>
            <input
              required className="input-field" value={name} onChange={e => setName(e.target.value)}
              placeholder="e.g. Stanford University"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Domain</label>
            <input
              required className="input-field" value={domain} onChange={e => setDomain(e.target.value)}
              placeholder="e.g. stanford.edu"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Tenant ID (Unique)</label>
            <input
              required className="input-field" value={tenantId} onChange={e => setTenantId(e.target.value)}
              placeholder="e.g. stanford"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>College Admin Email</label>
            <input className="input-field" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="e.g. admin@stanford.edu" />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>College Admin Name (optional)</label>
            <input className="input-field" value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="e.g. Dr. R. Sharma" />
          </div>

          <div style={{ marginTop: '5px', padding: '12px', background: 'rgba(59,130,246,0.15)', borderRadius: '8px', border: '1px dashed rgba(59,130,246,0.3)', fontSize: '13px', color: 'var(--text-secondary)' }}>
            💡 <strong>College Admin:</strong> If you provide an admin email, we create the college admin automatically in Keycloak (role: tenantadmin) with the <code>tenant_id</code> attribute. Their temporary login is <strong>username = admin email</strong> and <strong>password = <code>Test@1234</code></strong> (shown once after creation) — no manual setup needed.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create College'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
