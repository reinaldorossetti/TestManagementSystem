-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "created_at" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "projects_name_key" ON "projects"("name");

-- CreateTable
CREATE TABLE "folder_projects" (
    "folder_path" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    CONSTRAINT "folder_projects_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "folder_projects_project_id_idx" ON "folder_projects"("project_id");

-- Backfill: link any pre-existing folders to a default project so installations
-- created before the Project feature keep working without manual setup.
INSERT INTO "projects" ("id", "name", "created_at")
SELECT 'PROJ-DEFAULT', 'Projeto Padrão', datetime('now')
WHERE EXISTS (SELECT 1 FROM "test_folders")
  AND NOT EXISTS (SELECT 1 FROM "projects" WHERE "id" = 'PROJ-DEFAULT');

INSERT INTO "folder_projects" ("folder_path", "project_id")
SELECT tf."path", 'PROJ-DEFAULT'
FROM "test_folders" tf
WHERE NOT EXISTS (SELECT 1 FROM "folder_projects" fp WHERE fp."folder_path" = tf."path")
  AND EXISTS (SELECT 1 FROM "projects" WHERE "id" = 'PROJ-DEFAULT');
