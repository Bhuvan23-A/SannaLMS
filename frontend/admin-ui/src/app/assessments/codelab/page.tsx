'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRole } from '@/hooks/useRole';
import { fetchApi } from '@/lib/api';
import {
  Activity,
  ShieldAlert,
  Users,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Download,
  RefreshCw,
  Search,
  Filter,
  Eye,
  FileCode2,
  Check,
  X,
  ArrowRight,
  TrendingUp,
  BarChart2
} from 'lucide-react';

interface MonitoredStudent {
  id: string;
  name: string;
  enrollmentNo: string;
  status: 'ACTIVE' | 'SUBMITTED' | 'DISCONNECTED';
  currentProblem: string;
  testCasesPassed: number;
  totalTestCases: number;
  score: number;
  violationCount: number; // tab switches, focus loss, fullscreen exits
  lastActivity: string;
  codeSnippet?: string;
}

interface SimilarityPair {
  id: string;
  studentA: { id: string; name: string; roll: string };
  studentB: { id: string; name: string; roll: string };
  problemTitle: string;
  language: string;
  similarityScore: number; // percentage
  status: 'NEEDS_REVIEW' | 'VERIFIED_COPIED' | 'DISMISSED';
  flaggedReason: string;
  codeA: string;
  codeB: string;
}

export default function CodeLabMonitorPage() {
  const { isAdmin, isTrainer } = useRole();
  const [activeTab, setActiveTab] = useState<'monitor' | 'similarity' | 'cohort'>('monitor');
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedAssessment, setSelectedAssessment] = useState<string>('ASM-2026-DSA');

  // Monitored student cohort state (CL-029, CL-030, SCR-16)
  const [students, setStudents] = useState<MonitoredStudent[]>([
    {
      id: 'st-01',
      name: 'Aarav Sharma',
      enrollmentNo: 'EN2026-081',
      status: 'ACTIVE',
      currentProblem: 'Problem 3: Longest Substring Without Repeating Characters',
      testCasesPassed: 10,
      totalTestCases: 10,
      score: 95,
      violationCount: 0,
      lastActivity: '12s ago',
      codeSnippet: 'def lengthOfLongestSubstring(s):\n    char_set = set()\n    left = max_len = 0...'
    },
    {
      id: 'st-02',
      name: 'Rohan Verma',
      enrollmentNo: 'EN2026-082',
      status: 'ACTIVE',
      currentProblem: 'Problem 2: Reverse Linked List in K-Groups',
      testCasesPassed: 7,
      totalTestCases: 10,
      score: 70,
      violationCount: 3, // Flagged for tab switches
      lastActivity: '35s ago',
      codeSnippet: 'ListNode* reverseKGroup(ListNode* head, int k) {\n    ListNode* curr = head;\n    int count = 0;...'
    },
    {
      id: 'st-03',
      name: 'Priya Patel',
      enrollmentNo: 'EN2026-083',
      status: 'SUBMITTED',
      currentProblem: 'All Completed (3/3)',
      testCasesPassed: 30,
      totalTestCases: 30,
      score: 100,
      violationCount: 0,
      lastActivity: 'Submitted 4m ago',
      codeSnippet: 'class Solution {\n    public int maxArea(int[] height) {\n        int left = 0, right = height.length - 1;...'
    },
    {
      id: 'st-04',
      name: 'Karthik Rao',
      enrollmentNo: 'EN2026-084',
      status: 'DISCONNECTED',
      currentProblem: 'Problem 1: Two Sum Target Pairs',
      testCasesPassed: 4,
      totalTestCases: 8,
      score: 50,
      violationCount: 1,
      lastActivity: 'Autosaved (Network drop 2m ago)',
      codeSnippet: 'SELECT dept_id, AVG(salary) FROM employees GROUP BY dept_id HAVING COUNT(*) > 5;'
    },
    {
      id: 'st-05',
      name: 'Ananya Iyer',
      enrollmentNo: 'EN2026-085',
      status: 'ACTIVE',
      currentProblem: 'Problem 3: Longest Substring Without Repeating Characters',
      testCasesPassed: 8,
      totalTestCases: 10,
      score: 80,
      violationCount: 4, // Multiple fullscreen exits
      lastActivity: '8s ago',
      codeSnippet: 'def lengthOfLongestSubstring(s):\n    lookup = {}\n    start = 0\n    ans = 0...'
    }
  ]);

  // Code similarity & plagiarism flagged pairs (CL-024, SCR-17)
  const [similarityPairs, setSimilarityPairs] = useState<SimilarityPair[]>([
    {
      id: 'sim-01',
      studentA: { id: 'st-01', name: 'Aarav Sharma', roll: 'EN2026-081' },
      studentB: { id: 'st-05', name: 'Ananya Iyer', roll: 'EN2026-085' },
      problemTitle: 'Problem 3: Longest Substring',
      language: 'Python',
      similarityScore: 89,
      status: 'NEEDS_REVIEW',
      flaggedReason: 'High AST structural token overlap (89%). Identical loop invariant and edge case branching.',
      codeA: 'def lengthOfLongestSubstring(s):\n    char_set = set()\n    left = max_len = 0\n    for right in range(len(s)):\n        while s[right] in char_set:\n            char_set.remove(s[left])\n            left += 1\n        char_set.add(s[right])\n        max_len = max(max_len, right - left + 1)\n    return max_len',
      codeB: 'def lengthOfLongestSubstring(s):\n    char_set = set()\n    left = max_len = 0\n    for right in range(len(s)):\n        while s[right] in char_set:\n            char_set.remove(s[left])\n            left += 1\n        char_set.add(s[right])\n        max_len = max(max_len, right - left + 1)\n    return max_len'
    },
    {
      id: 'sim-02',
      studentA: { id: 'st-02', name: 'Rohan Verma', roll: 'EN2026-082' },
      studentB: { id: 'st-04', name: 'Karthik Rao', roll: 'EN2026-084' },
      problemTitle: 'Problem 1: Two Sum Pairs',
      language: 'C++',
      similarityScore: 78,
      status: 'DISMISSED',
      flaggedReason: 'Standard idiomatic two-pointer approach using std::unordered_map. Deemed coincidental canonical solution.',
      codeA: '#include <vector>\n#include <unordered_map>\nusing namespace std;\nvector<int> twoSum(vector<int>& nums, int target) {\n    unordered_map<int, int> mp;\n    for (int i = 0; i < nums.size(); ++i) {\n        if (mp.count(target - nums[i])) return {mp[target - nums[i]], i};\n        mp[nums[i]] = i;\n    }\n    return {};\n}',
      codeB: '#include <vector>\n#include <unordered_map>\nusing namespace std;\nvector<int> twoSum(vector<int>& a, int t) {\n    unordered_map<int, int> m;\n    for (int i = 0; i < a.size(); ++i) {\n        int need = t - a[i];\n        if (m.find(need) != m.end()) return {m[need], i};\n        m[a[i]] = i;\n    }\n    return {};\n}'
    }
  ]);

  const [inspectModal, setInspectModal] = useState<SimilarityPair | null>(null);

  const updateSimilarityStatus = (id: string, newStatus: SimilarityPair['status']) => {
    setSimilarityPairs(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
  };

  const exportAssessmentReport = () => {
    let csv = 'Student Name,Enrollment No,Status,Current Problem,Test Cases Passed,Total Cases,Score,Integrity Violations,Last Activity\n';
    students.forEach(s => {
      csv += `"${s.name}","${s.enrollmentNo}","${s.status}","${s.currentProblem}",${s.testCasesPassed},${s.totalTestCases},${s.score},${s.violationCount},"${s.lastActivity}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CodeLab_Assessment_Monitor_${selectedAssessment}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          s.enrollmentNo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const activeCount = students.filter(s => s.status === 'ACTIVE').length;
  const submittedCount = students.filter(s => s.status === 'SUBMITTED').length;
  const offlineCount = students.filter(s => s.status === 'DISCONNECTED').length;
  const flaggedCount = students.filter(s => s.violationCount > 0).length;

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '40px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <Link href="/assessments" style={{ color: '#38bdf8', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}>
              ← Assessments Center
            </Link>
            <span style={{ color: '#64748b' }}>/</span>
            <span style={{ color: '#94a3b8', fontSize: '13px' }}>CodeLab Control Center</span>
          </div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileCode2 size={28} color="#38bdf8" />
            Edulateral CodeLab Live Assessment & Proctoring Monitor
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: '6px 0 0 0' }}>
            Live assessment observation, server-authoritative timers, tab-switch integrity telemetry, and human-in-the-loop similarity review.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            onClick={() => setLoading(true)}
            className="btn-secondary"
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh Live Feed
          </button>
          <button
            onClick={exportAssessmentReport}
            className="btn-primary"
            style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' }}
          >
            <Download size={14} /> Export Report (CSV)
          </button>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="panel" style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '16px 20px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Active Test Takers</span>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#f8fafc' }}>{activeCount} <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>students</span></div>
          <div style={{ fontSize: '12px', color: '#38bdf8', marginTop: '4px' }}>Autosaving every 15s</div>
        </div>

        <div className="panel" style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '16px 20px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Submitted & Finalized</span>
            <CheckCircle2 size={16} color="#10b981" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#10b981' }}>{submittedCount} <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>completed</span></div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Avg score: 86.5%</div>
        </div>

        <div className="panel" style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '16px 20px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: '#f87171', textTransform: 'uppercase', fontWeight: 600 }}>Integrity Warnings</span>
            <ShieldAlert size={16} color="#ef4444" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#f87171' }}>{flaggedCount} <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>students</span></div>
          <div style={{ fontSize: '12px', color: '#fca5a5', marginTop: '4px' }}>Tab-switch / Fullscreen exits</div>
        </div>

        <div className="panel" style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(245, 158, 11, 0.25)', padding: '16px 20px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Similarity Flags</span>
            <AlertTriangle size={16} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#f59e0b' }}>{similarityPairs.filter(p => p.status === 'NEEDS_REVIEW').length} <span style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>pairs</span></div>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Awaiting human trainer review</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('monitor')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'monitor' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeTab === 'monitor' ? '#38bdf8' : '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Activity size={16} /> Live Students Feed (SCR-16)
        </button>
        <button
          onClick={() => setActiveTab('similarity')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'similarity' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeTab === 'similarity' ? '#38bdf8' : '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <ShieldAlert size={16} /> Code Similarity & Review (CL-024)
        </button>
        <button
          onClick={() => setActiveTab('cohort')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            background: 'transparent',
            border: 'none',
            borderBottom: activeTab === 'cohort' ? '2px solid #38bdf8' : '2px solid transparent',
            color: activeTab === 'cohort' ? '#38bdf8' : '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <TrendingUp size={16} /> Skill Intelligence & Cohort Analytics (CL-027)
        </button>
      </div>

      {/* TAB 1: LIVE ASSESSMENT MONITOR */}
      {activeTab === 'monitor' && (
        <div className="panel" style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '20px' }}>
          {/* Controls Bar */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '12px', flex: 1, minWidth: '280px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search size={15} style={{ position: 'absolute', left: '12px', top: '12px', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Search student name or enrollment no..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="input-field"
                  style={{ paddingLeft: '36px', height: '38px', width: '100%', fontSize: '13px' }}
                />
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="input-field"
                style={{ width: '160px', height: '38px', fontSize: '13px' }}
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active Only</option>
                <option value="SUBMITTED">Submitted Only</option>
                <option value="DISCONNECTED">Offline / Recovery</option>
              </select>
            </div>

            <div style={{ fontSize: '13px', color: '#94a3b8' }}>
              Showing <strong>{filteredStudents.length}</strong> of {students.length} students
            </div>
          </div>

          {/* Students Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)', color: '#94a3b8', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 14px' }}>Student</th>
                  <th style={{ padding: '12px 14px' }}>Status</th>
                  <th style={{ padding: '12px 14px' }}>Current Progress</th>
                  <th style={{ padding: '12px 14px' }}>Test Cases</th>
                  <th style={{ padding: '12px 14px' }}>Score</th>
                  <th style={{ padding: '12px 14px' }}>Integrity Alerts</th>
                  <th style={{ padding: '12px 14px' }}>Last Telemetry</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map(student => (
                  <tr key={student.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', transition: 'background 0.15s' }}>
                    <td style={{ padding: '14px' }}>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>{student.name}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>{student.enrollmentNo}</div>
                    </td>
                    <td style={{ padding: '14px' }}>
                      {student.status === 'ACTIVE' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '12px', fontWeight: 600 }}>
                          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} /> Active
                        </span>
                      )}
                      {student.status === 'SUBMITTED' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8', fontSize: '12px', fontWeight: 600 }}>
                          <CheckCircle2 size={12} /> Submitted
                        </span>
                      )}
                      {student.status === 'DISCONNECTED' && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', fontSize: '12px', fontWeight: 600 }}>
                          <AlertTriangle size={12} /> Offline
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px', color: '#cbd5e1', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {student.currentProblem}
                    </td>
                    <td style={{ padding: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 600, color: student.testCasesPassed === student.totalTestCases ? '#10b981' : '#f59e0b' }}>
                          {student.testCasesPassed}/{student.totalTestCases}
                        </span>
                        <div style={{ width: '60px', height: '5px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${(student.testCasesPassed / student.totalTestCases) * 100}%`, height: '100%', background: '#10b981' }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px', fontWeight: 700, color: '#f8fafc' }}>
                      {student.score} pts
                    </td>
                    <td style={{ padding: '14px' }}>
                      {student.violationCount === 0 ? (
                        <span style={{ color: '#10b981', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Check size={14} /> Clear
                        </span>
                      ) : (
                        <span style={{ color: '#f87171', fontSize: '12px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(239, 68, 68, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                          <ShieldAlert size={14} /> {student.violationCount} event{student.violationCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px', fontSize: '12px', color: '#94a3b8' }}>
                      {student.lastActivity}
                    </td>
                    <td style={{ padding: '14px', textAlign: 'right' }}>
                      <button
                        onClick={() => alert(`Reviewing live autosaved snapshot for ${student.name}:\n\n${student.codeSnippet}`)}
                        className="btn-secondary"
                        style={{ fontSize: '12px', padding: '4px 10px' }}
                      >
                        Inspect Code
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: CODE SIMILARITY & PLAGIARISM REVIEW */}
      {activeTab === 'similarity' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '10px', padding: '14px 18px', fontSize: '13px', color: '#fde68a' }}>
            <strong>Integrity Notice (CL-024):</strong> Similarity detection identifies lexical and structural code overlaps across batch submissions. High similarity flags are evidence for trainer review and must never automatically declare student misconduct without human verification.
          </div>

          <div style={{ display: 'grid', gap: '16px' }}>
            {similarityPairs.map(pair => (
              <div key={pair.id} className="panel" style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontWeight: 800,
                      fontSize: '14px',
                      background: pair.similarityScore > 85 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      color: pair.similarityScore > 85 ? '#ef4444' : '#f59e0b',
                      border: `1px solid ${pair.similarityScore > 85 ? '#ef4444' : '#f59e0b'}`
                    }}>
                      {pair.similarityScore}% Overlap
                    </span>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                        {pair.problemTitle} · <span style={{ color: '#38bdf8' }}>{pair.language}</span>
                      </h3>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>
                        Between <strong>{pair.studentA.name}</strong> ({pair.studentA.roll}) and <strong>{pair.studentB.name}</strong> ({pair.studentB.roll})
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span className={`badge ${pair.status === 'NEEDS_REVIEW' ? 'badge-warning' : pair.status === 'VERIFIED_COPIED' ? 'badge-danger' : 'badge-success'}`}>
                      {pair.status.replace(/_/g, ' ')}
                    </span>
                    <button
                      onClick={() => setInspectModal(pair)}
                      className="btn-primary"
                      style={{ fontSize: '12px', padding: '6px 12px' }}
                    >
                      Compare Side-by-Side
                    </button>
                  </div>
                </div>

                <div style={{ fontSize: '13px', color: '#cbd5e1', background: 'rgba(0, 0, 0, 0.25)', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px' }}>
                  <strong>Diagnostic Reason:</strong> {pair.flaggedReason}
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => updateSimilarityStatus(pair.id, 'DISMISSED')}
                    className="btn-secondary"
                    style={{ fontSize: '12px', color: '#10b981' }}
                  >
                    ✓ Dismiss (Coincidental / Canonical)
                  </button>
                  <button
                    onClick={() => updateSimilarityStatus(pair.id, 'VERIFIED_COPIED')}
                    className="btn-secondary"
                    style={{ fontSize: '12px', color: '#ef4444' }}
                  >
                    ⚠ Confirm Misconduct
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: COHORT SKILL INTELLIGENCE */}
      {activeTab === 'cohort' && (
        <div className="panel" style={{ background: 'rgba(15, 23, 42, 0.75)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '24px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px', color: '#f8fafc' }}>
            Cohort Technical Skill Engine (CL-027, Section 8)
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px' }}>
            Transparent longitudinal skill scores computed from accuracy, difficulty, consistency, recency, and formal assessments.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
            {[
              { skill: 'Python', score: 88, benchmark: '+6% vs Nat. Avg', color: '#38bdf8' },
              { skill: 'Data Structures & Algorithms', score: 74, benchmark: 'At Benchmark', color: '#10b981' },
              { skill: 'C++ Systems', score: 71, benchmark: '-2% vs Nat. Avg', color: '#f59e0b' },
              { skill: 'SQL & Database Queries', score: 82, benchmark: '+11% vs Nat. Avg', color: '#6366f1' },
              { skill: 'Web Technologies (JS)', score: 91, benchmark: '+14% vs Nat. Avg', color: '#ec4899' },
              { skill: 'Algorithmic Problem Solving', score: 79, benchmark: '+4% vs Nat. Avg', color: '#a855f7' }
            ].map(item => (
              <div key={item.skill} style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '10px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>{item.skill}</span>
                  <span style={{ fontSize: '18px', fontWeight: 800, color: item.color }}>{item.score}</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                  <div style={{ width: `${item.score}%`, height: '100%', background: item.color }} />
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.benchmark}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Inspect Code Diff Modal */}
      {inspectModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#0b1329', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: '14px', width: '900px', maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                  Side-by-Side Code Comparison: {inspectModal.problemTitle}
                </h3>
                <div style={{ fontSize: '12px', color: '#f59e0b', marginTop: '2px' }}>
                  Similarity: {inspectModal.similarityScore}% · {inspectModal.language}
                </div>
              </div>
              <button onClick={() => setInspectModal(null)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', padding: '20px', overflowY: 'auto' }}>
              <div>
                <div style={{ fontWeight: 600, color: '#38bdf8', marginBottom: '8px', fontSize: '13px' }}>
                  {inspectModal.studentA.name} ({inspectModal.studentA.roll})
                </div>
                <pre style={{ background: '#020617', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#38bdf8', fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre-wrap', maxHeight: '400px', overflowY: 'auto' }}>
                  {inspectModal.codeA}
                </pre>
              </div>

              <div>
                <div style={{ fontWeight: 600, color: '#f59e0b', marginBottom: '8px', fontSize: '13px' }}>
                  {inspectModal.studentB.name} ({inspectModal.studentB.roll})
                </div>
                <pre style={{ background: '#020617', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#f59e0b', fontFamily: 'monospace', fontSize: '12px', whiteSpace: 'pre-wrap', maxHeight: '400px', overflowY: 'auto' }}>
                  {inspectModal.codeB}
                </pre>
              </div>
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255, 255, 255, 0.1)', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => { updateSimilarityStatus(inspectModal.id, 'DISMISSED'); setInspectModal(null); }} className="btn-secondary" style={{ fontSize: '13px' }}>
                Dismiss Flag
              </button>
              <button onClick={() => { updateSimilarityStatus(inspectModal.id, 'VERIFIED_COPIED'); setInspectModal(null); }} className="btn-primary" style={{ fontSize: '13px', background: '#ef4444' }}>
                Confirm Misconduct
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
