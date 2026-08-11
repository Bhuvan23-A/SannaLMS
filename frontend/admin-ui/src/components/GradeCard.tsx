'use client';

// Reusable semester grade card: groups a student's grades by semester and
// shows per-course grade/CGPA, semester GPA and overall CGPA.
// grades: gradebook rows [{course_id, total_score, max_score, grade, cgpa}]
// courses: [{id, title, semester_id}]  semesters: [{id, name}]

export default function GradeCard({ grades, courses, semesters, studentName }: {
  grades: any[];
  courses: any[];
  semesters: any[];
  studentName?: string;
}) {
  const gradeByCourse: Record<string, any> = {};
  (Array.isArray(grades) ? grades : []).forEach((g: any) => { if (g.course_id) gradeByCourse[g.course_id] = g; });

  const semesterName = (id: string) => (semesters.find((s: any) => s.id === id) as any)?.name || 'General';
  const semesterNumber = (id: string) => {
    const m = /(\d+)/.exec(semesterName(id) || '');
    return m ? parseInt(m[1], 10) : 0;
  };

  // Group courses by semester (courses without a semester target → "General").
  const groups = new Map<string, any[]>();
  (Array.isArray(courses) ? courses : []).forEach((c: any) => {
    const key = c.semester_id || 'general';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  });

  const sortedKeys = Array.from(groups.keys()).sort((a, b) => semesterNumber(a) - semesterNumber(b));

  const graded = (Array.isArray(grades) ? grades : []).filter((g: any) => g.cgpa != null);
  const overallCgpa = graded.length ? graded.reduce((s: number, g: any) => s + (g.cgpa || 0), 0) / graded.length : null;

  const gradeColor = (grade: string | null) => {
    if (grade === 'A') return '#00c864';
    if (grade === 'B') return '#00a8ff';
    if (grade === 'C') return '#ffa502';
    if (grade === 'D') return '#ff6348';
    return '#ff4757';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          {studentName && <h2 style={{ fontSize: '20px', margin: 0 }}>{studentName}</h2>}
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '13px' }}>Semester Grade Card</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
            {overallCgpa != null ? overallCgpa.toFixed(2) : '—'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Overall CGPA</div>
        </div>
      </div>

      {sortedKeys.length === 0 && (
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '30px 0' }}>
          No courses with grades yet.
        </p>
      )}

      {sortedKeys.map((key) => {
        const rows = groups.get(key) || [];
        const semGrades = rows
          .map((c: any) => gradeByCourse[c.id])
          .filter((g: any) => g && g.cgpa != null);
        const semGpa = semGrades.length ? semGrades.reduce((s: number, g: any) => s + (g.cgpa || 0), 0) / semGrades.length : null;
        return (
          <div key={key} className="panel" style={{ marginBottom: '20px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', margin: 0 }}>📘 {semesterName(key)}</h3>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Semester GPA: <strong style={{ color: 'var(--primary-color)' }}>{semGpa != null ? semGpa.toFixed(2) : '—'}</strong>
              </span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '8px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: '12px' }}>Course</th>
                  <th style={{ padding: '8px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>Score</th>
                  <th style={{ padding: '8px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>Grade</th>
                  <th style={{ padding: '8px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>CGPA</th>
                  <th style={{ padding: '8px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>Result</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c: any) => {
                  const g = gradeByCourse[c.id];
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                      <td style={{ padding: '10px 8px' }}>{c.title}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        {g ? `${g.total_score} / ${g.max_score}` : '—'}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        {g?.grade ? <span style={{ fontWeight: 'bold', color: gradeColor(g.grade) }}>{g.grade}</span> : <span style={{ color: 'var(--text-secondary)' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>{g?.cgpa != null ? g.cgpa.toFixed(1) : '—'}</td>
                      <td style={{ padding: '10px 8px', textAlign: 'center' }}>
                        {g?.grade ? (
                          <span className={`badge ${g.grade !== 'F' ? 'badge-success' : 'badge-danger'}`}>
                            {g.grade !== 'F' ? 'PASS' : 'FAIL'}
                          </span>
                        ) : (
                          <span className="badge badge-warning">NO GRADE</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
