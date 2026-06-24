import type {
  Execution as PrismaExecution,
  TestCase as PrismaTestCase,
  Step as PrismaStep,
  TestSpec as PrismaTestSpec,
  TestCaseSphere as PrismaTestCaseSphere,
  TestCaseHistory as PrismaTestCaseHistory,
} from '@/generated/prisma/client';
import type {
  DbExecution,
  DbTestCase,
  DbStepLog,
  DbTestSpec,
  DbTestCaseSphere,
} from '@/src/utils/sqliteEngine';

/**
 * Mappers translate Prisma's idiomatic camelCase rows into the legacy
 * snake_case `Db*` shapes consumed by the existing frontend / SQLite engine,
 * keeping the persistence layer decoupled from the UI data contract.
 */

export function toDbExecution(row: PrismaExecution): DbExecution {
  return {
    id: row.id,
    timestamp: row.timestamp,
    command: row.command,
    duration_s: row.durationS,
    total_tests: row.totalTests,
    passed: row.passed,
    failed: row.failed,
    status: row.status as DbExecution['status'],
    results_path: row.resultsPath,
  };
}

export function toDbTestCase(row: PrismaTestCase): DbTestCase {
  return {
    id: row.id,
    execution_id: row.executionId,
    name: row.name,
    category: row.category,
    status: row.status as DbTestCase['status'],
    duration_s: row.durationS,
  };
}

export function toDbStep(row: PrismaStep): DbStepLog {
  return {
    id: row.id,
    test_case_id: row.testCaseId,
    step_type: row.stepType as DbStepLog['step_type'],
    text: row.text,
    status: row.status as DbStepLog['status'],
  };
}

export function toDbTestSpec(row: PrismaTestSpec): DbTestSpec {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    tags: row.tags,
    content: row.content,
    created_at: row.createdAt,
  };
}

export function toDbTestCaseSphere(
  row: PrismaTestCaseSphere & { history?: PrismaTestCaseHistory[] },
): DbTestCaseSphere {
  return {
    id: row.id,
    folder: row.folder,
    title: row.title,
    preconditions: row.preconditions,
    steps: row.steps,
    expected_result: row.expectedResult,
    observation: row.observation ?? undefined,
    created_at: row.createdAt,
    history: (row.history ?? []).map((entry) => ({
      user: entry.user,
      action: entry.action,
      time: entry.time,
    })),
  };
}
