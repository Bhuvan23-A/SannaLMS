'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
import { Eye, EyeOff, Key, Phone, Layers, GraduationCap, Building2, CheckCircle2, AlertCircle, Download, Upload, FileSpreadsheet, Info, ShieldCheck, Check, AlertTriangle } from 'lucide-react';

const SAMPLE_CSV = `email,first_name,last_name,phone,role,department,branch,admission_batch,semester,section
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
  const [selectedBatch, setSelectedBatch] = useState(''); // Admission cohort e.g. 2024-2028
  const [selectedSession, setSelectedSession] = useState(''); // Running academic session e.g. 2026-2027
  const [selectedSem, setSelectedSem] = useState('');
  const [selectedSection, setSelectedSection] = useState('');

  // SEC-01 Security & Credentials settings
  const [passwordStrategy, setPasswordStrategy] = useState<'RANDOM_SECURE' | 'CUSTOM'>('RANDOM_SECURE');
  const [defaultPassword, setDefaultPassword] = useState('EduLMS@2026!');
  const [requirePasswordChange, setRequirePasswordChange] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
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

  // Strict cascading dropdowns (IMP-01)
  const currentCollege = colleges.find(c => c.id === collegeId);
  const collegeDepts = departments.filter(d => !collegeId || d.college_id === collegeId || d.tenant_id === currentCollege?.tenant_id);
  const filteredBranches = selectedDept ? branches.filter(b => b.department_id === selectedDept) : (collegeId ? branches.filter(b => b.college_id === collegeId || b.tenant_id === currentCollege?.tenant_id) : branches);
  const collegeSessions = sessions.filter(s => !collegeId || s.college_id === collegeId || s.tenant_id === currentCollege?.tenant_id);
  const filteredSections = selectedBranch ? sections.filter(s => s.branch_id === selectedBranch) : (selectedDept ? sections.filter(s => s.department_id === selectedDept) : sections);

  const handleCollegeChange = (newCollegeId: string) => {
    setCollegeId(newCollegeId);
    setSelectedDept('');
    setSelectedBranch('');
    setSelectedBatch('');
    setSelectedSession('');
    setSelectedSem('');
    setSelectedSection('');
  };

  const handleFile = (e: any) => {
    const f = e.target?.files?.[0];
    if (!f) return;
    setFileName(f.name);
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result || ''));
    reader.readAsText(f);
  };

  const downloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'edulateral_student_import_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  const parsedRows = parseCsv(csvText);

  // Pre-import dry-run validation (IMP-02)
  const validationSummary = (() => {
    if (parsedRows.length === 0) return null;
    const emailSet = new Set<string>();
    let duplicates = 0;
    let malformed = 0;
    let valid = 0;

    parsedRows.forEach(r => {
      const email = (r.email || '').toLowerCase().trim();
      if (!email || !email.includes('@') || !email.includes('.')) {
        malformed++;
      } else if (emailSet.has(email)) {
        duplicates++;
      } else {
        emailSet.add(email);
        valid++;
      }
    });

    return { total: parsedRows.length, valid, duplicates, malformed };
  })();

  const downloadErrorReport = () => {
    if (!result || !result.results) return;
    const failedRows = result.results.filter((r: any) => r.status === 'failed' || r.error);
    if (failedRows.length === 0) {
      alert('No failed rows to export.');
      return;
    }
    let csv = 'email,role,status,error_reason\n';
    failedRows.forEach((r: any) => {
      csv += `"${r.email || ''}","${r.role || ''}","${r.status || 'failed'}","${(r.error || '').replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'bulk_import_errors.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const runImport = async () => {
    setError('');
    setResult(null);
    if (!collegeId) { setError('Select a college first'); return; }
    if (parsedRows.length === 0) { setError('No valid rows found. Check the CSV format.'); return; }

    const deptObj = departments.find(d => d.id === selectedDept);
    const branchObj = branches.find(b => b.id === selectedBranch);
    const sessionObj = sessions.find(s => s.id === selectedSession);
    const sectionObj = sections.find(s => s.id === selectedSection);

    try {
      setImporting(true);
      const res = await fetchApi('/api/v1/users/bulk-import', {
        method: 'POST',
        body: JSON.stringify({
          users: parsedRows,
          default_password: passwordStrategy === 'CUSTOM' ? defaultPassword : undefined,
          require_password_change: requirePasswordChange,
          use_phone_as_password: false, // SEC-01: Disallow phone-derived passwords
          college_id: collegeId,
          department: deptObj?.name || selectedDept || undefined,
          branch: branchObj?.name || selectedBranch || undefined,
          batch: selectedBatch || undefined,
          academic_session: sessionObj?.name || selectedSession || undefined,
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>Bulk Import Users</h1>
        <button
          type="button"
          className="btn-secondary"
          onClick={downloadSampleCsv}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(14, 165, 233, 0.12)', border: '1px solid rgba(56, 189, 248, 0.35)', color: '#38bdf8', fontWeight: 600 }}
        >
          <Download size={14} /> Download Sample CSV Template (.csv)
        </button>
      </div>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
        Upload a CSV to batch provision students, faculty, and teaching assistants. Accounts receive secure Keycloak SSO credentials, and are placed into their college, department, branch, admission batch, and section.
      </p>

      <div className="panel" style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 600 }}>Target College / Institution *</label>
        <select className="input-field" style={{ maxWidth: '420px', marginBottom: '20px' }} value={collegeId} onChange={e => handleCollegeChange(e.target.value)}>
          {colleges.length === 0 && <option value="">No colleges available</option>}
          {colleges.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.subdomain})</option>)}
        </select>

        {/* Academic Placement Presets (IMP-01, IMP-03) */}
        <div style={{ background: 'rgba(14, 165, 233, 0.04)', border: '1px solid rgba(56, 189, 248, 0.2)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <Layers size={18} color="#38bdf8" />
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>Academic Placement Presets (Cascading Hierarchy)</h3>
            <span style={{ fontSize: '11px', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>Cascades by Tenant</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Set batch-wide defaults for rows that omit placement columns. Values cascade strictly by your selected college and department.
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
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>Admission Batch (Cohort)</label>
              <input
                type="text"
                className="input-field"
                style={{ width: '100%', fontSize: '13px' }}
                placeholder="e.g. 2024-2028"
                value={selectedBatch}
                onChange={e => setSelectedBatch(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>Academic Session (Current)</label>
              <select
                className="input-field"
                style={{ width: '100%', fontSize: '13px' }}
                value={selectedSession}
                onChange={e => setSelectedSession(e.target.value)}
              >
                <option value="">(Use CSV Column / None)</option>
                {collegeSessions.map(s => (
                  <option key={s.id} value={s.id}>{s.name} {s.is_current ? '(Current)' : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>Semester</label>
              <select
                className="input-field"
                style={{ width: '100%', fontSize: '13px' }}
                value={selectedSem}
                onChange={e => setSelectedSem(e.target.value)}
              >
                <option value="">(Use CSV Column / None)</option>
                <option value="1">Sem 1</option>
                <option value="2">Sem 2</option>
                <option value="3">Sem 3</option>
                <option value="4">Sem 4</option>
                <option value="5">Sem 5</option>
                <option value="6">Sem 6</option>
                <option value="7">Sem 7</option>
                <option value="8">Sem 8</option>
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

        {/* Security & Credential Provisioning Policy (SEC-01) */}
        <div style={{ background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <ShieldCheck size={18} color="#10b981" />
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0 }}>Credential Provisioning Policy (Security Standard)</h3>
            <span style={{ fontSize: '11px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>SEC-01 Compliant</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Phone numbers are <strong>never</strong> used as passwords. Users receive unique temporary credentials and must set their private password on first login.
          </p>

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="pwd_strategy"
                checked={passwordStrategy === 'RANDOM_SECURE'}
                onChange={() => setPasswordStrategy('RANDOM_SECURE')}
              />
              <span>Generate unique random temporary passwords</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input
                type="radio"
                name="pwd_strategy"
                checked={passwordStrategy === 'CUSTOM'}
                onChange={() => setPasswordStrategy('CUSTOM')}
              />
              <span>Set unified temporary password:</span>
            </label>

            {passwordStrategy === 'CUSTOM' && (
              <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  style={{ width: '180px', paddingRight: '36px', fontSize: '13px' }}
                  value={defaultPassword}
                  onChange={e => setDefaultPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '8px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            )}
          </div>

          <div style={{ marginTop: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: '#10b981', fontWeight: 500 }}>
              <input
                type="checkbox"
                checked={requirePasswordChange}
                onChange={e => setRequirePasswordChange(e.target.checked)}
              />
              <span>Enforce immediate password change on student first login (Keycloak UPDATE_PASSWORD)</span>
            </label>
          </div>
        </div>

        {/* CSV Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Upload size={14} /> Upload CSV File
          </button>
          <button type="button" className="btn-secondary" onClick={() => setCsvText(SAMPLE_CSV)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileSpreadsheet size={14} /> Load Sample CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleFile} />
        </div>
        {fileName && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>File: <strong>{fileName}</strong></p>}

        <label style={{ display: 'block', marginBottom: '5px', fontSize: '13px', color: 'var(--text-secondary)' }}>CSV contents</label>
        <textarea
          className="input-field"
          rows={7}
          style={{ fontFamily: 'monospace', fontSize: '13px' }}
          placeholder={'email,first_name,last_name,phone,role,department,branch,admission_batch,semester,section\nstudent.1@college.edu,Aarav,Sharma,9876543210,student,Computer Science,B.Tech CSE,2024-2028,3,A'}
          value={csvText}
          onChange={e => setCsvText(e.target.value)}
        />

        {/* Dry-run validation preview (IMP-02) */}
        {validationSummary && (
          <div style={{ marginTop: '16px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>CSV Pre-Import Verification:</span>
                <span className="badge badge-info">{validationSummary.total} Total Rows</span>
                <span className="badge badge-success">{validationSummary.valid} Valid</span>
                {validationSummary.duplicates > 0 && <span className="badge badge-warning">{validationSummary.duplicates} Duplicates</span>}
                {validationSummary.malformed > 0 && <span className="badge badge-danger">{validationSummary.malformed} Invalid</span>}
              </div>
            </div>

            <div style={{ overflowX: 'auto', maxHeight: '160px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '6px', textAlign: 'left' }}>#</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Email</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Name</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Role</th>
                    <th style={{ padding: '6px', textAlign: 'left' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {parsedRows.slice(0, 5).map((r, i) => {
                    const isBad = !r.email || !r.email.includes('@');
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <td style={{ padding: '6px' }}>{i + 1}</td>
                        <td style={{ padding: '6px', fontFamily: 'monospace' }}>{r.email}</td>
                        <td style={{ padding: '6px' }}>{r.first_name || ''} {r.last_name || ''}</td>
                        <td style={{ padding: '6px', textTransform: 'capitalize' }}>{r.role || 'student'}</td>
                        <td style={{ padding: '6px' }}>
                          <span style={{ color: isBad ? '#f87171' : '#10b981', fontWeight: 600 }}>
                            {isBad ? '⚠️ Invalid Email' : '✓ Ready'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {parsedRows.length > 5 && (
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                + {parsedRows.length - 5} more rows ready for import.
              </div>
            )}
          </div>
        )}

        <div style={{ marginTop: '20px', display: 'flex', gap: '14px', alignItems: 'center' }}>
          <button className="btn-primary" disabled={importing || parsedRows.length === 0} onClick={runImport} style={{ padding: '10px 22px', fontSize: '14px', fontWeight: 600 }}>
            {importing ? 'Processing Import...' : `Commit Import (${validationSummary?.valid || 0} Users)`}
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-panel" style={{ padding: '15px', color: 'var(--danger-color)', border: '1px solid var(--danger-color)', marginBottom: '20px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Results and Error Report Download (IMP-02) */}
      {result && (
        <div className="panel" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ margin: 0 }}>Import Completed</h3>
            <button
              type="button"
              className="btn-secondary"
              onClick={downloadErrorReport}
              style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Download size={13} /> Export Failure / Duplicate Log (.csv)
            </button>
          </div>

          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <span className="badge badge-info">Total Processed: {result.total}</span>
            <span className="badge badge-success">Created: {result.created}</span>
            {result.already_exists > 0 && <span className="badge badge-warning">Already existed: {result.already_exists}</span>}
            {result.failed > 0 && <span className="badge badge-danger">Failed: {result.failed}</span>}
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
                    <td style={{ padding: '8px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                      {r.error || (r.status === 'created' ? 'Secure temporary credential provisioned (Keycloak reset required)' : 'Existing record preserved')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
