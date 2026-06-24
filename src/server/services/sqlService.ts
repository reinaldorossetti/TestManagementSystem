import { executeVirtualSQL } from '@/src/utils/sqliteEngine';
import { getSnapshot } from './databaseService';

export interface SqlQueryResult {
  columns: string[];
  rows: unknown[];
  count: number;
  error?: string;
}

/**
 * Runs a read-only SELECT against a fresh database snapshot. Any non-SELECT
 * statement is rejected so the playground can never mutate persisted data.
 */
export async function runReadOnlyQuery(query: string): Promise<SqlQueryResult> {
  const normalized = query.trim().toUpperCase();
  if (!normalized.startsWith('SELECT')) {
    return {
      columns: [],
      rows: [],
      count: 0,
      error: 'Apenas consultas SELECT (somente leitura) são permitidas neste playground.',
    };
  }

  const snapshot = await getSnapshot();
  return executeVirtualSQL(query, snapshot);
}
