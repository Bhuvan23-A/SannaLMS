import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient, keycloak } from '../api/client';
import SessionQR from '../SessionQR';
import { useExamProctoring } from '../hooks/useExamProctoring';
import { 
  LogOut, User, Activity, BookOpen, Terminal, CheckSquare, 
  Sparkles, Award, ShieldAlert, ChevronRight, Play, CheckCircle2, 
  ArrowRight, Send, Loader2, Trophy, Settings, HelpCircle, Layers, Clock,
  FileText, Calendar, Upload, Bell, GraduationCap, RefreshCw,
  MessageSquare, MessagesSquare, Video, Download, ExternalLink
} from 'lucide-react';

// Starter templates per language — switching tabs loads the matching template
const LANGUAGE_TEMPLATES: Record<'python' | 'cpp' | 'java', string> = {
  python: `# Write your Python code here
name = input("Enter name: ")
print(f"Hello, {name}!")
print("Sandbox environment isolated successfully.")`,
  cpp: `// Write your C++ code here
#include <iostream>
#include <string>
using namespace std;

int main() {
    string name;
    cout << "Enter name: ";
    getline(cin, name);
    cout << "Hello, " << name << "!" << endl;
    cout << "Sandbox environment isolated successfully." << endl;
    return 0;
}`,
  java: `// Write your Java code here
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        System.out.print("Enter name: ");
        String name = sc.nextLine();
        System.out.println("Hello, " + name + "!");
        System.out.println("Sandbox environment isolated successfully.");
    }
}`,
};

export const Dashboard: React.FC = () => {
  const { userProfile, logout } = useAuth();

  // Admin dashboard base URL — override for local dev via .env (VITE_ADMIN_URL=http://localhost:3000)
  const ADMIN_URL: string = (import.meta.env.VITE_ADMIN_URL as string) || 'https://admin.sannalms.sannainnovations.com';
  const adminRedirectedRef = useRef(false);
  
  // Navigation & Role State
  const [activeTab, setActiveTab] = useState<'overview' | 'courses' | 'sandbox' | 'assessment' | 'tutor' | 'leaderboard' | 'certificates' | 'assignments' | 'attendance' | 'liveclasses' | 'grades' | 'notifications' | 'calendar' | 'forums' | 'chat'>('overview');
  const [selectedRole, setSelectedRole] = useState<'STUDENT' | 'INSTRUCTOR' | 'ADMIN'>('STUDENT');

  // Determine roles from Keycloak. Realm role names vary by case/legacy export
  // (lowercase `instructor`, uppercase `TEACHING_ASSISTANT`, etc.), so compare
  // case-insensitively against the decoded token instead of hasRealmRole.
  const realmRoles: string[] = keycloak.tokenParsed?.realm_access?.roles || [];
  const hasAnyRole = (...names: string[]) =>
    names.some(name => realmRoles.some(r => r.toLowerCase() === name.toLowerCase()));
  const hasAdminRole = keycloak.token ? hasAnyRole('superadmin', 'tenantadmin') : true;
  const hasTrainerRole = keycloak.token
    ? (hasAdminRole || hasAnyRole('instructor', 'primary_trainer', 'trainer', 'teaching_assistant', 'assistant'))
    : true;

  // Set default role based on Keycloak roles on mount.
  // Super Admin / College Admin are routed straight to the role-scoped Admin Dashboard
  // (the admin UI resolves the same JWT and renders the correct access level).
  useEffect(() => {
    if (keycloak.token) {
      if (hasAnyRole('superadmin', 'tenantadmin')) {
        setSelectedRole('ADMIN');
        if (!adminRedirectedRef.current) {
          adminRedirectedRef.current = true;
          const adminUrl = `${ADMIN_URL}/?token=${encodeURIComponent(keycloak.token)}`;
          window.location.replace(adminUrl);
        }
      } else if (hasAnyRole('instructor', 'primary_trainer', 'trainer', 'teaching_assistant', 'assistant')) {
        // Trainers/assistant trainers do all their work in the admin portal —
        // route them straight there instead of the demo dashboard (#ux).
        setSelectedRole('INSTRUCTOR');
        if (!adminRedirectedRef.current) {
          adminRedirectedRef.current = true;
          const adminUrl = `${ADMIN_URL}/?token=${encodeURIComponent(keycloak.token)}`;
          window.location.replace(adminUrl);
        }
      } else {
        setSelectedRole('STUDENT');
      }
    }
  }, []);

  // --- CORE LMS STATE ---
  // Demo courses are only a fallback: as soon as the real "my courses" API
  // responds (role-scoped to the student's enrollments), they are replaced.
  const DEMO_COURSES: any[] = [
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
  ];

  const [courses, setCourses] = useState<any[]>(DEMO_COURSES);
  const [coursesLoading, setCoursesLoading] = useState(false);
  
  const [selectedCourse, setSelectedCourse] = useState<any>(courses[0]);
  // NOTE: this initializer is re-evaluated on every render (React only USES it on the first),
  // so it must be safe even after `courses` is replaced with the student's real enrollments
  // (which may have zero modules/lessons). Optional chaining keeps it crash-proof.
  const [activeLesson, setActiveLesson] = useState<any>(courses[0]?.modules?.[0]?.lessons?.[0]);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const [videoWatchedProgress, setVideoWatchedProgress] = useState(0);
  // Video can be blocked by some networks/ad blockers — show the transcript fallback.
  const [videoError, setVideoError] = useState(false);

  // --- REAL "MY COURSES" (#fix): students see the courses they are enrolled in,
  // with their real curriculum (modules -> lessons -> topics) from course-service.
  const [playerCourseId, setPlayerCourseId] = useState<string>(courses[0]?.id || '');
  const [courseResources, setCourseResources] = useState<any[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);

  const loadCourseResources = async (cId: string) => {
    if (!cId) { setCourseResources([]); return; }
    try {
      setResourcesLoading(true);
      const resp = await apiClient.get(`/courses/${cId}/resources`);
      setCourseResources(Array.isArray(resp.data) ? resp.data : []);
    } catch {
      setCourseResources([]);
    } finally {
      setResourcesLoading(false);
    }
  };

  const downloadResource = async (resId: string, filename: string) => {
    try {
      const res = await apiClient.get(`/courses/${playerCourseId}/resources/${resId}/download`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download file');
    }
  };

  useEffect(() => {
    if (playerCourseId) {
      loadCourseResources(playerCourseId);
    }
  }, [playerCourseId]);

  const fetchMyCourses = async () => {
    setCoursesLoading(true);
    try {
      const resp = await apiClient.get('/courses');
      const list = Array.isArray(resp.data) ? resp.data : [];
      if (list.length === 0) return; // keep the demo fallback when nothing is published yet
      const enriched: any[] = [];
      for (const c of list) {
        const course: any = {
          id: c.id,
          title: c.title,
          description: c.description || '',
          duration: c.year ? `Year ${c.year}` : '',
          enrolled: true,
          progress: 0,
          image: '',
          modules: [],
        };
        try {
          const modRes = await apiClient.get(`/modules/course/${c.id}`);
          const mods = Array.isArray(modRes.data) ? modRes.data : [];
          for (const m of mods) {
            const mod: any = { id: m.id, title: m.title, lessons: [] };
            try {
              const lesRes = await apiClient.get(`/lessons/module/${m.id}`);
              const lessons = Array.isArray(lesRes.data) ? lesRes.data : [];
              for (const l of lessons) {
                let video = '';
                let transcript = '';
                let asset: any = null;
                try {
                  const topRes = await apiClient.get(`/topics/lesson/${l.id}`);
                  const topics = Array.isArray(topRes.data) ? topRes.data : [];
                  const first = topics[0];
                  if (first?.id) {
                    // Real lesson media lives in the topic's asset (PDF/video) —
                    // fetch it so the player can show documents and videos, not
                    // just typed content.
                    try {
                      const aRes = await apiClient.get(`/content/asset/${first.id}`);
                      const a = aRes.data;
                      if (a?.physical_path) {
                        asset = {
                          type: a.type,
                          status: a.status,
                          // container path /app/uploads/... → public /uploads/...
                          url: String(a.physical_path).replace(/^\/app/, ''),
                        };
                      }
                    } catch { /* topic has no asset yet */ }
                  }
                  const content = first?.content || '';
                  const isUrl = /^(https?:)?\/\//.test(content) || content.startsWith('/uploads/');
                  video = asset?.type === 'VIDEO' && asset?.status === 'READY' ? asset.url : (isUrl ? content : '');
                  transcript = isUrl ? '' : content;
                } catch { /* lesson has no topics yet */ }
                mod.lessons.push({ id: l.id, title: l.title, duration: '—', completed: false, video, transcript, asset });
              }
            } catch { /* module has no lessons yet */ }
            course.modules.push(mod);
          }
        } catch { /* course has no modules yet */ }
        enriched.push(course);
      }
      if (enriched.length > 0) {
        setCourses(enriched);
        setSelectedCourse(enriched[0]);
        setPlayerCourseId(enriched[0].id);
        if (enriched[0].modules?.length > 0 && enriched[0].modules[0].lessons?.length > 0) {
          setActiveLesson(enriched[0].modules[0].lessons[0]);
        }
      }
    } catch (err: any) {
      console.warn('Could not load real courses — showing demo content', err?.message || err);
    } finally {
      setCoursesLoading(false);
    }
  };

  // --- TAB 1: Code Sandbox State ---
  const [codeLanguage, setCodeLanguage] = useState<'python' | 'cpp' | 'java'>('python');
  const [codeByLanguage, setCodeByLanguage] = useState<Record<string, string>>({
    python: LANGUAGE_TEMPLATES.python,
    cpp: LANGUAGE_TEMPLATES.cpp,
    java: LANGUAGE_TEMPLATES.java,
  });
  const [sandboxCode, setSandboxCode] = useState<string>(LANGUAGE_TEMPLATES.python);
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

  // --- REAL QUIZZES (student takes quizzes created by trainers/admins) ---
  const [quizList, setQuizList] = useState<any[]>([]);
  const [quizzesLoading, setQuizzesLoading] = useState(false);
  const [quizzesError, setQuizzesError] = useState('');
  const [pickedQuiz, setPickedQuiz] = useState<any>(null);
  const [quizQuestionIndex, setQuizQuestionIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizSubmitResult, setQuizSubmitResult] = useState<{ score: number; maxScore: number; graded: boolean } | null>(null);
  const submittingRef = useRef(false);

  // Exam lockdown: detect tab switches / focus loss / copy-paste during a real
  // quiz, log each violation to the Part-4 proctoring service, and auto-submit
  // after 3 strikes. Active only while a quiz is actually in progress.
  const {
    strikes: proctorStrikes,
    lastViolation: proctorViolation,
    autoSubmitted: proctorAutoSubmitted,
  } = useExamProctoring({
    enabled: examStarted && !!pickedQuiz,
    studentId: keycloak.subject || undefined,
    examId: pickedQuiz?.id,
    maxStrikes: 3,
    onAutoSubmit: () => submitRealQuiz(),
  });

  // Helper: the student's enrolled course ids (scoping quizzes/assignments to
  // the courses they are actually enrolled in — the backend requires them).
  const fetchEnrolledCourseIds = async (): Promise<string[]> => {
    try {
      const resp = await apiClient.get('/courses');
      const list = Array.isArray(resp.data) ? resp.data : [];
      return list.map((c: any) => c.id).filter(Boolean);
    } catch { return []; }
  };

  const fetchQuizzes = async () => {
    setQuizzesLoading(true);
    setQuizzesError('');
    try {
      const courseIds = await fetchEnrolledCourseIds();
      const qs = courseIds.length > 0 ? `?course_ids=${encodeURIComponent(courseIds.join(','))}` : '?course_ids=';
      const response = await apiClient.get(`/quizzes${qs}`);
      const data = response.data || [];
      setQuizList(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setQuizzesError(err?.response?.data?.message || err?.message || 'Failed to load quizzes');
    } finally {
      setQuizzesLoading(false);
    }
  };

  // --- REAL ASSIGNMENTS (student sees & submits assignments created by trainers/admins) ---
  const [assignmentList, setAssignmentList] = useState<any[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentsError, setAssignmentsError] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState('');
  // The student's own submission for the selected assignment (trainer's score + feedback)
  const [mySubmission, setMySubmission] = useState<any>(null);

  const fetchMySubmission = async (assignmentId: string) => {
    try {
      const response = await apiClient.get(`/assignments/${assignmentId}/my-submission`);
      setMySubmission(response.data || null);
    } catch { setMySubmission(null); }
  };

  const fetchAssignments = async () => {
    setAssignmentsLoading(true);
    setAssignmentsError('');
    try {
      const courseIds = await fetchEnrolledCourseIds();
      const qs = courseIds.length > 0 ? `?course_ids=${encodeURIComponent(courseIds.join(','))}` : '?course_ids=';
      const response = await apiClient.get(`/assignments${qs}`);
      const data = response.data || [];
      const list = Array.isArray(data) ? data : [];
      setAssignmentList(list);
      if (list.length > 0 && !selectedAssignmentId) {
        setSelectedAssignmentId(list[0].id);
        fetchMySubmission(list[0].id);
      }
    } catch (err: any) {
      setAssignmentsError(err?.response?.data?.message || err?.message || 'Failed to load assignments');
    } finally {
      setAssignmentsLoading(false);
    }
  };

  // --- LEADERBOARD STATE ---
  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState('');

  const fetchLeaderboard = async () => {
    setLeaderboardLoading(true);
    setLeaderboardError('');
    try {
      const response = await apiClient.get(`${window.location.origin}/api/gamification/leaderboard/global`, { params: { limit: 25 } });
      const data = response.data || [];
      setLeaderboardData(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setLeaderboardError(err?.response?.data?.detail || err?.message || 'Failed to load leaderboard');
    } finally {
      setLeaderboardLoading(false);
    }
  };

  // Award XP for real student actions (quiz completed, attendance check-in).
  // Routes to the Part-4 gamification service through the gateway. For quizzes
  // the score/maxScore are passed so XP scales with performance — aced quizzes
  // pay full base XP, weak attempts pay proportionally less (#xp-scaling).
  const awardXp = async (actionType: string, score?: number, maxScore?: number) => {
    try {
      const fullName = keycloak.tokenParsed?.preferred_username
        || [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(' ')
        || 'Student';
      await apiClient.post(`${window.location.origin}/api/gamification/award-xp`, {
        student_id: keycloak.subject || 'u-1',
        student_name: fullName,
        action_type: actionType,
        score: typeof score === 'number' ? score : null,
        max_score: typeof maxScore === 'number' ? maxScore : null,
      });
    } catch (err) {
      console.warn('XP award failed (non-critical)', err);
    }
  };

  // --- COMMAND CENTER LIVE STATS (#live-stats) ---
  // The overview cards used to be hardcoded (2,450 XP, Top 5%, #14) and never
  // changed. They are now fetched from the real services: XP + rank from the
  // gamification service, quiz-score standing from the assessment service.
  const [xpTotal, setXpTotal] = useState<number | null>(null);
  const [leaderboardRank, setLeaderboardRank] = useState<{ rank: number; total_students: number } | null>(null);
  const [scorePercentile, setScorePercentile] = useState<{ percentile: number | null; attempts: number } | null>(null);

  const fetchOverviewStats = async () => {
    if (!keycloak.subject) return;
    try {
      // 1. Total XP + level from the gamification service
      try {
        const xpResp = await apiClient.get(`${window.location.origin}/api/gamification/student/${keycloak.subject}`);
        setXpTotal(xpResp.data?.xp_points ?? 0);
      } catch { setXpTotal(0); }
      // 2. Global leaderboard rank (live, ZREVRANK-based)
      try {
        const rankResp = await apiClient.get(`${window.location.origin}/api/gamification/leaderboard/rank/${keycloak.subject}`);
        const d = rankResp.data || {};
        setLeaderboardRank({ rank: d.rank ?? 1, total_students: d.total_students ?? 1 });
      } catch { setLeaderboardRank(null); }
      // 3. Quiz-score percentile vs the whole college
      try {
        const pctResp = await apiClient.get('/quizzes/my-rank');
        const d = pctResp.data || {};
        setScorePercentile({ percentile: d.percentile ?? null, attempts: d.attempts ?? 0 });
      } catch { setScorePercentile(null); }
    } catch (err) {
      console.warn('Failed to load command-center stats', err);
    }
  };

  // Completed lessons across the student's enrolled courses — computed live
  // from the real curriculum state instead of the old hardcoded "12 / 18".
  const completedLessons = courses
    .filter(c => c.enrolled)
    .reduce((acc, c) => acc + (c.modules || []).reduce((a: number, m: any) => a + (m.lessons || []).filter((l: any) => l.completed).length, 0), 0);
  const totalLessons = courses
    .filter(c => c.enrolled)
    .reduce((acc, c) => acc + (c.modules || []).reduce((a: number, m: any) => a + (m.lessons || []).length, 0), 0);

  // Local record of quizzes this student already completed (survives refresh)
  const getQuizDone = (quizId: string) => {
    try {
      const raw = localStorage.getItem(`quizDone:${quizId}:${keycloak.subject || ''}`);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  };

  // --- CERTIFICATES STATE ---
  const [myCerts, setMyCerts] = useState<any[]>([]);
  const [certsLoading, setCertsLoading] = useState(false);
  const [certsError, setCertsError] = useState('');
  const [verifyResult, setVerifyResult] = useState<{ no: string; data: any; error: string } | null>(null);

  const fetchMyCertificates = async () => {
    setCertsLoading(true);
    setCertsError('');
    try {
      const response = await apiClient.get('/certificates/my');
      const data = response.data || [];
      setMyCerts(Array.isArray(data) ? data : data.data || []);
    } catch (err: any) {
      setCertsError(err?.response?.data?.message || err?.message || 'Failed to load certificates');
    } finally {
      setCertsLoading(false);
    }
  };

  const verifyCertificate = async (certificateNo: string) => {
    setVerifyResult({ no: certificateNo, data: null, error: '' });
    try {
      const response = await apiClient.get(`/certificates/verify/${certificateNo}`);
      setVerifyResult({ no: certificateNo, data: response.data, error: '' });
    } catch (err: any) {
      setVerifyResult({ no: certificateNo, data: null, error: err?.response?.data?.message || err?.message || 'Verification failed' });
    }
  };

  useEffect(() => {
    if (!examStarted || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [examStarted, timeLeft]);

  // Load live data when tabs open
  useEffect(() => {
    if (activeTab === 'overview') fetchOverviewStats();
    if (activeTab === 'leaderboard') fetchLeaderboard();
    if (activeTab === 'certificates') fetchMyCertificates();
    if (activeTab === 'attendance') fetchAttendanceCourses();
    if (activeTab === 'liveclasses') fetchLiveClasses();
    if (activeTab === 'assessment') fetchQuizzes();
    if (activeTab === 'assignments') fetchAssignments();
    if (activeTab === 'grades') fetchMyGrades();
    if (activeTab === 'notifications') fetchNotifications();
    if (activeTab === 'courses') fetchMyCourses();
    if (activeTab === 'forums') fetchForums();
    if (activeTab === 'chat') fetchChatRooms();
    if (activeTab === 'calendar') fetchCalendarEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // On first load, replace demo courses with the student's real enrolled courses
  // and pull the live command-center stats.
  useEffect(() => {
    fetchMyCourses();
    fetchOverviewStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- CORE LMS METHODS ---
  const handleLessonClick = (lesson: any) => {
    setActiveLesson(lesson);
    setIsPlayingVideo(false);
    setVideoWatchedProgress(0);
    setVideoError(false);
  };

  const handleLessonCompleteToggle = (lessonId: string) => {
    let toggledLesson: any = null;
    const updatedCourses = courses.map(course => {
      if (course.id !== selectedCourse.id) return course;
      
      const updatedModules = course.modules.map((mod: any) => {
        const updatedLessons = mod.lessons.map((les: any) => {
          if (les.id === lessonId) {
            toggledLesson = { ...les, completed: !les.completed };
            return toggledLesson;
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

    // Keep the video player's button in sync with the curriculum list
    if (toggledLesson && toggledLesson.id === activeLesson.id) {
      setActiveLesson(toggledLesson);
    }

    setCourses(updatedCourses);
  };

  // --- SANDBOX RUNNER ---
  const handleLanguageChange = (lang: 'python' | 'cpp' | 'java') => {
    // Save the current editor content against the current language first
    setCodeByLanguage(prev => ({ ...prev, [codeLanguage]: sandboxCode }));
    setCodeLanguage(lang);
    setSandboxCode(codeByLanguage[lang] || LANGUAGE_TEMPLATES[lang]);
    setSandboxOutput('');
    setSandboxError('');
    setSandboxStatus('');
  };

  const runSandboxCode = async () => {
    setIsSandboxRunning(true);
    setSandboxOutput('');
    setSandboxError('');
    setSandboxStatus('SPAWNING_ISOLATED_CONTAINER...');

    try {
      const response = await apiClient.post('/sandbox/execute', {
        language: codeLanguage,
        code: sandboxCode,
        input: sandboxInput,
        // C++/Java need time to compile + start the JVM — only Python is fast enough for 4s
        timeout: codeLanguage === 'python' ? 4000 : 15000,
      });

      const data = response.data || {};
      setSandboxOutput(data.output || '');
      setSandboxError(data.error || '');
      setSandboxStatus(data.status || 'FINISHED');
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Execution failed';
      setSandboxStatus('FAILED');
      setSandboxError(message);
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

  // --- REAL QUIZ TAKING (created by trainers/admins) ---
  const startQuiz = (quiz: any) => {
    setPickedQuiz(quiz);
    setQuizQuestionIndex(0);
    setQuizAnswers({});
    setExamStarted(true);
    setTimeLeft((quiz.duration_mins || 10) * 60);
    setQuizSubmitResult(null);
    setTestResult(null);
    setSelectedOption('');
  };

  const currentQuizQuestions = pickedQuiz?.questions || [];
  const currentQuizQuestion = currentQuizQuestions[quizQuestionIndex]?.question;

  const pickQuizAnswer = (questionId: string, optionId: string) => {
    setQuizAnswers(prev => ({ ...prev, [questionId]: optionId }));
  };

  const submitRealQuiz = async () => {
    if (!pickedQuiz || submittingRef.current) return;
    submittingRef.current = true;
    try {
      const response = await apiClient.post(`/quizzes/${pickedQuiz.id}/submit`, {
        answers: quizAnswers,
        // Exam-lockdown audit trail: violations logged to the Part-4 proctoring
        // service are summarized on the submission so trainers can review it.
        proctoring: {
          violation_count: proctorStrikes,
          auto_submitted: proctorAutoSubmitted,
          last_violation: proctorViolation,
        },
      });
      const res = response.data || {};
      const maxScore = currentQuizQuestions.reduce((acc: number, qq: any) => acc + (qq.question?.marks || 0), 0);
      setQuizSubmitResult({
        score: res.score ?? 0,
        maxScore,
        graded: res.is_graded !== false,
      });
      setExamStarted(false);
      // Record completion so the quiz list shows a "Completed" state, and award XP
      try {
        localStorage.setItem(`quizDone:${pickedQuiz.id}:${keycloak.subject || ''}`, JSON.stringify({ score: res.score ?? 0, maxScore, at: Date.now() }));
      } catch { /* ignore */ }
      if (res.is_graded !== false) {
        // XP now scales with the score — full marks pays the full 200 XP base,
        // partial scores pay proportionally (#xp-scaling).
        await awardXp('quiz_ace', res.score ?? 0, maxScore);
      }
      // Keep the command-center cards live after earning XP
      fetchOverviewStats();
    } catch (err: any) {
      const status = err?.response?.status;
      alert(status === 409
        ? 'You have already submitted this quiz — retakes are not allowed.'
        : 'Failed to submit quiz: ' + (err?.response?.data?.message || err?.message));
      if (status === 409) {
        setExamStarted(false);
        setPickedQuiz(null);
        fetchQuizzes();
      }
    } finally {
      submittingRef.current = false;
    }
  };

  // Auto-submit when the timer expires (submits the real quiz instead of hanging)
  useEffect(() => {
    if (examStarted && timeLeft <= 0 && pickedQuiz && Object.keys(quizAnswers).length > 0) {
      submitRealQuiz();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examStarted, timeLeft]);

  // --- AI TUTOR (RAG QUERY) ---
  const queryAiTutor = async () => {
    if (!tutorQuery.trim()) return;

    const query = tutorQuery;
    setTutorQuery('');
    setChatHistory(prev => [...prev, { sender: 'user', text: query }]);
    setIsTutorLoading(true);

    try {
      const response = await apiClient.post('/tutor/query', {
        student_query: query,
        // Send ALL lesson transcripts from the enrolled course so the tutor can
        // find relevant material instead of always re-answering from one lesson.
        course_context: courses
          .filter(c => c.enrolled)
          .flatMap((c: any) => (c.modules || []).flatMap((m: any) => (m.lessons || []).map((l: any) => l.transcript).filter(Boolean)))
          .join('\n')
          || activeLesson?.transcript
          || 'This is SannaLMS course context.',
      });

      const data = response.data || {};
      let answer = data.answer || 'I am ready to help.';
      if (typeof data.confidence_score === 'number') {
        answer += `\n\n(confidence: ${Math.round(data.confidence_score * 100)}%)`;
      }
      setChatHistory(prev => [...prev, { sender: 'bot', text: answer }]);
    } catch (err: any) {
      const message = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Tutor service unreachable';
      setChatHistory(prev => [...prev, { sender: 'bot', text: `${message}` }]);
    } finally {
      setIsTutorLoading(false);
    }
  };

  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [pickedFileInfo, setPickedFileInfo] = useState('');
  const [uploadedCodeContent, setUploadedCodeContent] = useState<string>('');
  const [replacingFile, setReplacingFile] = useState(false);

  // Re-upload a corrected attachment on an existing submission — replaces the
  // file in place (backend upserts the same row and resets the grade for
  // re-review), so the student never needs a whole new submission.
  const handleReplaceFile = async (e: any) => {
    const f = e.target?.files?.[0] as File | undefined;
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      alert('File is larger than the 10 MB limit. Please choose a smaller file.');
      e.target.value = '';
      return;
    }
    const assignmentId = selectedAssignmentId || assignmentList[0]?.id;
    if (!assignmentId) {
      alert('No assignment selected.');
      return;
    }
    setReplacingFile(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      // The apiClient defaults to Content-Type: application/json, which would
      // mangle the multipart body (no boundary) and make the server see "no
      // file". Override it so axios sets the proper multipart boundary.
      const up = await apiClient.post(`/assignments/upload?assignment_id=${assignmentId}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const rel = up.data?.url;
      const fileUrl = rel ? `${window.location.origin}${rel}` : '';
      // Preserve the existing written answer (if any) so only the attachment changes
      await apiClient.post(`/assignments/${assignmentId}/submit`, {
        text_content: mySubmission?.submission?.text_content || null,
        file_url: fileUrl || null,
      });
      await fetchMySubmission(assignmentId);
      alert('File replaced! Your trainer will re-review the updated submission.');
    } catch (err: any) {
      alert(`Replace failed: ${err?.response?.data?.message || err?.message || 'unknown error'}`);
    } finally {
      setReplacingFile(false);
      e.target.value = '';
    }
  };

  // Real file upload from PC / mobile (text files are loaded into the editor for editing)
  const TEXT_EXTENSIONS = ['py','js','ts','jsx','tsx','java','cpp','c','cc','h','hpp','cs','go','rb','php','txt','md','json','html','css','sql','sh','yml','yaml','xml','ini','cfg','log','csv'];
  const handleFilePick = (e: any) => {
    const f = e.target?.files?.[0] as File | undefined;
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) {
      alert('File is larger than the 10 MB limit. Please choose a smaller file.');
      e.target.value = '';
      return;
    }
    setPickedFile(f);
    setUploadedFileName(f.name);
    const ext = f.name.split('.').pop()?.toLowerCase() || '';
    const kb = (f.size / 1024).toFixed(1);
    if (TEXT_EXTENSIONS.includes(ext)) {
      const reader = new FileReader();
      reader.onload = () => setUploadedCodeContent(String(reader.result || '').slice(0, 50000));
      reader.readAsText(f);
      setPickedFileInfo(`${f.name} (${kb} KB) — loaded into the editor below.`);
    } else {
      setPickedFileInfo(`${f.name} (${kb} KB) — uploaded as-is (${ext.toUpperCase()} preview not available here).`);
    }
  };
  const handleSubmitAssignment = async () => {
    // Submit against the real assignment (created by the trainer) so it lands in the gradebook
    const assignmentId = selectedAssignmentId || assignmentList[0]?.id;
    if (!assignmentId) {
      alert('No assignment selected. Please pick an assignment from the list first.');
      return;
    }
    const code = uploadedCodeContent.trim();
    if (!code && !pickedFile) {
      alert('Add your answer as code/text OR attach a file (or both) before submitting.');
      return;
    }
    try {
      // Upload the picked file first — the trainer must be able to open it.
      let fileUrl = '';
      if (pickedFile) {
        const fd = new FormData();
        fd.append('file', pickedFile);
        // Override the global JSON Content-Type so the multipart body is sent
        // with a proper boundary (see note above).
        const up = await apiClient.post(`/assignments/upload?assignment_id=${assignmentId}`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const rel = up.data?.url;
        if (rel) fileUrl = `${window.location.origin}${rel}`;
      }
      await apiClient.post(`/assignments/${assignmentId}/submit`, {
        text_content: code || null,
        file_url: fileUrl || null,
      });
      fetchMySubmission(assignmentId);
      // The server records the submission; the trainer reviews it and releases a
      // score + feedback. No fake "plagiarism verdict" on submit.
      setPickedFile(null);
      setPickedFileInfo('');
      setUploadedCodeContent('');
      setUploadedFileName('');
      alert('Assignment submitted successfully! Your trainer will review and grade it.');
    } catch (err: any) {
      alert(`Submission failed: ${err?.response?.data?.message || err?.message || 'unknown error'}`);
    }
  };

  // --- STUDENT ATTENDANCE STATE (course-aware) ---
  // Real "my courses" come from the enrollments API; falls back to the tenant
  // course list (or the demo list) when a student isn't enrolled yet, so the
  // attendance tab always has context.
  const [attendanceCourses, setAttendanceCourses] = useState<any[]>([]);
  const [attendanceCourseId, setAttendanceCourseId] = useState('');
  const [attendanceSessionOptions, setAttendanceSessionOptions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [attendanceSessions, setAttendanceSessions] = useState<any[]>([]);
  const [attendanceStats, setAttendanceStats] = useState({ present: 0, total: 0, percentage: 0 });
  const [qrCodeInput, setQrCodeInput] = useState('');
  const [gpsLatitude, setGpsLatitude] = useState('12.9716');
  const [gpsLongitude, setGpsLongitude] = useState('77.5946');
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInMessage, setCheckInMessage] = useState('');

  const studentUserId = keycloak.subject || userProfile?.id || 'u-1';
  const selectedAttendanceSession = attendanceSessionOptions.find((x: any) => x.id === selectedSessionId);
  const selectedAttendanceCourse = attendanceCourses.find((x: any) => x.id === attendanceCourseId);
  // Students can only check in while the session is LIVE (trainer started it
  // and it hasn't auto-closed) — other sessions are listed but disabled.
  const selectedIsLive = !!selectedAttendanceSession && selectedAttendanceSession.status === 'LIVE';

  const fetchAttendanceCourses = async () => {
    let list: any[] = [];
    try {
      const response = await apiClient.get(`/enrollments/user/${studentUserId}`);
      const data = response.data || [];
      if (Array.isArray(data) && data.length > 0) {
        list = data.filter((e: any) => e.course).map((e: any) => ({ id: e.course_id, title: e.course?.title || e.course_id }));
      }
    } catch (err) { console.warn('Could not load enrolled courses', err); }
    // Fallback: all courses in the student's college (demo-friendly when no enrollment exists yet)
    if (list.length === 0) {
      try {
        const resp = await apiClient.get('/courses');
        const data = resp.data || [];
        if (Array.isArray(data) && data.length > 0) list = data.map((c: any) => ({ id: c.id, title: c.title }));
      } catch (err) { console.warn('Could not load courses', err); }
    }
    // Last resort: the demo course list so the tab always has context
    if (list.length === 0) list = courses.map((c: any) => ({ id: c.id, title: c.title }));
    setAttendanceCourses(list);
    if (list.length > 0) {
      const first = list[0];
      setAttendanceCourseId(first.id);
      await fetchAttendanceSessions(first.id);
      await fetchAttendanceReport(first.id, first.title);
    }
  };

  const fetchAttendanceSessions = async (courseId: string) => {
    try {
      const response = await apiClient.get(`/attendance/sessions?course_id=${encodeURIComponent(courseId)}`);
      const sessions = Array.isArray(response.data) ? response.data : [];
      setAttendanceSessionOptions(sessions);
      // Default to the first LIVE session so the student lands ready to check in
      const live = sessions.filter((s: any) => s.status === 'LIVE');
      setSelectedSessionId((live.length > 0 ? live[0] : sessions[0])?.id || '');
    } catch (err) {
      console.warn('Could not load attendance sessions', err);
      setAttendanceSessionOptions([]);
      setSelectedSessionId('');
    }
  };

  const fetchAttendanceReport = async (courseId: string, courseTitle: string) => {
    try {
      const response = await apiClient.get(`/attendance/report/${encodeURIComponent(courseId)}/student/${studentUserId}`);
      const data = response.data || {};
      setAttendanceStats({
        present: data.present || 0,
        total: data.total_sessions || 0,
        percentage: data.percentage || 0,
      });
      const records = Array.isArray(data.records) ? data.records : [];
      setAttendanceSessions(records.map((r: any) => ({
        id: r.id,
        courseName: courseTitle,
        date: r.check_in_at ? new Date(r.check_in_at).toLocaleDateString() : '',
        time: r.check_in_at ? new Date(r.check_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        status: r.status,
        type: r.method,
      })));
    } catch (err) { console.warn('Could not load attendance report', err); }
  };

  const refreshAttendance = async () => {
    if (!attendanceCourseId) return;
    const title = selectedAttendanceCourse?.title || 'Course';
    await fetchAttendanceSessions(attendanceCourseId);
    await fetchAttendanceReport(attendanceCourseId, title);
  };

  const handleGPSCheckIn = async () => {
    if (!selectedSessionId) { setCheckInMessage('Please pick a session first.'); return; }
    setCheckingIn(true);
    setCheckInMessage('');
    try {
      await apiClient.post('/attendance/checkin/gps', {
        session_id: selectedSessionId,
        lat: parseFloat(gpsLatitude),
        lng: parseFloat(gpsLongitude)
      });
      setCheckInMessage('GPS Check-in Successful! Location verified.');
      awardXp('perfect_attendance');
      await refreshAttendance();
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Check-in failed';
      setCheckInMessage(`Check-in Failed: ${message}`);
    } finally {
      setCheckingIn(false);
    }
  };

  const handleQRCheckIn = async (tokenOverride?: string) => {
    const token = (tokenOverride || qrCodeInput || '').trim();
    if (!token) {
      setCheckInMessage('Please select a session or paste a QR token first.');
      return;
    }
    setCheckingIn(true);
    setCheckInMessage('');
    try {
      await apiClient.post('/attendance/checkin/qr', { qr_token: token });
      setCheckInMessage('QR Code Check-in Successful!');
      awardXp('perfect_attendance');
      await refreshAttendance();
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Check-in failed';
      setCheckInMessage(`QR Check-in Failed: ${message}`);
    } finally {
      setCheckingIn(false);
    }
  };

  // --- NOTIFICATIONS INBOX (#fix) ---
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const fetchNotifications = async () => {
    setNotificationsLoading(true);
    try {
      const response = await apiClient.get('/notifications/history');
      setNotifications(Array.isArray(response.data) ? response.data : []);
    } catch { setNotifications([]); } finally { setNotificationsLoading(false); }
  };

  const markNotificationRead = async (id: string) => {
    try { await apiClient.put(`/notifications/${id}/read`); } catch { /* non-critical */ }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  // --- LIVE CLASSES (#fix): the college's scheduled live sessions ---
  const [liveClasses, setLiveClasses] = useState<any[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);

  const fetchLiveClasses = async () => {
    setLiveLoading(true);
    try {
      const r = await apiClient.get('/liveclasses');
      setLiveClasses(Array.isArray(r.data) ? r.data : []);
    } catch { setLiveClasses([]); } finally { setLiveLoading(false); }
  };

  const joinLiveClass = async (cls: any) => {
    try {
      const r = await apiClient.get(`/liveclasses/${cls.id}/join`);
      const data = r.data;
      if (data && data.jitsi_url) { window.open(data.jitsi_url, '_blank'); }
      else { alert('This class is not joinable right now.'); }
    } catch (err: any) { alert(err?.response?.data?.message || 'Failed to join the class'); }
  };

  // --- CALENDAR (#fix): events scheduled for the student's college ---
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const fetchCalendarEvents = async () => {
    setCalendarLoading(true);
    try {
      const response = await apiClient.get('/events');
      setCalendarEvents(Array.isArray(response.data) ? response.data : []);
    } catch { setCalendarEvents([]); } finally { setCalendarLoading(false); }
  };

  // Color-code event types so exams/holidays/deadlines stand out at a glance.
  const eventTypeMeta = (t: string) => {
    switch (t) {
      case 'EXAM': return { label: 'Exam', color: '#ff6b6b', bg: 'rgba(255,80,80,0.12)' };
      case 'CLASS': return { label: 'Class', color: '#60a5fa', bg: 'rgba(59,130,246,0.15)' };
      case 'ASSIGNMENT_DEADLINE': return { label: 'Assignment Deadline', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)' };
      case 'HOLIDAY': return { label: 'Holiday', color: '#34d399', bg: 'rgba(52,211,153,0.12)' };
      default: return { label: 'Event', color: '#94a3b8', bg: 'rgba(148,163,184,0.12)' };
    }
  };

  // --- FORUMS (#fix): students see their college's forums + post threads ---
  const [forums, setForums] = useState<any[]>([]);
  const [selectedForum, setSelectedForum] = useState<any>(null);
  const [forumThreads, setForumThreads] = useState<any[]>([]);
  const [forumsLoading, setForumsLoading] = useState(false);
  const [threadTitle, setThreadTitle] = useState('');
  const [threadContent, setThreadContent] = useState('');
  const [threadPosting, setThreadPosting] = useState(false);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const postForumReply = async (threadId: string) => {
    const content = (replyTexts[threadId] || '').trim();
    if (!content) return;
    setReplyingTo(threadId);
    try {
      await apiClient.post(`/threads/${threadId}/posts`, { content });
      setReplyTexts(prev => { const n = { ...prev }; delete n[threadId]; return n; });
      if (selectedForum) await openForum(selectedForum);
    } catch (err: any) { alert(err?.response?.data?.message || 'Failed to post reply'); } finally { setReplyingTo(null); }
  };

  const fetchForums = async () => {
    setForumsLoading(true);
    try {
      const response = await apiClient.get('/forums');
      setForums(Array.isArray(response.data) ? response.data : []);
    } catch { setForums([]); } finally { setForumsLoading(false); }
  };

  const openForum = async (f: any) => {
    setSelectedForum(f);
    setForumThreads([]);
    setForumsLoading(true);
    try {
      const r = await apiClient.get(`/threads/forum/${f.id}`);
      setForumThreads(Array.isArray(r.data) ? r.data : []);
    } catch { setForumThreads([]); } finally { setForumsLoading(false); }
  };

  const createForumThread = async (e: any) => {
    e.preventDefault();
    if (!selectedForum || !threadTitle.trim()) return;
    setThreadPosting(true);
    try {
      await apiClient.post('/threads', { forum_id: selectedForum.id, title: threadTitle.trim(), content: threadContent.trim() });
      setThreadTitle(''); setThreadContent('');
      await openForum(selectedForum);
    } catch (err: any) { alert(err?.response?.data?.message || 'Failed to post thread'); } finally { setThreadPosting(false); }
  };

  // --- CHAT (#fix): group chat rooms + direct messages for the student ---
  const [chatView, setChatView] = useState<'rooms' | 'dm'>('rooms');
  const [chatRooms, setChatRooms] = useState<any[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [roomMessages, setRoomMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMsg, setChatMsg] = useState('');
  const [chatSending, setChatSending] = useState(false);
  const chatMessagesEndRef = useRef<HTMLDivElement>(null);
  // Direct messages (a full UUID is required — the old free-text box let
  // people paste partial IDs and messages went nowhere) (#fix).
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const [dmTarget, setDmTarget] = useState('');
  const [dmConvo, setDmConvo] = useState<any[]>([]);
  const [dmMsg, setDmMsg] = useState('');
  const [dmLoading, setDmLoading] = useState(false);
  const [dmError, setDmError] = useState('');
  const dmMessagesEndRef = useRef<HTMLDivElement>(null);

  const loadDmConversation = async (target?: string) => {
    const id = (target ?? dmTarget).trim();
    if (!UUID_RE.test(id)) { setDmError('That does not look like a valid user ID (must be a full UUID). Ask the other person for their ID.'); setDmConvo([]); return; }
    setDmError('');
    setDmLoading(true);
    try {
      const r = await apiClient.get(`/chat/dm/${id}`);
      const data = Array.isArray(r.data) ? r.data : [];
      setDmConvo(data);
      // Auto-mark incoming DMs as read so the sender sees  (#fix).
      data.filter((m: any) => m.from_user === id && m.to_user === studentUserId && !m.is_read)
        .forEach((m: any) => apiClient.put(`/chat/dm/${m.id}/read`).catch(() => {}));
      setTimeout(() => dmMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { setDmConvo([]); } finally { setDmLoading(false); }
  };

  // DM inbox (#dm): everyone the student has exchanged DMs with — so an
  // incoming message shows up right in the list, no UUID pasting needed.
  const [dmConversations, setDmConversations] = useState<any[]>([]);

  const loadDmConversations = async () => {
    try {
      const r = await apiClient.get('/chat/dm/conversations');
      setDmConversations(Array.isArray(r.data) ? r.data : []);
    } catch { /* keep the last list */ }
  };

  const openDmConversation = async (otherId: string) => {
    setDmTarget(otherId);
    setDmError('');
    await loadDmConversation(otherId);
    loadDmConversations();
  };

  const sendDm = async () => {
    if (!dmMsg.trim() || !UUID_RE.test(dmTarget.trim())) { setDmError('Enter a valid user ID first.'); return; }
    setDmError('');
    try {
      await apiClient.post('/chat/dm', { to_user: dmTarget.trim(), content: dmMsg.trim() });
      setDmMsg('');
      await loadDmConversation();
      loadDmConversations();
    } catch (err: any) { setDmError(err?.response?.data?.message || 'Failed to send message'); }
  };

  const fetchChatRooms = async () => {
    setChatLoading(true);
    try {
      const response = await apiClient.get('/chat/rooms');
      setChatRooms(Array.isArray(response.data) ? response.data : []);
    } catch { setChatRooms([]); } finally { setChatLoading(false); }
  };

  const loadRoomMessages = async () => {
    if (!selectedRoom) return;
    try {
      const r = await apiClient.get(`/chat/rooms/${selectedRoom.id}/messages`);
      setRoomMessages(Array.isArray(r.data) ? r.data : []);
      setTimeout(() => chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch { setRoomMessages([]); }
  };

  const openRoom = async (room: any) => {
    setSelectedRoom(room);
    setRoomMessages([]);
    try { await apiClient.post(`/chat/rooms/${room.id}/join`); } catch { /* non-critical */ }
    await loadRoomMessages();
  };

  const sendChatMessage = async () => {
    if (!selectedRoom || !chatMsg.trim()) return;
    setChatSending(true);
    try {
      await apiClient.post(`/chat/rooms/${selectedRoom.id}/messages`, { content: chatMsg.trim() });
      setChatMsg('');
      await loadRoomMessages();
    } catch (err: any) { alert(err?.response?.data?.message || 'Failed to send message'); } finally { setChatSending(false); }
  };

  // Live updates: poll the open chat room and the DM conversation every 5s so
  // new messages appear without a manual reload (#live).
  useEffect(() => {
    if (activeTab !== 'chat' || !selectedRoom) return;
    const t = setInterval(loadRoomMessages, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, selectedRoom]);
  useEffect(() => {
    if (activeTab !== 'chat' || chatView !== 'dm' || !UUID_RE.test(dmTarget.trim())) return;
    const t = setInterval(() => loadDmConversation(), 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, chatView, dmTarget]);
  // Refresh the inbox (who's messaged me + unread counts) while on the DM view.
  useEffect(() => {
    if (activeTab !== 'chat' || chatView !== 'dm') return;
    loadDmConversations();
    const t = setInterval(loadDmConversations, 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, chatView]);

  // --- MY GRADES (#fix) ---
  const [myGrades, setMyGrades] = useState<any[]>([]);
  const [gradesLoading, setGradesLoading] = useState(false);

  const fetchMyGrades = async () => {
    setGradesLoading(true);
    try {
      // Real enrolled courses -> per-course gradebook + assignment marks
      const enrollRes = await apiClient.get(`/enrollments/user/${studentUserId}`);
      const enrollments = Array.isArray(enrollRes.data) ? enrollRes.data : [];
      const rows: any[] = [];
      for (const en of enrollments) {
        if (!en.course) continue;
        let grade: any = null;
        try { grade = (await apiClient.get(`/gradebook/${en.course_id}/student/${studentUserId}`)).data || null; } catch { /* no grade row yet */ }
        const assignRes = await apiClient.get(`/assignments?course_id=${encodeURIComponent(en.course_id)}`).catch(() => ({ data: [] }));
        const assigns = Array.isArray(assignRes.data) ? assignRes.data : [];
        const marks: any[] = [];
        for (const a of assigns) {
          try {
            const ms = (await apiClient.get(`/assignments/${a.id}/my-submission`)).data;
            if (ms?.submission) marks.push({ title: a.title, max_marks: a.max_marks, ...ms.submission });
          } catch { /* no submission */ }
        }
        rows.push({ course: en.course, grade, marks });
      }
      setMyGrades(rows);
    } catch { setMyGrades([]); } finally { setGradesLoading(false); }
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
            {selectedRole === 'STUDENT' && (
              <>
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
                <button className={`nav-link-btn ${activeTab === 'assignments' ? 'active' : ''}`} onClick={() => setActiveTab('assignments')}>
                  <FileText size={18} /> Assignments
                </button>
                <button className={`nav-link-btn ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>
                  <Calendar size={18} /> Attendance
                </button>
                <button className={`nav-link-btn ${activeTab === 'liveclasses' ? 'active' : ''}`} onClick={() => setActiveTab('liveclasses')}>
                  <Video size={18} /> Live Classes
                </button>
                <button className={`nav-link-btn ${activeTab === 'grades' ? 'active' : ''}`} onClick={() => setActiveTab('grades')}>
                  <GraduationCap size={18} /> My Grades
                </button>
                <button className={`nav-link-btn ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
                  <Bell size={18} /> Notifications
                </button>
                <button className={`nav-link-btn ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
                  <Calendar size={18} /> Calendar
                </button>
                <button className={`nav-link-btn ${activeTab === 'forums' ? 'active' : ''}`} onClick={() => setActiveTab('forums')}>
                  <MessageSquare size={18} /> Forums
                </button>
                <button className={`nav-link-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
                  <MessagesSquare size={18} /> Chat
                </button>
              </>
            )}

            {selectedRole === 'INSTRUCTOR' && (
              <>
                <button className={`nav-link-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                  <Activity size={18} /> Overview
                </button>
                <button className={`nav-link-btn ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
                  <Bell size={18} /> Notifications
                </button>
                <button className={`nav-link-btn ${activeTab === 'calendar' ? 'active' : ''}`} onClick={() => setActiveTab('calendar')}>
                  <Calendar size={18} /> Calendar
                </button>
                <button className={`nav-link-btn ${activeTab === 'forums' ? 'active' : ''}`} onClick={() => setActiveTab('forums')}>
                  <MessageSquare size={18} /> Forums
                </button>
                <button className={`nav-link-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
                  <MessagesSquare size={18} /> Chat
                </button>
                <a href={`https://admin.sannalms.sannainnovations.com/courses?token=${keycloak.token || ''}`} target="_blank" rel="noopener noreferrer" className="nav-link-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={18} /> Course Builder
                </a>
                <a href={`https://admin.sannalms.sannainnovations.com/liveclasses?token=${keycloak.token || ''}`} target="_blank" rel="noopener noreferrer" className="nav-link-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={18} /> Live Scheduler
                </a>
                <a href={`https://admin.sannalms.sannainnovations.com/assessments?token=${keycloak.token || ''}`} target="_blank" rel="noopener noreferrer" className="nav-link-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckSquare size={18} /> Gradebooks
                </a>
              </>
            )}

            {selectedRole === 'ADMIN' && (
              <>
                <button className={`nav-link-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
                  <Activity size={18} /> Overview
                </button>
                <a href={`https://admin.sannalms.sannainnovations.com/colleges?token=${keycloak.token || ''}`} target="_blank" rel="noopener noreferrer" className="nav-link-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} /> Colleges Portal
                </a>
                <a href={`https://admin.sannalms.sannainnovations.com/departments?token=${keycloak.token || ''}`} target="_blank" rel="noopener noreferrer" className="nav-link-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <BookOpen size={18} /> Departments
                </a>
                <a href={`https://admin.sannalms.sannainnovations.com/branches?token=${keycloak.token || ''}`} target="_blank" rel="noopener noreferrer" className="nav-link-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Layers size={18} /> Branches Portal
                </a>
                <a href={`https://admin.sannalms.sannainnovations.com/semesters?token=${keycloak.token || ''}`} target="_blank" rel="noopener noreferrer" className="nav-link-btn" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={18} /> Semesters
                </a>
              </>
            )}
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
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <a
              href={`${window.location.origin}/auth/realms/sannalms/account/`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ flex: 1, background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.25)', color: '#60a5fa', padding: '0.65rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', textDecoration: 'none', fontSize: '0.9rem', transition: 'all 0.2s' }}
            >
              <Settings size={16} /> Account
            </a>
            <button onClick={logout} style={{ flex: 1, background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.2)', color: '#fb7185', padding: '0.65rem', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s' }}>
              <LogOut size={16} /> Logout
            </button>
          </div>
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
              {activeTab === 'assignments' && 'Assignments & Submissions'}
              {activeTab === 'attendance' && 'Student GPS & QR Attendance Portal'}
              {activeTab === 'liveclasses' && 'Live Classes'}
              {activeTab === 'grades' && 'My Grades & Progress'}
              {activeTab === 'notifications' && 'Notifications Inbox'}
              {activeTab === 'calendar' && 'College Calendar & Events'}
              {activeTab === 'forums' && 'Discussion Forums'}
              {activeTab === 'chat' && 'College Chat'}
            </h1>
          </div>

          {/* Role Evaluator & Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '0.5rem 1rem', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.05)' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>View Mode:</span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button onClick={() => { setSelectedRole('STUDENT'); setActiveTab('overview'); }} style={{ padding: '0.35rem 0.75rem', borderRadius: '0.5rem', border: 'none', fontSize: '0.8rem', fontWeight: 600, background: selectedRole === 'STUDENT' ? 'var(--accent-indigo)' : 'transparent', color: selectedRole === 'STUDENT' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer' }}>Student</button>
              {hasTrainerRole && (
                <button onClick={() => { setSelectedRole('INSTRUCTOR'); setActiveTab('overview'); }} style={{ padding: '0.35rem 0.75rem', borderRadius: '0.5rem', border: 'none', fontSize: '0.8rem', fontWeight: 600, background: selectedRole === 'INSTRUCTOR' ? 'var(--accent-cyan)' : 'transparent', color: selectedRole === 'INSTRUCTOR' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer' }}>Trainer</button>
              )}
              {hasAdminRole && (
                <button onClick={() => { setSelectedRole('ADMIN'); setActiveTab('overview'); }} style={{ padding: '0.35rem 0.75rem', borderRadius: '0.5rem', border: 'none', fontSize: '0.8rem', fontWeight: 600, background: selectedRole === 'ADMIN' ? 'var(--accent-emerald)' : 'transparent', color: selectedRole === 'ADMIN' ? '#fff' : 'var(--text-secondary)', cursor: 'pointer' }}>Admin</button>
              )}
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
                <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', background: 'linear-gradient(to right, #fbbf24, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{xpTotal === null ? '—' : `${xpTotal.toLocaleString()} XP`}</h2>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '1.5rem' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Completed Lessons</p>
                <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--accent-cyan)' }}>{totalLessons > 0 ? `${completedLessons} / ${totalLessons}` : '—'}</h2>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '1.5rem' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Adaptive Score Rank</p>
                <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--accent-emerald)' }}>{scorePercentile?.percentile == null ? '—' : `Top ${Math.max(1, 100 - scorePercentile.percentile)}%`}</h2>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '1.5rem' }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Global Leaderboard Rank</p>
                <h2 style={{ fontSize: '2rem', marginTop: '0.5rem', color: 'var(--accent-indigo)' }}>{leaderboardRank ? `#${leaderboardRank.rank}` : '—'}</h2>
              </div>
            </div>

            {/* Dashboard details based on view-mode */}
            {selectedRole === 'STUDENT' && (
              <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '2rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.25rem', padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem' }}>Enrolled Courses</h3>
                  {courses.filter(c => c.enrolled).map(course => (
                    <div key={course.id} style={{ display: 'flex', gap: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.04)' }}>
                      <img src={course.image} alt={course.title} style={{ width: '120px', height: '80px', borderRadius: '8px', objectFit: 'cover' }}
                        onError={(e) => {
                          // Blocked/missing image (ad blocker, firewall): swap in a
                          // local placeholder instead of a broken icon (#fix).
                          (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="80"><rect width="120" height="80" rx="8" fill="#1e293b"/><text x="60" y="47" font-size="22" text-anchor="middle"></text></svg>');
                        }} />
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
                    <a href={`https://admin.sannalms.sannainnovations.com/courses?token=${keycloak.token || ''}`} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ display: 'inline-block', textDecoration: 'none', padding: '8px 16px', borderRadius: '6px' }}>Manage Courses</a>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '1rem', padding: '1.5rem', textAlign: 'center' }}>
                    <h4 style={{ marginBottom: '0.5rem' }}>Live Class Scheduler</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Schedule virtual sessions, assign links, and manage calendar logs.</p>
                    <a href={`https://admin.sannalms.sannainnovations.com/liveclasses?token=${keycloak.token || ''}`} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ display: 'inline-block', textDecoration: 'none', padding: '8px 16px', borderRadius: '6px' }}>Manage Live Classes</a>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '1rem', padding: '1.5rem', textAlign: 'center' }}>
                    <h4 style={{ marginBottom: '0.5rem' }}>Gradebooks & Quizzes</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Review student scorecards, upload quiz questions, and manage grade logs.</p>
                    <a href={`https://admin.sannalms.sannainnovations.com/assessments?token=${keycloak.token || ''}`} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ display: 'inline-block', textDecoration: 'none', padding: '8px 16px', borderRadius: '6px' }}>Manage Assessments</a>
                  </div>
                </div>
              </div>
            )}

            {selectedRole === 'ADMIN' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.25rem', padding: '2rem' }}>
                  <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>SaaS Admin Directories Console</h3>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '2.5rem' }}>
                    <a href={`https://admin.sannalms.sannainnovations.com/colleges?token=${keycloak.token || ''}`} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ textDecoration: 'none', padding: '10px 20px', borderRadius: '8px' }}>Colleges Portal</a>
                    <a href={`https://admin.sannalms.sannainnovations.com/departments?token=${keycloak.token || ''}`} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ textDecoration: 'none', padding: '10px 20px', borderRadius: '8px' }}>Departments Directory</a>
                    <a href={`https://admin.sannalms.sannainnovations.com/branches?token=${keycloak.token || ''}`} target="_blank" rel="noopener noreferrer" className="btn-secondary" style={{ textDecoration: 'none', padding: '10px 20px', borderRadius: '8px' }}>Branches Portal</a>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

            {/* Course switcher — students enrolled in multiple courses can jump between them */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{coursesLoading ? 'Loading your courses…' : 'My Courses:'}</span>
              {courses.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCourse(c); setPlayerCourseId(c.id); if (c.modules?.[0]?.lessons?.[0]) setActiveLesson(c.modules[0].lessons[0]); }}
                  style={{
                    padding: '0.45rem 1rem',
                    borderRadius: '999px',
                    border: '1px solid',
                    borderColor: playerCourseId === c.id ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.08)',
                    background: playerCourseId === c.id ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.02)',
                    color: playerCourseId === c.id ? '#a5b4fc' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  {c.title}
                </button>
              ))}
            </div>

            {(!selectedCourse || (selectedCourse.modules || []).length === 0) ? (
              <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '0.75rem' }}>
                <BookOpen size={32} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No course content published yet. Your trainer will add modules and lessons here.</p>
              </div>
            ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
            
            {/* Player Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ background: '#000', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.25rem', overflow: 'hidden', position: 'relative', aspectRatio: '16/9' }}>                        {isPlayingVideo && !videoError ? (
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
                    onError={() => setVideoError(true)}
                  />
                ) : isPlayingVideo && videoError ? (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.8))', color: '#cbd5e1', textAlign: 'center', padding: '1.5rem' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}></div>
                    <p style={{ fontSize: '0.9rem', maxWidth: '360px', lineHeight: 1.5 }}>
                      This video is unavailable on your network. Read the lesson transcript below instead.
                    </p>
                  </div>
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.8))', position: 'absolute', top: 0, left: 0 }}>
                    {activeLesson.video ? (
                      <button onClick={() => setIsPlayingVideo(true)} style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'var(--accent-cyan)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff', boxShadow: '0 0 20px rgba(6,182,212,0.4)', transition: 'transform 0.2s' }}>
                        <Play size={32} fill="#fff" />
                      </button>
                    ) : activeLesson.asset?.type === 'DOCUMENT' && activeLesson.asset?.status === 'READY' ? (
                      <a href={activeLesson.asset.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.4)', color: '#a5b4fc', padding: '0.7rem 1.4rem', borderRadius: '10px', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>
                        <FileText size={20} /> Open PDF
                      </a>
                    ) : (
                      <FileText size={40} color="var(--text-secondary)" />
                    )}
                    <p style={{ marginTop: '1.5rem', fontWeight: 600, fontSize: '1.1rem' }}>{activeLesson.title}</p>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      {activeLesson.video ? 'Click to play media session'
                        : activeLesson.asset?.type === 'DOCUMENT' && activeLesson.asset?.status === 'READY' ? 'Open the PDF to view the lesson material'
                        : activeLesson.transcript ? 'No video uploaded — read the lesson content below'
                        : 'No content added to this lesson yet'}
                    </span>
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
                {activeLesson.transcript && (
                  <>
                    <h4>Lecture Transcript Context (for RAG AI Tutor):</h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.6', marginTop: '0.5rem', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)' }}>
                      {activeLesson.transcript}
                    </p>
                  </>
                )}
                <button onClick={() => setActiveTab('tutor')} style={{ marginTop: '1rem', border: 'none', background: 'linear-gradient(135deg, var(--accent-indigo), var(--accent-cyan))', color: '#fff', padding: '0.65rem 1.25rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={16} /> Query AI Tutor on this Lesson
                </button>
              </div>

              {/* Course Reference Materials & Documents (#6) */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.25rem', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={18} color="var(--accent-cyan)" />
                    <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>Course Reference Materials & Documents</h4>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {courseResources.length} {courseResources.length === 1 ? 'file' : 'files'} available
                  </span>
                </div>

                {resourcesLoading ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading reference materials…</p>
                ) : courseResources.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>No reference materials uploaded for this course yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                    {courseResources.map((res: any) => {
                      const isLink = Boolean(res.link_url || res.content_type === 'link' || res.file_path?.startsWith('http'));
                      return (
                        <div
                          key={res.id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0.75rem 1rem',
                            borderRadius: '8px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                            <div style={{
                              width: '32px',
                              height: '32px',
                              minWidth: '32px',
                              borderRadius: '6px',
                              background: isLink ? 'rgba(16, 185, 129, 0.12)' : 'rgba(56, 189, 248, 0.12)',
                              border: isLink ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(56, 189, 248, 0.25)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {isLink ? <ExternalLink size={16} color="#10b981" /> : <FileText size={16} color="#38bdf8" />}
                            </div>
                            <div>
                              <p style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fff', margin: 0 }}>{res.title}</p>
                              <span style={{ fontSize: '0.75rem', color: isLink ? '#10b981' : 'var(--text-secondary)' }}>
                                {isLink ? 'Google Drive / Cloud Resource' : res.file_name}
                              </span>
                            </div>
                          </div>
                          {isLink ? (
                            <button
                              onClick={() => window.open(res.link_url || res.file_path, '_blank', 'noopener,noreferrer')}
                              style={{
                                padding: '0.4rem 0.9rem',
                                borderRadius: '6px',
                                border: '1px solid rgba(16,185,129,0.4)',
                                background: 'rgba(16,185,129,0.1)',
                                color: '#10b981',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                              }}
                            >
                              <ExternalLink size={14} /> Open Link
                            </button>
                          ) : (
                            <button
                              onClick={() => downloadResource(res.id, res.file_name || `${res.title}.pdf`)}
                              style={{
                                padding: '0.4rem 0.9rem',
                                borderRadius: '6px',
                                border: '1px solid rgba(6,182,212,0.4)',
                                background: 'rgba(6,182,212,0.1)',
                                color: 'var(--accent-cyan)',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.4rem',
                              }}
                            >
                              <Download size={14} /> Download
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
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
          </div>
        )}

        {/* 3. CODE SANDBOX TAB */}
        {activeTab === 'sandbox' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
            
            {/* Editor Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleLanguageChange('python')} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: codeLanguage === 'python' ? 'rgba(6,182,212,0.1)' : 'transparent', color: codeLanguage === 'python' ? 'var(--accent-cyan)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>Python</button>
                  <button onClick={() => handleLanguageChange('cpp')} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: codeLanguage === 'cpp' ? 'rgba(6,182,212,0.1)' : 'transparent', color: codeLanguage === 'cpp' ? 'var(--accent-cyan)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>C++</button>
                  <button onClick={() => handleLanguageChange('java')} style={{ padding: '0.5rem 1rem', borderRadius: '6px', border: 'none', background: codeLanguage === 'java' ? 'rgba(6,182,212,0.1)' : 'transparent', color: codeLanguage === 'java' ? 'var(--accent-cyan)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600 }}>Java</button>
                </div>

                <button onClick={runSandboxCode} disabled={isSandboxRunning} style={{ border: 'none', background: 'var(--accent-cyan)', color: '#fff', padding: '0.5rem 1.25rem', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isSandboxRunning ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} fill="#fff" />}
                  Execute Code
                </button>
              </div>

              <textarea 
                value={sandboxCode} 
                onChange={(e) => { setSandboxCode(e.target.value); setCodeByLanguage(prev => ({ ...prev, [codeLanguage]: e.target.value })); }}
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

        {/* 4. QUIZZES TAB (real quizzes created by trainers/admins) */}
        {activeTab === 'assessment' && (
          <div style={{ maxWidth: '750px', margin: '0 auto' }}>
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.25rem', padding: '2.5rem', position: 'relative' }}>

              {/* Quiz picker */}
              {!examStarted && !quizSubmitResult && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem' }}>Available Quizzes</h2>
                    <button onClick={fetchQuizzes} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                      {quizzesLoading ? 'Loading...' : 'Refresh'}
                    </button>
                  </div>

                  {quizzesError && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                      {quizzesError}
                    </div>
                  )}

                  {!quizzesLoading && !quizzesError && quizList.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '0.75rem' }}>
                      <CheckSquare size={32} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No quizzes assigned yet. Your trainer will publish quizzes here for you to attempt.</p>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {quizList.map((quiz: any) => {
                      // Server-authoritative completion state (blocks retakes);
                      // localStorage is only a fallback for older records.
                      const done = quiz.my_submission?.submitted ? quiz.my_submission : getQuizDone(quiz.id);
                      return (
                      <div key={quiz.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                        <div>
                          <h4 style={{ fontSize: '1rem', fontWeight: 700 }}>{quiz.title}{done && <span style={{ marginLeft: '8px', fontSize: '0.75rem', fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', padding: '2px 8px', borderRadius: '10px' }}>{done.score != null ? ` Completed ${done.score}/${done.maxScore}` : ' Submitted'}</span>}</h4>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            {(quiz.questions || []).length} questions · {quiz.duration_mins || 10} min · {quiz.description || 'No description'}
                          </span>
                        </div>
                        <button
                          onClick={() => startQuiz(quiz)}
                          disabled={!!done}
                          style={{ border: 'none', background: done ? 'rgba(255,255,255,0.06)' : 'var(--accent-emerald)', color: done ? 'var(--text-secondary)' : '#fff', padding: '0.5rem 1.25rem', borderRadius: '8px', cursor: done ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.9rem' }}
                        >
                          {done ? 'Completed' : 'Start Quiz'}
                        </button>
                      </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quiz in progress */}
              {examStarted && pickedQuiz && currentQuizQuestion && (
                <div>
                  {proctorStrikes > 0 && (
                    <div style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)', color: '#fca5a5', padding: '0.75rem 1rem', borderRadius: '10px', marginBottom: '1.25rem', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <ShieldAlert size={16} style={{ flexShrink: 0 }} />
                      <span>
                        Exam monitoring: {proctorStrikes} violation{proctorStrikes === 1 ? '' : 's'} detected
                        {proctorViolation ? ` (${proctorViolation.event_type.replace(/_/g, ' ')})` : ''}. Do not switch tabs or leave this window — after 3 violations the quiz is auto-submitted.
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem' }}>{pickedQuiz.title}</h3>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Question {quizQuestionIndex + 1} of {currentQuizQuestions.length}
                      </span>
                    </div>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: timeLeft < 60 ? '#f43f5e' : '#fff', fontWeight: 600 }}>
                      <Clock size={16} /> {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>{currentQuizQuestion.text}</h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                    {(currentQuizQuestion.options || []).map((opt: any, idx: number) => {
                      const optionId = typeof opt === 'string' ? opt : String(opt.id);
                      const optionText = typeof opt === 'string' ? opt : opt.text;
                      const isSelected = quizAnswers[currentQuizQuestion.id] === optionId;
                      return (
                        <button
                          key={idx}
                          onClick={() => pickQuizAnswer(currentQuizQuestion.id, optionId)}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '1rem',
                            background: isSelected ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.01)',
                            border: '1px solid',
                            borderColor: isSelected ? 'var(--accent-emerald)' : 'rgba(255,255,255,0.06)',
                            borderRadius: '8px',
                            color: '#fff',
                            cursor: 'pointer',
                            fontWeight: 500,
                            fontSize: '0.95rem',
                            transition: 'all 0.15s'
                          }}
                        >
                          {optionText}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      onClick={() => setQuizQuestionIndex(prev => Math.max(0, prev - 1))}
                      disabled={quizQuestionIndex === 0}
                      style={{ border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#fff', padding: '0.65rem 1.25rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, opacity: quizQuestionIndex === 0 ? 0.4 : 1 }}
                    >
                      Previous
                    </button>

                    {quizQuestionIndex < currentQuizQuestions.length - 1 ? (
                      <button
                        onClick={() => setQuizQuestionIndex(prev => prev + 1)}
                        style={{ border: 'none', background: 'var(--accent-indigo)', color: '#fff', padding: '0.65rem 1.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
                      >
                        Next Question
                      </button>
                    ) : (
                      <button
                        onClick={submitRealQuiz}
                        style={{ border: 'none', background: 'var(--accent-emerald)', color: '#fff', padding: '0.65rem 1.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
                      >
                        Submit Quiz
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Quiz result */}
              {quizSubmitResult && (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ background: 'rgba(99,102,241,0.1)', padding: '1rem', borderRadius: '50%', width: '70px', height: '70px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
                    <Award size={36} color="var(--accent-indigo)" />
                  </div>
                  <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Quiz Submitted!</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                    {quizSubmitResult.graded
                      ? 'Your answers were auto-graded and recorded in the gradebook.'
                      : 'Your answers were saved — the trainer will grade them manually.'}
                  </p>
                  <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1rem 2rem', borderRadius: '8px', display: 'inline-block', border: '1px solid rgba(255,255,255,0.04)', marginBottom: '2rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Your Score:</span>
                    <h3 style={{ fontSize: '2rem', color: 'var(--accent-cyan)' }}>{quizSubmitResult.score} / {quizSubmitResult.maxScore}</h3>
                  </div>
                  <div>
                    <button onClick={() => { setQuizSubmitResult(null); setPickedQuiz(null); fetchQuizzes(); }} style={{ border: 'none', background: 'var(--accent-indigo)', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}>
                      Back to Quizzes
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem' }}>Global XP Rankings</h3>
                <button onClick={fetchLeaderboard} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                  {leaderboardLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>

              {leaderboardError && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  {leaderboardError}
                </div>
              )}

              {!leaderboardLoading && !leaderboardError && leaderboardData.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '0.75rem' }}>
                  <Trophy size={32} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No XP rankings yet — complete lessons and assessments to earn points.</p>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {leaderboardData.map((user, idx) => {
                  const isMe = user.student_id === keycloak.subject;
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem 1.25rem',
                        background: isMe ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.01)',
                        border: '1px solid',
                        borderColor: isMe ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.03)',
                        borderRadius: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: user.rank <= 3 ? '#fbbf24' : 'var(--text-secondary)', width: '30px' }}>#{user.rank}</span>
                        <div>
                          <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>{user.student_name}{isMe ? ' (You)' : ''}</h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Level {user.level} · {user.xp_points} XP</span>
                        </div>
                      </div>
                      <span style={{ fontWeight: 700, color: 'var(--accent-cyan)', fontSize: '1rem' }}>{user.xp_points.toLocaleString()} XP</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 7. CERTIFICATES TAB */}
        {activeTab === 'certificates' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.25rem' }}>My Certificates</h3>
              <button onClick={fetchMyCertificates} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                {certsLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {certsError && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem' }}>
                {certsError}
              </div>
            )}

            {!certsLoading && !certsError && myCerts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '0.75rem' }}>
                <Award size={32} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No certificates issued yet. Complete your courses to earn verified credentials.</p>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {myCerts.map(cert => (
                <div key={cert.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.25rem', padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '240px' }}>
                  <div>
                    <Award size={36} color="var(--accent-cyan)" style={{ marginBottom: '1rem' }} />
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.35rem', lineHeight: '1.4' }}>{cert.course_title || cert.course}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Issued: {cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : 'N/A'}</span>
                    {cert.grade && <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--accent-emerald)', marginTop: '0.25rem' }}>Grade: {cert.grade}</span>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                    <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>ID: {cert.certificate_no || cert.id}</span>
                    <button onClick={() => verifyCertificate(cert.certificate_no || cert.id)} style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--accent-cyan)', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      Verify Credentials <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {verifyResult && (
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1rem', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <h4 style={{ fontSize: '1rem' }}>Verification Result — {verifyResult.no}</h4>
                  <button onClick={() => setVerifyResult(null)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '1.2rem' }}></button>
                </div>
                {verifyResult.error ? (
                  <p style={{ color: '#f87171', fontSize: '0.9rem' }}>{verifyResult.error}</p>
                ) : verifyResult.data ? (
                  verifyResult.data.is_revoked ? (
                    <div style={{ fontSize: '0.9rem', color: '#f87171', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span>This certificate has been revoked{verifyResult.data.revoke_reason ? ` — ${verifyResult.data.revoke_reason}` : ''}.</span>
                      <span>Holder: {verifyResult.data.student_name}</span>
                      <span>Course: {verifyResult.data.course_title}</span>
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.9rem', color: 'var(--accent-emerald)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <span>Certificate is valid.</span>
                      <span>Holder: {verifyResult.data.student_name}</span>
                      <span>Course: {verifyResult.data.course_title}</span>
                      {verifyResult.data.issued_at && <span>Issued: {new Date(verifyResult.data.issued_at).toLocaleDateString()}</span>}
                    </div>
                  )
                ) : (
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Verifying...</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* 8. ASSIGNMENTS TAB */}
        {activeTab === 'assignments' && (
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.25rem', padding: '2rem' }}>
{true && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: '#fff' }}>Submit New Assignment</h3>
                  <button onClick={fetchAssignments} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                    {assignmentsLoading ? 'Loading...' : 'Refresh'}
                  </button>
                </div>

                {assignmentsError && (
                  <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
                    {assignmentsError}
                  </div>
                )}

                {!assignmentsLoading && !assignmentsError && assignmentList.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '0.75rem', marginBottom: '1rem' }}>
                    <FileText size={28} style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }} />
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No assignments published yet. Your trainer will add assignments here for you to submit.</p>
                  </div>
                )}

                {assignmentList.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Select Assignment to Submit</label>
                    <select
                      value={selectedAssignmentId}
                      onChange={e => { setSelectedAssignmentId(e.target.value); fetchMySubmission(e.target.value); }}
                      style={{ width: '100%', background: '#040711', color: '#fff', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.35rem', padding: '0.5rem 0.75rem', outline: 'none' }}
                    >
                      {assignmentList.map((a: any) => (
                        <option key={a.id} value={a.id}>{a.title} (due: {a.due_date ? new Date(a.due_date).toLocaleDateString() : 'no due date'})</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ marginBottom: '1.2rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>Upload File (from PC or Mobile)</label>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input
                      type="file"
                      id="assignment-file-input"
                      style={{ display: 'none' }}
                      onChange={handleFilePick}
                    />
                    <button
                      onClick={() => document.getElementById('assignment-file-input')?.click()}
                      style={{ border: '1px solid rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.12)', color: '#34d399', padding: '0.55rem 1.1rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                    >
                      <Upload size={15} /> Choose File
                    </button>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{pickedFileInfo || 'No file chosen yet — type your answer below and/or attach a file.'}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  {/* Left Form */}
                  <div>
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Assignment Code Content</label>
                      <textarea
                        rows={10}
                        value={uploadedCodeContent}
                        onChange={e => setUploadedCodeContent(e.target.value)}
                        style={{ width: '100%', background: '#040711', color: '#10b981', fontFamily: 'monospace', fontSize: '0.85rem', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.35rem', padding: '0.75rem', outline: 'none', resize: 'vertical' }}
                      />
                    </div>

                    <button
                      onClick={handleSubmitAssignment}
                      style={{ border: 'none', background: 'var(--accent-emerald)', color: '#fff', padding: '0.65rem 1.5rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      <Upload size={16} /> Submit Assignment
                    </button>
                  </div>

                  {/* Right History */}
                  <div>
                    {mySubmission?.submission && (
                      <div style={{ marginBottom: '1.5rem', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '0.75rem', padding: '1rem' }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.6rem', color: '#fff' }}>My Submission & Marks</h3>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                          Submitted: {mySubmission.submission.submitted_at ? new Date(mySubmission.submission.submitted_at).toLocaleString() : '—'}
                        </div>
                        {mySubmission.submission.file_url && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                            {mySubmission.submission.file_url.startsWith('http') || mySubmission.submission.file_url.startsWith('/') ? (
                              <a href={mySubmission.submission.file_url.startsWith('http') ? mySubmission.submission.file_url : `${window.location.origin}${mySubmission.submission.file_url}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-cyan)', textDecoration: 'underline' }}>{mySubmission.submission.file_url.split('/').pop()}</a>
                            ) : (
                              <span style={{ color: 'var(--text-secondary)' }}>{mySubmission.submission.file_url} (file not attached — older submission)</span>
                            )}
                            <div style={{ marginTop: '0.5rem' }}>
                              <input type="file" id="assignment-replace-input" style={{ display: 'none' }} onChange={handleReplaceFile} />
                              <button
                                onClick={() => document.getElementById('assignment-replace-input')?.click()}
                                disabled={replacingFile}
                                style={{ border: '1px solid rgba(251,191,36,0.4)', background: 'rgba(251,191,36,0.1)', color: '#fbbf24', padding: '0.4rem 0.9rem', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                              >
                                <RefreshCw size={13} /> {replacingFile ? 'Replacing…' : 'Replace File'}
                              </button>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>Upload a corrected file — it replaces this attachment (grade resets for re-review).</span>
                            </div>
                          </div>
                        )}
                        {mySubmission.submission.is_graded ? (
                          <div style={{ fontSize: '0.9rem', marginTop: '0.4rem' }}>
                            <span style={{ fontWeight: 700, color: 'var(--accent-emerald)' }}>Score: {mySubmission.submission.score} / {mySubmission.assignment?.max_marks ?? '—'}</span>
                            {mySubmission.submission.feedback && (
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>Feedback: {mySubmission.submission.feedback}</div>
                            )}
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.85rem', color: '#fbbf24', marginTop: '0.4rem' }}>Submitted — awaiting trainer review & marks</div>
                        )}
                      </div>
                    )}
                    {!mySubmission?.submission && (
                      <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '1.5rem', borderRadius: '0.75rem' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', color: '#fff' }}>How grading works</h3>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                          Your submission goes straight to your trainer. They review it, award marks, and add feedback —
                          you'll see your score here once it's graded. Marks also flow into <strong>My Grades</strong>.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            

            
          </div>
        )}

        {/* 9a. MY GRADES TAB (#fix) */}
        {activeTab === 'grades' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>My Grades</h2>
              <button onClick={fetchMyGrades} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
                {gradesLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {gradesLoading ? (
              <p style={{ color: 'var(--text-secondary)' }}>Loading your grades...</p>
            ) : myGrades.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '0.75rem' }}>
                <GraduationCap size={32} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No enrolled courses yet. Once your college admin enrolls you, your grades and assignment marks will appear here.</p>
              </div>
            ) : myGrades.map(row => (
              <div key={row.course.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '1rem', padding: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{row.course.title}</h3>
                  {row.grade && row.grade.grade ? (
                    <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center', fontSize: '0.9rem' }}>
                      <span style={{ fontWeight: 800, color: row.grade.grade === 'F' ? '#ef4444' : 'var(--accent-emerald)' }}>Grade: {row.grade.grade}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>Score: {row.grade.total_score} / {row.grade.max_score}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>CGPA: {row.grade.cgpa ? Number(row.grade.cgpa).toFixed(1) : '—'}</span>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No grade calculated yet — completes your assignments & quizzes</span>
                  )}
                </div>
                {row.marks.length > 0 && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
                        <th style={{ padding: '8px', textAlign: 'left', color: 'var(--text-secondary)' }}>Assignment</th>
                        <th style={{ padding: '8px', textAlign: 'center', color: 'var(--text-secondary)' }}>Score</th>
                        <th style={{ padding: '8px', textAlign: 'center', color: 'var(--text-secondary)' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {row.marks.map((m: any) => (
                        <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '8px', color: '#fff' }}>{m.title}</td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>{m.is_graded ? `${m.score} / ${m.max_marks}` : '—'}</td>
                          <td style={{ padding: '8px', textAlign: 'center' }}>
                            {m.is_graded ? (
                              <span style={{ color: '#34d399', fontWeight: 700 }}> Graded{m.feedback ? ` — ${m.feedback}` : ''}</span>
                            ) : (
                              <span style={{ color: '#fbbf24' }}>Submitted — pending review</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 9b. NOTIFICATIONS TAB (#fix) */}
        {activeTab === 'notifications' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>Notifications</h2>
              <button onClick={fetchNotifications} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
                {notificationsLoading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {notificationsLoading ? (
              <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
            ) : notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '0.75rem' }}>
                <Bell size={32} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No notifications yet. Announcements from your college and trainers will appear here.</p>
              </div>
            ) : notifications.map(n => (
              <div
                key={n.id}
                onClick={() => !n.is_read && markNotificationRead(n.id)}
                style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: `1px solid ${n.is_read ? 'rgba(255,255,255,0.05)' : 'rgba(59,130,246,0.45)'}`, borderRadius: '0.75rem', padding: '1rem' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                  <strong style={{ color: '#fff', fontSize: '0.95rem' }}>
                    {n.title}
                    {!n.is_read && (
                      <span style={{ marginLeft: '8px', fontSize: '0.65rem', fontWeight: 800, color: '#fff', background: '#3b82f6', padding: '2px 8px', borderRadius: '10px', verticalAlign: 'middle' }}>NEW</span>
                    )}
                  </strong>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{n.body}</p>
              </div>
            ))}
          </div>
        )}

        {/* 9c. FORUMS TAB (#fix) — college forums + thread posting */}
        {activeTab === 'forums' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>
                {selectedForum ? selectedForum.title : 'Discussion Forums'}
              </h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedForum && (
                  <button onClick={() => { setSelectedForum(null); setForumThreads([]); }} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>← Back to forums</button>
                )}
                <button onClick={selectedForum ? openForum.bind(null, selectedForum) : fetchForums} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>
                  {forumsLoading ? 'Loading...' : 'Refresh'}
                </button>
              </div>
            </div>

            {!selectedForum ? (
              forumsLoading ? (
                <p style={{ color: 'var(--text-secondary)' }}>Loading forums...</p>
              ) : forums.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '0.75rem' }}>
                  <MessageSquare size={32} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No forums available for your college yet.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                  {forums.map(f => (
                    <div
                      key={f.id}
                      onClick={() => openForum(f)}
                      style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', padding: '1.25rem', transition: 'all 0.15s' }}
                    >
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
                        {f.title}
                        {f.is_locked && <span style={{ fontSize: '0.65rem', marginLeft: '6px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(251,191,36,0.15)', color: '#fbbf24', verticalAlign: 'middle' }}>Closed</span>}
                      </h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>{f.description}</p>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <>
                {selectedForum.is_locked && (
                  <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: '0.75rem', padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#fbbf24' }}>
                    <strong>This forum is closed.</strong> No new threads or replies can be posted.
                  </div>
                )}
                <form onSubmit={createForumThread} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', padding: '1rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center', opacity: selectedForum.is_locked ? 0.5 : 1, pointerEvents: selectedForum.is_locked ? 'none' : 'auto' }}>
                  <input className="input-field" placeholder="Thread title" value={threadTitle} onChange={e => setThreadTitle(e.target.value)} style={{ flex: 1, minWidth: '160px' }} required disabled={selectedForum.is_locked} />
                  <input className="input-field" placeholder="What's on your mind?" value={threadContent} onChange={e => setThreadContent(e.target.value)} style={{ flex: 2, minWidth: '220px' }} required disabled={selectedForum.is_locked} />
                  <button type="submit" className="btn-primary" disabled={threadPosting || selectedForum.is_locked} style={{ padding: '8px 18px' }}>{threadPosting ? 'Posting...' : 'Post Thread'}</button>
                </form>

                {forumsLoading ? (
                  <p style={{ color: 'var(--text-secondary)' }}>Loading threads...</p>
                ) : forumThreads.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>No threads yet — start the first one above.</p>
                ) : forumThreads.map(t => (
                  <div key={t.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{t.title}</strong>
                      {t.is_solved && <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16,185,129,0.12)', padding: '2px 8px', borderRadius: '10px' }}>Solved</span>}
                    </div>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0' }}>{t.content}</p>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {t.user_id ? `${t.user_id === studentUserId ? 'You' : 'Peer'} · ` : ''}{t.created_at ? new Date(t.created_at).toLocaleString() : ''}
                    </div>

                    {/* Replies (#fix): replies render under their thread */}
                    {(t.posts || []).length > 0 && (
                      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: '0.6rem', paddingTop: '0.6rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {(t.posts || []).map((p: any) => (
                          <div key={p.id} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '0.5rem', padding: '0.5rem 0.75rem' }}>
                            <div style={{ fontSize: '0.85rem' }}>{p.content}</div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                              {p.user_id ? `${p.user_id === studentUserId ? 'You' : 'Peer'} · ` : ''}{p.created_at ? new Date(p.created_at).toLocaleString() : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.6rem', opacity: selectedForum.is_locked ? 0.5 : 1, pointerEvents: selectedForum.is_locked ? 'none' : 'auto' }}>
                      <input
                        className="input-field"
                        style={{ flex: 1 }}
                        placeholder={selectedForum.is_locked ? 'Forum is closed' : 'Write a reply...'}
                        value={replyTexts[t.id] || ''}
                        onChange={e => setReplyTexts({ ...replyTexts, [t.id]: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && postForumReply(t.id)}
                        disabled={selectedForum.is_locked}
                      />
                      <button className="btn-primary" style={{ padding: '0 1rem' }} disabled={replyingTo === t.id || selectedForum.is_locked} onClick={() => postForumReply(t.id)}>
                        {replyingTo === t.id ? 'Posting...' : 'Reply'}
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* 9d. CHAT TAB (#fix) — group chat rooms for the student's college */}
        {activeTab === 'chat' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '75vh' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>
                {chatView === 'dm' ? 'Direct Messages' : (selectedRoom ? `#${selectedRoom.name}` : 'Group Chat')}
              </h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className={chatView === 'rooms' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '6px 14px', fontSize: '0.85rem' }} onClick={() => setChatView('rooms')}>Group Chat</button>
                <button className={chatView === 'dm' ? 'btn-primary' : 'btn-secondary'} style={{ padding: '6px 14px', fontSize: '0.85rem' }} onClick={() => setChatView('dm')}>Direct Messages</button>
                {chatView === 'rooms' && selectedRoom && (
                  <button onClick={() => setSelectedRoom(null)} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>← Rooms</button>
                )}
                {chatView === 'rooms' && (
                  <button onClick={selectedRoom ? loadRoomMessages : fetchChatRooms} className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.85rem' }}>{chatLoading ? 'Loading...' : 'Refresh'}</button>
                )}
              </div>
            </div>

            {chatView === 'dm' ? (
              <div style={{ flex: 1, display: 'flex', gap: '1rem', minHeight: 0 }}>
                {/* Inbox (#dm): everyone who has messaged me — click to open */}
                <div style={{ width: '240px', flexShrink: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '0.75rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem' }}>
                  <p style={{ fontSize: '0.75rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', margin: 0 }}>Inbox</p>
                  {dmConversations.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
                      No conversations yet — when a trainer or admin messages you, it appears here.
                    </p>
                  ) : dmConversations.map((c: any) => (
                    <div
                      key={c.user_id}
                      onClick={() => openDmConversation(c.user_id)}
                      style={{ cursor: 'pointer', padding: '0.6rem 0.7rem', borderRadius: '0.5rem', background: dmTarget === c.user_id ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name || 'User'}</span>
                        {c.unread_count > 0 && <span style={{ background: '#f87171', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>{c.unread_count}</span>}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: '2px' }}>
                        {c.last_message || 'No messages yet'}
                      </div>
                    </div>
                  ))}
                </div>
                {/* Open conversation */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                    <input
                      className="input-field"
                      style={{ flex: 1, minWidth: '220px' }}
                      placeholder="Start a new chat — paste a user ID (full UUID)"
                      value={dmTarget}
                      onChange={e => setDmTarget(e.target.value)}
                    />
                    <button className="btn-secondary" style={{ padding: '0 1rem' }} onClick={() => loadDmConversation()}>{dmLoading ? 'Loading...' : 'Load Conversation'}</button>
                  </div>
                  {dmError && <p style={{ fontSize: '0.8rem', color: '#f87171', margin: '0 0 0.5rem' }}> {dmError}</p>}
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', marginBottom: '1rem' }}>
                    {dmConvo.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: 'auto' }}>
                        {UUID_RE.test(dmTarget.trim()) ? 'No messages yet in this conversation.' : 'Pick a conversation from the inbox on the left.'}
                      </p>
                    ) : dmConvo.map(m => (
                      <div key={m.id} style={{ display: 'flex', justifyContent: m.from_user === studentUserId ? 'flex-end' : 'flex-start' }}>
                        <div style={{ maxWidth: '65%', padding: '0.6rem 0.9rem', borderRadius: '0.75rem', fontSize: '0.9rem', background: m.from_user === studentUserId ? 'rgba(59,130,246,0.35)' : 'rgba(255,255,255,0.06)' }}>
                          <div>{m.content}</div>
                          <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: '0.25rem' }}>
                            {m.from_user === studentUserId ? 'You' : (dmConversations.find((c: any) => c.user_id === m.from_user)?.name || 'Peer')} · {m.created_at ? new Date(m.created_at).toLocaleTimeString() : ''} {m.from_user === studentUserId ? (m.is_read ? '' : '') : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                    <div ref={dmMessagesEndRef} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      className="input-field"
                      style={{ flex: 1 }}
                      placeholder="Write a message..."
                      value={dmMsg}
                      onChange={e => setDmMsg(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && sendDm()}
                    />
                    <button className="btn-primary" onClick={sendDm} disabled={!dmMsg.trim()} style={{ padding: '0 1.2rem' }}><Send size={18} /></button>
                  </div>
                </div>
              </div>
            ) : !selectedRoom ? (
              chatLoading ? (
                <p style={{ color: 'var(--text-secondary)' }}>Loading rooms...</p>
              ) : chatRooms.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '0.75rem' }}>
                  <MessagesSquare size={32} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No chat rooms yet — your trainers or college admin can create one.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                  {chatRooms.map(room => (
                    <div
                      key={room.id}
                      onClick={() => openRoom(room)}
                      style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.75rem', padding: '1.25rem', transition: 'all 0.15s' }}
                    >
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
                        #{room.name}
                        {room.is_locked && <span style={{ fontSize: '0.65rem', marginLeft: '6px', padding: '2px 8px', borderRadius: '10px', background: 'rgba(251,191,36,0.15)', color: '#fbbf24', verticalAlign: 'middle' }}>Closed</span>}
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                        {room._count?.members ?? 0} members · {room._count?.messages ?? 0} messages
                      </p>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.75rem', marginBottom: '1rem' }}>
                  {roomMessages.length === 0 ? (
                    <p style={{ color: 'var(--text-secondary)', textAlign: 'center', margin: 'auto' }}>No messages yet — say hello!</p>
                  ) : roomMessages.map(msg => (
                    <div key={msg.id} style={{ display: 'flex', justifyContent: msg.user_id === studentUserId ? 'flex-end' : 'flex-start' }}>
                      <div style={{ maxWidth: '65%', padding: '0.6rem 0.9rem', borderRadius: '0.75rem', fontSize: '0.9rem', background: msg.user_id === studentUserId ? 'rgba(59,130,246,0.35)' : 'rgba(255,255,255,0.06)' }}>
                        <div>{msg.content}</div>
                        <div style={{ fontSize: '0.65rem', opacity: 0.6, marginTop: '0.25rem' }}>
                          {msg.user_id === studentUserId ? 'You' : 'Peer'} · {msg.created_at ? new Date(msg.created_at).toLocaleTimeString() : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatMessagesEndRef} />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', opacity: selectedRoom.is_locked ? 0.5 : 1, pointerEvents: selectedRoom.is_locked ? 'none' : 'auto' }}>
                  <input
                    className="input-field"
                    style={{ flex: 1 }}
                    placeholder={selectedRoom.is_locked ? 'Room is closed — read only' : 'Type a message...'}
                    value={chatMsg}
                    onChange={e => setChatMsg(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                    disabled={selectedRoom.is_locked}
                  />
                  <button className="btn-primary" onClick={sendChatMessage} disabled={chatSending || !chatMsg.trim() || selectedRoom.is_locked} style={{ padding: '0 1.2rem' }}>
                    {chatSending ? 'Sending...' : <Send size={18} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 8b. CALENDAR TAB (#fix) — events scheduled for the student's college */}
        {activeTab === 'calendar' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {calendarLoading ? (
              <p style={{ color: 'var(--text-secondary)' }}>Loading events...</p>
            ) : calendarEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '0.75rem' }}>
                <Calendar size={32} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No events scheduled yet — your college admin or trainers will add them here.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
                {calendarEvents.map((ev: any) => {
                  const meta = eventTypeMeta(ev.event_type);
                  const start = new Date(ev.start_time);
                  const end = new Date(ev.end_time);
                  const now = new Date();
                  const status = start > now ? 'upcoming' : (end >= now ? 'ongoing' : 'past');
                  return (
                    <div key={ev.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.9rem', padding: '1.25rem', opacity: status === 'past' ? 0.55 : 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>{status}</span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '3px 9px', borderRadius: '12px', background: meta.bg, color: meta.color }}>{meta.label}</span>
                      </div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: 0 }}>{ev.title}</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0.5rem 0 1rem' }}>{ev.description || 'No description.'}</p>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <div>{start.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</div>
                        <div>{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 8c. LIVE CLASSES TAB (#fix) — the college's live sessions for students */}
        {activeTab === 'liveclasses' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {liveLoading ? (
              <p style={{ color: 'var(--text-secondary)' }}>Loading classes...</p>
            ) : liveClasses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed rgba(255,255,255,0.08)', borderRadius: '0.75rem' }}>
                <Video size={32} style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }} />
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No live classes scheduled yet — your trainers will add them here.</p>
              </div>
            ) : (
              liveClasses.map((c: any) => {
                const status = c.is_live ? 'live' : (c.ended_at ? 'ended' : 'upcoming');
                return (
                  <div key={c.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.9rem', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', opacity: status === 'ended' ? 0.55 : 1 }}>
                    <div style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', margin: 0 }}>{c.title}</h3>
                        {status === 'live' && <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: '12px', background: 'rgba(255,71,87,0.15)', color: '#ff4757' }}>LIVE</span>}
                        {status === 'ended' && <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: '12px', background: 'rgba(148,163,184,0.15)', color: '#94a3b8' }}> Ended</span>}
                        {status === 'upcoming' && <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '3px 9px', borderRadius: '12px', background: 'rgba(52,211,153,0.15)', color: '#34d399' }}>Upcoming</span>}
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem' }}>{c.description || 'No description.'}</p>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {c.scheduled_at ? new Date(c.scheduled_at).toLocaleString() : ''} · {c.duration_mins} mins
                      </div>
                    </div>
                    {status !== 'ended' && (
                      <button className="btn-primary" onClick={() => joinLiveClass(c)}>
                        {status === 'live' ? 'Join Now' : 'Join Class'}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* 9. ATTENDANCE TAB */}
        {activeTab === 'attendance' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '1rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Sessions Attended</span>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem' }}>{attendanceStats.present} / {attendanceStats.total}</h3>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '1rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Attendance Rate</span>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.25rem', color: attendanceStats.percentage >= 75 ? 'var(--accent-emerald)' : '#fbbf24' }}>{attendanceStats.percentage}%</h3>
              </div>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '1rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Status Requirement</span>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, marginTop: '0.75rem', color: attendanceStats.percentage >= 75 ? 'var(--accent-emerald)' : '#f87171' }}>
                  {attendanceStats.percentage >= 75 ? ' Meet Threshold (>= 75%)' : ' Low Attendance Warning'}
                </h3>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.25rem', padding: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1rem', color: '#fff' }}>Attendance Check-In</h3>

                {attendanceCourses.length > 0 && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Course</label>
                    <select
                      value={attendanceCourseId}
                      onChange={async (e) => {
                        const cid = e.target.value;
                        setAttendanceCourseId(cid);
                        setCheckInMessage('');
                        await fetchAttendanceSessions(cid);
                        await fetchAttendanceReport(cid, attendanceCourses.find((c: any) => c.id === cid)?.title || 'Course');
                      }}
                      style={{ width: '100%', background: '#040711', color: '#fff', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.35rem', padding: '0.4rem 0.6rem', outline: 'none', fontSize: '0.8rem' }}
                    >
                      {attendanceCourses.map((c: any) => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                  </div>
                )}

                {selectedAttendanceSession && (
                  <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', padding: '0.7rem 1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                    You are checking into: <strong>{selectedAttendanceCourse?.title || 'Course'}</strong> — <strong>{selectedAttendanceSession.title || selectedAttendanceSession.course_id}</strong>
                    <span style={{ color: 'var(--text-secondary)' }}>{selectedAttendanceSession.date ? ` (${new Date(selectedAttendanceSession.date).toLocaleString()})` : ''}</span>
                  </div>
                )}
                
                {checkInMessage && (
                  <div style={{ 
                    background: checkInMessage.includes('') ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)',
                    border: '1px solid',
                    borderColor: checkInMessage.includes('') ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                    padding: '0.75rem 1rem', 
                    borderRadius: '8px', 
                    marginBottom: '1.5rem',
                    fontSize: '0.85rem'
                  }}>
                    {checkInMessage}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>Method A: QR Code Check-in</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Pick your session and tap check-in — the trainer's QR token is applied automatically.</p>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Attendance Session</label>
                    <select
                      value={selectedSessionId}
                      onChange={e => setSelectedSessionId(e.target.value)}
                      style={{ width: '100%', background: '#040711', color: '#fff', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.35rem', padding: '0.4rem 0.6rem', outline: 'none', fontSize: '0.8rem', marginBottom: '0.75rem' }}
                    >
                      {attendanceSessionOptions.length === 0 && <option value="">No sessions for this course yet</option>}
                      {attendanceSessionOptions.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.title || s.course_id || s.id}{s.date ? ` — ${new Date(s.date).toLocaleDateString()}` : ''} [{s.status === 'LIVE' ? 'LIVE' : s.status === 'ENDED' ? 'Ended' : 'Scheduled'}]</option>
                      ))}
                    </select>
                    {!selectedIsLive && (
                      <p style={{ fontSize: '0.72rem', color: '#fbbf24', marginBottom: '0.6rem' }}>
                        Check-in is only allowed while the session is <strong>LIVE</strong> — ask your trainer to start it.
                      </p>
                    )}
                    <button
                      onClick={() => {
                        const s = attendanceSessionOptions.find((x: any) => x.id === selectedSessionId);
                        if (s?.qr_token) handleQRCheckIn(s.qr_token);
                        else setCheckInMessage('Selected session has no QR token yet.');
                      }}
                      disabled={checkingIn || !selectedIsLive}
                      style={{ border: 'none', background: selectedIsLive ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.12)', color: '#fff', padding: '0.5rem 1rem', borderRadius: '4px', cursor: selectedIsLive ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: '0.85rem', width: '100%' }}
                    >
                      Check In via QR
                    </button>
                    {(() => {
                      const s = attendanceSessionOptions.find((x: any) => x.id === selectedSessionId);
                      return s?.qr_token ? (
                        <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                          <SessionQR token={s.qr_token} />
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.4rem', wordBreak: 'break-all' }}>
                            {s.qr_token}
                          </p>
                        </div>
                      ) : null;
                    })()}
                  </div>

                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>Manual QR Token (scanned code)</h4>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input
                        type="text"
                        placeholder="Paste the 32-character QR token from your trainer"
                        value={qrCodeInput}
                        onChange={e => setQrCodeInput(e.target.value)}
                        style={{ flex: 1, background: '#040711', color: '#fff', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.35rem', padding: '0.5rem 0.75rem', outline: 'none', fontSize: '0.85rem' }}
                      />
                      <button
                        onClick={() => handleQRCheckIn()}
                        disabled={checkingIn}
                        style={{ border: 'none', background: 'var(--accent-cyan)', color: '#fff', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
                      >
                        Verify QR
                      </button>
                    </div>
                  </div>

                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.5rem', color: '#fff' }}>Method B: GPS Geofence Check-in</h4>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Sends browser location coordinates to evaluate if you are inside the college perimeter.</p>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Attendance Session</label>
                    <select
                      value={selectedSessionId}
                      onChange={e => setSelectedSessionId(e.target.value)}
                      style={{ width: '100%', background: '#040711', color: '#fff', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.35rem', padding: '0.4rem 0.6rem', outline: 'none', fontSize: '0.8rem', marginBottom: '0.75rem' }}
                    >
                      {attendanceSessionOptions.length === 0 && <option value="">No sessions for this course yet</option>}
                      {attendanceSessionOptions.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.title || s.course_id || s.id}{s.date ? ` — ${new Date(s.date).toLocaleDateString()}` : ''} [{s.status === 'LIVE' ? 'LIVE' : s.status === 'ENDED' ? 'Ended' : 'Scheduled'}]</option>
                      ))}
                    </select>
                    {!selectedIsLive && (
                      <p style={{ fontSize: '0.72rem', color: '#fbbf24', marginBottom: '0.6rem' }}>
                        GPS check-in is only allowed while the session is <strong>LIVE</strong>.
                      </p>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Latitude</label>
                        <input
                          type="text"
                          value={gpsLatitude}
                          onChange={e => setGpsLatitude(e.target.value)}
                          style={{ width: '100%', background: '#040711', color: '#fff', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.35rem', padding: '0.4rem 0.6rem', outline: 'none', fontSize: '0.8rem' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Longitude</label>
                        <input
                          type="text"
                          value={gpsLongitude}
                          onChange={e => setGpsLongitude(e.target.value)}
                          style={{ width: '100%', background: '#040711', color: '#fff', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '0.35rem', padding: '0.4rem 0.6rem', outline: 'none', fontSize: '0.8rem' }}
                        />
                      </div>
                    </div>
                    <button
                      onClick={handleGPSCheckIn}
                      disabled={checkingIn || !selectedIsLive}
                      style={{ border: 'none', background: selectedIsLive ? 'var(--accent-emerald)' : 'rgba(255,255,255,0.12)', color: '#fff', padding: '0.5rem 1rem', borderRadius: '4px', cursor: selectedIsLive ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: '0.85rem', width: '100%' }}
                    >
                      Trigger GPS Validation
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '1.25rem', padding: '2rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '1.5rem', color: '#fff' }}>Recent Attendance Ledger</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {attendanceSessions.map(sess => (
                    <div key={sess.id} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', padding: '1rem', borderRadius: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff' }}>{sess.courseName}</h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{sess.date} | {sess.time} ({sess.type})</span>
                      </div>
                      <span style={{ 
                        fontSize: '0.8rem', 
                        fontWeight: 700, 
                        color: sess.status === 'PRESENT' ? 'var(--accent-emerald)' : '#ef4444',
                        background: sess.status === 'PRESENT' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        {sess.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
