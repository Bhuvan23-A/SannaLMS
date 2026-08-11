-- Stage 2: subject catalog + section rosters (college-accurate schema).

CREATE TABLE "Subject" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  department_id TEXT,
  branch_id TEXT,
  credits INTEGER NOT NULL DEFAULT 3,
  lt_p TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by TEXT,
  updated_by TEXT,
  deleted_by TEXT,
  UNIQUE (tenant_id, branch_id, code)
);
CREATE INDEX idx_subject_tenant_dept ON "Subject" (tenant_id, department_id);

ALTER TABLE "Course"
  ADD COLUMN "subject_id" TEXT,
  ADD COLUMN "section_id" TEXT,
  ADD COLUMN "semester_number" INTEGER;
CREATE INDEX idx_course_subject ON "Course" (subject_id);
CREATE INDEX idx_course_section ON "Course" (section_id);
-- One offering per subject per section, unless deleted.
CREATE UNIQUE INDEX offering_unique ON "Course" (subject_id, section_id)
  WHERE subject_id IS NOT NULL AND section_id IS NOT NULL AND deleted_at IS NULL;

ALTER TABLE "Module" ADD COLUMN "subject_id" TEXT;
CREATE INDEX idx_module_subject ON "Module" (subject_id);

ALTER TABLE "Enrollment"
  ADD COLUMN "auto_enrolled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "section_id" TEXT;
CREATE INDEX idx_enrollment_section ON "Enrollment" (section_id);

CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DROPPED');

CREATE TABLE "SectionMembership" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by TEXT,
  updated_by TEXT,
  deleted_by TEXT,
  UNIQUE (section_id, user_id)
);
CREATE INDEX idx_membership_user ON "SectionMembership" (user_id, status);

ALTER TABLE "Promotion"
  ADD COLUMN "from_section_id" TEXT,
  ADD COLUMN "to_section_id" TEXT,
  ALTER COLUMN "from_semester_id" DROP NOT NULL,
  ALTER COLUMN "to_semester_id" DROP NOT NULL;
CREATE INDEX idx_promotion_from_section ON "Promotion" (tenant_id, from_section_id);
