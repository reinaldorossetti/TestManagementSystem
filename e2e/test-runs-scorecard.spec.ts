import { test, expect } from '@playwright/test';
import { TestRunsPage } from './pages/TestRunsPage';

test.describe('Test Runs Scorecard — Comparativo Chrome vs Firefox, Exportação XLSX/PDF e Isolamento de Reports (analyst)', () => {
  test('Given um analista autenticado, When cria dois runs Chrome e Firefox, registra resultados, gera scorecard e exporta XLSX e PDF, Then o agregado soma os dois runs e /reports permanece sem scorecard', async ({
    page,
    request,
  }) => {
    const testRunsPage = new TestRunsPage(page);
    const milestone = `Sprint-Scorecard-${Date.now()}`;

    // 1. Autenticar como analyst
    await testRunsPage.registerAndLoginAs(request, 'analyst');

    // 2. Criar dois runs do mesmo conjunto, Chrome e Firefox, mesma versão e mesmo milestone, só pelas telas /test-runs
    await testRunsPage.navigateToTestRunsFromMenu();

    // Run 1: Chrome (2 casos selecionados)
    await testRunsPage.createTestRun({
      appVersion: '2.5.0',
      platform: 'Web',
      environment: 'Homologação',
      browserOrDevice: 'Chrome',
      milestone,
      suiteType: 'Regressão',
      customName: `${milestone} - Chrome - Regressão`,
    });

    await page
      .getByTestId('selector-folder-select')
      .selectOption('br.com.grupocard.contacard.dev/Recarga de telefone');
    const checkboxesChrome = page
      .getByTestId('test-run-case-selector')
      .locator('input[type="checkbox"]');
    await checkboxesChrome.nth(0).check();
    await checkboxesChrome.nth(1).check();
    await page.getByTestId('include-selected-cases-btn').click();

    // 3. Registrar Passed em todos no Chrome
    await testRunsPage.recordCaseResult({
      sourceTestCaseId: 'RECEL01',
      status: 'Passed',
      notes: 'Aprovado no Chrome',
    });
    await testRunsPage.recordCaseResult({
      sourceTestCaseId: 'RECEL02',
      status: 'Passed',
      notes: 'Aprovado no Chrome',
    });

    // Run 2: Firefox (mesmos 2 casos)
    await testRunsPage.createTestRun({
      appVersion: '2.5.0',
      platform: 'Web',
      environment: 'Homologação',
      browserOrDevice: 'Firefox',
      milestone,
      suiteType: 'Regressão',
      customName: `${milestone} - Firefox - Regressão`,
    });

    await page
      .getByTestId('selector-folder-select')
      .selectOption('br.com.grupocard.contacard.dev/Recarga de telefone');
    const checkboxesFirefox = page
      .getByTestId('test-run-case-selector')
      .locator('input[type="checkbox"]');
    await checkboxesFirefox.nth(0).check();
    await checkboxesFirefox.nth(1).check();
    await page.getByTestId('include-selected-cases-btn').click();

    // Registrar Passed em um e Failed em outro no Firefox
    await testRunsPage.recordCaseResult({
      sourceTestCaseId: 'RECEL01',
      status: 'Passed',
      notes: 'Aprovado no Firefox',
    });
    await testRunsPage.recordCaseResult({
      sourceTestCaseId: 'RECEL02',
      status: 'Failed',
      notes: 'Falhou especificamente no navegador Firefox ao renderizar modal.',
    });

    // 6. Abrir o scorecard sem filtro e verificar que a exportação está desabilitada (AC-SCR-05)
    await page.getByTestId('test-runs-nav-scorecard').click();
    await page.waitForURL('**/test-runs/scorecard', { timeout: 15000 });
    await expect(page.getByTestId('scorecard-empty-state')).toBeVisible();
    await expect(page.getByTestId('scorecard-export-xlsx-btn').first()).toBeDisabled();
    await expect(page.getByTestId('scorecard-export-pdf-btn').first()).toBeDisabled();

    // 4. Gerar o scorecard e conferir o agregado (AC-SCR-02)
    await page.getByTestId('scorecard-milestone-input').fill(milestone);
    await page.getByTestId('generate-scorecard-btn').click();

    await expect(page.getByTestId('scorecard-table')).toBeVisible();
    await expect(page.getByTestId('scorecard-aggregate-total')).toHaveText('4');
    await expect(page.getByTestId('scorecard-aggregate-passed')).toContainText('75% (3)');
    await expect(page.getByTestId('scorecard-aggregate-failed')).toContainText('25% (1)');

    // 5. Exportar XLSX e PDF com corpo não vazio (AC-SCR-06, AC-SCR-07)
    const xlsxRes = await page.request.get(
      `/api/test-runs/scorecard/export?milestone=${encodeURIComponent(milestone)}&format=xlsx`,
    );
    expect(xlsxRes.status()).toBe(200);
    const xlsxBody = await xlsxRes.body();
    expect(xlsxBody.byteLength).toBeGreaterThan(100);

    const pdfRes = await page.request.get(
      `/api/test-runs/scorecard/export?milestone=${encodeURIComponent(milestone)}&format=pdf`,
    );
    expect(pdfRes.status()).toBe(200);
    const pdfBody = await pdfRes.body();
    expect(pdfBody.byteLength).toBeGreaterThan(100);

    // 7. Abrir /reports e verificar que a página não oferece scorecard de Test Runs (AC-SCR-09)
    await page.goto('/reports');
    await expect(page.locator('body')).not.toContainText('Scorecard de Execução (Test Runs)');
  });
});

