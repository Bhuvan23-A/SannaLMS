-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('CLASS', 'EXAM', 'ASSIGNMENT_DEADLINE', 'HOLIDAY', 'OTHER');

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "event_type" "EventType" NOT NULL DEFAULT 'OTHER',
    "course_id" TEXT,
    "tenant_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_by" TEXT,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);
