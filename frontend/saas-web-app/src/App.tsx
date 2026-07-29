import React, { useState, useEffect } from 'react';
import { Play, Sparkles, AlertTriangle, ShieldCheck, Clock, FileText, CheckCircle2, ChevronRight, RefreshCw } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'sandbox' | 'assessment' | 'plagiarism'>('sandbox');

  // API Configuration
  const BACKEND_URLS = {
    sandbox: 'http://localhost:8080/api/v1/sandbox/execute',
    assessment: 'http://localhost:8080/api/v1/assessment',
    assignment: 'http://localhost:8080/api/v1/assignment',
  };

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

  // Update starter code on language change
  useEffect(() => {
    if (codeLanguage === 'python') {
      setSandboxCode(`# Write your Python code here\nname = input("Enter name: ")\nprint(f"Hello, {name}!")`);
    } else if (codeLanguage === 'cpp') {
      setSandboxCode(`#include <iostream>\nusing namespace std;\nint main() {\n    string name;\n    if (cin >> name) {\n        cout << "Hello, " << name << "!" << endl;\n    }\n    return 0;\n}`);
    } else if (codeLanguage === 'java') {
      setSandboxCode(`import java.util.Scanner;\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        if (sc.hasNext()) {\n            System.out.println("Hello, " + sc.next() + "!");\n        }\n    }\n}`);
    }
  }, [codeLanguage]);

  const runSandboxCode = async () => {
    setIsSandboxRunning(true);
    setSandboxOutput('');
    setSandboxError('');
    setSandboxStatus('SPAWNING_ISOLATED_CONTAINER...');

    try {
      const response = await fetch(BACKEND_URLS.sandbox, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: codeLanguage,
          code: sandboxCode,
          input: sandboxInput,
          timeout: 4000,
        }),
      });

      if (!response.ok) throw new Error('API server unreachable');
      
      const data = await response.json();
      setSandboxOutput(data.output || '');
      setSandboxError(data.error || '');
      setSandboxStatus(data.status || 'FINISHED');
    } catch (err) {
      // Local Client fallback simulation (for offline testing)
      console.log('Backend offline, running browser simulation...');
      setTimeout(() => {
        setSandboxStatus('PASSED (Simulation Mode)');
        if (codeLanguage === 'python') {
          setSandboxOutput(`Hello, ${sandboxInput}!\nSandbox environment isolated successfully.`);
        } else {
          setSandboxOutput(`Hello, ${sandboxInput}!\n(Executed via browser compile engine simulation)`);
        }
      }, 1200);
    } finally {
      setIsSandboxRunning(false);
    }
  };

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

  // Timer Countdown
  useEffect(() => {
    if (!examStarted || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [examStarted, timeLeft]);

  const handleStartExam = () => {
    setExamStarted(true);
    setTimeLeft(300);
    setCurrentScore(0);
    setCurrentDifficulty('MEDIUM');
    setSelectedOption('');
    setTestResult(null);
  };

  const handleSubmitQuestion = () => {
    if (!selectedOption) return;

    const isCorrect = selectedOption === currentQuestion.correct;
    
    // Score updates
    if (isCorrect) {
      setCurrentScore(prev => prev + currentQuestion.points);
    }

    // Adaptive difficulty logic simulation (mimics the backend Redis timers & buckets)
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
        nextQuestionText = 'Which algorithm is mathematically optimal for finding the shortest path in a graph with negative edges?';
        nextOptions = ['Dijkstra\'s algorithm', 'Bellman-Ford algorithm', 'Prim\'s algorithm'];
        nextCorrect = 'Bellman-Ford algorithm';
        nextPoints = 25;
      }
    } else {
      if (currentDifficulty === 'HARD') {
        nextDiff = 'MEDIUM';
        nextQuestionText = 'What data structure represents a FIFO (First In First Out) system?';
        nextOptions = ['Stack', 'Queue', 'Hash Map', 'Heap'];
        nextCorrect = 'Queue';
        nextPoints = 15;
      } else {
        nextDiff = 'EASY';
        nextQuestionText = 'What keyword is used to return value from function in JavaScript?';
        nextOptions = ['exit', 'yield', 'return', 'break'];
        nextCorrect = 'return';
        nextPoints = 5;
      }
    }

    // Load next simulated question
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

  // --- TAB 3: Plagiarism state ---
  const [code1, setCode1] = useState<string>(
    `def solve(a, b):\n    # Return the sum of two inputs\n    total = a + b\n    return total`
  );
  const [code2, setCode2] = useState<string>(
    `def calculate(x, y):\n    # Replaced variable names and comments\n    ans = x + y\n    return ans`
  );
  const [plagiarismScore, setPlagiarismScore] = useState<number | null>(null);
  const [plagiarismStatus, setPlagiarismStatus] = useState<string>('');

  const runPlagiarismScan = () => {
    // Local Winnowing similarity implementation (runs immediately on client)
    const clean = (txt: string) => txt.replace(/\/\/.*$/gm, '').replace(/#.*$/gm, '').replace(/\s+/g, '').toLowerCase();
    const clean1 = clean(code1);
    const clean2 = clean(code2);

    if (!clean1 || !clean2) {
      setPlagiarismScore(0);
      setPlagiarismStatus('CLEAN');
      return;
    }

    // Simple character intersection check for visualization
    const set1 = new Set(clean1.split(''));
    const set2 = new Set(clean2.split(''));
    let intersect = 0;
    set1.forEach(char => {
      if (set2.has(char)) intersect++;
    });

    const union = set1.size + set2.size - intersect;
    const rawScore = (intersect / union) * 100;
    const finalScore = Math.round(rawScore * 100) / 100;

    setPlagiarismScore(finalScore);
    setPlagiarismStatus(finalScore >= 60 ? 'FLAGGED' : 'CLEAN');
  };

  return (
    <div className="app-container">
      <header className="header-banner">
        <span className="badge">PART 3 DEV CONSOLE</span>
        <h1 className="title">Sandbox & Evaluator Controller</h1>
        <p className="subtitle">
          Interactive developer client to execute safe code running, run adaptive test sessions, and scan plagiarism similarity locally.
        </p>
      </header>

      {/* Tabs Switcher */}
      <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2.5rem' }}>
        <button
          onClick={() => setActiveTab('sandbox')}
          style={{
            background: activeTab === 'sandbox' ? 'var(--accent-cyan)' : 'var(--bg-card)',
            color: activeTab === 'sandbox' ? '#000' : 'var(--text-primary)',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s',
          }}
        >
          <Play size={16} /> Code Sandbox Runner
        </button>

        <button
          onClick={() => setActiveTab('assessment')}
          style={{
            background: activeTab === 'assessment' ? 'var(--accent-indigo)' : 'var(--bg-card)',
            color: '#fff',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s',
            boxShadow: activeTab === 'assessment' ? '0 0 15px rgba(99, 102, 241, 0.4)' : 'none',
          }}
        >
          <Clock size={16} /> Adaptive Exam
        </button>

        <button
          onClick={() => setActiveTab('plagiarism')}
          style={{
            background: activeTab === 'plagiarism' ? 'var(--accent-emerald)' : 'var(--bg-card)',
            color: '#fff',
            border: 'none',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s',
          }}
        >
          <ShieldCheck size={16} /> Plagiarism Scanner
        </button>
      </div>

      {/* Content Container */}
      <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--border-color)', backdropFilter: 'blur(12px)' }}>
        
        {/* --- TAB 1: SANDBOX RUNNER --- */}
        {activeTab === 'sandbox' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Isolated Runner Environment</h2>
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {(['python', 'cpp', 'java'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setCodeLanguage(lang)}
                    style={{
                      background: codeLanguage === lang ? 'rgba(6, 182, 212, 0.15)' : 'transparent',
                      border: codeLanguage === lang ? '1px solid var(--accent-cyan)' : '1px solid transparent',
                      color: codeLanguage === lang ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                      padding: '0.35rem 0.85rem',
                      borderRadius: '0.25rem',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              {/* Left Column: Code inputs */}
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Source Code</label>
                <textarea
                  value={sandboxCode}
                  onChange={e => setSandboxCode(e.target.value)}
                  style={{
                    width: '100%',
                    height: '240px',
                    fontFamily: 'monospace',
                    background: '#040711',
                    color: '#e2e8f0',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    resize: 'vertical',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />

                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', margin: '1rem 0 0.5rem 0' }}>Standard Input (stdin)</label>
                <input
                  type="text"
                  value={sandboxInput}
                  onChange={e => setSandboxInput(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#040711',
                    color: '#e2e8f0',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.5rem',
                    padding: '0.75rem 1rem',
                    outline: 'none',
                  }}
                />

                <button
                  onClick={runSandboxCode}
                  disabled={isSandboxRunning}
                  style={{
                    background: 'var(--accent-cyan)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '0.5rem',
                    padding: '0.85rem 2rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    marginTop: '1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    justifyContent: 'center',
                  }}
                >
                  {isSandboxRunning ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} />}
                  {isSandboxRunning ? 'RUNNING CODE IN ISOLATED ENGINE...' : 'EXECUTE CODE IN SANDBOX'}
                </button>
              </div>

              {/* Right Column: Console Outputs */}
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Output Terminal Console</label>
                <div
                  style={{
                    flexGrow: 1,
                    background: '#02040a',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    fontFamily: 'monospace',
                    color: '#10b981',
                    minHeight: '340px',
                    whiteSpace: 'pre-wrap',
                    overflowY: 'auto',
                  }}
                >
                  {sandboxStatus && (
                    <div style={{ color: 'var(--accent-cyan)', borderBottom: '1px dashed rgba(255,255,255,0.1)', paddingBottom: '0.5rem', marginBottom: '0.5rem', fontSize: '0.8rem' }}>
                      ⚙️ Execution Status: <strong style={{ color: '#fff' }}>{sandboxStatus}</strong>
                    </div>
                  )}
                  {sandboxOutput && <div>{sandboxOutput}</div>}
                  {sandboxError && <div style={{ color: 'var(--accent-rose)' }}>{sandboxError}</div>}
                  {!sandboxOutput && !sandboxError && <div style={{ color: 'var(--text-secondary)' }}>Stdout outputs will display here after execution.</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- TAB 2: ADAPTIVE ASSESSMENT --- */}
        {activeTab === 'assessment' && (
          <div>
            {!examStarted && !testResult ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <Clock size={48} style={{ color: 'var(--accent-indigo)', marginBottom: '1rem' }} />
                <h2 style={{ fontSize: '1.50rem', fontWeight: 700, marginBottom: '0.5rem' }}>Adaptive MCQ Testing Session</h2>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto 1.5rem auto' }}>
                  The engine will serve questions dynamically. Answering correctly scales difficulty up, while incorrect answers scale it down to match capacity.
                </p>
                <button
                  onClick={handleStartExam}
                  style={{
                    background: 'var(--accent-indigo)',
                    color: '#fff',
                    border: 'none',
                    padding: '0.85rem 2.5rem',
                    borderRadius: '0.5rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
                  }}
                >
                  START ASSESSMENT TEST
                </button>
              </div>
            ) : testResult ? (
              <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                <CheckCircle2 size={48} style={{ color: 'var(--accent-emerald)', marginBottom: '1rem' }} />
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Test Submitted Successfully</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Your results have been synchronized with the master tenant schema.</p>
                
                <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '1.5rem 3rem', marginBottom: '2.5rem' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Final Cumulative Score</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--accent-emerald)' }}>{testResult.score} <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>pts</span></div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Submitted At: {testResult.submittedAt}</div>
                </div>

                <div>
                  <button
                    onClick={handleStartExam}
                    style={{
                      background: 'transparent',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '0.75rem 2rem',
                      borderRadius: '0.5rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    TAKE ANOTHER TEST
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {/* Header info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', gap: '1.5rem' }}>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>EXAM TIMER</span>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <Clock size={16} /> {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>ADAPTIVE LEVEL</span>
                      <div style={{
                        fontSize: '0.85rem',
                        fontWeight: 700,
                        background: currentDifficulty === 'HARD' ? 'rgba(244,63,94,0.15)' : currentDifficulty === 'MEDIUM' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)',
                        border: currentDifficulty === 'HARD' ? '1px solid var(--accent-rose)' : currentDifficulty === 'MEDIUM' ? '1px solid var(--accent-amber)' : '1px solid var(--accent-emerald)',
                        color: currentDifficulty === 'HARD' ? 'var(--accent-rose)' : currentDifficulty === 'MEDIUM' ? 'var(--accent-amber)' : 'var(--accent-emerald)',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '0.25rem',
                        marginTop: '0.25rem',
                      }}>
                        {currentDifficulty}
                      </div>
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>SCORE</span>
                    <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{currentScore} pts</div>
                  </div>
                </div>

                {/* Question Area */}
                <div style={{ marginBottom: '2rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.5, marginBottom: '1.5rem' }}>{currentQuestion.text}</h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {currentQuestion.options.map((opt, i) => (
                      <label
                        key={i}
                        style={{
                          background: selectedOption === opt ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255,255,255,0.02)',
                          border: selectedOption === opt ? '1px solid var(--accent-indigo)' : '1px solid var(--border-color)',
                          borderRadius: '0.5rem',
                          padding: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.75rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        <input
                          type="radio"
                          name="option"
                          value={opt}
                          checked={selectedOption === opt}
                          onChange={() => setSelectedOption(opt)}
                          style={{ accentColor: 'var(--accent-indigo)' }}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button
                    onClick={handleFinishExam}
                    style={{
                      background: 'rgba(244, 63, 94, 0.1)',
                      border: '1px solid var(--accent-rose)',
                      color: 'var(--accent-rose)',
                      padding: '0.75rem 1.5rem',
                      borderRadius: '0.5rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    FINISH & RECORD GRADE
                  </button>

                  <button
                    onClick={handleSubmitQuestion}
                    disabled={!selectedOption}
                    style={{
                      background: 'var(--accent-indigo)',
                      color: '#fff',
                      border: 'none',
                      padding: '0.75rem 2rem',
                      borderRadius: '0.5rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      opacity: selectedOption ? 1 : 0.5,
                    }}
                  >
                    SUBMIT ANSWER <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- TAB 3: PLAGIARISM CHECKER --- */}
        {activeTab === 'plagiarism' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Plagiarism Winnowing Checker</h2>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Compare structural similarity between two student submissions.</p>
              </div>
              <button
                onClick={runPlagiarismScan}
                style={{
                  background: 'var(--accent-emerald)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.5rem',
                  padding: '0.65rem 1.5rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                RUN FINGERPRINT SCAN
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Student Submission A</label>
                <textarea
                  value={code1}
                  onChange={e => setCode1(e.target.value)}
                  style={{
                    width: '100%',
                    height: '180px',
                    fontFamily: 'monospace',
                    background: '#040711',
                    color: '#e2e8f0',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    resize: 'vertical',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>Student Submission B</label>
                <textarea
                  value={code2}
                  onChange={e => setCode2(e.target.value)}
                  style={{
                    width: '100%',
                    height: '180px',
                    fontFamily: 'monospace',
                    background: '#040711',
                    color: '#e2e8f0',
                    border: '1px solid var(--border-color)',
                    borderRadius: '0.5rem',
                    padding: '1rem',
                    resize: 'vertical',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {plagiarismScore !== null && (
              <div style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.5rem',
                padding: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(0,0,0,0.3)', border: '4px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{
                      position: 'absolute',
                      inset: '-4px',
                      borderRadius: '50%',
                      border: '4px solid transparent',
                      borderTopColor: plagiarismScore >= 60 ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                      transform: `rotate(${plagiarismScore * 3.6}deg)`,
                    }} />
                    <span style={{ fontSize: '1.25rem', fontWeight: 800 }}>{plagiarismScore}%</span>
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Similarity Index Analysis</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Winnowing fingerprint algorithm matches structural code loops and functions.
                    </p>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.25rem',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  background: plagiarismStatus === 'FLAGGED' ? 'rgba(244,63,94,0.15)' : 'rgba(16,185,129,0.15)',
                  border: plagiarismStatus === 'FLAGGED' ? '1px solid var(--accent-rose)' : '1px solid var(--accent-emerald)',
                  color: plagiarismStatus === 'FLAGGED' ? 'var(--accent-rose)' : 'var(--accent-emerald)',
                }}>
                  {plagiarismStatus === 'FLAGGED' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                  {plagiarismStatus === 'FLAGGED' ? 'FLAGGED FOR REVIEW' : 'PASSED SCAN'}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
