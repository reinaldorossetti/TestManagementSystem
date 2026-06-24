import { prisma } from '@/src/lib/db';
import type { DbExecution } from '@/src/utils/sqliteEngine';
import {
  insertRun,
  deleteExecution as deleteExecutionRow,
  findExecutionById,
} from '@/src/server/repositories/executionRepository';
import type { PersistRunInput } from '@/src/server/validation/schemas';

/**
 * Persists a completed simulation run (execution + test cases + steps) in a
 * single transaction, replacing the legacy in-place `setSqliteDb` array prepend.
 */
export async function persistRun(payload: PersistRunInput): Promise<void> {
  await prisma.$transaction((tx) => insertRun(payload, tx));
}

export async function getExecution(id: string): Promise<DbExecution | null> {
  return findExecutionById(id);
}

export async function removeExecution(id: string): Promise<void> {
  await deleteExecutionRow(id);
}
