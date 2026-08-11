'use client';
import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { useRole } from './useRole';

/**
 * College context for the super admin.
 *
 * Everyone else (college admin / trainer / student) is already tenant-scoped
 * by the API, so this hook only fetches the college list for super admins and
 * returns no-op helpers for everyone else. Super admins see every college's
 * data mixed together, so every management page needs a college selector and
 * college-qualified labels to tell "Programming Fundamentals" at Joy
 * University apart from the one at Test College.
 */
export function useColleges() {
  const { role } = useRole();
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const [colleges, setColleges] = useState<any[]>([]);

  useEffect(() => {
    if (!isSuperAdmin) { setColleges([]); return; }
    let alive = true;
    fetchApi('/api/v1/colleges')
      .then((d) => { if (alive) setColleges(Array.isArray(d) ? d : []); })
      .catch(() => {});
    return () => { alive = false; };
  }, [isSuperAdmin]);

  // Held colleges are suspended — hide them from creation/filter dropdowns.
  const activeColleges = colleges.filter((c: any) => c.status !== 'HELD');

  const collegeName = (id?: string) => colleges.find((c: any) => c.id === id)?.name || '';

  // Courses / quizzes / assignments carry tenant_id, so map it back to a name.
  const collegeNameByTenant = (tenantId?: string) =>
    colleges.find((c: any) => c.tenant_id === tenantId)?.name || '';

  // "Joy University · Data Structures" so super admins can tell courses apart.
  const courseLabel = (course?: any) => {
    if (!course) return '';
    const cn = collegeNameByTenant(course.tenant_id);
    return cn ? `${cn} · ${course.title}` : course.title;
  };

  return { colleges, activeColleges, isSuperAdmin, collegeName, collegeNameByTenant, courseLabel };
}
