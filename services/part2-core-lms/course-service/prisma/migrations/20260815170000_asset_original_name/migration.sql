-- Store the user-visible filename of an uploaded topic asset so the course
-- builder can show what was uploaded instead of an opaque random id.
ALTER TABLE "AssetMetadata" ADD COLUMN "original_name" TEXT;
