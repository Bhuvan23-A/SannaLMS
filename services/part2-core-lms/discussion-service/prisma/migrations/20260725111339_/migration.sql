-- AlterTable
ALTER TABLE "Post" ALTER COLUMN "read_by" DROP DEFAULT,
ALTER COLUMN "tenant_id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Thread" ALTER COLUMN "tenant_id" DROP DEFAULT;
