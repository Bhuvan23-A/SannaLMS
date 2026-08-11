'use client';
import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';

// Course creation is a college-admin action: the tenant is applied from their
// own account, and they pick the department → branch → semester + year the
// course is offered to (real-LMS org targeting).
//
// Stage-1 college-accurate fields: subject code + credits (subject identity)
// and section + academic session + year of study (cohort targeting). "Year" is
// the YEAR OF STUDY (1..4), not a calendar year — that mismatch confused admins.
export default function CreateCourseModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const { role } = useRole();
  const isSuperAdmin = role === 'SUPER_ADMIN';

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [credits, setCredits] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [departmentId, setDepartmentId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [semesterId, setSemesterId] = useState('');
  const [yearOfStudy, setYearOfStudy] = useState('');
  const [section, setSection] = useState('');
  const [academicSession, setAcademicSession] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [depts, brs, sems] = await Promise.all([
          fetchApi('/api/v1/departments').catch(() => []),
          fetchApi('/api/v1/branches').catch(() => []),
          fetchApi('/api/v1/semesters').catch(() => []),
        ]);
        setDepartments(Array.isArray(depts) ? depts : []);
        setBranches(Array.isArray(brs) ? brs : []);
        setSemesters(Array.isArray(sems) ? sems : []);
      } catch { /* org data unavailable */ }
    })();
  }, []);

  // Cascade: branch list depends on department, semester list on branch
  const visibleBranches = branches.filter((b: any) => !departmentId || b.department_id === departmentId);
  const visibleSemesters = semesters.filter((s: any) => !branchId || s.branch_id === branchId);
  // Year of study (1..6 covers 3/4-year UG + 2-year PG), NOT a calendar year.
  const studyYears = [1, 2, 3, 4, 5, 6];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await fetchApi('/api/v1/courses', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description,
          status: 'DRAFT',
          department_id: departmentId || undefined,
          branch_id: branchId || undefined,
          semester_id: semesterId || undefined,
          // Stage-1 college-accurate fields
          subject_code: subjectCode.trim() || undefined,
          credits: credits ? Number(credits) : undefined,
          section: section.trim() || undefined,
          academic_session: academicSession.trim() || undefined,
          year_of_study: yearOfStudy || undefined,
        }),
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
      zIndex: 1000,
      width: '100vw', height: '100vh'
    }}>
      <div className="glass-panel animate-fade-in" style={{ width: '500px', padding: '30px', maxHeight: '92vh', overflowY: 'auto' }}>
        <h2 style={{ marginBottom: '20px' }}>Create Course</h2>

        {error && (
          <div style={{ padding: '10px', background: 'rgba(239,68,68,0.2)', color: 'var(--danger-color)', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Course Title</label>
            <input
              required className="input-field" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Introduction to Databases"
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Description</label>
            <input
              required className="input-field" value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Learn about SQL and NoSQL"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Subject Code</label>
              <input
                className="input-field" value={subjectCode} onChange={e => setSubjectCode(e.target.value)}
                placeholder="e.g. CS201"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Credits</label>
              <input
                type="number" min={1} max={12} className="input-field" value={credits} onChange={e => setCredits(e.target.value)}
                placeholder="e.g. 4"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Department</label>
              <select className="input-field" value={departmentId} onChange={e => { setDepartmentId(e.target.value); setBranchId(''); setSemesterId(''); }}>
                <option value="">Select…</option>
                {departments.length === 0 ? <option value="" disabled>No departments yet</option>
                  : departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Branch</label>
              <select className="input-field" value={branchId} onChange={e => { setBranchId(e.target.value); setSemesterId(''); }}>
                <option value="">Select…</option>
                {visibleBranches.length === 0 ? <option value="" disabled>No branches yet</option>
                  : visibleBranches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Semester</label>
              <select className="input-field" value={semesterId} onChange={e => setSemesterId(e.target.value)}>
                <option value="">Select…</option>
                {visibleSemesters.length === 0 ? <option value="" disabled>No semesters yet</option>
                  : visibleSemesters.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Year of Study</label>
              <select className="input-field" value={yearOfStudy} onChange={e => setYearOfStudy(e.target.value)}>
                <option value="">Select…</option>
                {studyYears.map(y => <option key={y} value={String(y)}>{y === 1 ? '1 (First year)' : `${y}${y === 2 ? ' (Second)' : y === 3 ? ' (Third)' : y === 4 ? ' (Final)' : ''}`}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Section</label>
              <input
                className="input-field" value={section} onChange={e => setSection(e.target.value)}
                placeholder="e.g. A (optional)"
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Academic Session</label>
              <input
                className="input-field" value={academicSession} onChange={e => setAcademicSession(e.target.value)}
                placeholder="e.g. 2026-27 (optional)"
              />
            </div>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            ℹ️ <strong>Year of Study</strong> is which year the course is taught in (1 = first year), not a calendar year.
            Subject Code, Credits, Section and Academic Session make courses distinguishable across branches and batches.
          </p>

          {!isSuperAdmin && (
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              ℹ️ The course is created under your college. Add departments/branches/semesters under Management if the lists are empty.
            </p>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create Course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
