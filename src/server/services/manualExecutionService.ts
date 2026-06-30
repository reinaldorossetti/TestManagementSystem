import { randomUUID } from 'node:crypto';
import {
  listExecutions,
  listTestCases,
} from '@/src/server/repositories/executionRepository';
import { findSphereCaseById } from '@/src/server/repositories/testCaseSphereRepository';
import {
  createManualExecution,
  listManualExecutionsByCase,
} from '@/src/server/repositories/sphereManualExecutionRepository';
import { updateSphereCase } from '@/src/server/repositories/testCaseSphereRepository';
import { extractResultsFolderFromPath } from '@/src/utils/robotResultsFolder';
import type {
  DbSphereManualExecution,
  DbTestCaseSphere,
  SphereExecutionMode,
  SphereExecutionStatus,
} from '@/src/utils/sqliteEngine';
import { nowTimestamp } from '@/src/server/utils/identifiers';
import type { ManualExecutionCreateInput } from '@/src/server/validation/schemas';

export class ManualExecutionNotFoundError extends Error {}
export class ManualExecutionValidationError extends Error {}

function buildMatchers(sphereId: string): string[] {
  const matchers = new Set<string>([sphereId.toUpperCase()]);

  const ctFromId = sphereId.match(/CT0*(\d+)/i);
  if (ctFromId) {
    const n = ctFromId[1];
    matchers.add(`CT${n}`);
    matchers.add(`CT${n.padStart(2, '0')}`);
  }

  const tcFromId = sphereId.match(/TC-?0*(\d+)/i);
  if (tcFromId) {
    const n = tcFromId[1];
    matchers.add(`CT${n}`);
    matchers.add(`CT${n.padStart(2, '0')}`);
    matchers.add(`TC-${n.padStart(3, '0')}`);
  }

  const recel = sphereId.match(/^RECEL(\d+)/i);
  if (recel) {
    matchers.add(`RECEL${recel[1]}`);
    matchers.add(`RCT${recel[1]}`);
  }

  return [...matchers];
}

function matchesSphereCase(
  testCase: { name: string; category: string; robot_test_id?: string },
  matchers: string[],
  sphereTitle: string,
): boolean {
  const name = testCase.name.toUpperCase();
  const category = testCase.category.toUpperCase();
  const robotId = testCase.robot_test_id?.toUpperCase() ?? '';

  if (matchers.some((token) => name.includes(token) || category.includes(token))) {
    return true;
  }
  if (robotId && matchers.some((token) => robotId.includes(token))) {
    return true;
  }

  const cleanTitle = sphereTitle
    .replace(/^[^-]+-\s*(Cenário de Teste Positivo - |Cenário de Teste Alternativo - )?/i, '')
    .trim()
    .toLowerCase();
  if (cleanTitle.length >= 8 && name.toLowerCase().includes(cleanTitle.slice(0, 48))) {
    return true;
  }

  return false;
}

export interface SphereExecutionSummary {
  test_case_id: string;
  status: SphereExecutionStatus | null;
  mode: SphereExecutionMode | null;
  executed_at: string | null;
}

async function resolveLatestAutomatedForCase(
  sphereCase: DbTestCaseSphere,
): Promise<{ status: SphereExecutionStatus; executed_at: string } | null> {
  const [executions, testCases] = await Promise.all([listExecutions(), listTestCases()]);
  const matchers = buildMatchers(sphereCase.id);

  for (const execution of executions) {
    const resultsFolder =
      execution.results_folder?.trim() ||
      extractResultsFolderFromPath(execution.results_path) ||
      null;
    if (!resultsFolder) continue;

    const execTests = testCases.filter((tc) => tc.execution_id === execution.id);
    const matched = execTests.find((tc) => matchesSphereCase(tc, matchers, sphereCase.title));
    if (!matched) continue;

    return {
      status: matched.status as SphereExecutionStatus,
      executed_at: execution.timestamp,
    };
  }

  return null;
}

export async function getExecutionSummary(testCaseId: string): Promise<SphereExecutionSummary> {
  const sphereCase = await findSphereCaseById(testCaseId);
  if (!sphereCase) {
    throw new ManualExecutionNotFoundError('Caso de teste não encontrado.');
  }

  const automated = await resolveLatestAutomatedForCase(sphereCase);
  const manualAt = sphereCase.last_execution_mode === 'manual' ? sphereCase.last_executed_at : null;
  const manualStatus =
    sphereCase.last_execution_mode === 'manual' ? sphereCase.last_execution_status : null;

  if (automated && manualAt && manualStatus) {
    if (manualAt.localeCompare(automated.executed_at) >= 0) {
      return {
        test_case_id: testCaseId,
        status: manualStatus,
        mode: 'manual',
        executed_at: manualAt,
      };
    }
    return {
      test_case_id: testCaseId,
      status: automated.status,
      mode: 'automated',
      executed_at: automated.executed_at,
    };
  }

  if (manualAt && manualStatus) {
    return {
      test_case_id: testCaseId,
      status: manualStatus,
      mode: 'manual',
      executed_at: manualAt,
    };
  }

  if (automated) {
    return {
      test_case_id: testCaseId,
      status: automated.status,
      mode: 'automated',
      executed_at: automated.executed_at,
    };
  }

  return {
    test_case_id: testCaseId,
    status: null,
    mode: null,
    executed_at: null,
  };
}

export interface ManualExecutionResult {
  execution: DbSphereManualExecution;
  testCase: DbTestCaseSphere;
}

export async function recordManualExecution(
  testCaseId: string,
  input: ManualExecutionCreateInput,
): Promise<ManualExecutionResult> {
  const sphereCase = await findSphereCaseById(testCaseId);
  if (!sphereCase) {
    throw new ManualExecutionNotFoundError('Caso de teste não encontrado.');
  }

  const executedAt = nowTimestamp();
  const executedBy = input.executedBy?.trim() || 'Operador QA';
  const notes = input.notes?.trim() ?? '';

  const execution = await createManualExecution({
    id: randomUUID(),
    testCaseId,
    status: input.status,
    notes,
    executedBy,
    executedAt,
    durationS: input.durationS ?? null,
  });

  const statusLabel = input.status;
  const historyAction = `manual execution: ${statusLabel} by ${executedBy}`;

  const testCase = await updateSphereCase(
    testCaseId,
    {
      lastExecutionStatus: input.status,
      lastExecutionMode: 'manual',
      lastExecutedAt: executedAt,
    },
    [{ user: executedBy, action: historyAction, time: executedAt }],
  );

  return { execution, testCase };
}

export async function listManualExecutionHistory(
  testCaseId: string,
): Promise<DbSphereManualExecution[]> {
  const sphereCase = await findSphereCaseById(testCaseId);
  if (!sphereCase) {
    throw new ManualExecutionNotFoundError('Caso de teste não encontrado.');
  }
  return listManualExecutionsByCase(testCaseId);
}

/** Updates sphere case when a newer automated run matches this TMS case. */
export async function syncAutomatedStatusForSphereCase(
  testCaseId: string,
  status: SphereExecutionStatus,
  executedAt: string,
): Promise<DbTestCaseSphere | null> {
  const sphereCase = await findSphereCaseById(testCaseId);
  if (!sphereCase) return null;

  const currentAt = sphereCase.last_executed_at ?? '';
  if (currentAt && currentAt.localeCompare(executedAt) > 0) {
    return sphereCase;
  }

  return updateSphereCase(
    testCaseId,
    {
      lastExecutionStatus: status,
      lastExecutionMode: 'automated',
      lastExecutedAt: executedAt,
    },
    [],
  );
}

export async function syncAutomatedStatusesAfterRobotRun(
  robotTestCases: { name: string; category: string; status: string; robot_test_id?: string }[],
  executedAt: string,
  sphereCases: DbTestCaseSphere[],
): Promise<void> {
  for (const sphereCase of sphereCases) {
    const matchers = buildMatchers(sphereCase.id);
    const matched = robotTestCases.find((tc) => matchesSphereCase(tc, matchers, sphereCase.title));
    if (!matched) continue;
    await syncAutomatedStatusForSphereCase(
      sphereCase.id,
      matched.status as SphereExecutionStatus,
      executedAt,
    );
  }
}
