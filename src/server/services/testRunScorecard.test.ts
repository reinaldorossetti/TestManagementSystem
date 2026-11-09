import { test, expect } from '@playwright/test';

const { describe } = test;
const it = test;
import {
  aggregateScorecard,
  applyResultToTestRunState,
  createTestRunCaseSnapshot,
  planTestRunCaseInclusion,
  reopenTestRunState,
  startTestRunState,
  type MutableTestRunLifecycleState,
} from './testRunScorecard';

describe('testRunScorecard — cálculos e ciclo de vida puros', () => {
  it('aggregateScorecard conta Passed e Failed do mesmo caso em runs diferentes', () => {
    const result = aggregateScorecard([
      {
        id: 'RUN-CHROME',
        name: 'Sprint 24 - Chrome - Regressão Login',
        appVersion: '2.5.0',
        platform: 'Web',
        environment: 'Homologação',
        browserOrDevice: 'Chrome',
        milestone: 'Sprint 24',
        status: 'In Progress',
        cases: [{ sourceTestCaseId: 'RECEL01', status: 'Passed' }],
      },
      {
        id: 'RUN-SAFARI',
        name: 'Sprint 24 - Safari - Regressão Login',
        appVersion: '2.5.0',
        platform: 'Web',
        environment: 'Homologação',
        browserOrDevice: 'Safari',
        milestone: 'Sprint 24',
        status: 'In Progress',
        cases: [{ sourceTestCaseId: 'RECEL01', status: 'Failed' }],
      },
    ]);

    expect(result.aggregate.total).toBe(2);
    expect(result.aggregate.passed.count).toBe(1);
    expect(result.aggregate.failed.count).toBe(1);
    expect(result.aggregate.passed.formatted).toBe('50% (1)');
    expect(result.aggregate.failed.formatted).toBe('50% (1)');
  });

  it('percentual de 18 em 24 é 75.0 e a soma dos status fecha o total', () => {
    const result = aggregateScorecard([
      {
        id: 'RUN-UI-SAFARI',
        name: 'UI Testing (Safari)',
        appVersion: '2.5.0',
        platform: 'Web',
        environment: 'Homologação',
        browserOrDevice: 'Safari',
        milestone: 'Sprint 24',
        status: 'Completed',
        counts: {
          open: 0,
          passed: 18,
          failed: 3,
          skipped: 1,
          blocked: 2,
        },
      },
      {
        id: 'RUN-FUNC-CHROME',
        name: 'Functional Testing (Chrome)',
        appVersion: '2.5.0',
        platform: 'Web',
        environment: 'Homologação',
        browserOrDevice: 'Chrome',
        milestone: 'Sprint 24',
        status: 'In Progress',
        counts: {
          open: 6,
          passed: 12,
          failed: 4,
          skipped: 1,
          blocked: 3,
        },
      },
    ]);

    const safariRow = result.runs[0];
    const chromeRow = result.runs[1];

    expect(safariRow.total).toBe(24);
    expect(
      safariRow.open.count +
        safariRow.passed.count +
        safariRow.failed.count +
        safariRow.skipped.count +
        safariRow.blocked.count,
    ).toBe(24);
    expect(safariRow.passed.percentageFixed).toBe('75.0');
    expect(safariRow.passed.formatted).toBe('75% (18)');
    expect(safariRow.skipped.formatted).toBe('4.2% (1)');

    expect(chromeRow.total).toBe(26);
    expect(
      chromeRow.open.count +
        chromeRow.passed.count +
        chromeRow.failed.count +
        chromeRow.skipped.count +
        chromeRow.blocked.count,
    ).toBe(26);
    expect(chromeRow.passed.formatted).toBe('46.2% (12)');

    expect(result.aggregate.total).toBe(50);
    expect(result.aggregate.open.count).toBe(6);
    expect(result.aggregate.passed.count).toBe(30);
    expect(result.aggregate.failed.count).toBe(7);
    expect(result.aggregate.skipped.count).toBe(2);
    expect(result.aggregate.blocked.count).toBe(5);
    expect(
      result.aggregate.open.count +
        result.aggregate.passed.count +
        result.aggregate.failed.count +
        result.aggregate.skipped.count +
        result.aggregate.blocked.count,
    ).toBe(50);
  });

  it('run abortado sai do scorecard quando includeAborted é falso', () => {
    const runs = [
      {
        id: 'RUN-1',
        name: 'Sprint 24 - Chrome - Smoke',
        appVersion: '2.5.0',
        platform: 'Web',
        environment: 'Homologação',
        browserOrDevice: 'Chrome',
        milestone: 'Sprint 24',
        status: 'Completed',
        counts: { open: 0, passed: 5, failed: 0, skipped: 0, blocked: 0 },
      },
      {
        id: 'RUN-ABORTED',
        name: 'Sprint 24 - Edge - Smoke',
        appVersion: '2.5.0',
        platform: 'Web',
        environment: 'Homologação',
        browserOrDevice: 'Edge',
        milestone: 'Sprint 24',
        status: 'Aborted',
        counts: { open: 2, passed: 1, failed: 2, skipped: 0, blocked: 0 },
      },
    ];

    const withoutAborted = aggregateScorecard(runs, { includeAborted: false });
    expect(withoutAborted.runs).toHaveLength(1);
    expect(withoutAborted.runs[0].id).toBe('RUN-1');
    expect(withoutAborted.aggregate.total).toBe(5);

    const withAborted = aggregateScorecard(runs, { includeAborted: true });
    expect(withAborted.runs).toHaveLength(2);
    expect(withAborted.aggregate.total).toBe(10);
  });

  it('Draft sem casos não inicia', () => {
    const emptyDraft: MutableTestRunLifecycleState = {
      status: 'Draft',
      startedAt: null,
      closedAt: null,
      cases: [],
    };

    expect(() => startTestRunState(emptyDraft)).toThrow(/sem casos/i);
  });

  it('primeiro resultado promove Draft a In Progress', () => {
    const draftWithCase: MutableTestRunLifecycleState = {
      status: 'Draft',
      startedAt: null,
      closedAt: null,
      cases: [
        {
          sourceTestCaseId: 'RECEL01',
          status: 'Open',
          notes: '',
          durationS: null,
          executedByUserId: null,
          executedAt: null,
        },
      ],
    };

    const updated = applyResultToTestRunState(draftWithCase, {
      sourceTestCaseId: 'RECEL01',
      status: 'Passed',
      notes: 'Executado com sucesso',
      durationS: 14.5,
      userId: 'user-tester-1',
      nowIso: '2026-11-08T12:00:00.000Z',
    });

    expect(updated.status).toBe('In Progress');
    expect(updated.startedAt).toBe('2026-11-08T12:00:00.000Z');
    expect(updated.cases[0].status).toBe('Passed');
    expect(updated.cases[0].executedByUserId).toBe('user-tester-1');
  });

  it('Completed rejeita resultado e admin reaberto volta a aceitar', () => {
    const completedRun: MutableTestRunLifecycleState = {
      status: 'Completed',
      startedAt: '2026-11-08T10:00:00.000Z',
      closedAt: '2026-11-08T11:00:00.000Z',
      cases: [
        {
          sourceTestCaseId: 'RECEL01',
          status: 'Open',
          notes: '',
          durationS: null,
          executedByUserId: null,
          executedAt: null,
        },
      ],
    };

    expect(() =>
      applyResultToTestRunState(completedRun, {
        sourceTestCaseId: 'RECEL01',
        status: 'Passed',
        userId: 'user-tester-1',
      }),
    ).toThrow(/reaberto/i);

    expect(() => reopenTestRunState(completedRun, 'analyst')).toThrow(/admin/i);

    const reopened = reopenTestRunState(completedRun, 'admin');
    expect(reopened.status).toBe('In Progress');
    expect(reopened.closedAt).toBeNull();

    const afterResult = applyResultToTestRunState(reopened, {
      sourceTestCaseId: 'RECEL01',
      status: 'Passed',
      userId: 'user-admin-1',
    });
    expect(afterResult.cases[0].status).toBe('Passed');
  });

  it('inclusão ignora caso duplicado e rejeita caso de outro projeto', () => {
    const plan = planTestRunCaseInclusion({
      existingSourceIds: ['RECEL01'],
      allowedFoldersForProject: ['br.com.grupocard.contacard.dev/Recarga de telefone'],
      candidateCases: [
        {
          id: 'RECEL01',
          folder: 'br.com.grupocard.contacard.dev/Recarga de telefone',
          title: 'RECEL01 - Recarga Vivo',
        },
        {
          id: 'RECEL02',
          folder: 'br.com.grupocard.contacard.dev/Recarga de telefone',
          title: 'RECEL02 - Recarga Claro',
        },
      ],
    });

    expect(plan.skippedDuplicates).toEqual(['RECEL01']);
    expect(plan.toInsert).toHaveLength(1);
    expect(plan.toInsert[0].sourceTestCaseId).toBe('RECEL02');

    expect(() =>
      planTestRunCaseInclusion({
        existingSourceIds: [],
        allowedFoldersForProject: ['br.com.grupocard.contacard.dev/Recarga de telefone'],
        candidateCases: [
          {
            id: 'OUTRO-01',
            folder: 'outro.projeto/Pagamentos',
            title: 'OUTRO-01 - Caso de outro projeto',
          },
        ],
      }),
    ).toThrow(/não faz parte do projeto/i);
  });

  it('snapshot de título não acompanha rename posterior do catálogo', () => {
    const sourceCatalogCase = {
      id: 'RECEL01',
      folder: 'br.com.grupocard.contacard.dev/Recarga de telefone',
      title: 'RECEL01 - Título Original Antes do Rename',
      preconditions: '@RECEL01',
    };

    const snapshot = createTestRunCaseSnapshot(sourceCatalogCase);
    sourceCatalogCase.title = 'RECEL01 - Título Renomeado no TMS';

    expect(snapshot.titleSnapshot).toBe('RECEL01 - Título Original Antes do Rename');
    expect(snapshot.badgeSnapshot).toBe('RECEL01');
    expect(snapshot.status).toBe('Open');
  });
});

