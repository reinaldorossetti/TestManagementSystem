-- CreateTable
CREATE TABLE "folder_acceptance_doc_history" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "folder_path" TEXT NOT NULL,
    "user" TEXT NOT NULL DEFAULT 'TMS',
    "action" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "time" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "folder_acceptance_doc_history_folder_path_idx" ON "folder_acceptance_doc_history"("folder_path");
