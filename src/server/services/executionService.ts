import { prisma } from '@/src/lib/db';
import type { DbExecution } from '@/src/utils/sqliteEngine';
import {
  insertRun,
  deleteExecution as deleteExecutionRow,
  findExecutionById,
} from '@/src/server/repositories/executionRepository';
import { listSphereCases } from '@/src/server/repositories/testCaseSphereRepository';
import { syncAutomatedStatusesAfterRobotRun } from '@/src/server/services/manualExecutionService';
import type { PersistRunInput } from '@/src/server/validation/schemas';

/**
 * Persists a completed Robot run (execution + test cases + steps) in a
 * single transaction, replacing the legacy in-place `setSqliteDb` array prepend.
 */
export async function persistRun(payload: PersistRunInput): Promise<void> {
  await prisma.$transaction((tx) => insertRun(payload, tx));

  const sphereCases = await listSphereCases();
  if (sphereCases.length > 0) {
    await syncAutomatedStatusesAfterRobotRun(
      payload.testCases,
      payload.execution.timestamp,
      sphereCases,
    );
  }
}

export async function getExecution(id: string): Promise<DbExecution | null> {
  return findExecutionById(id);
}

export async function removeExecution(id: string): Promise<void> {
  await deleteExecutionRow(id);
}
