-- Live-session lifecycle for attendance sessions
-- SCHEDULED -> LIVE -> ENDED; students can only check in while LIVE.

ALTER TABLE "Session" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'SCHEDULED';
ALTER TABLE "Session" ADD COLUMN "started_at" TIMESTAMP(3);
ALTER TABLE "Session" ADD COLUMN "ended_at" TIMESTAMP(3);
ALTER TABLE "Session" ADD COLUMN "end_time" TIMESTAMP(3);
