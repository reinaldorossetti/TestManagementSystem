-- AlterTable: add project details and platform (Web, Mobile, Desktop)
ALTER TABLE "projects" ADD COLUMN "details" TEXT;
ALTER TABLE "projects" ADD COLUMN "platform" TEXT;
