'use client';

import { useState, useEffect, use } from 'react';
import { fetchApi } from '@/lib/api';
import { useUserDirectory } from '@/hooks/useUserDirectory';
import Link from 'next/link';

export default function ThreadsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: forumId } = use(params);
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  // People resolver (#fix): show author names instead of raw UUIDs
  const { nameOf } = useUserDirectory();

  useEffect(() => {
    loadThreads();
  }, [forumId]);

  // Live updates: refresh the thread list every 10s so new threads/replies
  // appear without a manual reload (#live).
  useEffect(() => {
    const t = setInterval(() => { loadThreads(); }, 10000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forumId]);

  const loadThreads = async () => {
    try {
      setLoading(true);
      const data = await fetchApi(`/api/v1/threads/forum/${forumId}`);
      setThreads(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createThread = async (e: any) => {
    e.preventDefault();
    try {
      await fetchApi('/api/v1/threads', {
        method: 'POST',
        body: JSON.stringify({ forum_id: forumId, title: newTitle, content: newContent })
      });
      setNewTitle('');
      setNewContent('');
      loadThreads();
    } catch (err) {
      alert('Failed to create thread');
    }
  };

  if (loading) return <div className="fade-in" style={{ padding: '20px' }}>Loading threads...</div>;

  return (
    <div className="fade-in">
      <Link href="/forums" style={{ color: 'var(--primary-color)', textDecoration: 'none', marginBottom: '20px', display: 'inline-block' }}>
        ← Back to Forums
      </Link>
      
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '30px' }}>Forum Threads</h1>

      <form onSubmit={createThread} className="panel" style={{ marginBottom: '30px' }}>
        <h3 style={{ marginBottom: '15px' }}>Start a New Thread</h3>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Title</label>
          <input required className="input-field" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Content</label>
          <textarea required className="input-field" rows={4} value={newContent} onChange={e => setNewContent(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary">Post Thread</button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {threads.length === 0 ? <p>No threads in this forum.</p> : threads.map(t => (
          <div className="panel" key={t.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: '18px', color: 'var(--primary-color)', marginBottom: '10px' }}>{t.title}</h3>
              {t.is_solved && <span className="badge badge-success">Solved</span>}
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>{t.content}</p>
            <div style={{ fontSize: '12px', color: '#888' }}>
              By {nameOf(t.user_id)} on {new Date(t.created_at).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
