'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';

export default function CourseEnrollmentsTab({ courseId }: { courseId: string }) {
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [userId, setUserId] = useState('');
  const [tenantId, setTenantId] = useState('');

  // Simulating student role dynamically
  const isStudent = typeof window !== 'undefined' ? localStorage.getItem('mockRole') === 'STUDENT' : false;
  const currentUserId = typeof window !== 'undefined' ? localStorage.getItem('mockUserId') || 'student-1' : 'student-1';

  const enrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetUserId = isStudent ? currentUserId : userId;
    const targetTenantId = isStudent ? 'tenant-123' : tenantId;

    try {
      await fetchApi('/api/v1/enrollments', {
        method: 'POST',
        body: JSON.stringify({ course_id: courseId, user_id: targetUserId, tenant_id: targetTenantId }),
      });
      alert('Successfully enrolled!');
      setUserId('');
    } catch (err: any) {
      alert(`Enrollment Failed: ${err.message}`);
    }
  };

  return (
    <div>
      <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>Course Enrollments</h2>
      
      <div className="panel" style={{ background: 'rgba(0,0,0,0.1)', border: '1px solid var(--primary-color)' }}>
        <h3 style={{ fontSize: '16px', marginBottom: '10px', color: 'var(--primary-color)' }}>Enroll in Course</h3>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
          {isStudent 
            ? "You are currently simulating a Student. Click below to enroll yourself in this course."
            : "Manually enroll a student into this course using their User ID."}
        </p>

        <form onSubmit={enrollStudent} style={{ display: 'flex', gap: '15px', alignItems: 'flex-end' }}>
          {!isStudent && (
            <>
              <div style={{ flex: 2 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Student User ID</label>
                <input required className="input-field" value={userId} onChange={e => setUserId(e.target.value)} placeholder="e.g. s-123" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px', color: 'var(--text-secondary)' }}>Tenant ID</label>
                <input required className="input-field" value={tenantId} onChange={e => setTenantId(e.target.value)} placeholder="e.g. stanford" />
              </div>
            </>
          )}
          <button type="submit" className="btn-primary" style={{ padding: '12px 20px', height: '44px' }}>
            {isStudent ? 'Enroll Me' : 'Enroll Student'}
          </button>
        </form>
      </div>
    </div>
  );
}
