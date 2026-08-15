'use client';

import { useState, useEffect, use } from 'react';
import { fetchApi } from '@/lib/api';
import { useUserDirectory } from '@/hooks/useUserDirectory';
import { useRole } from '@/hooks/useRole';
import Link from 'next/link';

export default function ThreadsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: forumId } = use(params);
  const { isAdmin, isTrainer } = useRole();
  const [forum, setForum] = useState<any>(null);
  const [threads, setThreads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  // Reply state (#fix): one reply box per thread.
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  // People resolver (#fix): show author names instead of raw UUIDs
  const { nameOf } = useUserDirectory();

  const postReply = async (threadId: string) => {
    const content = (replyTexts[threadId] || '').trim();
    if (!content) return;
    setReplyingTo(threadId);
    try {
      await fetchApi(`/api/v1/threads/${threadId}/posts`, { method: 'POST', body: JSON.stringify({ content }) });
      setReplyTexts(prev => { const n = { ...prev }; delete n[threadId]; return n; });
      loadThreads();
    } catch (err: any) { alert(err.message || 'Failed to post reply'); } finally { setReplyingTo(null); }
  };

  const markSolved = async (threadId: string) => {
    try {
      await fetchApi(`/api/v1/threads/${threadId}/solve`, { method: 'PUT' });
      loadThreads();
    } catch (err: any) { alert(err.message || 'Failed to mark solved'); }
  };

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
      const [forumData, data] = await Promise.all([
        fetchApi(`/api/v1/forums/${forumId}`).catch(() => null),
        fetchApi(`/api/v1/threads/forum/${forumId}`),
      ]);
      setForum(forumData);
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

      {forum?.is_locked && (
        <div className="panel" style={{ marginBottom: '30px', borderLeft: '4px solid #fbbf24', background: 'rgba(251,191,36,0.08)', padding: '15px' }}>
          🔒 <strong>This forum is closed.</strong> No new threads or replies can be posted. Use the forum list to reopen it.
        </div>
      )}

      <form onSubmit={createThread} className="panel" style={{ marginBottom: '30px', opacity: forum?.is_locked ? 0.5 : 1, pointerEvents: forum?.is_locked ? 'none' : 'auto' }}>
        <h3 style={{ marginBottom: '15px' }}>Start a New Thread</h3>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Title</label>
          <input required className="input-field" value={newTitle} onChange={e => setNewTitle(e.target.value)} disabled={forum?.is_locked} />
        </div>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px' }}>Content</label>
          <textarea required className="input-field" rows={4} value={newContent} onChange={e => setNewContent(e.target.value)} disabled={forum?.is_locked} />
        </div>
        <button type="submit" className="btn-primary" disabled={forum?.is_locked}>Post Thread</button>
      </form>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {threads.length === 0 ? <p>No threads in this forum.</p> : threads.map(t => (
          <div className="panel" key={t.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <h3 style={{ fontSize: '18px', color: 'var(--primary-color)', marginBottom: '10px' }}>{t.title}</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {t.is_solved && <span className="badge badge-success">Solved</span>}
                {(isAdmin || isTrainer) && !t.is_solved && (
                  <button className="btn-secondary" style={{ fontSize: '12px', padding: '3px 10px', color: '#00c864', borderColor: '#00c864' }} onClick={() => markSolved(t.id)}>✓ Mark Solved</button>
                )}
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>{t.content}</p>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '12px' }}>
              By {nameOf(t.user_id)} on {new Date(t.created_at).toLocaleString()}
            </div>

            {/* Replies (#fix): replies render under their thread */}
            {(t.posts || []).length > 0 && (
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '10px', marginBottom: '10px' }}>
                {(t.posts || []).map((p: any) => (
                  <div key={p.id} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '6px', padding: '8px 12px', marginBottom: '6px' }}>
                    <div style={{ fontSize: '13px' }}>{p.content}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '4px' }}>
                      {nameOf(p.user_id)} · {new Date(p.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', opacity: forum?.is_locked ? 0.5 : 1, pointerEvents: forum?.is_locked ? 'none' : 'auto' }}>
              <input className="input-field" style={{ flex: 1 }} placeholder={forum?.is_locked ? 'Forum is closed' : 'Write a reply...'} value={replyTexts[t.id] || ''} onChange={e => setReplyTexts({ ...replyTexts, [t.id]: e.target.value })} onKeyDown={e => e.key === 'Enter' && postReply(t.id)} disabled={forum?.is_locked} />
              <button className="btn-primary" style={{ padding: '6px 14px' }} disabled={replyingTo === t.id || forum?.is_locked} onClick={() => postReply(t.id)}>
                {replyingTo === t.id ? 'Posting...' : 'Reply'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
