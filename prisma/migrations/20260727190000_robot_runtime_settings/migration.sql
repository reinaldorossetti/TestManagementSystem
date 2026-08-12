-- Persisted Robot Framework runtime preferences.
CREATE TABLE IF NOT EXISTS "robot_runtime_settings" (
    "id" INTEGER NOT NULL PRIMARY KEY CHECK ("id" = 1),
    "output_dir" TEXT NOT NULL
);

INSERT OR IGNORE INTO "robot_runtime_settings" ("id", "output_dir")
VALUES (1, '%ROBOT_HOME%/results/');
