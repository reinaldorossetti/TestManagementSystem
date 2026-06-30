-- CreateTable
CREATE TABLE "test_case_evidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "test_case_id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "evidence_type" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "mime_type" TEXT,
    "file_name" TEXT,
    "image_data" BLOB,
    "storage_path" TEXT,
    "external_url" TEXT,
    "created_at" TEXT NOT NULL,
    "created_by" TEXT NOT NULL DEFAULT 'TMS'
);

-- CreateIndex
CREATE INDEX "test_case_evidence_test_case_id_idx" ON "test_case_evidence"("test_case_id");
