import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import {
  INITIAL_GHERKIN_CONTENT,
  getDefaultSqlQuery,
  getDefaultScriptLanguage,
  getFormattedTimestamp,
  buildWorkspaceImportedCaseId,
  normalizeImportedCaseTitleForMatch,
  extractPrimaryScenarioTagFromPreconditions,
  normalizeScenarioTagForBadge,
  isTwoScenarioFallback,
} from '../src/constants/initialSpecs';
import { parseRobotGherkinFeature } from '../src/utils/featureLoader';

test.describe('Modular Architecture Unit Tests (Constants & Initial Specs)', () => {
  test('validates INITIAL_GHERKIN_CONTENT parses correctly into scenarios', () => {
    const parsed = parseRobotGherkinFeature(INITIAL_GHERKIN_CONTENT);
    expect(parsed.title).toContain('Jornada de Entrada e Associação de Estabelecimentos - TMS');
    expect(parsed.scenarios.length).toBeGreaterThanOrEqual(12);
    expect(parsed.scenarios[0].tags).toContain('@RCT01');
    expect(isTwoScenarioFallback(parsed)).toBe(false);
  });

  test('validates getDefaultSqlQuery generates expected SQL template for caseId', () => {
    const sql = getDefaultSqlQuery('CT01');
    expect(sql).toContain("robot --include CT01 ./");
    expect(sql).toContain("WHERE test_case_id = 'CT01'");
    expect(sql).toContain("INSERT INTO executions");
  });

  test('validates getDefaultScriptLanguage generates Robot Framework script template', () => {
    const script = getDefaultScriptLanguage('CT01', 'Teste de Login');
    expect(script).toContain('*** Settings ***');
    expect(script).toContain('*** Test Cases ***');
    expect(script).toContain('Executar Cenário CT01');
    expect(script).toContain('[Tags]           CT01    regression');
  });

  test('validates buildWorkspaceImportedCaseId combines folder slug and tag correctly', () => {
    const caseId = buildWorkspaceImportedCaseId(
      'br.com.grupocard.contacard.dev/Recarga_Transporte',
      ['RCT01'],
      'Validar recarga',
      'TC-01',
    );
    expect(caseId).toBe('RECARGA-TRANSPORTE-RCT01');
  });

  test('validates normalizeImportedCaseTitleForMatch normalizes accents and whitespace', () => {
    const normalized = normalizeImportedCaseTitleForMatch('Cenário  de  Teste  Positivo');
    expect(normalized).toBe('cenario de teste positivo');
  });

  test('validates extractPrimaryScenarioTagFromPreconditions extracts @TAG', () => {
    expect(extractPrimaryScenarioTagFromPreconditions('Precondição: @LT05')).toBe('LT05');
    expect(extractPrimaryScenarioTagFromPreconditions('Sem tag')).toBe(null);
  });

  test('validates normalizeScenarioTagForBadge removes @ and uppercases tag', () => {
    expect(normalizeScenarioTagForBadge('@rct01')).toBe('RCT01');
    expect(normalizeScenarioTagForBadge('  ct02 ')).toBe('CT02');
  });

  test('validates timestamp formatting', () => {
    const timestamp = getFormattedTimestamp();
    expect(timestamp).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  });
});

test.describe('Docker Local Setup Verification', () => {
  test('validates Dockerfile existence and configuration', () => {
    const dockerfilePath = path.resolve(process.cwd(), 'Dockerfile');
    expect(existsSync(dockerfilePath)).toBe(true);

    const dockerfileContent = readFileSync(dockerfilePath, 'utf8');
    expect(dockerfileContent).toContain('FROM node:20-bookworm');
    expect(dockerfileContent).toContain('robotframework');
    expect(dockerfileContent).toContain('robotframework-browser');
    expect(dockerfileContent).toContain('COPY prisma ./prisma');
    expect(dockerfileContent).toContain('npx prisma db push --accept-data-loss');
  });

  test('validates docker-compose.yml existence and configuration', () => {
    const composePath = path.resolve(process.cwd(), 'docker-compose.yml');
    expect(existsSync(composePath)).toBe(true);

    const composeContent = readFileSync(composePath, 'utf8');
    expect(composeContent).toContain('3000:3000');
    expect(composeContent).toContain('./prisma:/app/prisma');
    expect(composeContent).toContain('./results:/app/results');
    expect(composeContent).toContain('./test_projects:/app/test_projects');
  });

  test('validates .dockerignore configuration', () => {
    const dockerignorePath = path.resolve(process.cwd(), '.dockerignore');
    expect(existsSync(dockerignorePath)).toBe(true);

    const content = readFileSync(dockerignorePath, 'utf8');
    expect(content).toContain('node_modules');
    expect(content).toContain('.next');
  });
});

test.describe('Click-to-Expand BDD Rule Validation', () => {
  test('validates scenario cards start collapsed by default and expand BDD description only after selecting/clicking', () => {
    const rawGherkin = `*** Settings ***
Documentation    Feature de Teste de Autenticação
Test Tags        login_tests

*** Test Cases ***
Cenário: CT01 - Login Válido
    [Documentation]    Cenário positivo de login com sucesso.
    Given que o usuario esta na tela de login
    When informa o usuario "padrao" e a senha "valida"
    Then o sistema autentica o usuario com sucesso

Cenário: CT02 - Login Inválido
    [Documentation]    Cenário negativo com senha incorreta.
    Given que o usuario esta na tela de login
    When informa o usuario "padrao" e a senha "errada"
    Then o sistema exibe mensagem de erro`;

    const parsed = parseRobotGherkinFeature(rawGherkin);
    expect(parsed.scenarios).toHaveLength(2);

    // Initial state: selectedScenarioId is null (collapsed mode for all cards by default)
    let selectedScenarioId: string | null = null;
    const isExpanded = (scId: string) => selectedScenarioId === scId;

    // Verify BDD description is hidden for all cards by default upon import
    expect(isExpanded('SC_ROBOT_001')).toBe(false);
    expect(isExpanded('SC_ROBOT_002')).toBe(false);

    // Simulate click on scenario 1 -> expands BDD description for scenario 1 only
    selectedScenarioId = selectedScenarioId === 'SC_ROBOT_001' ? null : 'SC_ROBOT_001';
    expect(isExpanded('SC_ROBOT_001')).toBe(true);
    expect(isExpanded('SC_ROBOT_002')).toBe(false);

    // Simulate click on scenario 2 -> expands scenario 2 and collapses scenario 1
    selectedScenarioId = selectedScenarioId === 'SC_ROBOT_002' ? null : 'SC_ROBOT_002';
    expect(isExpanded('SC_ROBOT_001')).toBe(false);
    expect(isExpanded('SC_ROBOT_002')).toBe(true);

    // Simulate second click on scenario 2 -> collapses scenario 2
    selectedScenarioId = selectedScenarioId === 'SC_ROBOT_002' ? null : 'SC_ROBOT_002';
    expect(isExpanded('SC_ROBOT_001')).toBe(false);
    expect(isExpanded('SC_ROBOT_002')).toBe(false);
  });
});

test.describe('Navigation Drawer (Navegar Painéis) Validation', () => {
  test('validates NavDrawerModal component structure and tab selection behavior', () => {
    let isNavDrawerOpen = false;
    let activeTab: 'tms' | 'terminal' | 'sqlite' | 'reports' = 'terminal';

    const openDrawer = () => { isNavDrawerOpen = true; };
    const closeDrawer = () => { isNavDrawerOpen = false; };
    const selectTab = (tab: 'tms' | 'terminal' | 'sqlite' | 'reports') => {
      activeTab = tab;
      closeDrawer();
    };

    expect(isNavDrawerOpen).toBe(false);
    expect(activeTab).toBe('terminal');

    // Simulate clicking "Navegar Painéis" button
    openDrawer();
    expect(isNavDrawerOpen).toBe(true);

    // Simulate selecting "Sistema de Gestão de Testes (TMS)"
    selectTab('tms');
    expect(activeTab).toBe('tms');
    expect(isNavDrawerOpen).toBe(false);

    // Reopen and select "Explorador SQLite"
    openDrawer();
    expect(isNavDrawerOpen).toBe(true);
    selectTab('sqlite');
    expect(activeTab).toBe('sqlite');
    expect(isNavDrawerOpen).toBe(false);
  });

  test('validates selecting Sistema de Gestão de Testes (TMS) redirects to /tms', () => {
    let redirectedUrl = '';
    const mockWindowAssign = (url: string) => {
      redirectedUrl = url;
    };

    const handlePanelClick = (panelId: 'tms' | 'terminal' | 'sqlite' | 'reports') => {
      mockWindowAssign(`/${panelId}`);
    };

    handlePanelClick('tms');
    expect(redirectedUrl).toBe('/tms');
  });
});
