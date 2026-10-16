import { useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Eye, EyeOff, Copy, Check, ShieldAlert } from 'lucide-react';

export default function CreateCollegeModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(true);
  const [copied, setCopied] = useState(false);
  const [confirmedSaved, setConfirmedSaved] = useState(false);

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

    const copyCreds = () => {
      const text = `College: ${result.name}\nUsername: ${creds?.admin_username}\nTemporary Password: ${creds?.admin_password}\nSecurity Requirement: Password change required on first login.`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setConfirmedSaved(true);
      setTimeout(() => setCopied(false), 3000);
    };

    return (
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)',
        display: 'flex', justifyContent: 'center',
        zIndex: 1000, overflowY: 'auto', padding: '20px'
      }}>
        <div className="panel" style={{
          width: '560px', maxWidth: '92vw', padding: '26px',
          border: '1px solid rgba(59, 130, 246, 0.4)',
          boxShadow: '0 0 40px rgba(59, 130, 246, 0.25), 0 24px 60px rgba(0,0,0,0.6)',
          background: '#0f172a', margin: 'auto', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto'
        }}>
          <h2 style={{ textAlign: 'center', marginBottom: '6px' }}>College Created!</h2>
          <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' }}>
            <strong>{result.name}</strong> is ready.
          </p>

          {creds ? (
            <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '18px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.15)', color: '#34d399', padding: '3px 8px', borderRadius: '4px', fontWeight: 600 }}>
                  High-Entropy Temporary Password
                </span>
                <button
                  type="button"
                  onClick={copyCreds}
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
                >
                  {copied ? <Check size={14} color="#34d399" /> : <Copy size={14} />}
                  {copied ? 'Copied to Clipboard!' : 'Copy Credentials'}
                </button>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Username</div>
                <code style={{ fontSize: '15px', wordBreak: 'break-all' }}>{creds.admin_username}</code>
              </div>

              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Temporary Password</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <code style={{ fontSize: '15px', wordBreak: 'break-all', color: '#60a5fa' }}>
                    {showPassword ? creds.admin_password : '••••••••••••'}
                  </code>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.2)', padding: '10px', borderRadius: '6px', marginTop: '14px' }}>
                <ShieldAlert size={18} color="#facc15" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ fontSize: '12px', color: '#fef08a', margin: 0, lineHeight: 1.4 }}>
                  Save this now — this temporary password is shown only once. The college admin will be prompted by Keycloak to set their own confidential password upon their first login.
                </p>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '14px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-primary)' }}>
                <input
                  type="checkbox"
                  checked={confirmedSaved}
                  onChange={e => setConfirmedSaved(e.target.checked)}
                />
                <span>I have securely copied and saved these admin credentials.</span>
              </label>
            </div>
          ) : (
            <div style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '16px', marginBottom: '16px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              No admin email was provided, so no college admin account was created.
            </div>
          )}

          {result.admin_error && (
            <div style={{ padding: '10px', background: 'rgba(239,68,68,0.15)', color: '#fca5a5', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
              College created, but the admin account could not be created: {result.admin_error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              className="btn-primary"
              disabled={creds && !confirmedSaved}
              onClick={onSuccess}
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(2, 6, 23, 0.85)', backdropFilter: 'blur(8px)',
      display: 'flex', justifyContent: 'center',
      zIndex: 1000, overflowY: 'auto', padding: '20px'
    }}>
      <div className="panel" style={{
        width: '560px', maxWidth: '92vw', padding: '26px',
        border: '1px solid rgba(59, 130, 246, 0.4)',
        boxShadow: '0 0 40px rgba(59, 130, 246, 0.2), 0 24px 60px rgba(0,0,0,0.6)',
        background: '#0f172a', margin: 'auto', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <h2 style={{ margin: 0 }}>Create College</h2>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}
            aria-label="Close"
          ></button>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
          Registers the college as a separate tenant. If you supply an admin email, the college admin account is created automatically.
        </p>

        {error && (
          <div style={{ padding: '10px', background: 'rgba(239,68,68,0.2)', color: 'var(--danger-color)', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>College Name</label>
              <input
                required className="input-field" value={name} onChange={e => setName(e.target.value)}
                placeholder="e.g. Stanford"
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
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>College Admin Name (optional)</label>
            <input className="input-field" value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="e.g. Dr. R. Sharma" />
          </div>

          <div style={{ marginTop: '2px', padding: '10px', background: 'rgba(59,130,246,0.15)', borderRadius: '8px', border: '1px dashed rgba(59,130,246,0.3)', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <strong>College Admin:</strong> If you provide an admin email, we create the college admin automatically in Keycloak (role: tenantadmin) with the <code>tenant_id</code> attribute. Their temporary login is <strong>username = admin email</strong> and <strong>password = <code>Test@1234</code></strong> (shown once after creation) — no manual setup needed.
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
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
