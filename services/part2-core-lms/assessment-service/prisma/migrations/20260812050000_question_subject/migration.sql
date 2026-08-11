-- Phase 3: the question bank is owned by the Subject catalog row — one bank
-- per subject, shared by every offering (section/batch) of that subject.
ALTER TABLE "Question" ADD COLUMN "subject_id" TEXT;
CREATE INDEX idx_question_subject ON "Question" ("subject_id");
