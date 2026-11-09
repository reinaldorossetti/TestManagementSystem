import {
  testRunResultSchema,
  type TestRunCaseStatus,
  type TestRunStatus,
} from '../validation/testRunSchemas';

export interface ScorecardMetricCell {
  count: number;
  percentage: number;
  percentageFixed: string;
  formatted: string;
}

export interface ScorecardStatusBreakdown {
  total: number;
  open: ScorecardMetricCell;
  passed: ScorecardMetricCell;
  failed: ScorecardMetricCell;
  skipped: ScorecardMetricCell;
  blocked: ScorecardMetricCell;
}

export interface ScorecardRunInputCase {
  id?: string;
  sourceTestCaseId: string;
  status: TestRunCaseStatus | string;
  folderSnapshot?: string;
  titleSnapshot?: string;
  badgeSnapshot?: string;
  notes?: string;
  durationS?: number | null;
}

export interface ScorecardRunInput {
  id: string;
  name: string;
  projectId?: string;
  projectName?: string;
  appVersion: string;
  platform: string;
  environment: string;
  browserOrDevice?: string | null;
  milestone: string;
  suiteType?: string;
  mode?: string;
  status: TestRunStatus | string;
  startedAt?: string | null;
  closedAt?: string | null;
  cases?: ScorecardRunInputCase[];
  counts?: {
    total?: number;
    open: number;
    passed: number;
    failed: number;
    skipped: number;
    blocked: number;
  };
}

export interface ScorecardRunRow extends ScorecardStatusBreakdown {
  id: string;
  name: string;
  projectId: string;
  projectName: string;
  appVersion: string;
  platform: string;
  environment: string;
  browserOrDevice: string | null;
  milestone: string;
  suiteType: string;
  mode: string;
  status: string;
  startedAt: string | null;
  closedAt: string | null;
  sourceTestCaseIds: string[];
}

export type ScorecardWarningCode =
  | 'DIFFERENT_VERSIONS'
  | 'DIFFERENT_SCOPES'
  | 'ABORTED_INCLUDED';

export interface ScorecardWarning {
  code: ScorecardWarningCode;
  messagePt: string;
  messageEn: string;
}

export interface AggregatedScorecard {
  aggregate: ScorecardStatusBreakdown;
  runs: ScorecardRunRow[];
  warnings: ScorecardWarning[];
}

/**
 * Rounds a number to the given decimal places using half-away-from-zero.
 */
export function roundHalfAwayFromZero(value: number, decimals = 1): number {
  if (!Number.isFinite(value) || value === 0) return 0;
  const factor = Math.pow(10, decimals);
  const sign = value < 0 ? -1 : 1;
  return (sign * Math.floor(Math.abs(value) * factor + 0.5 + 1e-12)) / factor;
}

/**
 * Calculates percentage (0..100) with 1 decimal place, half away from zero.
 */
export function calculateStatusPercentage(count: number, total: number): number {
  if (total <= 0 || count <= 0) return 0;
  return roundHalfAwayFromZero((count / total) * 100, 1);
}

/**
 * Formats a status cell for the Scorecard (e.g., `75% (18)` or `4.2% (1)`).
 */
export function formatScorecardCell(count: number, total: number): ScorecardMetricCell {
  const safeCount = Math.max(0, Math.trunc(count));
  const pct = calculateStatusPercentage(safeCount, total);
  const percentageFixed = pct.toFixed(1);
  const pctDisplay = Number.isInteger(pct) ? `${pct}%` : `${percentageFixed}%`;
  return {
    count: safeCount,
    percentage: pct,
    percentageFixed,
    formatted: `${pctDisplay} (${safeCount})`,
  };
}

/**
 * Builds the 5-status breakdown for a given set of counts.
 * Guarantees that total = open + passed + failed + skipped + blocked.
 */
export function buildStatusBreakdown(counts: {
  open: number;
  passed: number;
  failed: number;
  skipped: number;
  blocked: number;
}): ScorecardStatusBreakdown {
  const open = Math.max(0, Math.trunc(counts.open));
  const passed = Math.max(0, Math.trunc(counts.passed));
  const failed = Math.max(0, Math.trunc(counts.failed));
  const skipped = Math.max(0, Math.trunc(counts.skipped));
  const blocked = Math.max(0, Math.trunc(counts.blocked));
  const total = open + passed + failed + skipped + blocked;

  return {
    total,
    open: formatScorecardCell(open, total),
    passed: formatScorecardCell(passed, total),
    failed: formatScorecardCell(failed, total),
    skipped: formatScorecardCell(skipped, total),
    blocked: formatScorecardCell(blocked, total),
  };
}

/**
 * Aggregates multiple Test Runs into a unified QA Sphere-style Scorecard.
 * Excludes `Aborted` runs unless `options.includeAborted` is explicitly `true`.
 */
export function aggregateScorecard(
  runs: ScorecardRunInput[],
  options: { includeAborted?: boolean } = {},
): AggregatedScorecard {
  const includeAborted = options.includeAborted === true;
  const filteredRuns = runs.filter((run) => includeAborted || run.status !== 'Aborted');

  let sumOpen = 0;
  let sumPassed = 0;
  let sumFailed = 0;
  let sumSkipped = 0;
  let sumBlocked = 0;

  const rows: ScorecardRunRow[] = filteredRuns.map((run) => {
    let open = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    let blocked = 0;
    const sourceTestCaseIds: string[] = [];

    if (run.counts) {
      open = run.counts.open;
      passed = run.counts.passed;
      failed = run.counts.failed;
      skipped = run.counts.skipped;
      blocked = run.counts.blocked;
      if (run.cases) {
        for (const c of run.cases) {
          sourceTestCaseIds.push(c.sourceTestCaseId);
        }
      }
    } else {
      for (const c of run.cases ?? []) {
        sourceTestCaseIds.push(c.sourceTestCaseId);
        switch (c.status) {
          case 'Passed':
            passed += 1;
            break;
          case 'Failed':
            failed += 1;
            break;
          case 'Skipped':
            skipped += 1;
            break;
          case 'Blocked':
            blocked += 1;
            break;
          default:
            open += 1;
            break;
        }
      }
    }

    sumOpen += open;
    sumPassed += passed;
    sumFailed += failed;
    sumSkipped += skipped;
    sumBlocked += blocked;

    const breakdown = buildStatusBreakdown({ open, passed, failed, skipped, blocked });

    return {
      id: run.id,
      name: run.name,
      projectId: run.projectId ?? '',
      projectName: run.projectName ?? '',
      appVersion: run.appVersion,
      platform: run.platform,
      environment: run.environment,
      browserOrDevice: run.browserOrDevice ?? null,
      milestone: run.milestone,
      suiteType: run.suiteType ?? 'Regressão',
      mode: run.mode ?? 'Manual',
      status: run.status,
      startedAt: run.startedAt ?? null,
      closedAt: run.closedAt ?? null,
      sourceTestCaseIds: [...sourceTestCaseIds].sort(),
      ...breakdown,
    };
  });

  const aggregate = buildStatusBreakdown({
    open: sumOpen,
    passed: sumPassed,
    failed: sumFailed,
    skipped: sumSkipped,
    blocked: sumBlocked,
  });

  const warnings: ScorecardWarning[] = [];

  if (rows.length > 1) {
    const distinctVersions = new Set(rows.map((r) => r.appVersion));
    if (distinctVersions.size > 1) {
      warnings.push({
        code: 'DIFFERENT_VERSIONS',
        messagePt:
          'Atenção: Os Test Runs selecionados possuem versões de aplicação diferentes. Os totais não são diretamente equivalentes.',
        messageEn:
          'Warning: Selected Test Runs have different application versions. Totals are not directly equivalent.',
      });
    }

    const scopeSignatures = new Set(
      rows.map((r) =>
        r.sourceTestCaseIds.length > 0
          ? r.sourceTestCaseIds.join('|')
          : `COUNT:${r.total}`,
      ),
    );
    if (scopeSignatures.size > 1) {
      warnings.push({
        code: 'DIFFERENT_SCOPES',
        messagePt:
          'Atenção: Os Test Runs selecionados possuem conjuntos de casos (escopos) diferentes.',
        messageEn:
          'Warning: Selected Test Runs have different test case scopes.',
      });
    }
  }

  if (includeAborted && rows.some((r) => r.status === 'Aborted')) {
    warnings.push({
      code: 'ABORTED_INCLUDED',
      messagePt: 'Atenção: Ciclos abortados (Aborted) foram incluídos explicitamente no scorecard.',
      messageEn: 'Warning: Aborted cycles were explicitly included in the scorecard.',
    });
  }

  return {
    aggregate,
    runs: rows,
    warnings,
  };
}

/**
 * Computes the badge snapshot for a copied case using the TMS badge convention
 * (scenario tag or normalized case ID, never the folder name).
 */
export function computeCaseBadgeSnapshot(testCase: {
  id: string;
  title: string;
  preconditions?: string | null;
}): string {
  const preconditions = testCase.preconditions ?? '';
  const tagMatch = preconditions.match(/@([A-Za-z0-9_-]+)/);
  if (tagMatch?.[1]) {
    const rawTag = tagMatch[1].replace(/^@/, '').trim().toUpperCase();
    const technicalSuffix = rawTag.match(/(?:^|[-_])(TC-\d+|RCT\d+|RECEL\d+|CT\d+|LT\d+)$/i)?.[1];
    if (technicalSuffix) {
      return technicalSuffix.toUpperCase();
    }
    if (/^[A-Z]{2,}\d+$/.test(rawTag)) {
      return rawTag;
    }
  }

  const rawId = testCase.id.trim();
  const suffixMatch = rawId.match(/(?:^|[-_])(TC-\d+|[A-Z]{2,}\d+)$/i);
  if (suffixMatch?.[1]) {
    return suffixMatch[1].toUpperCase();
  }

  const titleMatch = testCase.title.trim().match(/^([A-Z]{2,}-?\d+)\b/i);
  if (titleMatch?.[1]) {
    return titleMatch[1].toUpperCase();
  }

  return rawId;
}

export interface CatalogTestCaseInput {
  id: string;
  folder: string;
  title: string;
  preconditions?: string | null;
  lastExecutionStatus?: string | null;
}

export interface TestRunCaseSnapshot {
  sourceTestCaseId: string;
  folderSnapshot: string;
  titleSnapshot: string;
  badgeSnapshot: string;
  status: 'Open';
  notes: string;
  durationS: null;
  executedByUserId: null;
  executedAt: null;
}

/**
 * Creates an isolated snapshot of a catalog test case at the moment of inclusion.
 * Subsequent renames in the catalog do not affect the returned snapshot.
 */
export function createTestRunCaseSnapshot(sourceCase: CatalogTestCaseInput): TestRunCaseSnapshot {
  return {
    sourceTestCaseId: String(sourceCase.id),
    folderSnapshot: String(sourceCase.folder),
    titleSnapshot: String(sourceCase.title),
    badgeSnapshot: computeCaseBadgeSnapshot(sourceCase),
    status: 'Open',
    notes: '',
    durationS: null,
    executedByUserId: null,
    executedAt: null,
  };
}

/**
 * Validates and plans the inclusion of catalog cases into a Test Run.
 * - Rejects cases whose folder does not belong to the run's project.
 * - Ignores duplicates already in the run (or repeated in the input) and lists them in `skippedDuplicates`.
 */
export function planTestRunCaseInclusion(params: {
  existingSourceIds: string[];
  candidateCases: CatalogTestCaseInput[];
  allowedFoldersForProject: string[];
}): {
  toInsert: TestRunCaseSnapshot[];
  skippedDuplicates: string[];
} {
  const allowedSet = new Set(params.allowedFoldersForProject);
  const existingSet = new Set(params.existingSourceIds);
  const skippedDuplicates: string[] = [];
  const toInsert: TestRunCaseSnapshot[] = [];

  for (const candidate of params.candidateCases) {
    const belongsToProject =
      allowedSet.has(candidate.folder) ||
      params.allowedFoldersForProject.some((folder) => candidate.folder.startsWith(`${folder}/`));

    if (!belongsToProject) {
      throw new Error(
        `O caso "${candidate.id}" pertence à pasta "${candidate.folder}", que não faz parte do projeto deste Test Run.`,
      );
    }

    if (existingSet.has(candidate.id)) {
      if (!skippedDuplicates.includes(candidate.id)) {
        skippedDuplicates.push(candidate.id);
      }
      continue;
    }

    existingSet.add(candidate.id);
    toInsert.push(createTestRunCaseSnapshot(candidate));
  }

  return { toInsert, skippedDuplicates };
}

export interface MutableTestRunLifecycleState {
  status: TestRunStatus;
  startedAt: string | null;
  closedAt: string | null;
  cases: Array<{
    sourceTestCaseId: string;
    status: TestRunCaseStatus;
    notes: string;
    durationS: number | null;
    executedByUserId: string | null;
    executedAt: string | null;
  }>;
}

/**
 * Transitions a `Draft` Test Run to `In Progress`.
 * Throws if the run has 0 cases (`AC-ESC-05`) or is not in `Draft`.
 */
export function startTestRunState(
  run: MutableTestRunLifecycleState,
  nowIso: string = new Date().toISOString(),
): MutableTestRunLifecycleState {
  if (run.status !== 'Draft') {
    throw new Error(`Apenas ciclos em Draft podem ser iniciados (status atual: ${run.status}).`);
  }
  if (run.cases.length === 0) {
    throw new Error('Não é permitido iniciar um Test Run em rascunho (Draft) sem casos no escopo.');
  }
  return {
    ...run,
    status: 'In Progress',
    startedAt: run.startedAt ?? nowIso,
  };
}

/**
 * Applies a result to a case inside a Test Run:
 * - Rejects if the run is `Completed` or `Aborted` (`AC-RES-04`).
 * - Validates status and note rules (`AC-RES-02`).
 * - Promotes a `Draft` run with cases to `In Progress` and sets `startedAt` (`AC-RES-03`).
 */
export function applyResultToTestRunState(
  run: MutableTestRunLifecycleState,
  params: {
    sourceTestCaseId: string;
    status: 'Passed' | 'Failed' | 'Blocked' | 'Skipped';
    notes?: string;
    durationS?: number | null;
    userId: string;
    nowIso?: string;
  },
): MutableTestRunLifecycleState {
  if (run.status === 'Completed' || run.status === 'Aborted') {
    throw new Error(
      `Test Run com status "${run.status}" não aceita novos resultados até ser reaberto por um administrador.`,
    );
  }

  const parsed = testRunResultSchema.safeParse({
    status: params.status,
    notes: params.notes ?? '',
    durationS: params.durationS,
  });

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Resultado inválido.');
  }

  if (run.cases.length === 0) {
    throw new Error('O Test Run não possui casos cadastrados.');
  }

  const targetIndex = run.cases.findIndex((c) => c.sourceTestCaseId === params.sourceTestCaseId);
  if (targetIndex === -1) {
    throw new Error(`Caso "${params.sourceTestCaseId}" não encontrado no Test Run.`);
  }

  const now = params.nowIso ?? new Date().toISOString();
  const nextStatus: TestRunStatus = run.status === 'Draft' ? 'In Progress' : run.status;
  const nextStartedAt = run.status === 'Draft' ? (run.startedAt ?? now) : run.startedAt;

  const updatedCases = run.cases.map((c, idx) =>
    idx === targetIndex
      ? {
          ...c,
          status: parsed.data.status,
          notes: parsed.data.notes,
          durationS: parsed.data.durationS ?? null,
          executedByUserId: params.userId,
          executedAt: now,
        }
      : c,
  );

  return {
    ...run,
    status: nextStatus,
    startedAt: nextStartedAt,
    cases: updatedCases,
  };
}

/**
 * Reopens a `Completed` or `Aborted` Test Run back to `In Progress` (`AC-RES-04`).
 * Restricted strictly to `admin`.
 */
export function reopenTestRunState(
  run: MutableTestRunLifecycleState,
  userRole: string,
): MutableTestRunLifecycleState {
  if (userRole !== 'admin') {
    throw new Error('Apenas usuários com papel admin podem reabrir um Test Run encerrado ou abortado.');
  }
  if (run.status !== 'Completed' && run.status !== 'Aborted') {
    throw new Error('Apenas ciclos Completed ou Aborted podem ser reabertos.');
  }
  return {
    ...run,
    status: 'In Progress',
    closedAt: null,
  };
}

