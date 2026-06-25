import type { DbExecution } from './sqliteEngine';

/** Pasta com data/hora da execução: RUN-2026-06-25_17-51-30-47841 */
export function buildRunFolderName(timestamp: string): string {
  const [datePart, timePart] = timestamp.trim().split(/\s+/);
  const safeDate = (datePart || '1970-01-01').replace(/[^0-9-]/g, '');
  const safeTime = (timePart || '00-00-00').replace(/:/g, '-');
  const suffix = `${Date.now()}`.slice(-5);
  return `RUN-${safeDate}_${safeTime}-${suffix}`;
}

/** Nome válido de subpasta em results/ (exclui caminhos simulados output_*.xml). */
export function isPlausibleResultsFolderName(name: string): boolean {
  const n = name.trim();
  if (!n) return false;
  if (/\.xml$/i.test(n)) return false;
  if (/^output_/i.test(n)) return false;
  if (/%ROBOT_HOME%/i.test(n)) return false;
  return true;
}

/** Extrai pasta de results/ a partir do caminho do output.xml (somente nomes válidos). */
export function extractResultsFolderFromPath(resultsPath: string): string | null {
  const normalized = resultsPath.replace(/\\/g, '/');
  const match = normalized.match(/(?:^|\/)results\/([^/]+)(?:\/|$)/i);
  const candidate = match?.[1] ?? null;
  return candidate && isPlausibleResultsFolderName(candidate) ? candidate : null;
}

/** Resolve a pasta em results/ a partir da execução persistida (heurística local). */
export function resolveResultsFolderFromExecution(exec: DbExecution): string {
  if (exec.results_folder?.trim() && isPlausibleResultsFolderName(exec.results_folder)) {
    return exec.results_folder.trim();
  }
  const fromPath = exec.results_path?.trim()
    ? extractResultsFolderFromPath(exec.results_path)
    : null;
  if (fromPath) return fromPath;
  if (isPlausibleResultsFolderName(exec.id)) return exec.id;
  return exec.id;
}
