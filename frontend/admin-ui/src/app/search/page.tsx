'use client';

import { useState } from 'react';
import { fetchApi } from '@/lib/api';
import Link from 'next/link';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: any) => {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      setLoading(true);
      setSearched(true);
      const data = await fetchApi(`/api/v1/search?q=${encodeURIComponent(query)}`);
      setResults(data || []);
    } catch (err) {
      console.error(err);
      alert('Search failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>Global Search</h1>
      </div>

      <form onSubmit={handleSearch} className="panel" style={{ marginBottom: '30px', display: 'flex', gap: '15px' }}>
        <input 
          required 
          className="input-field" 
          style={{ flex: 1, padding: '15px', fontSize: '18px' }} 
          placeholder="Search for courses, forums, threads..." 
          value={query} 
          onChange={e => setQuery(e.target.value)} 
        />
        <button type="submit" className="btn-primary" style={{ padding: '0 30px' }}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {searched && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>{results.length} Results Found</h2>
          {results.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              No matches found for "{query}".
            </div>
          ) : results.map((r, i) => (
            <div className="panel" key={i}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                <span className="badge badge-info">{r.type}</span>
                <h3 style={{ fontSize: '18px', color: 'var(--primary-color)' }}>{r.title}</h3>
              </div>
              <p style={{ color: 'var(--text-secondary)' }}>{r.description}</p>
              
              <div style={{ marginTop: '15px' }}>
                {r.type === 'COURSE' && <Link href={`/courses/${r.id}`} className="btn-secondary">View Course</Link>}
                {r.type === 'FORUM' && <Link href={`/forums/${r.id}`} className="btn-secondary">View Forum</Link>}
                {r.type === 'THREAD' && <Link href={`/forums/${r.forum_id}`} className="btn-secondary">View Thread</Link>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
