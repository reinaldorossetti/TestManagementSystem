import type { DbTestCaseSphere, SphereExecutionMode, SphereExecutionStatus } from '@/src/utils/sqliteEngine';

/** Resolves the raw status code for a sphere case (DB fields take precedence over localStorage). */
export function resolveSphereCaseStatus(
  testCase: DbTestCaseSphere,
  localStatuses: Record<string, string> = {},
): string {
  if (testCase.last_execution_status) {
    return testCase.last_execution_status;
  }
  return localStatuses[testCase.id] || 'Not executed';
}

export function resolveSphereCaseMode(testCase: DbTestCaseSphere): SphereExecutionMode | null {
  return testCase.last_execution_mode ?? null;
}

/** Merges persisted execution status into the map used by Excel/PDF exporters. */
export function buildStatusByCaseId(
  cases: DbTestCaseSphere[],
  localStatuses: Record<string, string> = {},
): Record<string, string> {
  const merged = { ...localStatuses };
  for (const testCase of cases) {
    if (testCase.last_execution_status) {
      merged[testCase.id] = testCase.last_execution_status;
    }
  }
  return merged;
}

export function buildExecutionModeByCaseId(
  cases: DbTestCaseSphere[],
): Record<string, SphereExecutionMode> {
  const modes: Record<string, SphereExecutionMode> = {};
  for (const testCase of cases) {
    if (testCase.last_execution_mode) {
      modes[testCase.id] = testCase.last_execution_mode;
    }
  }
  return modes;
}

export function parseGherkinStepLines(steps: string): string[] {
  return steps
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

export const MANUAL_STATUS_OPTIONS: {
  value: SphereExecutionStatus;
  labelPt: string;
  labelEn: string;
}[] = [
  { value: 'PASS', labelPt: 'Aprovado', labelEn: 'Passed' },
  { value: 'FAIL', labelPt: 'Falhou', labelEn: 'Failed' },
  { value: 'BLOCKED', labelPt: 'Bloqueado', labelEn: 'Blocked' },
  { value: 'SKIP', labelPt: 'Ignorado', labelEn: 'Skipped' },
];
