'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
import { Eye, EyeOff, Key, Phone, Layers, GraduationCap, Building2, CheckCircle2, AlertCircle } from 'lucide-react';

const SAMPLE_CSV = `email,first_name,last_name,phone,role,department,branch,batch,semester,section
student.1@college.edu,Aarav,Sharma,9876543210,student,Computer Science,B.Tech CSE,2024-2028,3,A
student.2@college.edu,Diya,Patel,9876543211,student,Computer Science,B.Tech CSE,2024-2028,3,A
prof.1@college.edu,Dr. Ramesh,Iyer,9876543212,professor,Computer Science,B.Tech CSE,,,
ta.1@college.edu,Priya,Nair,9876543213,teaching_assistant,Computer Science,B.Tech CSE,2024-2028,3,A`;

export default function BulkImportPage() {
  const { isAdmin } = useRole();
  const [colleges, setColleges] = useState<any[]>([]);
  const [collegeId, setCollegeId] = useState('');
  const [csvText, setCsvText] = useState('');
  const [fileName, setFileName] = useState('');
  
  // Placement data
  const [departments, setDepartments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);

  // Selected dropdown filters (optional defaults for this batch)
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedSem, setSelectedSem] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  const [defaultPassword, setDefaultPassword] = useState('Test@1234');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const [collegesData, deptsData, branchesData, sessionsData, sectionsData] = await Promise.all([
          fetchApi('/api/v1/colleges').catch(() => []),
          fetchApi('/api/v1/departments').catch(() => []),
          fetchApi('/api/v1/branches').catch(() => []),
          fetchApi('/api/v1/academic-sessions').catch(() => []),
          fetchApi('/api/v1/sections').catch(() => []),
        ]);

        const active = Array.isArray(collegesData) ? collegesData.filter((c: any) => c.status !== 'HELD') : [];
        if (active.length > 0) {
          setColleges(active);
          setCollegeId(active[0].id);
        } else {
          setColleges([]);
        }

        setDepartments(Array.isArray(deptsData) ? deptsData : []);
        setBranches(Array.isArray(branchesData) ? branchesData : []);
        setSessions(Array.isArray(sessionsData) ? sessionsData : []);
        setSections(Array.isArray(sectionsData) ? sectionsData : []);
      } catch { /* data unavailable */ }
    })();
  }, []);

  // Filter branches and sections dynamically
  const currentCollege = colleges.find(c => c.id === collegeId);
  const collegeDepts = departments.filter(d => !collegeId || d.college_id === collegeId || d.tenant_id === currentCollege?.tenant_id);
  const filteredBranches = selectedDept ? branches.filter(b => b.department_id === selectedDept) : branches;
  const filteredSections = selectedBranch ? sections.filter(s => s.branch_id === selectedBranch) : sections;

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
    if (rows.length === 0) { setError('No valid rows found. Check the CSV format (first row must be the header: email,first_name,last_name,phone,role,...).'); return; }

    const deptObj = departments.find(d => d.id === selectedDept);
    const branchObj = branches.find(b => b.id === selectedBranch);
    const sessionObj = sessions.find(s => s.id === selectedBatch);
    const sectionObj = sections.find(s => s.id === selectedSection);

    try {
      setImporting(true);
      const res = await fetchApi('/api/v1/users/bulk-import', {
        method: 'POST',
        body: JSON.stringify({
          users: rows,
          default_password: defaultPassword || 'Test@1234',
          college_id: collegeId,
          department: deptObj?.name || selectedDept || undefined,
          branch: branchObj?.name || selectedBranch || undefined,
          batch: sessionObj?.name || selectedBatch || undefined,
          academic_session: sessionObj?.name || selectedBatch || undefined,
          semester: selectedSem || undefined,
          section: sectionObj?.name || selectedSection || undefined,
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
      <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>Bulk Import Users</h1>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
        Upload a CSV to create students, professors, and teaching assistants in bulk. Users receive Keycloak SSO credentials, and are assigned to their college, department, branch, batch, and section.
      </p>

      <div className="panel" style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}>College / Institution</label>
        <select className="input-field" style={{ maxWidth: '420px', marginBottom: '20px' }} value={collegeId} onChange={e => setCollegeId(e.target.value)}>
          {colleges.length === 0 && <option value="">No colleges available</option>}
          {colleges.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.subdomain})</option>)}
        </select>

        {/* Academic Placement (Batch / Branch / Department / Section Selection) */}
        <div style={{ background: 'rgba(14, 165, 233, 0.04)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Layers size={18} color="#38bdf8" />
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>Academic Placement (Assign Batch, Branch &amp; Section)</h3>
            <span style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>Optional Preset</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Select below to apply a default placement to this entire upload. If left as <em>&quot;Use CSV Column&quot;</em>, values are read row-by-row directly from the CSV.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>Department</label>
              <select
                className="input-field"
                style={{ width: '100%', fontSize: '13px' }}
                value={selectedDept}
                onChange={e => {
                  setSelectedDept(e.target.value);
                  setSelectedBranch('');
                  setSelectedSection('');
                }}
              >
                <option value="">(Use CSV Column / None)</option>
                {collegeDepts.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>Branch / Degree</label>
              <select
                className="input-field"
                style={{ width: '100%', fontSize: '13px' }}
                value={selectedBranch}
                onChange={e => {
                  setSelectedBranch(e.target.value);
                  setSelectedSection('');
                }}
              >
                <option value="">(Use CSV Column / None)</option>
                {filteredBranches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>Batch / Academic Year</label>
              <select
                className="input-field"
                style={{ width: '100%', fontSize: '13px' }}
                value={selectedBatch}
                onChange={e => setSelectedBatch(e.target.value)}
              >
                <option value="">(Use CSV Column / None)</option>
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>{s.name} {s.is_current ? '(Current)' : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>Semester / Year</label>
              <select
                className="input-field"
                style={{ width: '100%', fontSize: '13px' }}
                value={selectedSem}
                onChange={e => setSelectedSem(e.target.value)}
              >
                <option value="">(Use CSV Column / None)</option>
                <option value="1">Sem 1 (1st Year)</option>
                <option value="2">Sem 2 (1st Year)</option>
                <option value="3">Sem 3 (2nd Year)</option>
                <option value="4">Sem 4 (2nd Year)</option>
                <option value="5">Sem 5 (3rd Year)</option>
                <option value="6">Sem 6 (3rd Year)</option>
                <option value="7">Sem 7 (4th Year)</option>
                <option value="8">Sem 8 (4th Year)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>Section</label>
              <select
                className="input-field"
                style={{ width: '100%', fontSize: '13px' }}
                value={selectedSection}
                onChange={e => setSelectedSection(e.target.value)}
              >
                <option value="">(Use CSV Column / None)</option>
                {filteredSections.map(s => (
                  <option key={s.id} value={s.id}>Section {s.name || 'Default'}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* CSV Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '12px' }}>
          <button className="btn-secondary" onClick={() => fileRef.current?.click()}>Upload CSV File</button>
          <button className="btn-secondary" onClick={() => setCsvText(SAMPLE_CSV)}>Load Sample CSV</button>
          <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleFile} />
        </div>
        {fileName && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>File: {fileName}</p>}

        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}>CSV contents</label>
        <textarea
          className="input-field"
          rows={10}
          style={{ fontFamily: 'monospace', fontSize: '13px' }}
          placeholder={'email,first_name,last_name,phone,role,department,branch,batch,semester,section\nstudent.1@college.edu,Aarav,Sharma,9876543210,student,Computer Science,B.Tech CSE,2024-2028,3,A'}
          value={csvText}
          onChange={e => setCsvText(e.target.value)}
        />

        {/* Automatic Password Information Box */}
        <div style={{ marginTop: '14px', padding: '12px 16px', background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(56, 189, 248, 0.25)', borderRadius: '10px', fontSize: '13px', color: '#7dd3fc', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
          <Key size={18} color="#38bdf8" style={{ marginTop: '2px', flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 600, color: '#38bdf8', marginBottom: '2px' }}>Student Password: Automatically Set to Phone Number</div>
            <span>Each student&apos;s login password will be set directly to their <strong>phone number</strong> from the CSV (e.g. <code>9876543210</code>). If a user row has no phone number, the fallback password below will be assigned.</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <span>Fallback password (if phone missing):</span>
            <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="input-field"
                style={{ width: '180px', paddingRight: '36px' }}
                value={defaultPassword}
                onChange={e => setDefaultPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: showPassword ? 'var(--accent-color)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <button className="btn-primary" disabled={importing} onClick={runImport}>
            {importing ? 'Importing...' : `Import ${parseCsv(csvText).length || ''} Users`}
          </button>
        </div>

        <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
          Roles: <code>student</code>, <code>professor</code> (or instructor), <code>teaching_assistant</code>, <code>college_admin</code>. Columns: <code>email</code> (required), <code>first_name</code>, <code>last_name</code>, <code>phone</code> (auto password), <code>role</code>, <code>department</code>, <code>branch</code>, <code>batch</code>, <code>semester</code>, <code>section</code>.
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

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '8px', textAlign: 'left' }}>Email</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Role</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Academic Placement</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Status</th>
                <th style={{ padding: '8px', textAlign: 'left' }}>Detail</th>
              </tr>
            </thead>
            <tbody>
              {(result.results || []).map((r: any, i: number) => {
                const placementParts = [r.department, r.branch, r.batch, r.section ? `Sec ${r.section}` : null].filter(Boolean);
                const placementText = placementParts.length > 0 ? placementParts.join(' • ') : 'General Cohort';
                return (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '8px', fontWeight: 600 }}>{r.email}</td>
                    <td style={{ padding: '8px', textTransform: 'capitalize' }}>{r.role ? r.role.replace(/_/g, ' ').toLowerCase() : 'student'}</td>
                    <td style={{ padding: '8px', color: '#7dd3fc', fontSize: '12px' }}>{placementText}</td>
                    <td style={{ padding: '8px' }}>
                      <span className={`badge ${r.status === 'created' ? 'badge-success' : r.status === 'already_exists' ? 'badge-warning' : 'badge-danger'}`}>
                        {r.status}
                      </span>
                    </td>
                    <td style={{ padding: '8px', color: 'var(--text-secondary)', fontSize: '12px' }}>{r.error || (r.status === 'created' ? 'Password set to phone number' : 'Updated attributes & credentials')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <p style={{ marginTop: '12px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            Users receive their login credentials (phone number as default password) and are assigned to their academic department, branch, batch, and section.
          </p>
        </div>
      )}
    </div>
  );
}
