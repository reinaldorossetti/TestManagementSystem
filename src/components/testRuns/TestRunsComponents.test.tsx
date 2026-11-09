import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test, expect } from '@playwright/test';
import { aggregateScorecard } from '@/src/server/services/testRunScorecard';
import {
  createTestRunSchema,
  resolveTestRunName,
} from '@/src/server/validation/testRunSchemas';
import { ScorecardEmptyState } from './ScorecardEmptyState';
import { ScorecardTable } from './ScorecardTable';
import { TestRunForm } from './TestRunForm';

const { describe } = test;
const it = test;

describe('Componentes Test Runs — Formulário e Scorecard', () => {
  const sampleProjects = [
    {
      id: 'PROJ-DEFAULT',
      name: 'Contacard Mobile',
      platform: 'Mobile',
      details: 'Projeto mobile',
    },
  ];

  it('TestRunForm exibe erro em versão latest e em Web sem browser', () => {
    const parsed = createTestRunSchema.safeParse({
      name: 'Sprint 24 - Web - Regressão',
      projectId: 'PROJ-DEFAULT',
      appVersion: 'latest',
      platform: 'Web',
      environment: 'Homologação',
      browserOrDevice: '',
      milestone: 'Sprint 24',
      suiteType: 'Regressão',
      mode: 'Manual',
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const appVersionIssue = parsed.error.issues.find((i) => i.path.includes('appVersion'));
      const browserIssue = parsed.error.issues.find((i) => i.path.includes('browserOrDevice'));
      expect(appVersionIssue?.message).toMatch(/2\.5\.0/);
      expect(browserIssue?.message).toMatch(/obrigatório/i);
    }
  });

  it('TestRunForm sugere o nome e preserva edição manual', () => {
    const autoName = resolveTestRunName({
      currentName: '',
      isManuallyEdited: false,
      milestone: 'Sprint 24',
      browserOrDevice: 'Chrome',
      platform: 'Web',
      suiteType: 'Regressão',
      featureLabel: 'Login',
    });
    expect(autoName).toBe('Sprint 24 - Chrome - Regressão Login');

    const preservedName = resolveTestRunName({
      currentName: 'Ciclo Especial Editado',
      isManuallyEdited: true,
      milestone: 'Sprint 24',
      browserOrDevice: 'Firefox',
      platform: 'Web',
      suiteType: 'Regressão',
      featureLabel: 'Login',
    });
    expect(preservedName).toBe('Ciclo Especial Editado');
  });

  it('TestRunForm não preenche plataforma a partir do projeto', () => {
    const html = renderToStaticMarkup(
      <TestRunForm projects={sampleProjects} onSubmit={() => {}} />,
    );
    expect(html).toContain('data-testid="test-run-platform-select"');
    expect(html).toContain('<option value="" selected="">Selecione a plataforma...</option>');
  });

  it('ScorecardTable renderiza 75% (18) e 46.2% (12)', () => {
    const scorecard = aggregateScorecard([
      {
        id: 'RUN-SAFARI',
        name: 'UI Testing (Safari)',
        appVersion: '2.5.0',
        platform: 'Web',
        environment: 'Homologação',
        browserOrDevice: 'Safari',
        milestone: 'Sprint 24',
        status: 'Completed',
        counts: { open: 0, passed: 18, failed: 3, skipped: 1, blocked: 2 },
      },
      {
        id: 'RUN-CHROME',
        name: 'Functional Testing (Chrome)',
        appVersion: '2.5.0',
        platform: 'Web',
        environment: 'Homologação',
        browserOrDevice: 'Chrome',
        milestone: 'Sprint 24',
        status: 'In Progress',
        counts: { open: 6, passed: 12, failed: 4, skipped: 1, blocked: 3 },
      },
    ]);

    const html = renderToStaticMarkup(<ScorecardTable scorecard={scorecard} />);

    expect(html).toContain('75% (18)');
    expect(html).toContain('46.2% (12)');
  });

  it('ScorecardTable mostra aviso quando as versões diferem', () => {
    const scorecard = aggregateScorecard([
      {
        id: 'RUN-V1',
        name: 'Sprint 24 - Chrome - Regressão',
        appVersion: '2.5.0',
        platform: 'Web',
        environment: 'Homologação',
        browserOrDevice: 'Chrome',
        milestone: 'Sprint 24',
        status: 'Completed',
        counts: { open: 0, passed: 10, failed: 0, skipped: 0, blocked: 0 },
      },
      {
        id: 'RUN-V2',
        name: 'Sprint 24 - Firefox - Regressão',
        appVersion: '2.6.0',
        platform: 'Web',
        environment: 'Homologação',
        browserOrDevice: 'Firefox',
        milestone: 'Sprint 24',
        status: 'Completed',
        counts: { open: 0, passed: 10, failed: 0, skipped: 0, blocked: 0 },
      },
    ]);

    const html = renderToStaticMarkup(<ScorecardTable scorecard={scorecard} />);

    expect(html).toContain('data-testid="scorecard-warning-DIFFERENT_VERSIONS"');
  });

  it('ScorecardEmptyState desabilita exportação', () => {
    const html = renderToStaticMarkup(<ScorecardEmptyState />);

    expect(html).toContain('data-testid="scorecard-export-xlsx-btn"');
    expect(html).toContain('data-testid="scorecard-export-pdf-btn"');
    expect(html).toContain('disabled=""');
  });
});
