-- AlterTable
ALTER TABLE "executions" ADD COLUMN "report_screenshot_path" TEXT;
ALTER TABLE "executions" ADD COLUMN "results_folder" TEXT;

-- AlterTable
ALTER TABLE "steps" ADD COLUMN "screenshot_path" TEXT;

-- AlterTable
ALTER TABLE "test_cases" ADD COLUMN "report_screenshot_path" TEXT;
ALTER TABLE "test_cases" ADD COLUMN "robot_test_id" TEXT;
