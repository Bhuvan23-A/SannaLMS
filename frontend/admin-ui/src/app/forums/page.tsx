'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import Link from 'next/link';
import { useRole } from '@/hooks/useRole';

export default function ForumsPage() {
  const [forums, setForums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin, isTrainer } = useRole();
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  useEffect(() => {
    loadForums();
  }, []);

  // Live updates: refresh the forum list every 15s so new forums appear
  // without a manual reload (#live).
  useEffect(() => {
    const t = setInterval(() => { loadForums(); }, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadForums = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/api/v1/forums');
      setForums(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createForum = async (e: any) => {
    e.preventDefault();
    try {
      await fetchApi('/api/v1/forums', {
        method: 'POST',
        body: JSON.stringify({ title: newTitle, description: newDesc })
      });
      setNewTitle('');
      setNewDesc('');
      loadForums();
    } catch (err) {
      alert('Failed to create forum');
    }
  };

  if (loading) return <div className="fade-in" style={{ padding: '20px' }}>Loading forums...</div>;

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>Discussion Forums</h1>
      </div>

      {(isAdmin || isTrainer) && (
        <form onSubmit={createForum} className="panel" style={{ marginBottom: '30px', display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Forum Title</label>
            <input required className="input-field" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
          </div>
          <div style={{ flex: 2 }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Description</label>
            <input required className="input-field" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
          </div>
          <button type="submit" className="btn-primary" style={{ height: '44px' }}>Create Forum</button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {forums.length === 0 ? <p>No forums available.</p> : forums.map(f => (
          <Link href={`/forums/${f.id}`} key={f.id} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="panel" style={{ transition: 'transform 0.2s', cursor: 'pointer' }} 
                 onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                 onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
              <h2 style={{ fontSize: '20px', color: 'var(--primary-color)', marginBottom: '5px' }}>{f.title}</h2>
              <p style={{ color: 'var(--text-secondary)' }}>{f.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
