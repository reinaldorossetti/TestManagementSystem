-- CreateTable
CREATE TABLE "executions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timestamp" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "duration_s" REAL NOT NULL,
    "total_tests" INTEGER NOT NULL,
    "passed" INTEGER NOT NULL,
    "failed" INTEGER NOT NULL,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "results_path" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "test_cases" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "execution_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "duration_s" REAL NOT NULL,
    CONSTRAINT "test_cases_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "executions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "steps" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "test_case_id" TEXT NOT NULL,
    "step_type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "steps_test_case_id_fkey" FOREIGN KEY ("test_case_id") REFERENCES "test_cases" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "test_specs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "test_folders" (
    "path" TEXT NOT NULL PRIMARY KEY
);

-- CreateTable
CREATE TABLE "test_cases_sphere" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "folder" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "preconditions" TEXT NOT NULL DEFAULT '',
    "steps" TEXT NOT NULL DEFAULT '',
    "expected_result" TEXT NOT NULL DEFAULT '',
    "observation" TEXT,
    "created_at" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "test_case_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "test_case_id" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    CONSTRAINT "test_case_history_test_case_id_fkey" FOREIGN KEY ("test_case_id") REFERENCES "test_cases_sphere" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "test_cases_execution_id_idx" ON "test_cases"("execution_id");

-- CreateIndex
CREATE INDEX "steps_test_case_id_idx" ON "steps"("test_case_id");

-- CreateIndex
CREATE INDEX "test_cases_sphere_folder_idx" ON "test_cases_sphere"("folder");

-- CreateIndex
CREATE INDEX "test_case_history_test_case_id_idx" ON "test_case_history"("test_case_id");
