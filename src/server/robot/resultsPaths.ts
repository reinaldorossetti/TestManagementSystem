import path from 'node:path';
import { getRobotResultsDirectory } from '@/src/server/services/robotRuntimeSettingsService';

export {
  buildRunFolderName,
  extractResultsFolderFromPath,
  isPlausibleResultsFolderName,
} from '@/src/utils/robotResultsFolder';

export const RESULTS_ROOT = 'results';

const sanitizeFolder = (value: string): string => value.replace(/[^a-zA-Z0-9._-]/g, '');

export async function resolveResultsRoot(): Promise<string> {
  const relative = (await getRobotResultsDirectory()).replace(/[\\/]+$/, '');
  const workspaceRoot = path.resolve(process.cwd());
  const root = path.resolve(workspaceRoot, relative || RESULTS_ROOT);
  if (root !== workspaceRoot && !root.startsWith(`${workspaceRoot}${path.sep}`)) {
    throw new Error('Diretório de resultados fora da pasta do projeto.');
  }
  return root;
}

export async function resolveResultsDir(runFolder: string): Promise<string> {
  const safe = sanitizeFolder(runFolder);
  if (!safe) throw new Error('Pasta de resultados inválida.');
  return path.join(await resolveResultsRoot(), safe);
}

export async function resolveOutputXmlPath(runFolder: string): Promise<string> {
  return path.join(await resolveResultsDir(runFolder), 'output.xml');
}

/**
 * Resolves an execution folder from its persisted absolute output.xml path.
 * This deliberately does not read the current settings: a report must remain
 * accessible after the operator changes the repository for future runs.
 */
export function resolvePersistedResultsDir(resultsPath: string, runFolder?: string): string {
  const outputPath = path.resolve(resultsPath);
  const resultsDir = path.dirname(outputPath);
  const workspaceRoot = path.resolve(process.cwd());
  if (
    path.basename(outputPath).toLowerCase() !== 'output.xml'
    || (resultsDir !== workspaceRoot && !resultsDir.startsWith(`${workspaceRoot}${path.sep}`))
    || (runFolder && path.basename(resultsDir) !== sanitizeFolder(runFolder))
  ) {
    throw new Error('Caminho persistido de resultados inválido.');
  }
  return resultsDir;
}
