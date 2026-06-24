import { INITIAL_DB_SEED } from '@/src/utils/sqliteEngine';
import type { PrismaClient } from '@/generated/prisma/client';

/**
 * Populates the database with the canonical demo dataset.
 *
 * The operation is idempotent: it wipes existing rows (respecting FK order)
 * before inserting the seed snapshot. Shared by the Prisma seed script and the
 * database reset service so both paths produce an identical baseline state.
 */
export async function seedDatabase(prisma: PrismaClient): Promise<void> {
  const seed = INITIAL_DB_SEED;

  await prisma.$transaction(async (tx) => {
    await tx.step.deleteMany();
    await tx.testCase.deleteMany();
    await tx.execution.deleteMany();
    await tx.testCaseHistory.deleteMany();
    await tx.testCaseSphere.deleteMany();
    await tx.testSpec.deleteMany();
    await tx.testFolder.deleteMany();

    for (const execution of seed.executions) {
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

    for (const testCase of seed.test_cases) {
      await tx.testCase.create({
        data: {
          id: testCase.id,
          executionId: testCase.execution_id,
          name: testCase.name,
          category: testCase.category,
          status: testCase.status,
          durationS: testCase.duration_s,
        },
      });
    }

    for (const step of seed.steps) {
      await tx.step.create({
        data: {
          id: step.id,
          testCaseId: step.test_case_id,
          stepType: step.step_type,
          text: step.text,
          status: step.status,
        },
      });
    }

    for (const spec of seed.test_specs ?? []) {
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

    for (const folderPath of seed.test_folders ?? []) {
      await tx.testFolder.create({ data: { path: folderPath } });
    }

    for (const sphereCase of seed.test_cases_sphere ?? []) {
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
