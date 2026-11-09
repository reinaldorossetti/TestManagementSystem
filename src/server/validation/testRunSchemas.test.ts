import { test, expect } from '@playwright/test';

const { describe } = test;
const it = test;
import {
  appVersionSchema,
  createTestRunSchema,
  resolveTestRunName,
  suggestTestRunName,
  testRunResultSchema,
} from './testRunSchemas';

describe('testRunSchemas — validação de configuração, versão e resultados', () => {
  it('aceita versão 2.5.0, 2.5.0-rc.1 e 2.5.0+build.1842', () => {
    expect(appVersionSchema.safeParse('2.5.0').success).toBe(true);
    expect(appVersionSchema.safeParse('2.5.0-rc.1').success).toBe(true);
    expect(appVersionSchema.safeParse('2.5.0+build.1842').success).toBe(true);
    expect(appVersionSchema.safeParse('2.5.0-rc.1+build.1842').success).toBe(true);
  });

  it('rejeita versão latest e v2.5', () => {
    const latestRes = appVersionSchema.safeParse('latest');
    const vPrefixRes = appVersionSchema.safeParse('v2.5');
    const twoPartsRes = appVersionSchema.safeParse('2.5');
    const emptyRes = appVersionSchema.safeParse('');

    expect(latestRes.success).toBe(false);
    expect(vPrefixRes.success).toBe(false);
    expect(twoPartsRes.success).toBe(false);
    expect(emptyRes.success).toBe(false);
  });

  it('sugere o nome Sprint 24 - Chrome - Regressão Login', () => {
    const suggested = suggestTestRunName({
      milestone: 'Sprint 24',
      browserOrDevice: 'Chrome',
      platform: 'Web',
      suiteType: 'Regressão',
      featureLabel: 'Login',
    });

    expect(suggested).toBe('Sprint 24 - Chrome - Regressão Login');
  });

  it('não sobrescreve nome já editado pelo operador', () => {
    const manualName = 'Ciclo Customizado do Operador QA';
    const nextName = resolveTestRunName({
      currentName: manualName,
      isManuallyEdited: true,
      milestone: 'Sprint 25',
      browserOrDevice: 'Firefox',
      platform: 'Web',
      suiteType: 'Smoke',
      featureLabel: 'Login',
    });

    expect(nextName).toBe(manualName);
  });

  it('Web sem browser é inválido e Desktop sem browser é válido', () => {
    const webWithoutBrowser = createTestRunSchema.safeParse({
      name: 'Sprint 24 - Web - Regressão',
      projectId: 'PROJ-DEFAULT',
      appVersion: '2.5.0',
      platform: 'Web',
      environment: 'Homologação',
      browserOrDevice: '',
      milestone: 'Sprint 24',
      suiteType: 'Regressão',
      mode: 'Manual',
    });

    expect(webWithoutBrowser.success).toBe(false);
    if (!webWithoutBrowser.success) {
      expect(webWithoutBrowser.error.issues.some((i) => i.path.includes('browserOrDevice'))).toBe(
        true,
      );
    }

    const desktopWithoutBrowser = createTestRunSchema.safeParse({
      name: 'Sprint 24 - Desktop - Regressão',
      projectId: 'PROJ-DEFAULT',
      appVersion: '2.5.0',
      platform: 'Desktop',
      environment: 'Homologação',
      milestone: 'Sprint 24',
      suiteType: 'Regressão',
      mode: 'Manual',
    });

    expect(desktopWithoutBrowser.success).toBe(true);
  });

  it('Failed sem nota de 10 caracteres é inválido', () => {
    const shortNoteResult = testRunResultSchema.safeParse({
      status: 'Failed',
      notes: 'Curto',
    });
    expect(shortNoteResult.success).toBe(false);

    const validFailedResult = testRunResultSchema.safeParse({
      status: 'Failed',
      notes: 'Falha ao validar redirecionamento após login no Chrome.',
      durationS: 18,
    });
    expect(validFailedResult.success).toBe(true);
  });
});

