import { prisma } from '@/src/lib/db';
import type { DbSphereManualExecution } from '@/src/utils/sqliteEngine';
import type { DbClient } from './types';

interface ManualExecutionCreateData {
  id: string;
  testCaseId: string;
  status: string;
  notes: string;
  executedBy: string;
  executedAt: string;
  durationS?: number | null;
}

export function toDbManualExecution(row: {
  id: string;
  testCaseId: string;
  status: string;
  notes: string;
  executedBy: string;
  executedAt: string;
  durationS: number | null;
}): DbSphereManualExecution {
  return {
    id: row.id,
    test_case_id: row.testCaseId,
    status: row.status as DbSphereManualExecution['status'],
    notes: row.notes,
    executed_by: row.executedBy,
    executed_at: row.executedAt,
    duration_s: row.durationS ?? undefined,
  };
}

export async function createManualExecution(
  data: ManualExecutionCreateData,
  client: DbClient = prisma,
): Promise<DbSphereManualExecution> {
  const row = await client.sphereManualExecution.create({
    data: {
      id: data.id,
      testCaseId: data.testCaseId,
      status: data.status,
      notes: data.notes,
      executedBy: data.executedBy,
      executedAt: data.executedAt,
      durationS: data.durationS ?? null,
    },
  });
  return toDbManualExecution(row);
}

export async function listManualExecutionsByCase(
  testCaseId: string,
  client: DbClient = prisma,
): Promise<DbSphereManualExecution[]> {
  const rows = await client.sphereManualExecution.findMany({
    where: { testCaseId },
    orderBy: { executedAt: 'desc' },
  });
  return rows.map(toDbManualExecution);
}

export async function deleteManualExecutionsForCase(
  testCaseId: string,
  client: DbClient = prisma,
): Promise<void> {
  await client.sphereManualExecution.deleteMany({ where: { testCaseId } });
}
