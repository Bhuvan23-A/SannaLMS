'use client';
import { useState } from 'react';
import { fetchApi } from '@/lib/api';

export default function CreateCollegeModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [tenantId, setTenantId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await fetchApi('/api/v1/colleges', {
        method: 'POST',
        body: JSON.stringify({ name, subdomain: domain.split('.')[0], tenant_id: tenantId }),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="glass-panel animate-fade-in" style={{ width: '400px', padding: '30px' }}>
        <h2 style={{ marginBottom: '20px' }}>Create College</h2>
        
        {error && (
          <div style={{ padding: '10px', background: 'rgba(239,68,68,0.2)', color: 'var(--danger-color)', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
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
 
          <div style={{ marginTop: '5px', padding: '12px', background: 'rgba(59,130,246,0.15)', borderRadius: '8px', border: '1px dashed rgba(59,130,246,0.3)', fontSize: '13px', color: 'var(--text-secondary)' }}>
            💡 <strong>Tenant Isolation:</strong> Register this college's admin in Keycloak under Users and attach the custom attribute <code>tenant_id</code> matching this value.
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
