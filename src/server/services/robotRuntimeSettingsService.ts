import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { prisma } from '@/src/lib/db';

const SETTINGS_TABLE = 'robot_runtime_settings';
export const DEFAULT_ROBOT_RESULTS_DIRECTORY = 'results/';

type SettingsRow = { output_dir: string };

async function ensureSettingsTable(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS ${SETTINGS_TABLE} (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      output_dir TEXT NOT NULL
    )
  `);
  await prisma.$executeRawUnsafe(
    `INSERT OR IGNORE INTO ${SETTINGS_TABLE} (id, output_dir) VALUES (1, ?)`,
    DEFAULT_ROBOT_RESULTS_DIRECTORY,
  );
}

/** Normalizes legacy placeholders and user input to a workspace-relative path. */
function normalizeResultsDirectory(value: string): string {
  let relative = value.trim().replace(/\\/g, '/');
  // Compatibility with values persisted by the previous implementation.
  relative = relative.replace(/^%?ROBOT_HOME%?\/?/i, '');
  relative = relative.replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/+$/, '');
  if (path.isAbsolute(value) || /^[a-zA-Z]:[\\/]/.test(value.trim())) {
    throw new Error('Informe um caminho relativo à pasta do projeto, por exemplo results/robot_framework/.');
  }
  if (!relative) relative = DEFAULT_ROBOT_RESULTS_DIRECTORY.replace(/\/$/, '');
  if (relative.split('/').some((segment) => segment === '..')) {
    throw new Error('O diretório de resultados não pode sair da pasta do projeto.');
  }
  return `${relative}/`;
}

async function ensurePhysicalDirectory(relativeDirectory: string): Promise<void> {
  const workspaceRoot = path.resolve(process.cwd());
  const resolved = path.resolve(workspaceRoot, relativeDirectory);
  if (resolved !== workspaceRoot && !resolved.startsWith(`${workspaceRoot}${path.sep}`)) {
    throw new Error('O diretório de resultados precisa estar dentro da pasta do projeto.');
  }
  await mkdir(resolved, { recursive: true });
}

/** Reads the persisted Robot output directory template. */
export async function getRobotResultsDirectory(): Promise<string> {
  await ensureSettingsTable();
  const rows = await prisma.$queryRawUnsafe<SettingsRow[]>(
    `SELECT output_dir FROM ${SETTINGS_TABLE} WHERE id = 1`,
  );
  const normalized = normalizeResultsDirectory(rows[0]?.output_dir || DEFAULT_ROBOT_RESULTS_DIRECTORY);
  await ensurePhysicalDirectory(normalized);
  if (rows[0]?.output_dir !== normalized) {
    await prisma.$executeRawUnsafe(
      `UPDATE ${SETTINGS_TABLE} SET output_dir = ? WHERE id = 1`,
      normalized,
    );
  }
  return normalized;
}

/**
 * Stores a real workspace-relative Robot output directory, such as
 * `results/robot_framework/`. Absolute paths and traversal are not accepted.
 */
export async function setRobotResultsDirectory(value: string): Promise<string> {
  const normalized = normalizeResultsDirectory(value);
  await ensurePhysicalDirectory(normalized);

  await ensureSettingsTable();
  await prisma.$executeRawUnsafe(
    `UPDATE ${SETTINGS_TABLE} SET output_dir = ? WHERE id = 1`,
    normalized,
  );
  return normalized;
}
