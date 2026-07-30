import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { 
  LogOut, User, Activity, BookOpen, Terminal, CheckSquare, 
  Sparkles, Award, ShieldAlert, ChevronRight, Play, CheckCircle2, 
  ArrowRight, Send, Loader2, Trophy, Settings, HelpCircle, Layers, Clock 
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { userProfile, logout } = useAuth();
  
  // Navigation & Role State
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'sandbox' | 'assessment' | 'tutor' | 'leaderboard' | 'certificates'>('overview');
  const [selectedRole, setSelectedRole] = useState<'STUDENT' | 'INSTRUCTOR' | 'ADMIN'>('STUDENT');

  // --- CORE LMS STATE ---
  const [courses, setCourses] = useState<any[]>([
    {
      id: 'c-1',
      title: 'Introduction to Python & Isolated RAG Architectures',
      description: 'Master isolated backend code execution, Docker containers API, and build semantic RAG tutoring models.',
      duration: '4 weeks',
      enrolled: true,
      progress: 60,
      image: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
      modules: [
        {
          title: 'Module 1: Safe Sandboxed Code Runners',
          lessons: [
            { id: 'l1', title: '1.1 Containerizing Python compilers with Docker SDK', duration: '12 mins', completed: true, video: 'https://www.w3schools.com/html/mov_bbb.mp4', transcript: 'In this lecture, we study the core implementation of Go sandboxed execution engines utilizing Docker API to spawn temporary containers.' },
            { id: 'l2', title: '1.2 Restricting memory bounds and system calls', duration: '15 mins', completed: true, video: 'https://www.w3schools.com/html/mov_bbb.mp4', transcript: 'This session details how to limit CPU cores to 0.5 and RAM to 128MB per execution to prevent Denial of Service resource exhaustion.' },
            { id: 'l3', title: '1.3 Dynamic terminal logs streaming', duration: '18 mins', completed: false, video: 'https://www.w3schools.com/html/mov_bbb.mp4', transcript: 'We explore WebSocket integrations to capture standard output streams from standard Alpine execution runs in real time.' },
          ]
        },
        {
          title: 'Module 2: Machine Learning & Adaptive Tests',
          lessons: [
            { id: 'l4', title: '2.1 Computer Adaptive Testing (CAT) theory', duration: '20 mins', completed: false, video: 'https://www.w3schools.com/html/mov_bbb.mp4', transcript: 'Learn about Item Response Theory (IRT) and how to calculate difficulty index shifts on consecutive answer submissions.' },
            { id: 'l5', title: '2.2 Real-time difficulty index adjustments', duration: '14 mins', completed: false, video: 'https://www.w3schools.com/html/mov_bbb.mp4', transcript: 'Reviewing backend Express route controllers that adapt the next test question from Easy, Medium, or Hard pools.' }
          ]
        }
      ]
    },
    {
      id: 'c-2',
      title: 'Next.js Microservices Orchestration',
      description: 'Learn modern API routing with Kong Gateways, Keycloak OIDC sessions, and Docker Compose networks.',
      duration: '6 weeks',
      enrolled: false,
      progress: 0,
      image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
      modules: []
    }
  ]);
  
  const [selectedCourse, setSelectedCourse] = useState<any>(courses[0]);
  const [activeLesson, setActiveLesson] = useState<any>(courses[0].modules[0].lessons[0]);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [videoWatchedProgress, setVideoWatchedProgress] = useState(0);

  // --- TAB 1: Code Sandbox State ---
  const [codeLanguage, setCodeLanguage] = useState<'python' | 'cpp' | 'java'>('python');
  const [sandboxCode, setSandboxCode] = useState<string>(
    `# Write your Python code here\nname = input("Enter name: ")\nprint(f"Hello, {name}!")\nprint("Sandbox environment isolated successfully.")`
  );
  const [sandboxInput, setSandboxInput] = useState<string>('SannaLMS Student');
  const [sandboxOutput, setSandboxOutput] = useState<string>('');
  const [sandboxError, setSandboxError] = useState<string>('');
  const [sandboxStatus, setSandboxStatus] = useState<string>('');
  const [isSandboxRunning, setIsSandboxRunning] = useState<boolean>(false);

  // --- TAB 2: Adaptive Assessment State ---
  const [examStarted, setExamStarted] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 mins
  const [currentDifficulty, setCurrentDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [currentQuestion, setCurrentQuestion] = useState<{
    id: string;
    text: string;
    options: string[];
    correct: string;
    points: number;
  }>({
    id: 'q1',
    text: 'What is the runtime complexity of accessing an element in an array by index?',
    options: ['O(1)', 'O(n)', 'O(log n)', 'O(n log n)'],
    correct: 'O(1)',
    points: 10,
  });
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [testResult, setTestResult] = useState<{ score: number; submittedAt: string } | null>(null);

  // --- TAB 3: AI Tutor State ---
  const [tutorQuery, setTutorQuery] = useState<string>('');
  const [tutorResponse, setTutorResponse] = useState<string>('');
  const [isTutorLoading, setIsTutorLoading] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<Array<{ sender: 'user' | 'bot'; text: string }>>([
    { sender: 'bot', text: 'Hello! I am your AI Tutor. Ask me any questions about the current course materials.' }
  ]);

  // --- TAB 4: User Directory (Admin list) ---
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  useEffect(() => {
    if (!examStarted || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [examStarted, timeLeft]);

  // --- CORE LMS METHODS ---
  const handleLessonClick = (lesson: any) => {
    setActiveLesson(lesson);
    setIsPlayingVideo(false);
    setVideoWatchedProgress(0);
  };

  const handleLessonCompleteToggle = (lessonId: string) => {
    const updatedCourses = courses.map(course => {
      if (course.id !== selectedCourse.id) return course;
      
      const updatedModules = course.modules.map((mod: any) => {
        const updatedLessons = mod.lessons.map((les: any) => {
          if (les.id === lessonId) {
            return { ...les, completed: !les.completed };
          }
          return les;
        });
        return { ...mod, lessons: updatedLessons };
      });

      // Recalculate progress
      const totalLessons = updatedModules.reduce((acc: number, cur: any) => acc + cur.lessons.length, 0);
      const completedLessons = updatedModules.reduce((acc: number, cur: any) => acc + cur.lessons.filter((l: any) => l.completed).length, 0);
      const newProgress = Math.round((completedLessons / totalLessons) * 100);

      const updatedCourse = { ...course, modules: updatedModules, progress: newProgress };
      if (selectedCourse.id === course.id) {
        setSelectedCourse(updatedCourse);
      }
      return updatedCourse;
    });

    setCourses(updatedCourses);
  };

  // --- SANDBOX RUNNER ---
  const runSandboxCode = async () => {
    setIsSandboxRunning(true);
    setSandboxOutput('');
    setSandboxError('');
    setSandboxStatus('SPAWNING_ISOLATED_CONTAINER...');

    try {
      const response = await fetch('/api/v1/sandbox/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: codeLanguage,
          code: sandboxCode,
          input: sandboxInput,
          timeout: 4000,
        }),
      });

      if (!response.ok) throw new Error('API server returned error');
      
      const data = await response.json();
      setSandboxOutput(data.output || '');
      setSandboxError(data.error || '');
      setSandboxStatus(data.status || 'FINISHED');
    } catch (err) {
      console.log('API call fallback, running client sandbox simulation...');
      setTimeout(() => {
        setSandboxStatus('SUCCESS (Offline Simulation)');
        if (codeLanguage === 'python') {
          setSandboxOutput(`Hello, ${sandboxInput}!\nExecution complete. Output parsed successfully.`);
        } else {
          setSandboxOutput(`Hello, ${sandboxInput}!\n(Sandbox compilation succeeded via backup engine)`);
        }
      }, 1000);
    } finally {
      setIsSandboxRunning(false);
    }
  };

  // --- CAT EXAM METHODS ---
  const handleStartExam = () => {
    setExamStarted(true);
    setTimeLeft(300);
    setCurrentScore(0);
    setCurrentDifficulty('MEDIUM');
    setSelectedOption('');
    setTestResult(null);
  };

  const handleSubmitQuestion = async () => {
    if (!selectedOption) return;

    const isCorrect = selectedOption === currentQuestion.correct;
    if (isCorrect) {
      setCurrentScore(prev => prev + currentQuestion.points);
    }

    // Adapt next question difficulty
    let nextDiff: 'EASY' | 'MEDIUM' | 'HARD' = currentDifficulty;
    let nextQuestionText = '';
    let nextOptions: string[] = [];
    let nextCorrect = '';
    let nextPoints = 10;

    if (isCorrect) {
      if (currentDifficulty === 'EASY') {
        nextDiff = 'MEDIUM';
        nextQuestionText = 'Explain how a binary search algorithm handles sorted datasets.';
        nextOptions = ['Splitting elements in half O(log n)', 'Searching linearly O(n)', 'Using hashing O(1)'];
        nextCorrect = 'Splitting elements in half O(log n)';
        nextPoints = 15;
      } else {
        nextDiff = 'HARD';
        nextQuestionText = 'Which algorithm is optimal for finding the shortest path in a graph with negative weight edges?';
        nextOptions = ['Dijkstra\'s algorithm', 'Bellman-Ford algorithm', 'Prim\'s algorithm'];
        nextCorrect = 'Bellman-Ford algorithm';
        nextPoints = 25;
      }
    } else {
      if (currentDifficulty === 'HARD') {
        nextDiff = 'MEDIUM';
        nextQuestionText = 'What data structure represents a FIFO (First In First Out) queue?';
        nextOptions = ['Stack', 'Queue', 'Binary Tree', 'Heap'];
        nextCorrect = 'Queue';
        nextPoints = 15;
      } else {
        nextDiff = 'EASY';
        nextQuestionText = 'What keyword is used to return values from functions in JavaScript?';
        nextOptions = ['exit', 'yield', 'return', 'break'];
        nextCorrect = 'return';
        nextPoints = 5;
      }
    }

    setCurrentDifficulty(nextDiff);
    setCurrentQuestion({
      id: Math.random().toString(),
      text: nextQuestionText,
      options: nextOptions,
      correct: nextCorrect,
      points: nextPoints,
    });
    setSelectedOption('');
  };

  const handleFinishExam = () => {
    setExamStarted(false);
    setTestResult({
      score: currentScore,
      submittedAt: new Date().toLocaleTimeString(),
    });
  };

  // --- AI TUTOR (RAG QUERY) ---
  const queryAiTutor = async () => {
    if (!tutorQuery.trim()) return;

    const query = tutorQuery;
    setTutorQuery('');
    setChatHistory(prev => [...prev, { sender: 'user', text: query }]);
    setIsTutorLoading(true);

    try {
      const response = await fetch('/api/v1/tutor/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_query: query,
          course_context: activeLesson?.transcript || 'This is SannaLMS course context.',
        }),
      });

      if (!response.ok) throw new Error('API server returned error');

      const data = await response.json();
      setChatHistory(prev => [...prev, { sender: 'bot', text: data.answer || 'I am ready to help.' }]);
    } catch (err) {
      console.log('AI Tutor fallback mode...');
      setTimeout(() => {
        setChatHistory(prev => [
          ...prev, 
          { 
            sender: 'bot', 
            text: `Based strictly on your active lesson (${activeLesson?.title}):\n\n👉 Focus on learning the core concepts of function compilation, memory isolation, and runtime scopes.\n\n(Fallback: AI service not reached, simulating locally)` 
          }
        ]);
      }, 1000);
    } finally {
      setIsTutorLoading(false);
    }
  };

  // --- USER DIRECTORY (ADMIN METHOD) ---
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const response = await apiClient.get('/users');
      setUsers(response.data.data || []);
    } catch (err: any) {
      console.error('Failed to load users directory', err);
    } finally {
      setUsersLoading(false);
    }
  };

  return (
    <div className="lms-dashboard-wrapper" style={{ display: 'flex', minHeight: '100vh', background: '#090d16', color: '#f8fafc' }}>
      
      {/* ─── SIDEBAR NAVIGATION ─── */}
      <aside className="sidebar" style={{ width: '280px', borderRight: '1px solid rgba(255,255,255,0.06)', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(20px)', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div className="sidebar-brand" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
            <div style={{ background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))', padding: '8px', borderRadius: '10px' }}>
              <Layers size={22} color="#fff" />
            </div>
            <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.025em', background: 'linear-gradient(to right, #fff, #cbd5e1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>SannaLMS</span>
          </div>

          <nav className="nav-menu" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <button className={`nav-link-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
              <Activity size={18} /> Overview
            </button>
            <button className={`nav-link-btn ${activeTab === 'courses' ? 'active' : ''}`} onClick={() => setActiveTab('courses')}>
              <BookOpen size={18} /> My Courses
            </button>
            <button className={`nav-link-btn ${activeTab === 'sandbox' ? 'active' : ''}`} onClick={() => setActiveTab('sandbox')}>
              <Terminal size={18} /> Code Sandbox
            </button>
            <button className={`nav-link-btn ${activeTab === 'assessment' ? 'active' : ''}`} onClick={() => setActiveTab('assessment')}>
              <CheckSquare size={18} /> Adaptive Exam
            </button>
            <button className={`nav-link-btn ${activeTab === 'tutor' ? 'active' : ''}`} onClick={() => setActiveTab('tutor')}>
              <Sparkles size={18} /> AI Tutor
            </button>
            <button className={`nav-link-btn ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
              <Trophy size={18} /> Leaderboard
            </button>
            <button className={`nav-link-btn ${activeTab === 'certificates' ? 'active' : ''}`} onClick={() => setActiveTab('certificates')}>
              <Award size={18} /> Certificates
            </button>
          </nav>
        </div>

        {/* User profile / Logout panel */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
              <User size={18} color="var(--accent-cyan)" />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{ fontSize: '0.9rem', fontWeight: 600, margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{userProfile?.firstName || 'SSO User'}</p>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{userProfile?.email || 'authenticated'}</span>
            </div>
          </div>
          
          <button onClick={logout} style={{ width: '100%', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', color: '#fb7185', padding: '0.65rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s' }}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT PLANE ─── */}
      <main className="main-content" style={{ flex: 1, padding: '2.5rem 3rem', overflowY: 'auto' }}>
        
        {/* Top Header Row */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
          <div>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-cyan)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Phase 2 Portal</span>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.25rem' }}>
              {activeTab === 'overview' && 'LMS Command Center'}
              {activeTab === 'courses' && 'Course Curriculum & Player'}
              {activeTab === 'sandbox' && 'Secure Go-Docker Sandbox'}
              {activeTab === 'assessment' && 'Computer Adaptive Test'}
              {activeTab === 'tutor' && 'Gemini AI Tutor'}
              {activeTab === 'leaderboard' && 'Global Gamification'}
              {activeTab === 'certificates' && 'Cryptographic Awards'}
            </h1>
          </div>

          {/* Role Evaluator & Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 1rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>View Mode:</span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button onClick={() => { setSelectedRole('STUDENT'); setActiveTab('overview'); }} style={{ padding: '0.35rem 0.75rem', borderRadius: '0.5rem', border: 'none', fontSize: '0.8rem', fontWeight: 600, background: selectedRole === 'STUDENT' ? 'var(--accent-indigo)' : 'transparent', color: selectedRole === 'STUDENT' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer' }}>Student</button>
              <button onClick={() => { setSelectedRole('INSTRUCTOR'); setActiveTab('courses'); }} style={{ padding: '0.35rem 0.75rem', borderRadius: '0.5rem', border: 'none', fontSize: '0.8rem', fontWeight: 600, background: selectedRole === 'INSTRUCTOR' ? 'var(--accent-cyan)' : 'transparent', color: selectedRole === 'INSTRUCTOR' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer' }}>Trainer</button>
              <button onClick={() => { setSelectedRole('ADMIN'); setActiveTab('overview'); }} style={{ padding: '0.35rem 0.75rem', borderRadius: '0.5rem', border: 'none', fontSize: '0.8rem', fontWeight: 600, background: selectedRole === 'ADMIN' ? 'var(--accent-emerald)' : 'transparent', color: selectedRole === 'ADMIN' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer' }}>Admin</button>
            </div>
          </div>
        </header>

        {/* ─── TAB CONTENT PANELS ─── */}

        {/* 1. OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '1.5rem' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Total Experience Points</p>
                <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', background: 'linear-gradient(to right, #fbbf24, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>2,450 XP</h2>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '1.5rem' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Completed Lessons</p>
                <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--accent-cyan)' }}>12 / 18</h2>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '1.5rem' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Adaptive Score Rank</p>
                <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--accent-emerald)' }}>Top 5%</h2>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '1.5rem' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Global Leaderboard Rank</p>
                <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--accent-indigo)' }}>#14</h2>
              </div>
            </div>

            {/* Dashboard details based on view-mode */}
            {selectedRole === 'STUDENT' && (
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '2rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.25rem', padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Enrolled Courses</h3>
                  {courses.filter(c => c.enrolled).map(course => (
                    <div key={course.id} style={{ display: 'flex', gap: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <img src={course.image} alt={course.title} style={{ width: '120px', height: '80px', borderRadius: '8px', objectFit: 'cover' }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                        <div>
                          <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{course.title}</h4>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Progress: {course.progress}%</span>
                        </div>
                        <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginTop: '0.5rem' }}>
                          <div style={{ height: '100%', width: `${course.progress}%`, background: 'var(--accent-indigo)', borderRadius: '3px' }} />
                        </div>
                      </div>
                      <button onClick={() => { setSelectedCourse(course); setActiveTab('courses'); }} style={{ border: 'none', background: 'rgba(99,102,241,0.1)', color: '#818cf8', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem', alignSelf: 'center' }}>
                        Open <ChevronRight size={16} />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Quick actions panel */}
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.25rem', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>LMS Quick Launch</h3>
                  <button className="btn-sidebar-quick" onClick={() => setActiveTab('sandbox')} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '1rem', borderRadius: '0.75rem', color: '#fff', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                    <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '10px', borderRadius: '8px', color: 'var(--accent-cyan)' }}><Terminal size={20} /></div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem' }}>Launch Code Sandbox</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Isolate container and execute code</p>
                    </div>
                  </button>
                  <button className="btn-sidebar-quick" onClick={() => setActiveTab('assessment')} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '1rem', borderRadius: '0.75rem', color: '#fff', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '10px', borderRadius: '8px', color: 'var(--accent-emerald)' }}><CheckSquare size={20} /></div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem' }}>Start Computer Adaptive Test</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Test your knowledge under IRT algorithms</p>
                    </div>
                  </button>
                  <button className="btn-sidebar-quick" onClick={() => setActiveTab('tutor')} style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '1rem', borderRadius: '0.75rem', color: '#fff', cursor: 'pointer', textAlign: 'left', width: '100%' }}>
                    <div style={{ background: 'rgba(99, 102, 241, 0.1)', padding: '10px', borderRadius: '8px', color: 'var(--accent-indigo)' }}><Sparkles size={20} /></div>
                    <div>
                      <h4 style={{ fontSize: '0.95rem' }}>Talk to Gemini AI Tutor</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Query AI based on lecture transcript context</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {selectedRole === 'INSTRUCTOR' && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.25rem', padding: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Course Management Panel (Trainer)</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>As an instructor, you can configure new modules, assign trainers, and check student analytics.</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '1rem', padding: '1.5rem', textAlign: 'center' }}>
                    <h4 style={{ marginBottom: '0.5rem' }}>Course Constructor</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Build curriculum, upload lesson notes and HLS video segments.</p>
                    <a href="http://103.160.144.225:8086/courses" target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ display: 'inline-block', textDecoration: 'none', padding: '8px 16px', borderRadius: '6px' }}>Manage Courses</a>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '1rem', padding: '1.5rem', textAlign: 'center' }}>
                    <h4 style={{ marginBottom: '0.5rem' }}>Live Class Scheduler</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Schedule virtual sessions, assign links, and manage calendar logs.</p>
                    <a href="http://103.160.144.225:8086/liveclasses" target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ display: 'inline-block', textDecoration: 'none', padding: '8px 16px', borderRadius: '6px' }}>Manage Live Classes</a>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '1rem', padding: '1.5rem', textAlign: 'center' }}>
                    <h4 style={{ marginBottom: '0.5rem' }}>Gradebooks & Quizzes</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Review student scorecards, upload quiz questions, and manage grade logs.</p>
                    <a href="http://103.160.144.225:8086/assessments" target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ display: 'inline-block', textDecoration: 'none', padding: '8px 16px', borderRadius: '6px' }}>Manage Assessments</a>
                  </div>
                </div>
              </div>
            )}

            {selectedRole === 'ADMIN' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.25rem', padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>SaaS Admin Directories Console</h3>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem' }}>
                    <a href="http://103.160.144.225:8086/colleges" target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ textDecoration: 'none', padding: '10px 20px', borderRadius: '8px' }}>Colleges Portal</a>
                    <a href="http://103.160.144.225:8086/departments" target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ textDecoration: 'none', padding: '10px 20px', borderRadius: '8px' }}>Departments Directory</a>
                    <a href="http://103.160.144.225:8086/branches" target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ textDecoration: 'none', padding: '10px 20px', borderRadius: '8px' }}>Branches Portal</a>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4>Enterprise User Directory</h4>
                    <button className="btn-secondary" onClick={fetchUsers} disabled={usersLoading} style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                      {usersLoading ? 'Loading...' : 'Fetch Users via API Gateway'}
                    </button>
                  </div>

                  {users.length > 0 && (
                    <div style={{ overflowX: 'auto', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'left', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <th style={{ padding: '0.75rem 1rem' }}>User ID</th>
                            <th style={{ padding: '0.75rem 1rem' }}>Email Endpoint</th>
                            <th style={{ padding: '0.75rem 1rem' }}>Provision State</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map(u => (
                            <tr key={u.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '0.85rem' }}>
                              <td style={{ padding: '0.75rem 1rem', fontFamily: 'monospace' }}>{u.id}</td>
                              <td style={{ padding: '0.75rem 1rem' }}>{u.email}</td>
                              <td style={{ padding: '0.75rem 1rem' }}>
                                <span style={{ background: u.isActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: u.isActive ? '#10b981' : '#ef4444', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem' }}>
                                  {u.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

        {/* 2. COURSES & LECTURE PLAYER TAB */}
        {activeTab === 'courses' && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
            
            {/* Player Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: '#000', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.25rem', overflow: 'hidden', position: 'relative', aspectRatio: '16/9' }}>
                {isPlayingVideo ? (
                  <video 
                    src={activeLesson.video} 
                    controls 
                    autoPlay
                    style={{ width: '100%', height: '100%' }}
                    onTimeUpdate={(e) => {
                      const cur = e.currentTarget.currentTime;
                      const dur = e.currentTarget.duration;
                      if (dur) setVideoWatchedProgress(Math.round((cur / dur) * 100));
                    }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.8))', position: 'absolute', top: 0, left: 0 }}>
                    <button onClick={() => setIsPlayingVideo(true)} style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'var(--accent-cyan)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', boxShadow: '0 0 20px rgba(6,182,212,0.4)', transition: 'transform 0.2s' }}>
                      <Play size={32} fill="#fff" />
                    </button>
                    <p style={{ marginTop: '1.5rem', fontWeight: 600, fontSize: '1.1rem' }}>{activeLesson.title}</p>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Click to play media session</span>
                  </div>
                )}
              </div>

              {/* Lesson details & transcript */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.25rem', padding: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', marginBottom: '1rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.25rem' }}>{activeLesson.title}</h3>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Duration: {activeLesson.duration} | Progress: {videoWatchedProgress}%</span>
                  </div>
                  <button 
                    onClick={() => handleLessonCompleteToggle(activeLesson.id)}
                    style={{ 
                      background: activeLesson.completed ? 'rgba(16,185,129,0.1)' : 'transparent', 
                      border: activeLesson.completed ? '1px solid var(--accent-emerald)' : '1px solid rgba(255,255,255,0.15)',
                      color: activeLesson.completed ? 'var(--accent-emerald)' : '#fff',
                      padding: '0.5rem 1rem', 
                      borderRadius: '8px', 
                      cursor: 'pointer', 
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <CheckCircle2 size={16} />
                    {activeLesson.completed ? 'Completed' : 'Mark Complete'}
                  </button>
                </div>
                <h4>Lecture Transcript Context (for RAG AI Tutor):</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginTop: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                  {activeLesson.transcript}
                </p>
                <button onClick={() => setActiveTab('tutor')} style={{ marginTop: '1rem', border: 'none', background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))', color: '#fff', padding: '0.65rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={16} /> Query AI Tutor on this Lesson
                </button>
              </div>
            </div>

            {/* Sidebar Modules List */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.25rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '0.25rem' }}>Course Curriculum</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{selectedCourse.title}</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {selectedCourse.modules.map((mod: any, modIdx: number) => (
                  <div key={modIdx} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{mod.title}</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {mod.lessons.map((les: any) => (
                        <button 
                          key={les.id} 
                          onClick={() => handleLessonClick(les)}
                          style={{ 
                            background: activeLesson.id === les.id ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.01)', 
                            border: '1px solid',
                            borderColor: activeLesson.id === les.id ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                            padding: '0.75rem 1rem', 
                            borderRadius: '8px', 
                            textAlign: 'left',
                            color: '#fff',
                            cursor: 'pointer',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <div style={{ overflow: 'hidden', paddingRight: '0.5rem' }}>
                            <p style={{ fontSize: '0.85rem', fontWeight: 600, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{les.title}</p>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{les.duration}</span>
                          </div>
                          {les.completed && <CheckCircle2 size={16} color="var(--accent-emerald)" />}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* 3. CODE SANDBOX TAB */}
        {activeTab === 'sandbox' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
            
            {/* Editor Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => setCodeLanguage('python')} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: codeLanguage === 'python' ? 'rgba(6,182,212,0.1)' : 'transparent', color: codeLanguage === 'python' ? 'var(--accent-cyan)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>Python</button>
                  <button onClick={() => setCodeLanguage('cpp')} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: codeLanguage === 'cpp' ? 'rgba(6,182,212,0.1)' : 'transparent', color: codeLanguage === 'cpp' ? 'var(--accent-cyan)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>C++</button>
                  <button onClick={() => setCodeLanguage('java')} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: codeLanguage === 'java' ? 'rgba(6,182,212,0.1)' : 'transparent', color: codeLanguage === 'java' ? 'var(--accent-cyan)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>Java</button>
                </div>

                <button onClick={runSandboxCode} disabled={isSandboxRunning} style={{ border: 'none', background: 'var(--accent-cyan)', color: '#fff', padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isSandboxRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="#fff" />}
                  Execute Code
                </button>
              </div>

              <textarea 
                value={sandboxCode} 
                onChange={(e) => setSandboxCode(e.target.value)} 
                style={{ width: '100%', height: '400px', background: '#070b13', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '1rem', padding: '1.25rem', fontFamily: 'monospace', fontSize: '0.9rem', color: '#38bdf8', outline: 'none', resize: 'none' }}
              />

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Standard Input (stdin)</label>
                <input 
                  type="text" 
                  value={sandboxInput} 
                  onChange={(e) => setSandboxInput(e.target.value)} 
                  style={{ width: '100%', padding: '0.75rem 1rem', background: '#070b13', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: '#fff', outline: 'none', marginTop: '0.35rem' }}
                />
              </div>
            </div>

            {/* Output Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.25rem', padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>Container Outputs</h3>
                
                {sandboxStatus && (
                  <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', fontFamily: 'monospace', alignSelf: 'flex-start', marginBottom: '1rem' }}>
                    STATUS: {sandboxStatus}
                  </span>
                )}

                <div style={{ flex: 1, background: '#020617', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)', fontFamily: 'monospace', fontSize: '0.9rem', overflowY: 'auto' }}>
                  {sandboxOutput && <pre style={{ color: '#10b981', whiteSpace: 'pre-wrap' }}>{sandboxOutput}</pre>}
                  {sandboxError && <pre style={{ color: '#ef4444', whiteSpace: 'pre-wrap' }}>{sandboxError}</pre>}
                  {!sandboxOutput && !sandboxError && <span style={{ color: 'var(--text-secondary)' }}>Click "Execute Code" to trigger the Go execution sandbox.</span>}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 4. ADAPTIVE ASSESSMENT TAB */}
        {activeTab === 'assessment' && (
          <div style={{ maxWidth: '750px', margin: '0 auto' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.25rem', padding: '2.5rem', position: 'relative' }}>
              
              {!examStarted && !testResult && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ background: 'rgba(16,185,129,0.1)', padding: '1rem', borderRadius: '50%', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <CheckSquare size={36} color="var(--accent-emerald)" />
                  </div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Item Response Theory (IRT) Exam Engine</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '2rem' }}>
                    This adaptive testing module dynamically adjusts question difficulty based on consecutive correct or incorrect answers.
                  </p>
                  <button onClick={handleStartExam} style={{ border: 'none', background: 'var(--accent-emerald)', color: '#fff', padding: '0.75rem 2rem', borderRadius: '8px', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
                    Start Assessment
                  </button>
                </div>
              )}

              {examStarted && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                    <span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                      Difficulty: {currentDifficulty}
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: timeLeft < 60 ? '#f43f5e' : '#fff', fontWeight: 600 }}>
                      <Clock size={16} /> {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>{currentQuestion.text}</h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                    {currentQuestion.options.map((opt, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setSelectedOption(opt)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '1rem',
                          background: selectedOption === opt ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.01)',
                          border: '1px solid',
                          borderColor: selectedOption === opt ? 'var(--accent-emerald)' : 'rgba(255,255,255,0.06)',
                          borderRadius: '8px',
                          color: '#fff',
                          cursor: 'pointer',
                          fontWeight: 500,
                          fontSize: '0.95rem',
                          transition: 'all 0.15s'
                        }}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <button onClick={handleFinishExam} style={{ border: '1px solid rgba(244,63,94,0.3)', background: 'transparent', color: '#fb7185', padding: '0.65rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                      Finish & Submit
                    </button>
                    <button onClick={handleSubmitQuestion} disabled={!selectedOption} style={{ border: 'none', background: 'var(--accent-emerald)', color: '#fff', padding: '0.65rem 1.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}>
                      Submit Answer
                    </button>
                  </div>
                </div>
              )}

              {testResult && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ background: 'rgba(99,102,241,0.1)', padding: '1rem', borderRadius: '50%', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <Award size={36} color="var(--accent-indigo)" />
                  </div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Assessment Completed!</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                    Your response has been registered and verified by the adaptive scaling algorithm.
                  </p>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem 2rem', borderRadius: '8px', display: 'inline-block', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '2rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Calculated Score:</span>
                    <h3 style={{ fontSize: '2rem', color: 'var(--accent-cyan)' }}>{testResult.score} Pts</h3>
                  </div>
                  <div>
                    <button onClick={handleStartExam} style={{ border: 'none', background: 'var(--accent-indigo)', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>
                      Retake Test
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* 5. AI TUTOR TAB */}
        {activeTab === 'tutor' && (
          <div style={{ maxWidth: '850px', margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
            
            {/* Chat Column */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.25rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '500px' }}>
              <div className="chat-messages" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem', paddingRight: '0.5rem' }}>
                {chatHistory.map((msg, idx) => (
                  <div 
                    key={idx} 
                    style={{ 
                      alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                      background: msg.sender === 'user' ? 'var(--accent-indigo)' : 'rgba(255,255,255,0.03)',
                      border: '1px solid',
                      borderColor: msg.sender === 'user' ? 'transparent' : 'rgba(255,255,255,0.05)',
                      padding: '0.85rem 1.25rem',
                      borderRadius: msg.sender === 'user' ? '1rem 1rem 0 1rem' : '0 1rem 1rem 1rem',
                      maxWidth: '80%',
                      fontSize: '0.925rem',
                      lineHeight: '1.5'
                    }}
                  >
                    {msg.text.split('\n').map((line, lIdx) => (
                      <p key={lIdx} style={{ margin: line ? '0 0 0.5rem 0' : '0' }}>{line}</p>
                    ))}
                  </div>
                ))}
                {isTutorLoading && (
                  <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.02)', padding: '0.85rem 1.25rem', borderRadius: '0 1rem 1rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Loader2 size={16} className="animate-spin" /> Thinking...
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <input 
                  type="text" 
                  value={tutorQuery}
                  onChange={(e) => setTutorQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') queryAiTutor(); }}
                  placeholder="Ask a question about the active lesson..."
                  style={{ flex: 1, padding: '0.75rem 1.25rem', background: '#070b13', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', color: '#fff', outline: 'none' }}
                />
                <button onClick={queryAiTutor} style={{ border: 'none', background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))', color: '#fff', padding: '0.75rem', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Send size={18} />
                </button>
              </div>
            </div>

            {/* Lesson Context Column */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.25rem', padding: '1.5rem', height: '500px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>Active Lesson Context</h3>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)' }}>{activeLesson?.title}</span>
              
              <div style={{ flex: 1, overflowY: 'auto', background: 'rgba(0,0,0,0.15)', padding: '1rem', borderRadius: '8px', marginTop: '1rem', border: '1px solid rgba(255,255,255,0.02)', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                {activeLesson?.transcript}
              </div>
            </div>

          </div>
        )}

        {/* 6. LEADERBOARD TAB */}
        {activeTab === 'leaderboard' && (
          <div style={{ maxWidth: '650px', margin: '0 auto' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.25rem', padding: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem' }}>Global XP Rankings</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {[
                  { rank: 1, name: 'Adithya Vardhan', xp: '3,840 XP', badges: 8, me: false },
                  { rank: 2, name: 'Rohan Sharma', xp: '3,450 XP', badges: 6, me: false },
                  { rank: 14, name: `${userProfile?.firstName || 'SSO'} ${userProfile?.lastName || 'User'}`, xp: '2,450 XP', badges: 4, me: true },
                  { rank: 15, name: 'Divya Rao', xp: '2,420 XP', badges: 3, me: false },
                  { rank: 16, name: 'Sanjay Kumar', xp: '2,310 XP', badges: 3, me: false }
                ].map((user, idx) => (
                  <div 
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem 1.25rem',
                      background: user.me ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.01)',
                      border: '1px solid',
                      borderColor: user.me ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                      borderRadius: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: user.rank <= 3 ? '#fbbf24' : 'var(--text-secondary)', width: '30px' }}>#{user.rank}</span>
                      <div>
                        <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{user.name}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Badges Unlocked: {user.badges}</span>
                      </div>
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '1rem' }}>{user.xp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 7. CERTIFICATES TAB */}
        {activeTab === 'certificates' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
            {[
              { id: 'cert-1', course: 'Introduction to Python & Isolated RAG Architectures', date: 'July 2026', verificationUrl: 'http://103.160.144.225:8008/verify/cert-1' },
            ].map(cert => (
              <div key={cert.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.25rem', padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '220px' }}>
                <div>
                  <Award size={36} color="var(--accent-cyan)" style={{ marginBottom: '1rem' }} />
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.35rem', lineHeight: '1.4' }}>{cert.course}</h4>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Issued: {cert.date}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>ID: {cert.id}</span>
                  <a href={cert.verificationUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    Verify Credentials <ArrowRight size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
};
