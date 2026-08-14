-- Program length per branch (B.Tech = 8, BBA = 6, MBA = 4, ...).
-- The semesters page uses this to only label the true last semester "Final".
ALTER TABLE "Branch" ADD COLUMN "total_semesters" INTEGER NOT NULL DEFAULT 8;
