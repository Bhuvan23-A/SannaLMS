-- Add feedback to quiz submissions so trainers can leave written remarks when
-- manually grading essay/coding answers.
ALTER TABLE "QuizSubmission" ADD COLUMN "feedback" TEXT;
