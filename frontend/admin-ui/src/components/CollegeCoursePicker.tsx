'use client';
import { useEffect } from 'react';
import { useColleges } from '@/hooks/useColleges';

/**
 * College + Course picker used on every page that filters by course.
 *
 * - Non-super-admins (college admin / trainer / student): the API already
 *   scopes their course list, so this renders just the course dropdown.
 * - Super admins see every college's courses mixed together, so this renders a
 *   College dropdown first (defaults to the first active college) and shows
 *   course options qualified with their college, e.g. "Joy University · Data
 *   Structures" — so a course from college X is never confused with one from
 *   college Y.
 *
 * The component keeps the selected course inside the selected college:
 * switching colleges resets the course to the first course of that college.
 */
export default function CollegeCoursePicker({
  courses,
  courseId,
  onCourseChange,
  collegeId,
  onCollegeChange,
  courseMaxWidth = 360,
}: {
  courses: any[];
  courseId: string;
  onCourseChange: (id: string) => void;
  collegeId: string;
  onCollegeChange: (id: string) => void;
  courseMaxWidth?: number;
}) {
  const { colleges, activeColleges, isSuperAdmin, courseLabel } = useColleges();
  const selectedCollege = colleges.find((c: any) => c.id === collegeId);

  const visibleCourses =
    isSuperAdmin && selectedCollege
      ? courses.filter((c: any) => !c.tenant_id || c.tenant_id === selectedCollege.tenant_id)
      : courses;

  // Super admin: default to the first active college once the list arrives.
  useEffect(() => {
    if (isSuperAdmin && activeColleges.length > 0 && !collegeId) {
      onCollegeChange(activeColleges[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin, activeColleges.length, collegeId]);

  // Keep the selected course inside the selected college.
  useEffect(() => {
    if (isSuperAdmin && selectedCollege && courses.length > 0 && visibleCourses.length === 0) {
      // This college has no courses — clear the stale selection.
      if (courseId) onCourseChange('');
      return;
    }
    if (visibleCourses.length === 0) return;
    if (!visibleCourses.some((c: any) => c.id === courseId)) {
      onCourseChange(visibleCourses[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCourses, courseId]);

  return (
    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
      {isSuperAdmin && activeColleges.length > 0 && (
        <>
          <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>College:</label>
          <select
            className="input-field"
            style={{ maxWidth: '220px' }}
            value={collegeId}
            onChange={e => onCollegeChange(e.target.value)}
          >
            {activeColleges.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </>
      )}
      {visibleCourses.length > 0 && (
        <>
          <label style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Course:</label>
          <select
            className="input-field"
            style={{ maxWidth: `${courseMaxWidth}px` }}
            value={courseId}
            onChange={e => onCourseChange(e.target.value)}
          >
            {visibleCourses.map((c: any) => (
              <option key={c.id} value={c.id}>{courseLabel(c)}</option>
            ))}
          </select>
        </>
      )}
      {isSuperAdmin && visibleCourses.length === 0 && courses.length === 0 && (
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>No courses available.</span>
      )}
    </div>
  );
}
