-- AlterTable
ALTER TABLE "test_cases_sphere" ADD COLUMN "last_execution_status" TEXT;
ALTER TABLE "test_cases_sphere" ADD COLUMN "last_execution_mode" TEXT;
ALTER TABLE "test_cases_sphere" ADD COLUMN "last_executed_at" TEXT;

-- CreateTable
CREATE TABLE "sphere_manual_executions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "test_case_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "executed_by" TEXT NOT NULL DEFAULT 'Operador QA',
    "executed_at" TEXT NOT NULL,
    "duration_s" REAL,
    CONSTRAINT "sphere_manual_executions_test_case_id_fkey" FOREIGN KEY ("test_case_id") REFERENCES "test_cases_sphere" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "sphere_manual_executions_test_case_id_idx" ON "sphere_manual_executions"("test_case_id");
