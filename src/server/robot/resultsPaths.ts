import path from 'node:path';

export { buildRunFolderName } from '@/src/utils/robotResultsFolder';

export const RESULTS_ROOT = 'results';

const sanitizeFolder = (value: string): string => value.replace(/[^a-zA-Z0-9._-]/g, '');

export function resolveResultsDir(runFolder: string): string {
  const safe = sanitizeFolder(runFolder);
  if (!safe) throw new Error('Pasta de resultados inválida.');
  return path.join(process.cwd(), RESULTS_ROOT, safe);
}

export function resolveOutputXmlPath(runFolder: string): string {
  return path.join(resolveResultsDir(runFolder), 'output.xml');
}

/** Extrai o nome da pasta em `results/` a partir do caminho do output.xml. */
export function extractResultsFolderFromPath(resultsPath: string): string | null {
  const normalized = resultsPath.replace(/\\/g, '/');
  const match = normalized.match(/\/results\/([^/]+)\//i);
  return match?.[1] ?? null;
}
