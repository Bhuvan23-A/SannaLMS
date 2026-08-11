-- Phase 6 parity audit — run BEFORE considering the destructive column drop.
-- Confirms the deprecated columns on Course/Question/Module still match the
-- new subject/section pointers (i.e. no read path depends on the old fields).
--
-- Usage: docker exec -i sannalms-postgres psql -U postgres -d sannalms_course < parity_audit.sql
-- Expected: every query below returns 0 rows (or a small, reviewed exception list).

-- 1. Offerings whose old semester/year contradicts their section's semester
--    (deprecated fields drifted from the source of truth).
SELECT c.id, c.title, c.semester_id, c.year, c.year_of_study, c.semester_number
FROM "Course" c
LEFT JOIN (
  SELECT id, tenant_id, branch_id, academic_session_id, year_of_study, semester_number
  FROM "Section"
  WHERE deleted_at IS NULL
) s ON s.id = c.section_id
WHERE c.deleted_at IS NULL
  AND c.section_id IS NOT NULL
  AND (
    (c.year_of_study IS NOT NULL AND s.year_of_study IS NOT NULL AND c.year_of_study <> s.year_of_study)
    OR (c.semester_number IS NOT NULL AND s.semester_number IS NOT NULL AND c.semester_number <> s.semester_number)
  );

-- 2. Offerings with no subject (legacy rows never backfilled) — these would
--    lose their identity if subject_id went away. Must be 0 after backfill.
SELECT COUNT(*) AS offerings_without_subject
FROM "Course"
WHERE deleted_at IS NULL AND subject_id IS NULL;

-- 3. Offerings with a section but no section_id (unassigned, pre-backfill).
SELECT COUNT(*) AS unassigned_offerings
FROM "Course"
WHERE deleted_at IS NULL AND section_id IS NULL;

-- 4. Modules with neither course_id nor subject_id (would vanish from both read paths).
SELECT COUNT(*) AS orphan_modules
FROM "Module"
WHERE deleted_at IS NULL AND course_id IS NULL AND subject_id IS NULL;

-- 5. Subject-syllabus collisions: modules attached to a subject but to a
--    DIFFERENT subject's offering (drift between the two ownership links).
SELECT m.id, m.title, m.course_id, m.subject_id
FROM "Module" m
JOIN "Course" c ON c.id = m.course_id
WHERE m.deleted_at IS NULL
  AND m.subject_id IS NOT NULL
  AND c.subject_id IS NOT NULL
  AND m.subject_id <> c.subject_id;
