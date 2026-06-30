-- CreateTable
CREATE TABLE "folder_acceptance_docs" (
    "folder_path" TEXT NOT NULL PRIMARY KEY,
    "doc_title" TEXT NOT NULL,
    "doc_web_path" TEXT NOT NULL,
    "repo_relative_path" TEXT NOT NULL,
    "updated_at" TEXT NOT NULL
);
