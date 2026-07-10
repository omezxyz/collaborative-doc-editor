-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "content" BYTEA;

-- AlterTable
ALTER TABLE "DocumentPermission" ADD COLUMN     "lastActive" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "role" DROP DEFAULT;

-- AlterTable
ALTER TABLE "DocumentUpdate" ADD COLUMN     "message" TEXT;
