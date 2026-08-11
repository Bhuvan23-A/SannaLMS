-- Stage 1: college-accurate fields on Course.
-- Subject identity + cohort targeting, kept additive so no data moves.
ALTER TABLE "Course"
  ADD COLUMN "subject_code" TEXT,
  ADD COLUMN "credits" INTEGER,
  ADD COLUMN "section" TEXT,
  ADD COLUMN "academic_session" TEXT,
  ADD COLUMN "year_of_study" INTEGER;
