'use client';

import { useState, useEffect, useRef } from 'react';
import { fetchApi, downloadFile } from '@/lib/api';
import { useRole } from '@/hooks/useRole';
import { useUserDirectory } from '@/hooks/useUserDirectory';
import CollegeCoursePicker from '@/components/CollegeCoursePicker';
import { useColleges } from '@/hooks/useColleges';
import Link from 'next/link';
import {
  Plus,
  Pencil,
  Trash2,
  Upload,
  Download,
  FileSpreadsheet,
  Clock,
  Calendar,
  Users,
  CheckCircle2,
  AlertCircle,
  FileText,
  HelpCircle,
  X,
  Eye,
  Search,
  Check,
  ChevronRight
} from 'lucide-react';

export default function QuizzesPage() {
  const { isAdmin, isTrainer, role } = useRole();
  const { colleges, isSuperAdmin } = useColleges();
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [courseId, setCourseId] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const selectedCollege = colleges.find((c: any) => c.id === collegeId);
  const [showForm, setShowForm] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', duration_mins: 30, start_time: '', end_time: '', question_ids: [] as string[] });
  
  // Assign-to targeting
  const [assignType, setAssignType] = useState<'ALL' | 'INDIVIDUALS'>('ALL');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [enrolledStudents, setEnrolledStudents] = useState<any[]>([]);
  
  // Hierarchy & Batch filtering
  const [departments, setDepartments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [filterDept, setFilterDept] = useState('');
  const [filterBranch, setFilterBranch] = useState('');
  const [filterSem, setFilterSem] = useState('');
  const [filterSection, setFilterSection] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  
  // Submissions review
  const [submissionsQuizId, setSubmissionsQuizId] = useState<string | null>(null);
  const [submissionsData, setSubmissionsData] = useState<any[]>([]);
  const [submissionsQuestions, setSubmissionsQuestions] = useState<any[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [expandedSubId, setExpandedSubId] = useState<string | null>(null);
  
  // Manual grading
  const [quizGradeInputs, setQuizGradeInputs] = useState<Record<string, string>>({});
  const [quizFeedbackInputs, setQuizFeedbackInputs] = useState<Record<string, string>>({});
  const [gradingId, setGradingId] = useState<string | null>(null);
  
  // Inline quick-add question
  const [quickAdd, setQuickAdd] = useState(false);
  const [newQ, setNewQ] = useState({ title: '', content: '', marks: 1, answer_key: '', image_url: '' });
  const [newQOptions, setNewQOptions] = useState(['', '', '', '']);
  const [newQCorrect, setNewQCorrect] = useState(0);
  const [addingQ, setAddingQ] = useState(false);

  // Bulk question upload in quiz form
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingQuestions, setUploadingQuestions] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState<any>(null);

  const { users, nameOf, emailOf } = useUserDirectory();

  const downloadSampleCsv = () => {
    const csvContent = "Question,Type,Marks,Option A,Option B,Option C,Option D,Correct Option,Explanation\n" +
      "\"What is the time complexity of binary search?\",MCQ,2,\"O(n)\",\"O(log n)\",\"O(n^2)\",\"O(1)\",\"Option B\",\"Binary search divides the search space in half each step.\"\n" +
      "\"Explain the difference between Supervised and Unsupervised Learning.\",ESSAY,5,\"\",\"\",\"\",\"\",\"\",\"Supervised learning uses labeled datasets while unsupervised discovers hidden patterns.\"\n" +
      "\"Python lists are immutable.\",MCQ,1,\"True\",\"False\",\"\",\"\",\"Option B\",\"Python lists are mutable sequences.\"\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'quiz_questions_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadQuestionsCsv = async (e: any) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setUploadingQuestions(true);
    setUploadMessage(null);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map((l: string) => l.trim()).filter(Boolean);
      if (lines.length <= 1) {
        throw new Error('CSV file is empty or contains only headers.');
      }

      const tenantId = isSuperAdmin && selectedCollege?.tenant_id ? selectedCollege.tenant_id : undefined;
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

      const newQuestionIds: string[] = [];
      const newQuestionObjects: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = parseCSVLine(lines[i]);
        if (!cols[0]) continue;

        const qTitle = cols[0];
        const qType = (cols[1] || 'MCQ').toUpperCase().includes('ESSAY') ? 'ESSAY' : 'MCQ';
        const qMarks = parseInt(cols[2], 10) || 1;

        let qOptions: any[] | undefined = undefined;
        let answerKey: string | null = null;

        if (qType === 'MCQ') {
          const optTexts = [cols[3], cols[4], cols[5], cols[6]].filter(Boolean);
          if (optTexts.length > 0) {
            const rawAns = (cols[7] || '').toUpperCase();
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
        }

        const payload: any = {
          title: qTitle,
          content: cols[8] ? `${qTitle}\n\nExplanation: ${cols[8]}` : qTitle,
          type: qType,
          marks: qMarks,
          answer_key: answerKey,
          options: qOptions,
          course_id: courseId || 'c-1',
        };
        if (tenantId) payload.tenant_id = tenantId;

        const created = await fetchApi('/api/v1/questions', { method: 'POST', body: JSON.stringify(payload) });
        if (created?.id) {
          newQuestionIds.push(created.id);
          newQuestionObjects.push(created);
        }
      }

      setQuestions(prev => [...newQuestionObjects, ...prev]);
      setForm(prev => ({
        ...prev,
        question_ids: Array.from(new Set([...prev.question_ids, ...newQuestionIds]))
      }));

      setUploadMessage({ ok: true, text: `Uploaded and added ${newQuestionIds.length} question(s) directly to this assessment!` });
    } catch (err: any) {
      setUploadMessage({ ok: false, text: err.message || 'Failed to parse CSV file.' });
    } finally {
      setUploadingQuestions(false);
    }
  };

  const exportQuizQuestions = (q: any) => {
    const qList = (q.questions || []).map((x: any) => x.question).filter(Boolean);
    if (qList.length === 0) {
      alert('This quiz has no questions to export.');
      return;
    }
    let csv = 'Question,Type,Marks,Option A,Option B,Option C,Option D,Correct Option,Explanation\n';
    qList.forEach((qn: any) => {
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
    link.setAttribute('download', `quiz-${(q.title || 'quiz').replace(/[^a-z0-9]/gi, '_')}-questions.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    (async () => {
      try {
        const [cData, dData, bData, semData, secData] = await Promise.all([
          fetchApi('/api/v1/courses').catch(() => []),
          fetchApi('/api/v1/departments').catch(() => []),
          fetchApi('/api/v1/branches').catch(() => []),
          fetchApi('/api/v1/semesters').catch(() => []),
          fetchApi('/api/v1/sections').catch(() => [])
        ]);
        if (Array.isArray(cData)) setCourses(cData);
        if (Array.isArray(dData)) setDepartments(dData);
        if (Array.isArray(bData)) setBranches(bData);
        if (Array.isArray(semData)) setSemesters(semData);
        if (Array.isArray(secData)) setSections(secData);
      } catch { }
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (courseId || isSuperAdmin) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, collegeId, isSuperAdmin]);

  const loadData = async () => {
    try {
      const tenantQ = isSuperAdmin && selectedCollege?.tenant_id ? `&tenant_id=${selectedCollege.tenant_id}` : '';
      const selCourse = courses.find((c: any) => c.id === courseId);
      const subjectQ = selCourse?.subject?.id ? `&subject_id=${selCourse.subject.id}` : '';
      const [qData, qnData] = await Promise.all([
        fetchApi(`/api/v1/quizzes?course_id=${courseId}${tenantQ}`),
        (isAdmin || isTrainer) ? fetchApi(`/api/v1/questions?course_id=${courseId}${subjectQ}${tenantQ}`) : Promise.resolve([])
      ]);
      setQuizzes(qData || []);
      setQuestions(qnData || []);
    } catch { } finally { setLoading(false); }
  };

  const loadEnrolledStudents = async () => {
    try {
      const r = await fetchApi(`/api/v1/enrollments/course/${courseId}`);
      setEnrolledStudents(Array.isArray(r) ? r : []);
    } catch { setEnrolledStudents([]); }
  };

  const openCreateForm = async () => {
    setEditingQuizId(null);
    setForm({ title: '', description: '', duration_mins: 30, start_time: '', end_time: '', question_ids: [] });
    setAssignType('ALL');
    setSelectedStudents([]);
    setUploadMessage(null);
    setShowForm(true);
    loadEnrolledStudents();
  };

  const openEditModal = (q: any) => {
    setEditingQuizId(q.id);
    if (q.course_id) setCourseId(q.course_id);
    const qIds = (q.questions || []).map((x: any) => x.question_id || x.question?.id || x.id).filter(Boolean);
    
    // Format local datetime strings for datetime-local inputs
    const toLocalDatetime = (dStr?: string) => {
      if (!dStr) return '';
      try {
        const d = new Date(dStr);
        if (isNaN(d.getTime())) return '';
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      } catch { return ''; }
    };

    setForm({
      title: q.title || '',
      description: q.description || '',
      duration_mins: q.duration_mins || 30,
      start_time: toLocalDatetime(q.start_time),
      end_time: toLocalDatetime(q.end_time),
      question_ids: qIds,
    });

    if (q.assigned_to) {
      let parsed = q.assigned_to;
      if (typeof parsed === 'string') {
        try { parsed = JSON.parse(parsed); } catch { parsed = { type: 'ALL' }; }
      }
      if (parsed.type === 'INDIVIDUALS' && Array.isArray(parsed.user_ids)) {
        setAssignType('INDIVIDUALS');
        setSelectedStudents(parsed.user_ids);
      } else {
        setAssignType('ALL');
        setSelectedStudents([]);
      }
    } else {
      setAssignType('ALL');
      setSelectedStudents([]);
    }
    setUploadMessage(null);
    setShowForm(true);
    loadEnrolledStudents();
  };

  const saveQuiz = async (e: any) => {
    e.preventDefault();
    if (!editingQuizId && (!form.question_ids || form.question_ids.length === 0)) {
      alert('Please add or upload at least 1 question for the assessment before creating.');
      return;
    }
    try {
      const assigned_to = assignType === 'ALL'
        ? { type: 'ALL' }
        : { type: 'INDIVIDUALS', user_ids: selectedStudents };
      const body: any = { ...form, course_id: courseId, assigned_to };
      if (body.start_time) body.start_time = new Date(body.start_time).toISOString();
      else delete body.start_time;
      if (body.end_time) body.end_time = new Date(body.end_time).toISOString();
      else delete body.end_time;
      const selectedCollege = colleges.find((c: any) => c.id === collegeId);
      if (isSuperAdmin && selectedCollege?.tenant_id) body.tenant_id = selectedCollege.tenant_id;

      if (editingQuizId) {
        await fetchApi(`/api/v1/quizzes/${editingQuizId}`, { method: 'PUT', body: JSON.stringify(body) });
      } else {
        await fetchApi('/api/v1/quizzes', { method: 'POST', body: JSON.stringify(body) });
      }

      setShowForm(false);
      setEditingQuizId(null);
      setForm({ title: '', description: '', duration_mins: 30, start_time: '', end_time: '', question_ids: [] });
      setAssignType('ALL'); setSelectedStudents([]);
      loadData();
    } catch { alert(editingQuizId ? 'Failed to update quiz' : 'Failed to create quiz'); }
  };

  const toggleQuestion = (id: string) => {
    setForm(f => ({
      ...f,
      question_ids: f.question_ids.includes(id) ? f.question_ids.filter(q => q !== id) : [...f.question_ids, id]
    }));
  };

  const removeFromQuiz = (qid: string) => {
    setForm(f => ({ ...f, question_ids: f.question_ids.filter(x => x !== qid) }));
  };

  const addQuestionInline = async () => {
    if (addingQ) return;
    if (!newQ.title.trim()) { alert('Enter a question title'); return; }
    setAddingQ(true);
    try {
      const existing = questions.find((q: any) => q.title?.trim().toLowerCase() === newQ.title.trim().toLowerCase());
      if (existing) {
        setForm(f => ({ ...f, question_ids: f.question_ids.includes(existing.id) ? f.question_ids : [...f.question_ids, existing.id] }));
      } else {
        const options = newQOptions.map((text, i) => ({ id: i + 1, text, isCorrect: i === newQCorrect }));
        const res = await fetchApi('/api/v1/questions', {
          method: 'POST',
          body: JSON.stringify({
            course_id: courseId,
            type: 'MCQ',
            title: newQ.title,
            content: newQ.content || newQ.title,
            marks: newQ.marks,
            options,
            answer_key: String(newQCorrect + 1),
            image_url: newQ.image_url || undefined,
          })
        });
        const qid = res?.id;
        if (qid) {
          setForm(f => ({ ...f, question_ids: f.question_ids.includes(qid) ? f.question_ids : [...f.question_ids, qid] }));
          setQuestions(prev => [...prev, res]);
        }
      }
      setQuickAdd(false);
      setNewQ({ title: '', content: '', marks: 1, answer_key: '', image_url: '' });
      setNewQOptions(['', '', '', '']);
      setNewQCorrect(0);
    } catch { alert('Failed to create question'); } finally { setAddingQ(false); }
  };

  const deleteQuiz = async (quizId: string) => {
    if (!confirm('Delete this quiz? Its submissions will be removed too.')) return;
    try {
      await fetchApi(`/api/v1/quizzes/${quizId}`, { method: 'DELETE' });
      loadData();
    } catch { alert('Failed to delete quiz'); }
  };

  const loadSubmissions = async (quizId: string) => {
    if (submissionsQuizId === quizId) { setSubmissionsQuizId(null); setExpandedSubId(null); return; }
    setSubmissionsQuizId(quizId);
    setExpandedSubId(null);
    setSubmissionsLoading(true);
    try {
      const d = await fetchApi(`/api/v1/quizzes/${quizId}/submissions`);
      const subs = Array.isArray(d?.submissions) ? d.submissions : Array.isArray(d) ? d : [];
      setSubmissionsData(subs);
      setSubmissionsQuestions(Array.isArray(d?.questions) ? d.questions : []);
      
      const gInputs: Record<string, string> = {};
      const fInputs: Record<string, string> = {};
      subs.forEach((s: any) => {
        if (s.score !== null && s.score !== undefined) gInputs[s.id] = String(s.score);
        if (s.feedback) fInputs[s.id] = s.feedback;
      });
      setQuizGradeInputs(gInputs);
      setQuizFeedbackInputs(fInputs);
    } catch { setSubmissionsData([]); setSubmissionsQuestions([]); } finally { setSubmissionsLoading(false); }
  };

  const gradeQuizSubmission = async (submissionId: string, maxMarks: number) => {
    const scoreVal = quizGradeInputs[submissionId];
    const score = parseFloat(scoreVal);
    if (isNaN(score) || score < 0) { alert('Enter a valid score'); return; }
    if (score > maxMarks) { alert(`Score cannot exceed ${maxMarks}`); return; }
    setGradingId(submissionId);
    try {
      await fetchApi(`/api/v1/quizzes/submissions/${submissionId}/grade`, {
        method: 'PUT',
        body: JSON.stringify({ score, feedback: quizFeedbackInputs[submissionId] || '' })
      });
      alert('Grade saved successfully');
      loadSubmissions(submissionsQuizId || '');
    } catch (err: any) { alert(err.message || 'Failed to grade'); } finally { setGradingId(null); }
  };

  const exportQuizScoreReport = (quizItem: any) => {
    const courseTitle = courses.find((c: any) => c.id === quizItem.course_id)?.title || 'Course';
    const totalMarks = submissionsQuestions.reduce((s: number, qq: any) => s + (qq.marks || 0), 0);
    const now = new Date();
    const downloadDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const downloadTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const assessmentDate = quizItem.start_time
      ? new Date(quizItem.start_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : downloadDate;
    const durationMins = quizItem.duration_mins || 30;

    let startTimeStr = '02:30 PM';
    let endTimeStr = '02:50 PM';
    if (quizItem.start_time) {
      startTimeStr = new Date(quizItem.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      endTimeStr = quizItem.end_time
        ? new Date(quizItem.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
        : startTimeStr;
    }

    const reportTitle = `${courseTitle}_${quizItem.title}`.replace(/[\s/\\:]+/g, '_');
    const headerBlock = 
`Edulateral Foundation
User Score Report of : ${reportTitle}
Assessment Date : ${assessmentDate}
Assessment Time : ${startTimeStr} - ${endTimeStr} (${durationMins} Minutes)
Downloaded On : ${downloadDate} ${downloadTime}

Sl.no,Candidate ID,Candidate Name,Candidate Email,Group,Unique ID,Assessment Status,Malpractice Logs,Marks Obtained
`;

    const rows = (submissionsData || []).map((sub: any, idx: number) => {
      const slNo = idx + 1;
      const user = users.find((u: any) => u.id === sub.user_id);
      const candEmail = emailOf(sub.user_id) || sub.user_id;
      const candId = candEmail.split('@')[0] || sub.user_id.slice(0, 8);
      const candName = nameOf(sub.user_id) || 'Student';
      const group = user?.branch || user?.department || sub.tenant_id || 'Batch 1';
      const uniqueId = sub.user_id;
      const status = sub.is_graded ? 'Graded' : 'Submitted';
      const malpractice = (sub.violation_count && sub.violation_count > 0) ? `${sub.violation_count} Violations` : '0 Violations';
      const marks = `${sub.score ?? 0} / ${totalMarks}`;
      return `${slNo},"${candId}","${candName}","${candEmail}","${group}","${uniqueId}","${status}","${malpractice}","${marks}"`;
    }).join('\n');

    const csvContent = '\uFEFF' + headerBlock + rows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `User_Score_Report_${reportTitle}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleStudent = (uid: string) => {
    setSelectedStudents(prev => prev.includes(uid) ? prev.filter(x => x !== uid) : [...prev, uid]);
  };

  const submitQuiz = async () => {
    if (!activeQuiz) return;
    try {
      const res = await fetchApi(`/api/v1/quizzes/${activeQuiz.id}/submit`, {
        method: 'POST',
        body: JSON.stringify({ answers })
      });
      setSubmitted(res);
      setActiveQuiz(null);
    } catch { alert('Failed to submit quiz'); }
  };

  if (loading) return <div className="animate-fade-in" style={{ padding: '20px' }}>Loading...</div>;

  if (activeQuiz) {
    const quizQs = activeQuiz.questions || [];
    return (
      <div className="animate-fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>{activeQuiz.title}</h1>
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="btn-secondary" onClick={() => setActiveQuiz(null)}>Cancel</button>
            <button className="btn-primary" onClick={submitQuiz}>Submit Quiz</button>
          </div>
        </div>
        {quizQs.length === 0 ? (
          <div className="panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            This quiz has no questions yet.
          </div>
        ) : quizQs.map((qq: any, i: number) => {
          const q = qq.question;
          return (
            <div className="panel" key={qq.question_id} style={{ marginBottom: '16px' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '10px' }}>Q{i + 1}: {q?.title}</p>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '15px', fontSize: '14px' }}>{q?.content}</p>
              {q?.image_url && (
                <div style={{ marginBottom: '15px' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={q.image_url} alt="Question diagram" style={{ maxWidth: '100%', maxHeight: '260px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)' }} />
                </div>
              )}
              {q?.type === 'MCQ' && q?.options && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(q.options as any[]).map((opt: any) => (
                    <label key={opt.id} style={{ display: 'flex', gap: '10px', cursor: 'pointer', padding: '10px', background: answers[qq.question_id] === opt.id ? 'rgba(99,102,241,0.15)' : 'rgba(0,0,0,0.2)', borderRadius: '8px', border: answers[qq.question_id] === opt.id ? '1px solid var(--accent-color)' : '1px solid transparent' }}>
                      <input type="radio" name={qq.question_id} value={opt.id}
                        checked={answers[qq.question_id] === opt.id}
                        onChange={() => setAnswers({ ...answers, [qq.question_id]: opt.id })} />
                      {opt.text}
                    </label>
                  ))}
                </div>
              )}
              {(q?.type === 'ESSAY' || q?.type === 'CODING') && (
                <textarea className="input-field" rows={5} placeholder={q.type === 'CODING' ? 'Write your code here...' : 'Write your essay answer...'}
                  value={answers[qq.question_id] || ''}
                  onChange={e => setAnswers({ ...answers, [qq.question_id]: e.target.value })} />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="animate-fade-in">
        <div className="panel" style={{ textAlign: 'center', padding: '60px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <CheckCircle2 size={56} color="#10b981" />
          </div>
          <h2 style={{ fontSize: '28px', marginBottom: '15px' }}>Quiz Submitted!</h2>
          {submitted.score !== null && submitted.score !== undefined ? (
            <p style={{ fontSize: '20px', color: 'var(--accent-color)' }}>Your Score: <strong>{submitted.score}</strong></p>
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>Your answers have been submitted. They will be manually reviewed by your trainer.</p>
          )}
          <button className="btn-primary" style={{ marginTop: '30px' }} onClick={() => { setSubmitted(null); loadData(); }}>Back to Quizzes</button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <Link href="/assessments" style={{ color: 'var(--accent-color)', textDecoration: 'none', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
            ← Back to Assessments Overview
          </Link>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em' }}>Quizzes & Online Tests</h1>
          <div style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <CollegeCoursePicker courses={courses} courseId={courseId} onCourseChange={setCourseId} collegeId={collegeId} onCollegeChange={setCollegeId} />
          </div>
        </div>
        {(isAdmin || isTrainer) && (
          <button className="btn-primary" onClick={openCreateForm} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={15} /> Create Assessment
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={saveQuiz} className="panel" style={{ marginBottom: '30px', background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(99,102,241,0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {editingQuizId ? <Pencil size={18} color="var(--accent-color)" /> : <Plus size={18} color="var(--accent-color)" />}
              {editingQuizId ? 'Edit Assessment Schedule & Details' : 'Create New Assessment / Quiz'}
            </h3>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px', marginBottom: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Assessment Title *</label>
              <input required className="input-field" placeholder="e.g. Mid-Term Data Structures Examination" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Duration (Minutes) *</label>
              <input type="number" className="input-field" value={form.duration_mins} onChange={e => setForm({ ...form, duration_mins: parseInt(e.target.value) || 30 })} />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Description & Guidelines</label>
            <textarea className="input-field" rows={2} placeholder="Instructions for students regarding questions, timing, and rules..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          {/* Date & Time Scheduling */}
          <div style={{ padding: '16px', borderRadius: '8px', background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.15)', marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-color)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Clock size={15} /> Assessment Schedule (Date & Time Window)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 600 }}>Start Date & Time (Opens)</label>
                <input type="datetime-local" className="input-field" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>Assessment opens automatically at this timestamp</span>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 600 }}>End Date & Time (Deadline / Closes)</label>
                <input type="datetime-local" className="input-field" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>Submissions are closed after this timestamp</span>
              </div>
            </div>
          </div>

          {/* Batch / Student Targeting */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 700 }}>Assign Assessment To</label>
            <div style={{ display: 'flex', gap: '20px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
                <input type="radio" name="assign-to" checked={assignType === 'ALL'} onChange={() => setAssignType('ALL')} />
                All Enrolled Students in Course
              </label>
              <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontSize: '13px' }}>
                <input type="radio" name="assign-to" checked={assignType === 'INDIVIDUALS'} onChange={() => setAssignType('INDIVIDUALS')} />
                Specific Batch / Semester / Students ({selectedStudents.length} selected)
              </label>
            </div>
            {assignType === 'INDIVIDUALS' && (() => {
              const currentTenant = isSuperAdmin && selectedCollege?.tenant_id ? selectedCollege.tenant_id : undefined;
              const allStudents = users.filter((u: any) => {
                const isStud = String(u.role || '').toUpperCase() === 'STUDENT';
                if (!isStud) return false;
                if (currentTenant && u.tenant_id && u.tenant_id !== currentTenant) return false;
                return true;
              });
              const pool = allStudents.length > 0 ? allStudents : enrolledStudents.map((e: any) => ({ id: e.user_id, ...e }));

              const filtered = pool.filter((st: any) => {
                const uid = st.id || st.user_id;
                const userObj = users.find((u: any) => u.id === uid) || st;
                if (filterDept && userObj.department_id && userObj.department_id !== filterDept) return false;
                if (filterBranch && userObj.branch_id && userObj.branch_id !== filterBranch) return false;
                if (filterSem && String(userObj.semester_number || userObj.semester_id) !== String(filterSem)) return false;
                if (filterSection && userObj.section_id && userObj.section_id !== filterSection) return false;
                if (studentSearch) {
                  const q = studentSearch.toLowerCase();
                  const name = `${userObj.first_name || ''} ${userObj.last_name || ''}`.toLowerCase();
                  const email = (userObj.email || '').toLowerCase();
                  if (!name.includes(q) && !email.includes(q)) return false;
                }
                return true;
              });

              const selectAllFiltered = () => {
                const idsToAdd = filtered.map((s: any) => s.id || s.user_id).filter(Boolean);
                setSelectedStudents(prev => Array.from(new Set([...prev, ...idsToAdd])));
              };

              const clearFiltered = () => {
                const idsToRemove = new Set(filtered.map((s: any) => s.id || s.user_id));
                setSelectedStudents(prev => prev.filter(id => !idsToRemove.has(id)));
              };

              return (
                <div style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '14px', marginBottom: '10px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Department</label>
                      <select className="input-field" style={{ padding: '6px 8px', fontSize: '12px' }} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                        <option value="">All Departments</option>
                        {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Branch</label>
                      <select className="input-field" style={{ padding: '6px 8px', fontSize: '12px' }} value={filterBranch} onChange={e => setFilterBranch(e.target.value)}>
                        <option value="">All Branches</option>
                        {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Semester / Batch</label>
                      <select className="input-field" style={{ padding: '6px 8px', fontSize: '12px' }} value={filterSem} onChange={e => setFilterSem(e.target.value)}>
                        <option value="">All Semesters</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={String(n)}>Semester {n}</option>)}
                        {semesters.map((s: any) => <option key={s.id} value={s.id}>{s.name || `Semester ${s.number}`}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Section</label>
                      <select className="input-field" style={{ padding: '6px 8px', fontSize: '12px' }} value={filterSection} onChange={e => setFilterSection(e.target.value)}>
                        <option value="">All Sections</option>
                        {sections.map((sec: any) => <option key={sec.id} value={sec.id}>{sec.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Search Student</label>
                      <input className="input-field" style={{ padding: '6px 8px', fontSize: '12px' }} placeholder="Search name/email..." value={studentSearch} onChange={e => setStudentSearch(e.target.value)} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ fontSize: '12px' }}>
                      Matching Students: <strong>{filtered.length}</strong> · <span style={{ color: 'var(--accent-color)' }}><strong>{selectedStudents.length}</strong> assigned</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" className="btn-secondary" style={{ padding: '3px 10px', fontSize: '11px' }} onClick={selectAllFiltered}>
                        Select All Filtered ({filtered.length})
                      </button>
                      <button type="button" className="btn-secondary" style={{ padding: '3px 10px', fontSize: '11px', color: 'var(--danger-color)' }} onClick={clearFiltered}>
                        Deselect Filtered
                      </button>
                    </div>
                  </div>

                  <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', padding: '6px' }}>
                    {filtered.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'center', padding: '12px' }}>No students match the selected filters.</p>
                    ) : filtered.map((st: any) => {
                      const uid = st.id || st.user_id;
                      const userObj = users.find((u: any) => u.id === uid) || st;
                      const deptName = departments.find((d: any) => d.id === userObj.department_id)?.name;
                      const semNumber = userObj.semester_number || semesters.find((s: any) => s.id === userObj.semester_id)?.number;
                      return (
                        <label key={uid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', borderRadius: '4px', cursor: 'pointer', background: selectedStudents.includes(uid) ? 'rgba(99,102,241,0.12)' : 'transparent', marginBottom: '2px' }}>
                          <span style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '12px' }}>
                            <input type="checkbox" checked={selectedStudents.includes(uid)} onChange={() => toggleStudent(uid)} />
                            <strong>{nameOf(uid)}</strong>
                            {emailOf(uid) && <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>({emailOf(uid)})</span>}
                          </span>
                          <span style={{ display: 'flex', gap: '6px', fontSize: '10px' }}>
                            {deptName && <span className="badge badge-secondary">{deptName}</span>}
                            {semNumber && <span className="badge badge-info">Sem {semNumber}</span>}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Question Attachment & Direct Upload Section */}
          <div style={{ marginBottom: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 700 }}>Assessment Questions ({form.question_ids.length} Selected)</label>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Add from bank, create inline, or upload bulk questions via CSV spreadsheet</span>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <input
                  type="file"
                  ref={csvFileInputRef}
                  accept=".csv,.txt"
                  style={{ display: 'none' }}
                  onChange={handleUploadQuestionsCsv}
                />
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px', borderColor: '#10b981', color: '#10b981' }}
                  onClick={() => csvFileInputRef.current?.click()}
                  disabled={uploadingQuestions}
                >
                  <Upload size={13} /> {uploadingQuestions ? 'Uploading Questions...' : 'Upload Questions (CSV)'}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                  onClick={downloadSampleCsv}
                  title="Download sample CSV template"
                >
                  <Download size={13} /> Template
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => setQuickAdd(!quickAdd)}
                >
                  <Plus size={13} /> {quickAdd ? 'Cancel' : 'Quick Add MCQ'}
                </button>
              </div>
            </div>

            {uploadMessage && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                marginBottom: '14px',
                fontSize: '12px',
                background: uploadMessage.ok ? 'rgba(16,185,129,0.12)' : 'rgba(244,63,94,0.12)',
                border: uploadMessage.ok ? '1px solid rgba(16,185,129,0.25)' : '1px solid rgba(244,63,94,0.25)',
                color: uploadMessage.ok ? '#10b981' : '#f43f5e',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {uploadMessage.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                {uploadMessage.text}
              </div>
            )}

            {quickAdd && (
              <div className="panel" style={{ padding: '16px', marginBottom: '16px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
                <h4 style={{ marginBottom: '12px', fontSize: '13px', fontWeight: 700, color: 'var(--accent-color)' }}>Quick Add Multiple Choice Question</h4>
                <input required className="input-field" placeholder="Question title / prompt *" style={{ marginBottom: '8px' }}
                  value={newQ.title} onChange={e => setNewQ({ ...newQ, title: e.target.value })} />
                <input className="input-field" placeholder="Explanation or detailed instructions (optional)" style={{ marginBottom: '8px' }}
                  value={newQ.content} onChange={e => setNewQ({ ...newQ, content: e.target.value })} />
                <input className="input-field" placeholder="Image / Diagram URL (optional)" style={{ marginBottom: '8px' }}
                  value={newQ.image_url} onChange={e => setNewQ({ ...newQ, image_url: e.target.value })} />
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Options (Select the radio button for the correct answer):</div>
                {newQOptions.map((opt, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                    <input type="radio" name="newq-correct" checked={newQCorrect === i}
                      onChange={() => setNewQCorrect(i)} title="Mark as correct answer" />
                    <input className="input-field" placeholder={`Option ${String.fromCharCode(65 + i)}`} value={opt}
                      onChange={e => setNewQOptions(newQOptions.map((o, j) => j === i ? e.target.value : o))} />
                  </div>
                ))}
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                  <button type="button" className="btn-primary" style={{ fontSize: '12px', padding: '6px 14px' }} disabled={addingQ} onClick={addQuestionInline}>
                    {addingQ ? 'Adding...' : 'Add to Quiz'}
                  </button>
                  <button type="button" className="btn-secondary" style={{ fontSize: '12px', padding: '6px 12px' }} onClick={() => setQuickAdd(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Selected Questions Summary / Reorder list */}
            {form.question_ids.length > 0 && (
              <div style={{ marginBottom: '14px', background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent-color)', marginBottom: '8px' }}>
                  Selected Questions for this Assessment ({form.question_ids.length}):
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
                  {form.question_ids.map((qid, idx) => {
                    const q = questions.find((x: any) => x.id === qid);
                    return (
                      <div key={qid} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', padding: '6px 10px', background: 'rgba(99,102,241,0.12)', borderRadius: '6px', fontSize: '12px' }}>
                        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <strong>Q{idx + 1}: {q?.title || qid}</strong>
                          {q && <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>({q.marks}M · {q.type})</span>}
                        </span>
                        <button type="button" className="btn-secondary" style={{ padding: '2px 8px', fontSize: '11px', color: 'var(--danger-color)', borderColor: 'var(--danger-color)', flexShrink: 0 }} onClick={() => removeFromQuiz(qid)}>
                          Remove
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Question Bank Checkbox Picker */}
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px', background: 'rgba(0,0,0,0.2)' }}>
              {questions.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'center', padding: '16px' }}>
                  No questions in question bank. Use "Upload Questions (CSV)" or "Quick Add MCQ" above.
                </p>
              ) : questions.map(q => (
                <label key={q.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', padding: '8px 10px', marginBottom: '4px', background: form.question_ids.includes(q.id) ? 'rgba(99,102,241,0.15)' : 'transparent', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.15s ease' }}>
                  <input type="checkbox" checked={form.question_ids.includes(q.id)} onChange={() => toggleQuestion(q.id)} />
                  <span style={{ fontSize: '13px', minWidth: 0 }}>
                    <strong>{q.title}</strong>{' '}
                    <span className={`badge ${q.type === 'MCQ' ? 'badge-info' : 'badge-warning'}`}>{q.type}</span>{' '}
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>({q.marks} Marks)</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
            <button type="submit" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={14} /> {editingQuizId ? 'Save & Update Assessment' : 'Publish Assessment'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => { setShowForm(false); setEditingQuizId(null); }}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Quizzes List Cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {quizzes.length === 0 ? (
          <div className="panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            No quizzes or assessments created for this course yet. Click "+ Create Assessment" above to add one.
          </div>
        ) : quizzes.map(q => (
          <div className="panel" key={q.id} style={{ background: 'rgba(15,23,42,0.75)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
              <div style={{ flex: 1, minWidth: '280px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 6px 0', color: '#ffffff' }}>{q.title}</h3>
                {q.description && <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '0 0 10px 0' }}>{q.description}</p>}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <span className="badge badge-info">{q.questions?.length || 0} Questions</span>
                  {q.duration_mins && (
                    <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={11} /> {q.duration_mins} mins
                    </span>
                  )}
                  {q.start_time && (
                    <span className="badge badge-warning" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={11} /> Opens: {new Date(q.start_time).toLocaleString()}
                    </span>
                  )}
                  {q.end_time && (
                    <span className="badge" style={{ background: 'rgba(244,63,94,0.12)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.25)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={11} /> Deadline: {new Date(q.end_time).toLocaleString()}
                    </span>
                  )}
                  {q.assigned_to && <span className="badge badge-secondary">Targeted Cohort</span>}
                </div>
              </div>

              {/* Action Buttons with Prominent Edit */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {(isAdmin || isTrainer) && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px', borderColor: 'var(--accent-color)', color: 'var(--accent-color)' }}
                    onClick={() => openEditModal(q)}
                    title="Edit assessment schedule, duration, timing, and questions"
                  >
                    <Pencil size={13} /> Edit Schedule & Questions
                  </button>
                )}
                {(isAdmin || isTrainer) && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                    onClick={() => exportQuizQuestions(q)}
                  >
                    <FileSpreadsheet size={13} /> Export CSV
                  </button>
                )}
                {(isAdmin || isTrainer) && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}
                    onClick={() => loadSubmissions(q.id)}
                  >
                    <Eye size={13} /> {submissionsQuizId === q.id ? 'Hide Submissions' : 'Submissions'}
                  </button>
                )}
                {(isAdmin || isTrainer) && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '12px', color: 'var(--danger-color)', borderColor: 'rgba(244,63,94,0.3)', display: 'flex', alignItems: 'center', gap: '5px' }}
                    onClick={() => deleteQuiz(q.id)}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                )}
                {role === 'STUDENT' && (
                  <button className="btn-primary" onClick={() => { setActiveQuiz(q); setAnswers({}); }}>
                    Take Quiz
                  </button>
                )}
              </div>
            </div>

            {/* Submissions Drawer */}
            {submissionsQuizId === q.id && (
              <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>Student Submissions & Scores</h4>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ fontSize: '11px', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
                    onClick={() => exportQuizScoreReport(q)}
                  >
                    <Download size={12} /> Export Submissions (Excel / CSV)
                  </button>
                </div>
                {submissionsLoading ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Loading submissions...</p>
                ) : submissionsData.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>No submissions received yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {submissionsData.map((sub: any) => {
                      const totalMarks = submissionsQuestions.reduce((s: number, qq: any) => s + (qq.marks || 0), 0);
                      const isExpanded = expandedSubId === sub.id;
                      const hasScore = sub.score !== null && sub.score !== undefined;

                      return (
                        <div key={sub.id} style={{ padding: '12px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>
                                {nameOf(sub.user_id)}
                                {emailOf(sub.user_id) && <span style={{ color: 'var(--text-secondary)', marginLeft: '8px', fontSize: '12px', fontWeight: 400 }}>({emailOf(sub.user_id)})</span>}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                Submitted: {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : '—'}
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span className={`badge ${sub.is_graded ? 'badge-success' : 'badge-warning'}`}>
                                Score: {hasScore ? sub.score : 0} / {totalMarks} Marks
                              </span>
                              <button
                                type="button"
                                className="btn-secondary"
                                style={{ fontSize: '11px', padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => setExpandedSubId(isExpanded ? null : sub.id)}
                              >
                                <Eye size={12} /> {isExpanded ? 'Hide Details' : 'Review & Grade'}
                              </button>
                            </div>
                          </div>

                          {/* Expanded Submission Answers and Grade Form */}
                          {isExpanded && (
                            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                              <h5 style={{ fontSize: '12px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--accent-color)' }}>Student Responses:</h5>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                                {submissionsQuestions.map((qq: any, qIdx: number) => {
                                  const rawAns = sub.answers?.[qq.question_id] ?? sub.answers?.[String(qIdx)];
                                  const ansStr = rawAns !== undefined && rawAns !== null ? String(rawAns) : '';
                                  const opts = Array.isArray(qq.options) ? qq.options : [];
                                  let ansText = ansStr;
                                  if (opts.length > 0 && ansStr) {
                                    const match = opts.find((o: any) => String(o?.id) === ansStr || String(o) === ansStr);
                                    if (match) ansText = typeof match === 'object' ? (match.text || String(match.id)) : String(match);
                                  }

                                  return (
                                    <div key={qq.question_id || qIdx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '6px', padding: '8px 10px' }}>
                                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                                        <span>Q{qIdx + 1}. {qq.title}</span>
                                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>({qq.marks} Marks · {qq.type})</span>
                                      </div>
                                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)', padding: '6px 8px', borderRadius: '4px' }}>
                                        <span style={{ color: 'var(--accent-color)', fontWeight: 600 }}>Answer: </span>
                                        <span style={{ color: '#fff' }}>{ansText || '(No answer provided)'}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Manual Grading Form */}
                              <div style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '6px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                  <label style={{ fontSize: '12px', fontWeight: 600, minWidth: '120px' }}>
                                    Score (out of {totalMarks}):
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    max={totalMarks}
                                    step="0.5"
                                    value={quizGradeInputs[sub.id] ?? ''}
                                    onChange={e => setQuizGradeInputs(prev => ({ ...prev, [sub.id]: e.target.value }))}
                                    style={{ width: '90px', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '12px' }}
                                    placeholder="0"
                                  />
                                </div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                                  <label style={{ fontSize: '12px', fontWeight: 600, minWidth: '120px' }}>
                                    Feedback:
                                  </label>
                                  <input
                                    type="text"
                                    value={quizFeedbackInputs[sub.id] ?? ''}
                                    onChange={e => setQuizFeedbackInputs(prev => ({ ...prev, [sub.id]: e.target.value }))}
                                    style={{ flex: 1, minWidth: '200px', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(0,0,0,0.4)', color: '#fff', fontSize: '12px' }}
                                    placeholder="Add feedback for student..."
                                  />
                                  <button
                                    type="button"
                                    className="btn-primary"
                                    style={{ fontSize: '11px', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                    disabled={gradingId === sub.id}
                                    onClick={() => gradeQuizSubmission(sub.id, totalMarks)}
                                  >
                                    <Check size={12} /> {gradingId === sub.id ? 'Saving...' : 'Save & Release Grade'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
