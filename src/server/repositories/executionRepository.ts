import { prisma } from '@/src/lib/db';
import type { DbExecution, DbTestCase, DbStepLog } from '@/src/utils/sqliteEngine';
import { toDbExecution, toDbTestCase, toDbStep } from '@/src/server/mappers/dbMappers';
import type { PersistRunInput } from '@/src/server/validation/schemas';
import type { DbClient } from './types';

export async function listExecutions(client: DbClient = prisma): Promise<DbExecution[]> {
  const rows = await client.execution.findMany({ orderBy: { createdAt: 'desc' } });
  return rows.map(toDbExecution);
}

export async function listTestCases(client: DbClient = prisma): Promise<DbTestCase[]> {
  const rows = await client.testCase.findMany();
  return rows.map(toDbTestCase);
}

export async function listSteps(client: DbClient = prisma): Promise<DbStepLog[]> {
  const rows = await client.step.findMany();
  return rows.map(toDbStep);
}

export async function findExecutionById(
  id: string,
  client: DbClient = prisma,
): Promise<DbExecution | null> {
  const row = await client.execution.findUnique({ where: { id } });
  return row ? toDbExecution(row) : null;
}

/** Inserts an execution together with its test cases and steps atomically. */
export async function insertRun(payload: PersistRunInput, client: DbClient): Promise<void> {
  const { execution, testCases, steps } = payload;

  await client.execution.create({
    data: {
      id: execution.id,
      timestamp: execution.timestamp,
      command: execution.command,
      durationS: execution.duration_s,
      totalTests: execution.total_tests,
      passed: execution.passed,
      failed: execution.failed,
      skipped: execution.skipped ?? 0,
      status: execution.status,
      resultsPath: execution.results_path,
    },
  });

  if (testCases.length > 0) {
    await client.testCase.createMany({
      data: testCases.map((testCase) => ({
        id: testCase.id,
        executionId: testCase.execution_id,
        name: testCase.name,
        category: testCase.category,
        status: testCase.status,
        durationS: testCase.duration_s,
      })),
    });
  }

  if (steps.length > 0) {
    await client.step.createMany({
      data: steps.map((step) => ({
        id: step.id,
        testCaseId: step.test_case_id,
        stepType: step.step_type,
        text: step.text,
        status: step.status,
      })),
    });
  }
}

export async function deleteExecution(id: string, client: DbClient = prisma): Promise<void> {
  await client.execution.delete({ where: { id } });
}
