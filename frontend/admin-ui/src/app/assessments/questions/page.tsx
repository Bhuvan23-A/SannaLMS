'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
import Link from 'next/link';

export default function QuestionsPage() {
  const { isAdmin, isTrainer, role } = useRole();
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Question bank differentiation (#fix): the bank is SUBJECT-FIRST — one bank
  // per Subject catalog row, reused by every offering/section of that subject.
  // Course, college, department, branch and semester refine the view.
  const [subjects, setSubjects] = useState<any[]>([]);
  const [subjectId, setSubjectId] = useState('');
  const [courses, setCourses] = useState<any[]>([]);
  const [courseId, setCourseId] = useState('');
  const [colleges, setColleges] = useState<any[]>([]);
  const [collegeId, setCollegeId] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [deptId, setDeptId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [semId, setSemId] = useState('');

  const [form, setForm] = useState({ type: 'MCQ', title: '', content: '', marks: 1, answer_key: '', image_url: '' });
  const [options, setOptions] = useState([
    { id: 1, text: '', isCorrect: false },
    { id: 2, text: '', isCorrect: false },
    { id: 3, text: '', isCorrect: false },
    { id: 4, text: '', isCorrect: false },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  // Question search & taxonomy filters (QB-02, QB-03)
  const [qSearch, setQSearch] = useState('');
  const [qDifficulty, setQDifficulty] = useState('ALL');
  const [qType, setQType] = useState('ALL');

  const downloadSampleTemplate = () => {
    const csvContent =
      "Question Text,Question Type,Difficulty Level,Subject / Topic,Marks,Option A,Option B,Option C,Option D,Correct Answer,Explanation\n" +
      "\"What is the average time complexity of QuickSort?\",MCQ,Medium,Algorithms,2,\"O(n)\",\"O(n log n)\",\"O(n^2)\",\"O(log n)\",\"Option B\",\"Partitioning around a pivot yields O(n log n) average time complexity.\"\n" +
      "\"Which HTTP method is idempotent and used for resource updates?\",MCQ,Easy,Web Technologies,1,\"POST\",\"PUT\",\"CONNECT\",\"PATCH\",\"Option B\",\"PUT replaces the resource entirely and is idempotent by HTTP specification.\"\n" +
      "\"Write a function to detect a cycle in a singly linked list in Python.\",CODING,Hard,Data Structures,5,\"\",\"\",\"\",\"\",\"def hasCycle(head): ...\",\"Floyd's Tortoise and Hare cycle detection algorithm in O(1) space.\"\n" +
      "\"Explain the ACID properties in database transaction management.\",ESSAY,Medium,Database Systems,5,\"\",\"\",\"\",\"\",\"Atomicity, Consistency, Isolation, Durability\",\"Detailed breakdown with an example transaction.\"\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'question_bank_sample_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportAllQuestions = () => {
    if (questions.length === 0) {
      alert('No questions available to export.');
      return;
    }
    let csv = 'Question,Type,Marks,Option A,Option B,Option C,Option D,Correct Option,Explanation\n';
    questions.forEach((qn: any) => {
      const title = `"${(qn.title || '').replace(/"/g, '""')}"`;
      const type = qn.type || 'MCQ';
      const marks = qn.marks || 1;
      let opts = ['', '', '', ''];
      let correct = qn.answer_key || '';
      if (Array.isArray(qn.options)) {
        qn.options.forEach((o: any, idx: number) => {
          if (idx < 4) opts[idx] = `"${(o.text || '').replace(/"/g, '""')}"`;
          if (o.isCorrect) correct = `Option ${String.fromCharCode(65 + idx)}`;
        });
      }
      const explanation = `"${(qn.content || '').replace(/"/g, '""')}"`;
      csv += `${title},${type},${marks},${opts[0]},${opts[1]},${opts[2]},${opts[3]},${correct},${explanation}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'question_bank_export.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importFromCsvOrExcel = async (e: any) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImporting(true);
    setImportMessage(null);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        throw new Error('File is empty or contains only headers.');
      }

      const tenantId = isSuperAdmin && selectedCollege?.tenant_id ? selectedCollege.tenant_id : undefined;
      let importedCount = 0;

      // Simple CSV line parser supporting quoted cells
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let cur = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"' || char === "'") {
            if (inQuotes && line[i + 1] === char) { cur += char; i++; }
            else inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(cur.trim());
            cur = '';
          } else {
            cur += char;
          }
        }
        result.push(cur.trim());
        return result;
      };

      const headerCols = parseCSVLine(lines[0]).map(h => h.toLowerCase());
      const hasDifficulty = headerCols.some(h => h.includes('diff'));
      const hasTopic = headerCols.some(h => h.includes('topic') || h.includes('subject'));

      // Skip header row
      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        if (!cols[0]) continue;

        let qTitle = cols[0];
        let qType = (cols[1] || 'MCQ').toUpperCase().includes('ESSAY') ? 'ESSAY' : (cols[1] || '').toUpperCase().includes('COD') ? 'CODING' : 'MCQ';
        let qDifficulty = 'Medium';
        let qTopic = '';
        let qMarks = 1;
        let optA = '', optB = '', optC = '', optD = '';
        let rawAns = '';
        let explanation = '';

        if (cols.length >= 10 && (hasDifficulty || hasTopic)) {
          qDifficulty = cols[2] || 'Medium';
          qTopic = cols[3] || '';
          qMarks = parseInt(cols[4], 10) || 1;
          optA = cols[5] || '';
          optB = cols[6] || '';
          optC = cols[7] || '';
          optD = cols[8] || '';
          rawAns = (cols[9] || '').toUpperCase();
          explanation = cols[10] || '';
        } else {
          qMarks = parseInt(cols[2], 10) || 1;
          optA = cols[3] || '';
          optB = cols[4] || '';
          optC = cols[5] || '';
          optD = cols[6] || '';
          rawAns = (cols[7] || '').toUpperCase();
          explanation = cols[8] || '';
        }

        let qOptions: any[] | undefined = undefined;
        let answerKey: string | null = null;

        if (qType === 'MCQ') {
          const optTexts = [optA, optB, optC, optD].filter(Boolean);
          if (optTexts.length > 0) {
            let correctIdx = 0;
            if (rawAns.includes('B') || rawAns === '2') correctIdx = 1;
            else if (rawAns.includes('C') || rawAns === '3') correctIdx = 2;
            else if (rawAns.includes('D') || rawAns === '4') correctIdx = 3;

            qOptions = optTexts.map((txt, idx) => ({
              id: idx + 1,
              text: txt,
              isCorrect: idx === correctIdx
            }));
            answerKey = String(correctIdx + 1);
          }
        } else if (rawAns) {
          answerKey = rawAns;
        }

        const payload: any = {
          title: qTitle,
          content: explanation ? `${qTitle}\n\nDifficulty: ${qDifficulty}${qTopic ? ` · Topic: ${qTopic}` : ''}\nExplanation: ${explanation}` : qTitle,
          type: qType,
          marks: qMarks,
          answer_key: answerKey,
          options: qOptions,
          subject_id: subjectId || null,
          course_id: courseId || 'c-1',
          department_id: deptId || null,
          branch_id: branchId || null,
          semester_id: semId || null,
        };
        if (tenantId) payload.tenant_id = tenantId;

        await fetchApi('/api/v1/questions', { method: 'POST', body: JSON.stringify(payload) });
        importedCount++;
      }

      setImportMessage({ ok: true, text: `Successfully imported ${importedCount} question(s) from spreadsheet!` });
      loadQuestions();
    } catch (err: any) {
      setImportMessage({ ok: false, text: err.message || 'Failed to import spreadsheet file.' });
    } finally {
      setImporting(false);
    }
  };

  // Load reference data once
  useEffect(() => {
    if (!isAdmin && !isTrainer) { setLoading(false); return; }
    (async () => {
      try {
        const [subjectsData, coursesData, collegesData, depts, brs, sems] = await Promise.all([
          fetchApi('/api/v1/subjects').catch(() => []),
          fetchApi('/api/v1/courses').catch(() => []),
          isSuperAdmin ? fetchApi('/api/v1/colleges').catch(() => []) : Promise.resolve([]),
          isAdmin ? fetchApi('/api/v1/departments').catch(() => []) : Promise.resolve([]),
          isAdmin ? fetchApi('/api/v1/branches').catch(() => []) : Promise.resolve([]),
          isAdmin ? fetchApi('/api/v1/semesters').catch(() => []) : Promise.resolve([]),
        ]);
        setSubjects(Array.isArray(subjectsData) ? subjectsData : []);
        setCourses(Array.isArray(coursesData) ? coursesData : []);
        // Only active colleges — held ones are suspended (#fix)
        const active = (Array.isArray(collegesData) ? collegesData : []).filter((c: any) => c.status !== 'HELD');
        setColleges(active);
        setDepartments(Array.isArray(depts) ? depts : []);
        setBranches(Array.isArray(brs) ? brs : []);
        setSemesters(Array.isArray(sems) ? sems : []);
        if (isSuperAdmin && active.length > 0) setCollegeId(active[0].id);
        setSubjectId('');
      } catch { /* reference data unavailable */ }
    })();
  }, [isAdmin, isTrainer, isSuperAdmin]);

  useEffect(() => {
    if (isAdmin || isTrainer) loadQuestions(); else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isTrainer, subjectId, courseId, collegeId, deptId, branchId, semId]);

  const selectedCollege = colleges.find((c: any) => c.id === collegeId);

  // Options scoped to the selected college (super admin) or the caller's tenant.
  // Branches/semesters must ALSO respect the college so a college admin never
  // sees another college's org chart in their bank (#fix).
  const inCollege = (item: any) => !isSuperAdmin || !selectedCollege || !item.tenant_id || item.tenant_id === selectedCollege.tenant_id;
  const visibleDepartments = departments.filter((d: any) => inCollege(d));
  const visibleBranches = branches.filter((b: any) => inCollege(b) && (!deptId || b.department_id === deptId));
  const visibleSemesters = semesters.filter((s: any) => inCollege(s) && (!branchId || s.branch_id === branchId));
  // Courses scoped to the selected college — same-named courses from different
  // colleges would otherwise be indistinguishable (#fix)
  const visibleCourses = courses.filter((c: any) => !isSuperAdmin || !selectedCollege || !c.tenant_id || c.tenant_id === selectedCollege.tenant_id);
  // Subjects scoped to the selected college (super admin) — a subject belongs
  // to a college's catalog, so same-named subjects from other colleges are hidden.
  const visibleSubjects = subjects.filter((s: any) => !isSuperAdmin || !selectedCollege || !s.tenant_id || s.tenant_id === selectedCollege.tenant_id);
  const collegeNameByTenant = (tid?: string) => colleges.find((c: any) => c.tenant_id === tid)?.name || '';
  const orgEmpty = visibleDepartments.length === 0;

  // Keep the selected subject inside the selected college if one is explicitly picked
  useEffect(() => {
    if (!subjectId) return;
    if (visibleSubjects.length > 0 && !visibleSubjects.some((s: any) => s.id === subjectId)) {
      setSubjectId('');
    }
  }, [visibleSubjects, subjectId]);

  const selectedSubject = visibleSubjects.find((s: any) => s.id === subjectId);

  const importFromPdf = async (e: any) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-uploading the same file
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    if (subjectId) formData.append('subject_id', subjectId);
    if (courseId) formData.append('course_id', courseId);
    if (isSuperAdmin && selectedCollege?.tenant_id) formData.append('tenant_id', selectedCollege.tenant_id);
    if (deptId) formData.append('department_id', deptId);
    if (branchId) formData.append('branch_id', branchId);
    if (semId) formData.append('semester_id', semId);
    setImporting(true);
    setImportMessage(null);
    try {
      const res = await fetchApi('/api/v1/questions/import-pdf', { method: 'POST', body: formData });
      setImportMessage({ ok: true, text: res.message || `Imported ${res.imported} question(s).` });
      loadQuestions();
    } catch (err: any) {
      setImportMessage({ ok: false, text: err.message || 'PDF import failed.' });
    } finally {
      setImporting(false);
    }
  };

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (subjectId) params.set('subject_id', subjectId);
      if (courseId) params.set('course_id', courseId);
      if (isSuperAdmin && selectedCollege?.tenant_id) params.set('tenant_id', selectedCollege.tenant_id);
      if (deptId) params.set('department_id', deptId);
      if (branchId) params.set('branch_id', branchId);
      if (semId) params.set('semester_id', semId);
      const qs = params.toString();
      const data = await fetchApi(`/api/v1/questions${qs ? `?${qs}` : ''}`);
      setQuestions(data || []);
    } catch { } finally { setLoading(false); }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ type: 'MCQ', title: '', content: '', marks: 1, answer_key: '', image_url: '' });
    setOptions([
      { id: 1, text: '', isCorrect: false },
      { id: 2, text: '', isCorrect: false },
      { id: 3, text: '', isCorrect: false },
      { id: 4, text: '', isCorrect: false },
    ]);
  };

  const startEdit = (q: any) => {
    const qOptions = Array.isArray(q.options) && q.options.length > 0 ? q.options : [
      { id: 1, text: '', isCorrect: false },
      { id: 2, text: '', isCorrect: false },
      { id: 3, text: '', isCorrect: false },
      { id: 4, text: '', isCorrect: false },
    ];
    setEditingId(q.id);
    setForm({ type: q.type || 'MCQ', title: q.title || '', content: q.content || '', marks: q.marks || 1, answer_key: q.answer_key || '', image_url: q.image_url || '' });
    setOptions(qOptions.map((o: any, i: number) => ({ id: i + 1, text: o.text || '', isCorrect: !!o.isCorrect })));
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (q: any) => {
    if (!window.confirm(`Delete question "${q.title}"? This cannot be undone.`)) return;
    try {
      await fetchApi(`/api/v1/questions/${q.id}`, { method: 'DELETE' });
      loadQuestions();
    } catch { alert('Failed to delete question'); }
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const url = editingId ? `/api/v1/questions/${editingId}` : '/api/v1/questions';
    try {
      const body: any = {
        ...form,
        options: form.type === 'MCQ' ? options : undefined
      };
      if (subjectId) body.subject_id = subjectId;
      if (courseId) body.course_id = courseId;
      if (isSuperAdmin && selectedCollege?.tenant_id) body.tenant_id = selectedCollege.tenant_id;
      if (deptId) body.department_id = deptId;
      if (branchId) body.branch_id = branchId;
      if (semId) body.semester_id = semId;
      await fetchApi(url, {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(body)
      });
      setShowForm(false);
      resetForm();
      loadQuestions();
    } catch { alert(editingId ? 'Failed to update question' : 'Failed to create question'); }
  };

  if (!isAdmin && !isTrainer) return (
    <div className="fade-in panel" style={{ textAlign: 'center', padding: '60px' }}>
      <div style={{ fontSize: '48px', marginBottom: '20px' }}></div>
      <h2>Access Restricted</h2>
      <p style={{ color: 'var(--text-secondary)' }}>Only Trainers and Admins can manage the Question Bank.</p>
    </div>
  );

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <Link href="/assessments" style={{ color: 'var(--primary-color)', textDecoration: 'none', fontSize: '13px', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            ← Back to Assessments
          </Link>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginTop: '6px', letterSpacing: '-0.5px' }}>Question Bank</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>
            Browse, filter, and author questions across colleges, departments, subjects, and semesters.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="btn-secondary" style={{ fontSize: '13px', background: 'rgba(56, 189, 248, 0.08)', borderColor: 'rgba(56, 189, 248, 0.3)' }} onClick={downloadSampleTemplate}>
            📥 Download Sample Template (CSV/Excel)
          </button>
          <input ref={csvFileInputRef} type="file" accept=".csv,text/csv,application/vnd.ms-excel,.xlsx" style={{ display: 'none' }} onChange={importFromCsvOrExcel} />
          <button type="button" className="btn-secondary" style={{ fontSize: '13px' }} disabled={importing} onClick={() => csvFileInputRef.current?.click()}>
            {importing ? 'Importing...' : 'Import Excel/CSV'}
          </button>
          <input ref={fileInputRef} type="file" accept="application/pdf,.pdf" style={{ display: 'none' }} onChange={importFromPdf} />
          <button type="button" className="btn-secondary" style={{ fontSize: '13px' }} disabled={importing} onClick={() => fileInputRef.current?.click()}>
            {importing ? 'Importing...' : 'Import PDF'}
          </button>
          <button type="button" className="btn-secondary" style={{ fontSize: '13px' }} onClick={exportAllQuestions}>
            Export Questions (CSV)
          </button>
          <button className="btn-primary" style={{ fontSize: '13px' }} onClick={() => setShowForm(!showForm)}>+ Add Question</button>
        </div>
      </div>

      {/* Structured Filter Grid Panel (ISSUE-04) */}
      <div style={{
        background: 'rgba(15, 23, 42, 0.75)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '12px',
        padding: '18px 20px',
        marginBottom: '24px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🔍</span> Filter & Hierarchy Scope
          </span>
          {(collegeId || subjectId || courseId || deptId || branchId || semId) && (
            <button
              type="button"
              onClick={() => { setSubjectId(''); setDeptId(''); setBranchId(''); setSemId(''); setCourseId(''); }}
              style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Reset Filters
            </button>
          )}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '14px',
          alignItems: 'start'
        }}>
          {isSuperAdmin && colleges.length > 0 && (
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                College
              </label>
              <select
                className="input-field"
                style={{ width: '100%', height: '38px', padding: '0 32px 0 12px', fontSize: '13px', background: 'rgba(10, 15, 30, 0.7)', border: '1px solid rgba(255, 255, 255, 0.18)', borderRadius: '8px', colorScheme: 'dark' }}
                value={collegeId}
                onChange={e => { setCollegeId(e.target.value); setSubjectId(''); setDeptId(''); setBranchId(''); setSemId(''); setCourseId(''); }}
              >
                {colleges.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {visibleSubjects.length > 0 && (
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                Subject
              </label>
              <select
                className="input-field"
                style={{ width: '100%', height: '38px', padding: '0 32px 0 12px', fontSize: '13px', background: 'rgba(10, 15, 30, 0.7)', border: '1px solid rgba(255, 255, 255, 0.18)', borderRadius: '8px', colorScheme: 'dark' }}
                value={subjectId}
                onChange={e => setSubjectId(e.target.value)}
              >
                <option value="">All Subjects</option>
                {visibleSubjects.map((s: any) => <option key={s.id} value={s.id}>{s.code ? `${s.code} · ` : ''}{s.name}</option>)}
              </select>
            </div>
          )}

          {visibleCourses.length > 0 && (
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                Course
              </label>
              <select
                className="input-field"
                style={{ width: '100%', height: '38px', padding: '0 32px 0 12px', fontSize: '13px', background: 'rgba(10, 15, 30, 0.7)', border: '1px solid rgba(255, 255, 255, 0.18)', borderRadius: '8px', colorScheme: 'dark' }}
                value={courseId}
                onChange={e => setCourseId(e.target.value)}
              >
                <option value="">All Offerings</option>
                {visibleCourses.map((c: any) => <option key={c.id} value={c.id}>{collegeNameByTenant(c.tenant_id) ? `${collegeNameByTenant(c.tenant_id)} · ${c.title}` : c.title}</option>)}
              </select>
            </div>
          )}

          {isAdmin && (
            <>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  Department
                </label>
                <select
                  className="input-field"
                  style={{ width: '100%', height: '38px', padding: '0 32px 0 12px', fontSize: '13px', background: 'rgba(10, 15, 30, 0.7)', border: '1px solid rgba(255, 255, 255, 0.18)', borderRadius: '8px', colorScheme: 'dark' }}
                  value={deptId}
                  onChange={e => { setDeptId(e.target.value); setBranchId(''); setSemId(''); }}
                >
                  <option value="">All Departments</option>
                  {visibleDepartments.length === 0 ? <option value="" disabled>No departments yet</option> : visibleDepartments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  Branch
                </label>
                <select
                  className="input-field"
                  style={{ width: '100%', height: '38px', padding: '0 32px 0 12px', fontSize: '13px', background: 'rgba(10, 15, 30, 0.7)', border: '1px solid rgba(255, 255, 255, 0.18)', borderRadius: '8px', colorScheme: 'dark' }}
                  value={branchId}
                  onChange={e => { setBranchId(e.target.value); setSemId(''); }}
                >
                  <option value="">All Branches</option>
                  {visibleBranches.length === 0 ? <option value="" disabled>No branches yet</option> : visibleBranches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                  Semester
                </label>
                <select
                  className="input-field"
                  style={{ width: '100%', height: '38px', padding: '0 32px 0 12px', fontSize: '13px', background: 'rgba(10, 15, 30, 0.7)', border: '1px solid rgba(255, 255, 255, 0.18)', borderRadius: '8px', colorScheme: 'dark' }}
                  value={semId}
                  onChange={e => setSemId(e.target.value)}
                >
                  <option value="">All Semesters</option>
                  {visibleSemesters.length === 0 ? <option value="" disabled>No semesters yet</option> : visibleSemesters.map((s: any) => {
                    const br = branches.find((b: any) => b.id === s.branch_id);
                    const brName = br?.name ? `${br.name} · ` : '';
                    const colName = isSuperAdmin ? `${collegeNameByTenant(s.tenant_id) ? `${collegeNameByTenant(s.tenant_id)} · ` : ''}` : '';
                    return <option key={s.id} value={s.id}>{colName}{brName}{s.name}</option>;
                  })}
                </select>
              </div>
            </>
          )}
        </div>

        {orgEmpty && isSuperAdmin && (
          <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.2)', fontSize: '12px', color: '#bae6fd' }}>
            ℹ️ No departments yet for this college — add them under Management → Departments / Branches / Semesters.
          </div>
        )}
      </div>

      {importMessage && (
        <div className="glass-panel" style={{
          padding: '14px 18px',
          marginBottom: '20px',
          color: importMessage.ok ? 'var(--success-color)' : 'var(--danger-color)',
          border: `1px solid ${importMessage.ok ? 'var(--success-color)' : 'var(--danger-color)'}`
        }}>
          {importMessage.text}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="panel" style={{ marginBottom: '30px' }}>
          <h3 style={{ marginBottom: '20px' }}>{editingId ? 'Edit Question' : 'New Question'}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Type</label>
              <select className="input-field" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                <option value="MCQ">MCQ</option>
                <option value="ESSAY">Essay</option>
                <option value="CODING">Coding</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '5px' }}>Marks</label>
              <input type="number" className="input-field" value={form.marks} onChange={e => setForm({ ...form, marks: parseInt(e.target.value) })} />
            </div>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Question Title</label>
            <input required className="input-field" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Content / Instructions</label>
            <textarea className="input-field" rows={3} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>Image URL (optional — diagram, chart or formula picture)</label>
            <input className="input-field" placeholder="https://... (paste a hosted image link)" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} />
            {form.image_url && (
              <div style={{ marginTop: '8px' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.image_url} alt="Question image preview" style={{ maxWidth: '260px', maxHeight: '160px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
              </div>
            )}
          </div>
          <div style={{ marginBottom: '15px', fontSize: '13px', color: 'var(--text-secondary)' }}>
            Will be saved under: <strong>{selectedSubject ? `${selectedSubject.code ? selectedSubject.code + ' · ' : ''}${selectedSubject.name}` : (courses.find((c: any) => c.id === courseId)?.title || 'subject')}</strong>
            {isSuperAdmin && selectedCollege && <> · <strong>{selectedCollege.name}</strong></>}
            {deptId && <> · Dept: <strong>{visibleDepartments.find((d: any) => d.id === deptId)?.name}</strong></>}
            {branchId && <> · Branch: <strong>{visibleBranches.find((b: any) => b.id === branchId)?.name}</strong></>}
            {semId && <> · Sem: <strong>{visibleSemesters.find((s: any) => s.id === semId)?.name}</strong></>}
          </div>
          {form.type === 'MCQ' && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '10px' }}>Options</label>
              {options.map((opt, i) => (
                <div key={opt.id} style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'center' }}>
                  <input type="radio" name="correct" checked={opt.isCorrect}
                    onChange={() => setOptions(options.map((o, j) => ({ ...o, isCorrect: j === i })))}
                    title="Mark as correct answer" />
                  <input className="input-field" style={{ flex: 1 }} placeholder={`Option ${i + 1}`}
                    value={opt.text} onChange={e => setOptions(options.map((o, j) => j === i ? { ...o, text: e.target.value } : o))} />
                </div>
              ))}
              <small style={{ color: 'var(--text-secondary)' }}>Select the radio button next to the correct answer.</small>
            </div>
          )}
          {(form.type === 'ESSAY' || form.type === 'CODING') && (
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px' }}>Answer Key / Expected Output</label>
              <textarea className="input-field" rows={3} value={form.answer_key} onChange={e => setForm({ ...form, answer_key: e.target.value })} />
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn-primary">{editingId ? 'Update Question' : 'Save Question'}</button>
            <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); resetForm(); }}>Cancel</button>
          </div>
        </form>
      )}

      {/* Search and Taxonomy Filter Bar (QB-02, QB-03) */}
      <div style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginBottom: '20px',
        background: 'rgba(255, 255, 255, 0.03)',
        padding: '12px 18px',
        borderRadius: '10px',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        <input
          type="text"
          placeholder="Search question text, topic, or answer..."
          value={qSearch}
          onChange={e => setQSearch(e.target.value)}
          className="input-field"
          style={{ minWidth: '260px', flex: 1 }}
        />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Type:</label>
          <select className="input-field" style={{ minWidth: '110px' }} value={qType} onChange={e => setQType(e.target.value)}>
            <option value="ALL">All Types</option>
            <option value="MCQ">MCQ</option>
            <option value="CODING">Coding</option>
            <option value="ESSAY">Essay</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Difficulty:</label>
          <select className="input-field" style={{ minWidth: '120px' }} value={qDifficulty} onChange={e => setQDifficulty(e.target.value)}>
            <option value="ALL">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
        {(qSearch || qType !== 'ALL' || qDifficulty !== 'ALL') && (
          <button
            type="button"
            className="btn-secondary"
            style={{ fontSize: '12px', padding: '6px 12px' }}
            onClick={() => { setQSearch(''); setQType('ALL'); setQDifficulty('ALL'); }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {(() => {
        const filteredQuestions = questions.filter(q => {
          if (qType !== 'ALL' && (q.type || 'MCQ').toUpperCase() !== qType.toUpperCase()) return false;
          if (qDifficulty !== 'ALL' && (q.difficulty || 'Medium').toLowerCase() !== qDifficulty.toLowerCase()) return false;
          if (qSearch.trim()) {
            const s = qSearch.toLowerCase().trim();
            const titleMatch = (q.title || '').toLowerCase().includes(s);
            const contentMatch = (q.content || '').toLowerCase().includes(s);
            const ansMatch = (q.answer_key || '').toLowerCase().includes(s);
            const topicMatch = (q.topic || '').toLowerCase().includes(s);
            if (!titleMatch && !contentMatch && !ansMatch && !topicMatch) return false;
          }
          return true;
        });

        return (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Showing <strong>{filteredQuestions.length}</strong> of <strong>{questions.length}</strong> question{questions.length === 1 ? '' : 's'}
              </span>
            </div>

            {loading ? <p>Loading questions...</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredQuestions.length === 0 ? (
                  <div className="panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    {questions.length === 0
                      ? 'No questions found for this selection. Try selecting "All Subjects" or add a question above.'
                      : 'No questions match the search filter.'}
                  </div>
                ) : (
                  filteredQuestions.map(q => (
                    <div className="panel" key={q.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <span className={`badge ${q.type === 'MCQ' ? 'badge-info' : q.type === 'CODING' ? 'badge-warning' : 'badge-success'}`}>{q.type}</span>
                            {q.difficulty && (
                              <span className="badge" style={{
                                background: q.difficulty === 'Easy' ? 'rgba(16,185,129,0.15)' : q.difficulty === 'Hard' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                                color: q.difficulty === 'Easy' ? '#10b981' : q.difficulty === 'Hard' ? '#f87171' : '#f59e0b',
                                border: '1px solid currentColor'
                              }}>
                                {q.difficulty}
                              </span>
                            )}
                            {q.topic && (
                              <span className="badge badge-secondary" style={{ background: 'rgba(56, 189, 248, 0.12)', color: '#38bdf8' }}>
                                {q.topic}
                              </span>
                            )}
                            {q.subject_id && subjects.find((s: any) => s.id === q.subject_id) && (
                              <span className="badge badge-info" style={{ background: 'rgba(0,200,255,0.12)', color: '#67d8ff' }}>
                                {subjects.find((s: any) => s.id === q.subject_id).code || ''} {subjects.find((s: any) => s.id === q.subject_id).name}
                              </span>
                            )}
                            <strong>{q.title}</strong>
                            <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>({q.marks} mark{q.marks > 1 ? 's' : ''})</span>
                            {(q.department_id || q.branch_id || q.semester_id) && (
                              <span className="badge badge-secondary" style={{ background: 'rgba(139,92,246,0.15)', color: '#c4b5fd' }}>scoped</span>
                            )}
                          </div>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{q.content}</p>
                          {q.image_url && (
                            <div style={{ marginTop: '8px' }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={q.image_url} alt="Question diagram" style={{ maxWidth: '300px', maxHeight: '200px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                            </div>
                          )}
                          {q.options && (
                            <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {(q.options as any[]).map((o: any) => (
                                <span key={o.id} style={{ padding: '4px 10px', borderRadius: '4px', fontSize: '13px', background: o.isCorrect ? 'rgba(0,200,100,0.2)' : 'rgba(255,255,255,0.05)', border: o.isCorrect ? '1px solid #00c864' : '1px solid rgba(255,255,255,0.1)', color: o.isCorrect ? '#00c864' : 'inherit' }}>
                                  {o.isCorrect ? ' ' : ''}{o.text}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                          <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '13px' }} onClick={() => startEdit(q)}>Edit</button>
                          <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '13px', color: 'var(--danger-color)', borderColor: 'var(--danger-color)' }} onClick={() => handleDelete(q)}>Delete</button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
