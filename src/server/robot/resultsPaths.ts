import path from 'node:path';

/**
 * Centraliza a resolução de caminhos da pasta de resultados das execuções reais
 * do Robot Framework. Cada execução grava em `results/<runId>/output.xml`.
 *
 * Sanitiza o runId para evitar path traversal (somente caracteres seguros).
 */
const RESULTS_ROOT = 'results';

const sanitizeRunId = (runId: string): string => runId.replace(/[^a-zA-Z0-9._-]/g, '');

export function resolveResultsDir(runId: string): string {
  const safe = sanitizeRunId(runId);
  if (!safe) throw new Error('runId inválido.');
  return path.join(process.cwd(), RESULTS_ROOT, safe);
}

export function resolveOutputXmlPath(runId: string): string {
  return path.join(resolveResultsDir(runId), 'output.xml');
}
