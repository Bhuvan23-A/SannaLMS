'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';

const SAMPLE_CSV = `email,first_name,last_name,role,department,branch,year
student.1@college.edu,Aarav,Sharma,student,CSE,CSE-A,1
student.2@college.edu,Diya,Patel,student,CSE,CSE-A,1
prof.1@college.edu,Dr. Ramesh,Iyer,professor,CSE,CSE-A,
ta.1@college.edu,Priya,Nair,teaching_assistant,CSE,CSE-A,2`;

export default function BulkImportPage() {
  const { isAdmin } = useRole();
  const [colleges, setColleges] = useState<any[]>([]);
  const [collegeId, setCollegeId] = useState('');
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  // Matches the documented demo-account password (Test@1234) so every
  // runtime-created user logs in with the same default as the seeded accounts.
  const [defaultPassword, setDefaultPassword] = useState('Test@1234');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchApi('/api/v1/colleges');
        // Only active colleges can accept new users (held colleges are suspended).
        const active = Array.isArray(data) ? data.filter((c: any) => c.status !== 'HELD') : [];
        if (active.length > 0) {
          setColleges(active);
          setCollegeId(active[0].id);
        } else {
          setColleges([]);
        }
      } catch { /* colleges unavailable */ }
    })();
  }, []);

  const handleFile = (e: any) => {
    const f = e.target?.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result || ''));
    reader.readAsText(f);
  };

  const parseCsv = (text: string): any[] => {
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return [];
    const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const rows: any[] = [];
    for (let i = 1; i < lines.length; i++) {
      // Simple CSV split that tolerates quoted commas
      const cells: string[] = [];
      let cur = '';
      let inQ = false;
      for (const ch of lines[i]) {
        if (ch === '"') inQ = !inQ;
        else if (ch === ',' && !inQ) { cells.push(cur.trim()); cur = ''; }
        else cur += ch;
      }
      cells.push(cur.trim());
      const row: any = {};
      headers.forEach((h, idx) => { if (cells[idx] !== undefined && cells[idx] !== '') row[h] = cells[idx]; });
      if (row.email) rows.push(row);
    }
    return rows;
  };

  const runImport = async () => {
    setError('');
    setResult(null);
    if (!collegeId) { setError('Select a college first'); return; }
    const rows = parseCsv(csvText);
    if (rows.length === 0) { setError('No valid rows found. Check the CSV format (first row must be the header: email,first_name,last_name,role,...).'); return; }
    try {
      setImporting(true);
      const res = await fetchApi('/api/v1/users/bulk-import', {
        method: 'POST',
        body: JSON.stringify({
          users: rows,
          default_password: defaultPassword || 'Test@1234',
          college_id: collegeId,
        }),
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  if (!isAdmin) return (
    <div className="fade-in panel" style={{ textAlign: 'center', padding: '60px' }}>
      <h2>Access Restricted</h2>
      <p style={{ color: 'var(--text-secondary)' }}>Only Super Admins and College Admins can import users.</p>
    </div>
  );

  return (
    <div className="fade-in">
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>👥 Bulk Import Users</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
        Upload a CSV to create students, professors, and teaching assistants in bulk. Users get a Keycloak account with the right role, your college&apos;s tenant, and department/branch/year attributes.
      </p>

      <div className="panel" style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}>College</label>
        <select className="input-field" style={{ maxWidth: '420px', marginBottom: '16px' }} value={collegeId} onChange={e => setCollegeId(e.target.value)}>
          {colleges.length === 0 && <option value="">No colleges available</option>}
          {colleges.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.subdomain})</option>)}
        </select>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}>📄 Upload CSV File</button>
          <button className="btn-secondary" onClick={() => setCsvText(SAMPLE_CSV)}>📋 Load Sample CSV</button>
          <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleFile} />
        </div>
        {fileName && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>File: {fileName}</p>}

        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}>CSV contents</label>
        <textarea className="input-field" rows={10} style={{ fontFamily: 'monospace', fontSize: '13px' }}
          placeholder={'email,first_name,last_name,role,department,branch,year\nstudent.1@college.edu,Aarav,Sharma,student,CSE,CSE-A,1'}
          value={csvText} onChange={e => setCsvText(e.target.value)} />

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            Temporary password:
            <input className="input-field" style={{ width: '160px' }} value={defaultPassword} onChange={e => setDefaultPassword(e.target.value)} />
          </label>
          <button className="btn-primary" disabled={importing} onClick={runImport}>
            {importing ? 'Importing...' : `🚀 Import ${parseCsv(csvText).length || ''} Users`}
          </button>
        </div>

        <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          Roles: <code>student</code>, <code>professor</code> (or instructor), <code>teaching_assistant</code>, <code>college_admin</code>. Columns: email (required), first_name, last_name, role, department, branch, year.
        </p>
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '15px', color: 'var(--danger-color)', border: '1px solid var(--danger-color)', marginBottom: '20px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {result && (
        <div className="panel" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '12px' }}>Import Results</h3>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <span className="badge badge-info">Total: {result.total}</span>
            <span className="badge badge-success">Created: {result.created}</span>
            {result.already_exists > 0 && <span className="badge badge-warning">Already existed: {result.already_exists}</span>}
            <span className="badge badge-danger">Failed: {result.failed}</span>
          </div>
          {result.failed > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Email</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Status</th>
                  <th style={{ padding: '8px', textAlign: 'left' }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {(result.results || []).filter((r: any) => r.status === 'failed').map((r: any, i: number) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px' }}>{r.email}</td>
                    <td style={{ padding: '8px', color: 'var(--danger-color)' }}>failed</td>
                    <td style={{ padding: '8px', color: 'var(--text-secondary)' }}>{r.error}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Created users get a temporary password and must change it at first login. You can now enroll them in courses via the Courses page (➕ Add Student) or with the attendance/assign features.
          </p>
        </div>
      )}
    </div>
  );
}
