-- CreateTable
CREATE TABLE "Certificate" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "course_title" TEXT NOT NULL,
    "student_name" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "certificate_no" TEXT NOT NULL,
    "grade" TEXT,
    "cgpa" DOUBLE PRECISION,
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoke_reason" TEXT,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_certificate_no_key" ON "Certificate"("certificate_no");

-- CreateIndex
CREATE UNIQUE INDEX "Certificate_course_id_user_id_key" ON "Certificate"("course_id", "user_id");
