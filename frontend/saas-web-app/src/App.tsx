import React from 'react';

export default function App() {
  const parts = [
    {
      part: 'Part 1',
      title: 'Infrastructure, Security & User Identity',
      lead: 'DevOps & Auth Lead',
      branch: 'part1/infra-auth-identity',
      desc: 'Provisioning servers, Keycloak SSO/OAuth2/TOTP, PostgreSQL schema-per-tenant isolation, MinIO, Kong Gateway & GitHub Actions.',
      stack: ['Go', 'Node.js', 'Keycloak', 'PostgreSQL', 'Kong', 'Docker']
    },
    {
      part: 'Part 2',
      title: 'LMS Core & Real-Time Communication',
      lead: 'Full-Stack LMS Lead',
      branch: 'part2/core-lms-content-chat',
      desc: 'Colleges/Branches management, HLS video course engine, SCORM packages, Socket.IO chat, Jitsi WebRTC live classes & QR/GPS attendance.',
      stack: ['Node.js', 'TypeScript', 'Socket.IO', 'FFmpeg', 'Jitsi']
    },
    {
      part: 'Part 3',
      title: 'Assessment, Proctoring & Coding Sandbox',
      lead: 'Backend & Sandbox Lead',
      branch: 'part3/assessment-coding-sandbox',
      desc: 'Question bank & adaptive testing, Docker-isolated code runner engine (Python, Java, C++), assignment workflow & MOSS plagiarism.',
      stack: ['Go Engine', 'Node.js', 'Docker Sandbox', 'MOSS']
    },
    {
      part: 'Part 4',
      title: 'AI Integration, Analytics & Placements',
      lead: 'AI/ML & Data Lead',
      branch: 'part4/ai-analytics-placements',
      desc: 'FastAPI RAG AI Tutor, OpenCV proctoring (gaze/face estimation), cohort analytics, XP gamification, placement portal & certificate signer.',
      stack: ['Python FastAPI', 'OpenCV', 'LangChain', 'PDF Signer']
    }
  ];

  return (
    <div className="app-container">
      <header className="header-banner">
        <span className="badge">Multi-Tenant SaaS Platform</span>
        <h1 className="title">SannaLMS Architecture Control Center</h1>
        <p className="subtitle">
          Distributed 4-Part Microservices Platform designed for multi-tenant educational institutions.
        </p>
      </header>

      <div className="parts-grid">
        {parts.map((p, idx) => (
          <div key={idx} className="part-card">
            <div>
              <span className="part-number">{p.part} • {p.lead}</span>
              <h2 className="part-title">{p.title}</h2>
              <p className="part-desc">{p.desc}</p>
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '0.5rem' }}>
                Git Branch: <strong style={{ color: '#06b6d4' }}>{p.branch}</strong>
              </div>
              <div className="tag-list">
                {p.stack.map((s, i) => (
                  <span key={i} className="tag">{s}</span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <section className="workflow-box">
        <h2 className="workflow-title">
          🚀 Team Git Branch Workflow Quick Reference
        </h2>
        <p style={{ color: '#94a3b8', lineHeight: 1.6 }}>
          Each teammate works in their assigned branch. Pull base changes from <code style={{ color: '#06b6d4' }}>develop</code> before committing.
        </p>
        <div className="code-block">
          # 1. Fetch & checkout your branch<br />
          git fetch --all<br />
          git checkout partX/your-branch-name<br /><br />
          # 2. Sync latest develop changes<br />
          git pull origin develop<br /><br />
          # 3. Commit and push strictly to your branch<br />
          git add .<br />
          git commit -m "feat(service): my new update"<br />
          git push origin partX/your-branch-name
        </div>
      </section>
    </div>
  );
}
