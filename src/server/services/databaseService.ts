import { prisma } from '@/src/lib/db';
import type { VirtualDatabase } from '@/src/utils/sqliteEngine';
import { seedDatabase } from '@/src/server/db/seed';
import {
  listExecutions,
  listTestCases,
  listSteps,
} from '@/src/server/repositories/executionRepository';
import { listTestSpecs } from '@/src/server/repositories/testSpecRepository';
import { listSphereCases } from '@/src/server/repositories/testCaseSphereRepository';
import { listFolders } from '@/src/server/repositories/folderRepository';

/**
 * Builds the full relational snapshot in the `VirtualDatabase` shape expected by
 * the frontend, aggregating every table in a single read.
 */
export async function getSnapshot(): Promise<VirtualDatabase> {
  const [executions, testCases, steps, testSpecs, sphereCases, folders] = await Promise.all([
    listExecutions(),
    listTestCases(),
    listSteps(),
    listTestSpecs(),
    listSphereCases(),
    listFolders(),
  ]);

  return {
    executions,
    test_cases: testCases,
    steps,
    test_specs: testSpecs,
    test_cases_sphere: sphereCases,
    test_folders: folders,
  };
}

/** Wipes execution history and restores the canonical demo dataset. */
export async function resetDatabase(): Promise<VirtualDatabase> {
  await seedDatabase(prisma);
  return getSnapshot();
}

/**
 * Transactional replace-all persistence used by the transitional snapshot save
 * path (mirrors the legacy localStorage blob). Granular endpoints remain the
 * preferred mutation surface; this exists to keep the frontend migration safe.
 */
export async function replaceDatabase(db: VirtualDatabase): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.step.deleteMany();
    await tx.testCase.deleteMany();
    await tx.execution.deleteMany();
    await tx.testCaseHistory.deleteMany();
    await tx.testCaseSphere.deleteMany();
    await tx.testSpec.deleteMany();
    await tx.testFolder.deleteMany();

    for (const execution of db.executions) {
      await tx.execution.create({
        data: {
          id: execution.id,
          timestamp: execution.timestamp,
          command: execution.command,
          durationS: execution.duration_s,
          totalTests: execution.total_tests,
          passed: execution.passed,
          failed: execution.failed,
          skipped: 0,
          status: execution.status,
          resultsPath: execution.results_path,
        },
      });
    }

    if (db.test_cases.length > 0) {
      await tx.testCase.createMany({
        data: db.test_cases.map((testCase) => ({
          id: testCase.id,
          executionId: testCase.execution_id,
          name: testCase.name,
          category: testCase.category,
          status: testCase.status,
          durationS: testCase.duration_s,
        })),
      });
    }

    if (db.steps.length > 0) {
      await tx.step.createMany({
        data: db.steps.map((step) => ({
          id: step.id,
          testCaseId: step.test_case_id,
          stepType: step.step_type,
          text: step.text,
          status: step.status,
        })),
      });
    }

    for (const spec of db.test_specs ?? []) {
      await tx.testSpec.create({
        data: {
          id: spec.id,
          name: spec.name,
          category: spec.category,
          tags: spec.tags,
          content: spec.content,
          createdAt: spec.created_at,
        },
      });
    }

    for (const folderPath of db.test_folders ?? []) {
      await tx.testFolder.create({ data: { path: folderPath } });
    }

    for (const sphereCase of db.test_cases_sphere ?? []) {
      await tx.testCaseSphere.create({
        data: {
          id: sphereCase.id,
          folder: sphereCase.folder,
          title: sphereCase.title,
          preconditions: sphereCase.preconditions,
          steps: sphereCase.steps,
          expectedResult: sphereCase.expected_result,
          observation: sphereCase.observation ?? null,
          createdAt: sphereCase.created_at,
          history: {
            create: (sphereCase.history ?? []).map((entry) => ({
              user: entry.user,
              action: entry.action,
              time: entry.time,
            })),
          },
        },
      });
    }
  });
}
