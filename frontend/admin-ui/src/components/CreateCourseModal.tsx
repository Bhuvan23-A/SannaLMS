'use client';
import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';

// Stage-2 offering flow: a course is an OFFERING — an instance of a Subject
// taught to a Section (cohort). The college admin picks the subject from the
// catalog and the section (class) it's taught to; the backend inherits the
// subject's code/credits and the section's branch/semester/year/session, then
// auto-enrolls the section's roster. Title/credits are optional overrides.
export default function CreateCourseModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const { role } = useRole();
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const [subjects, setSubjects] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [colleges, setColleges] = useState<any[]>([]);
  const [collegeId, setCollegeId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [title, setTitle] = useState('');
  const [credits, setCredits] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [subs, secs, brs, sess, collegeList] = await Promise.all([
          fetchApi('/api/v1/subjects').catch(() => []),
          fetchApi('/api/v1/sections').catch(() => []),
          fetchApi('/api/v1/branches').catch(() => []),
          fetchApi('/api/v1/academic-sessions').catch(() => []),
          fetchApi('/api/v1/colleges').catch(() => []),
        ]);
        setSubjects(Array.isArray(subs) ? subs : []);
        setSections(Array.isArray(secs) ? secs : []);
        setBranches(Array.isArray(brs) ? brs : []);
        setSessions(Array.isArray(sess) ? sess : []);
        const list = Array.isArray(collegeList) ? collegeList : [];
        setColleges(list);
        const active = list.filter((c: any) => c.status !== 'HELD');
        if (active.length === 1) setCollegeId(active[0].id);
      } catch { /* org data unavailable */ }
    })();
  }, []);

  const activeColleges = colleges.filter((c: any) => c.status !== 'HELD');
  const selectedCollege = activeColleges.find((c: any) => c.id === collegeId);
  const branchName = (id: string) => branches.find((b: any) => b.id === id)?.name || '—';
  const sessionName = (id: string) => sessions.find((s: any) => s.id === id)?.name || '—';

  const selectedSubject = subjects.find((s: any) => s.id === subjectId);
  const selectedSection = sections.find((s: any) => s.id === sectionId);
  // Super admins pick the college first so only that college's subjects and
  // sections appear (college admins are already tenant-scoped).
  const inCollege = (item: any) => !isSuperAdmin || !collegeId || !item.tenant_id || item.tenant_id === selectedCollege?.tenant_id;
  const visibleSubjects = subjects.filter((s: any) => inCollege(s));
  // Only show sections of the same program (branch) as the subject, when known.
  const visibleSections = sections.filter((s: any) =>
    inCollege(s) &&
    (!selectedSubject?.branch_id || s.branch_id === selectedSubject.branch_id)
  );
  const sectionLabel = (s: any) =>
    `${branchName(s.branch_id)} · ${sessionName(s.academic_session_id)} · Sem ${s.semester_number}${s.name ? ` · Sec ${s.name}` : ''}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId || !sectionId) {
      setError('Select a subject and a section');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await fetchApi('/api/v1/courses', {
        method: 'POST',
        body: JSON.stringify({
          subject_id: subjectId,
          section_id: sectionId,
          title: title.trim() || undefined,
          credits: credits ? Number(credits) : undefined,
          status: 'DRAFT',
          tenant_id: selectedCollege?.tenant_id,
          // Denormalized mirrors from the section (for filtering/display); the
          // backend also stores the structured section_id.
          branch_id: selectedSection?.branch_id,
          department_id: selectedSubject?.department_id,
          section: selectedSection?.name || undefined,
          academic_session: selectedSection ? sessionName(selectedSection.academic_session_id) : undefined,
          year_of_study: selectedSection?.year_of_study,
          semester_number: selectedSection?.semester_number,
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
        <h2 style={{ marginBottom: '6px' }}>Create Course (Offering)</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
          Pick the subject and the section (class) it is taught to. The roster is auto-enrolled.
        </p>

        {error && (
          <div style={{ padding: '10px', background: 'rgba(239,68,68,0.2)', color: 'var(--danger-color)', borderRadius: '8px', marginBottom: '15px', fontSize: '14px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {isSuperAdmin && (
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>College *</label>
              <select required className="input-field" value={collegeId} onChange={e => { setCollegeId(e.target.value); setSubjectId(''); setSectionId(''); }}>
                <option value="">Select college…</option>
                {activeColleges.length === 0 ? <option value="" disabled>No active colleges found</option>
                  : activeColleges.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Subject *</label>
            <select required className="input-field" value={subjectId} onChange={e => { setSubjectId(e.target.value); setSectionId(''); }}>
              <option value="">Select subject…</option>
              {visibleSubjects.length === 0 ? <option value="" disabled>No subjects yet — add them under Subjects first</option>
                : visibleSubjects.map((s: any) => <option key={s.id} value={s.id}>{s.code} — {s.name}{s.credits ? ` (${s.credits} cr)` : ''}</option>)}
            </select>
            {selectedSubject && (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '5px' }}>
                {selectedSubject.code} · {selectedSubject.name} · {selectedSubject.credits} credits
                {selectedSubject.branch_id ? ` · ${branchName(selectedSubject.branch_id)}` : ''}
              </div>
            )}
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Section (class) *</label>
            <select required className="input-field" value={sectionId} onChange={e => setSectionId(e.target.value)}>
              <option value="">Select section…</option>
              {sections.length === 0 ? <option value="" disabled>No sections yet — add them under Sections first</option>
                : visibleSections.length === 0 ? <option value="" disabled>No sections for this subject&apos;s branch</option>
                : visibleSections.map((s: any) => <option key={s.id} value={s.id}>{sectionLabel(s)}</option>)}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Title (override)</label>
              <input className="input-field" value={title} onChange={e => setTitle(e.target.value)}
                placeholder={selectedSubject ? `Defaults to "${selectedSubject.name}"` : "Optional"} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Credits (override)</label>
              <input type="number" min={1} max={12} className="input-field" value={credits} onChange={e => setCredits(e.target.value)}
                placeholder={selectedSubject ? `Defaults to ${selectedSubject.credits}` : "Optional"} />
            </div>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
            ℹ️ Department, branch, semester, year of study and academic session come from the selected section.
            You can assign trainers and add students after creation.
          </p>

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
