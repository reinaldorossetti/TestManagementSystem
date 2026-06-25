import type { DbExecution } from './sqliteEngine';

/** Pasta com data/hora da execução: RUN-2026-06-25_17-51-30-47841 */
export function buildRunFolderName(timestamp: string): string {
  const [datePart, timePart] = timestamp.trim().split(/\s+/);
  const safeDate = (datePart || '1970-01-01').replace(/[^0-9-]/g, '');
  const safeTime = (timePart || '00-00-00').replace(/:/g, '-');
  const suffix = `${Date.now()}`.slice(-5);
  return `RUN-${safeDate}_${safeTime}-${suffix}`;
}

/** Resolve a pasta em results/ a partir da execução persistida. */
export function resolveResultsFolderFromExecution(exec: DbExecution): string {
  if (exec.results_folder?.trim()) return exec.results_folder.trim();
  if (exec.results_path?.trim()) {
    const normalized = exec.results_path.replace(/\\/g, '/');
    const match = normalized.match(/(?:^|\/)results\/([^/]+)(?:\/|$)/i);
    if (match?.[1]) return match[1];
  }
  return exec.id;
}
