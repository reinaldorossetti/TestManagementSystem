import { test, expect } from '@playwright/test';
import { TestRunsPage } from './pages/TestRunsPage';

test.describe('Test Runs — Ciclo isolado, validações, resultados, evidências e governança', () => {
  test('Given um operador tester autenticado, When cria um Test Run, inclui casos, grava resultados/evidência e consulta o scorecard, Then o catálogo TMS permanece inalterado e a exportação fica restrita', async ({
    page,
    request,
  }) => {
    const testRunsPage = new TestRunsPage(page);

    // 1. Autenticar como tester
    await testRunsPage.registerAndLoginAs(request, 'tester');

    // Captura estado inicial do caso RECEL01 no catálogo TMS antes do ciclo
    const initialDbRes = await request.get('/api/database');
    const initialDbJson = await initialDbRes.json();
    const initialRecel01 = (initialDbJson.data?.test_cases_sphere ?? []).find(
      (c: { id: string }) => c.id === 'RECEL01',
    );
    const initialStatus = initialRecel01?.last_execution_status ?? null;

    const initialEvRes = await request.get('/api/test-cases-sphere/RECEL01/evidence');
    const initialEvJson = await initialEvRes.json();
    const initialManualEvidenceCount = (initialEvJson.data?.items ?? []).length;

    // 2. Abrir /test-runs pelo item novo de menu
    await testRunsPage.navigateToTestRunsFromMenu();

    // 2.1 Validar regras de formulário (AC-PLT-05, AC-VER-02, AC-PLT-02, AC-CFG-02, AC-CFG-03)
    await page.getByTestId('new-test-run-btn').click();
    await expect(page.getByTestId('test-run-form')).toBeVisible();

    // Plataforma inicia vazia (AC-PLT-05)
    await expect(page.getByTestId('run-platform-select')).toHaveValue('');

    // Rejeita versão textual como "latest" (AC-VER-02)
    await page.getByTestId('run-version-input').fill('latest');
    await page.getByTestId('run-platform-select').selectOption('Web');
    await page.getByTestId('run-milestone-input').fill('Sprint 24');
    await page.getByTestId('submit-test-run-btn').click();
    await expect(page.getByTestId('test-run-form-error')).toBeVisible();

    // Rejeita plataforma Web sem browserOrDevice (AC-PLT-02)
    await page.getByTestId('run-version-input').fill('2.5.0');
    await page.getByTestId('submit-test-run-btn').click();
    await expect(page.getByTestId('test-run-form-error')).toBeVisible();

    // Verifica sugestão automática de nome (AC-CFG-02)
    await page.getByTestId('run-browser-input').fill('Chrome');
    await expect(page.getByTestId('run-name-input')).toHaveValue(
      'Sprint 24 - v2.5.0 - Web Chrome - Regressão',
    );
    await page.getByTestId('cancel-test-run-btn').click();

    // 3. Criar run com versão 2.5.0, plataforma Web, ambiente Homologação, browser Chrome, milestone Sprint 24, suíte Regressão
    await testRunsPage.createTestRun({
      appVersion: '2.5.0',
      platform: 'Web',
      environment: 'Homologação',
      browserOrDevice: 'Chrome',
      milestone: 'Sprint 24',
      suiteType: 'Regressão',
    });

    await expect(page.getByTestId('selected-run-version')).toHaveText('2.5.0');
    await expect(page.getByTestId('selected-run-status-badge')).toContainText('Rascunho');

    // 4. Incluir os casos de uma feature pelo seletor do próprio módulo (AC-SEL-01, AC-SEL-02)
    await testRunsPage.includeFolderFromSelector(
      'br.com.grupocard.contacard.dev/Recarga de telefone',
    );

    // 4.1 Incluir novamente a mesma pasta deve exibir aviso de duplicatas ignoradas (AC-SEL-03)
    await page.getByTestId('include-folder-btn').click();
    await expect(page.getByTestId('skipped-duplicates-notice')).toBeVisible();

    // 4.2 Remover um caso Open antes de executar (AC-SEL-04)
    await page.getByTestId('remove-case-btn-RECEL04').click();
    await expect(page.getByTestId('test-run-case-row-RECEL04')).toHaveCount(0);

    // 5. Marcar um caso Passed, outro Failed com nota, outro Blocked com nota, e anexar um link de evidência
    await testRunsPage.recordCaseResult({
      sourceTestCaseId: 'RECEL01',
      status: 'Passed',
      notes: 'Fluxo de recarga Vivo aprovado no Chrome.',
    });

    // Primeiro resultado deve mover o ciclo para In Progress (AC-LCY-03)
    await expect(page.getByTestId('selected-run-status-badge')).toContainText('Em Progresso');

    await testRunsPage.attachLinkEvidenceToActiveCase(
      'https://jira.tms.local/browse/RUN-EVID-01',
      'Evidência exclusiva do ciclo',
    );
    await expect(page.getByTestId('active-case-evidence-list')).toContainText(
      'Evidência exclusiva do ciclo',
    );

    await testRunsPage.recordCaseResult({
      sourceTestCaseId: 'RECEL02',
      status: 'Failed',
      notes: 'Falha ao validar comprovante da operadora Claro no Chrome.',
    });

    await testRunsPage.recordCaseResult({
      sourceTestCaseId: 'RECEL03',
      status: 'Blocked',
      notes: 'Ambiente de gateway TIM indisponível para homologação.',
    });

    await expect(page.getByTestId('test-run-case-status-RECEL01')).toContainText('Aprovado');
    await expect(page.getByTestId('test-run-case-status-RECEL02')).toContainText('Falhou');
    await expect(page.getByTestId('test-run-case-status-RECEL03')).toContainText('Bloqueado');

    // 5.1 Testar filtro lateral de ciclos por milestone e status
    await page.getByTestId('runs-filter-milestone').fill('Sprint 24');
    await page.getByTestId('runs-filter-status').selectOption('In Progress');
    await expect(page.getByTestId('selected-run-version')).toHaveText('2.5.0');

    // 6. Conferir que o último status e a lista de evidências do caso no TMS não mudaram (AC-RES-05, AC-RES-07)
    const afterDbRes = await request.get('/api/database');
    const afterDbJson = await afterDbRes.json();
    const afterRecel01 = (afterDbJson.data?.test_cases_sphere ?? []).find(
      (c: { id: string }) => c.id === 'RECEL01',
    );
    expect(afterRecel01?.last_execution_status ?? null).toBe(initialStatus);

    const afterEvRes = await request.get('/api/test-cases-sphere/RECEL01/evidence');
    const afterEvJson = await afterEvRes.json();
    expect((afterEvJson.data?.items ?? []).length).toBe(initialManualEvidenceCount);

    // 7. Abrir /test-runs/scorecard, filtrar o run e conferir os totais. Exportação indisponível para o tester (AC-RBAC-02)
    await page.getByTestId('test-runs-nav-scorecard').click();
    await page.waitForURL('**/test-runs/scorecard', { timeout: 15000 });

    await page.getByTestId('scorecard-milestone-input').fill('Sprint 24');
    await page.getByTestId('generate-scorecard-btn').click();

    await expect(page.getByTestId('scorecard-table')).toBeVisible();
    await expect(page.getByTestId('scorecard-export-restricted-badge')).toBeVisible();

    const exportAttempt = await request.get(
      '/api/test-runs/scorecard/export?milestone=Sprint%2024&format=xlsx',
    );
    expect(exportAttempt.status()).toBe(403);
  });

  test('Given um admin autenticado, When conclui, aborta ou reabre um Test Run, Then o ciclo de vida respeita as permissões RBAC', async ({
    page,
    request,
  }) => {
    const testRunsPage = new TestRunsPage(page);
    await testRunsPage.registerAndLoginAs(request, 'admin');
    await testRunsPage.navigateToTestRunsFromMenu();

    await testRunsPage.createTestRun({
      appVersion: '3.0.0-rc.1',
      platform: 'Mobile',
      environment: 'Homologação',
      browserOrDevice: 'Android 14 / Pixel 7',
      milestone: 'Release 2026.04',
      suiteType: 'Smoke',
    });

    await testRunsPage.includeFolderFromSelector(
      'br.com.grupocard.contacard.dev/Recarga de telefone',
    );

    // Editar versão antes de ter resultados gravados (AC-VER-04)
    await page.getByTestId('edit-run-version-btn').click();
    await page.getByTestId('edit-run-version-input').fill('3.0.0');
    await page.getByTestId('save-run-version-btn').click();
    await expect(page.getByTestId('selected-run-version')).toHaveText('3.0.0');

    // Iniciar ciclo explicitamente (AC-LCY-02)
    await page.getByTestId('lifecycle-start-btn').click();
    await expect(page.getByTestId('selected-run-status-badge')).toContainText('Em Progresso');

    // Abortar ciclo (AC-LCY-04)
    await page.getByTestId('lifecycle-abort-btn').click();
    await expect(page.getByTestId('selected-run-status-badge')).toContainText('Abortado');

    // Reabrir ciclo como admin (AC-LCY-05)
    await page.getByTestId('lifecycle-reopen-btn').click();
    await expect(page.getByTestId('selected-run-status-badge')).toContainText('Em Progresso');
  });
});
