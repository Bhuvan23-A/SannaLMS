-- Phase 5: modules may belong to the Subject syllabus only (no offering yet).
-- course_id becomes nullable; subject_id is the primary owner.
ALTER TABLE "Module" ALTER COLUMN "course_id" DROP NOT NULL;
