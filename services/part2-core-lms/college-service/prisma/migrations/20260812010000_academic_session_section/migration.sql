-- Stage 2: academic sessions + sections (college-accurate schema).
ALTER TABLE "Semester" ADD COLUMN "semester_number" INTEGER;

CREATE TYPE "AcademicSessionStatus" AS ENUM ('PLANNED', 'ACTIVE', 'CLOSED');

CREATE TABLE "AcademicSession" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  status "AcademicSessionStatus" NOT NULL DEFAULT 'PLANNED',
  is_current BOOLEAN NOT NULL DEFAULT false,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by TEXT,
  updated_by TEXT,
  deleted_by TEXT,
  UNIQUE (tenant_id, name)
);

CREATE TABLE "Section" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  academic_session_id TEXT NOT NULL,
  year_of_study INTEGER NOT NULL,
  semester_number INTEGER NOT NULL,
  name TEXT NOT NULL DEFAULT '',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  created_by TEXT,
  updated_by TEXT,
  deleted_by TEXT,
  UNIQUE (tenant_id, branch_id, academic_session_id, semester_number, name)
);
CREATE INDEX idx_section_branch_sem ON "Section" (branch_id, semester_number);
CREATE INDEX idx_section_tenant_session ON "Section" (tenant_id, academic_session_id);
