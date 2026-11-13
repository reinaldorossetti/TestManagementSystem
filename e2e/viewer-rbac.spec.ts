import { expect, test } from '@playwright/test';

test.describe('RBAC Usuário de Consulta (viewer) e Limpeza de Pastas Vazias', () => {
  test('usuário de consulta tem botões de cadastro e execução desativados, APIs retornam 403 e não há pastas vazias no TMS', async ({
    page,
  }) => {
    // 1. Login como Usuário de Consulta (viewer)
    await page.goto('/login');
    await page.fill('#email-input', 'consulta@tms.local');
    await page.fill('#login-password', 'Consulta@QA2026!Pass');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/tms', { timeout: 15000 });

    // 2. Verificar que não existem pastas vazias (0 casos) no TMS
    const folderEntries = page.locator('[data-testid="tms-folder-entry"]');
    await expect(folderEntries.first()).toBeVisible({ timeout: 10000 });
    const folderCount = await folderEntries.count();
    for (let i = 0; i < folderCount; i += 1) {
      const countText = await folderEntries
        .nth(i)
        .locator('[data-testid="tms-folder-case-count"]')
        .innerText();
      expect(Number(countText.trim())).toBeGreaterThan(0);
    }

    // 3. Verificar botões desativados no TMS (projetos, pastas, cadastro e execução)
    await folderEntries.first().click();
    await expect(page.getByTestId('tms-create-project-button')).toBeDisabled();
    await expect(page.getByTestId('tms-edit-project-button')).toBeDisabled();
    await expect(page.getByTestId('tms-new-folder-button')).toBeDisabled();
    await expect(page.getByTestId('tms-edit-folder-button')).toBeDisabled();
    await expect(page.getByTestId('tms-delete-folder-button')).toBeDisabled();
    await expect(page.getByTestId('tms-create-case-button')).toBeDisabled();
    await expect(page.getByTestId('tms-run-plural-button')).toBeDisabled();
    await expect(page.getByTestId('tms-import-tests-button')).toBeDisabled();
    await expect(page.getByTestId('tms-edit-case-button')).toBeDisabled();
    await expect(page.getByTestId('tms-delete-case-button')).toBeDisabled();
    await expect(page.getByTestId('tms-run-manual-button')).toBeDisabled();
    await expect(page.getByTestId('tms-run-singular-button')).toBeDisabled();

    // 4. Verificar botões desativados no Terminal (/terminal)
    await page.goto('/terminal');
    await expect(page.getByTestId('terminal-run-feature-button')).toBeDisabled();
    await expect(page.getByTestId('terminal-run-all-button')).toBeDisabled();
    await expect(page.getByTestId('terminal-import-file-button')).toBeDisabled();
    await expect(page.getByTestId('terminal-edit-gherkin-button')).toBeDisabled();
    await expect(page.getByTestId('terminal-store-tests-button')).toBeDisabled();
    const scenarioRunButtons = page.locator('[data-testid^="workspace-run-scenario-"]');
    await expect(scenarioRunButtons.first()).toBeVisible({ timeout: 10000 });
    await expect(scenarioRunButtons.first()).toBeDisabled();

    // 5. Verificar botão desativado em Test Runs (/test-runs)
    await page.goto('/test-runs');
    await expect(page.getByTestId('new-test-run-btn')).toBeDisabled();

    // 6. Verificar bloqueio HTTP 403 nas APIs de execução e cadastro para viewer
    const runRes = await page.request.post('/api/terminal/run', {
      data: { command: 'python -m robot test_projects/' },
    });
    expect(runRes.status()).toBe(403);

    const createCaseRes = await page.request.post('/api/test-cases-sphere', {
      data: {
        id: 'VIEWER-TEST-01',
        folder: 'br.com.grupocard.contacard.dev/Recarga de telefone',
        title: 'Tentativa bloqueada',
      },
    });
    expect(createCaseRes.status()).toBe(403);

    const createFolderRes = await page.request.post('/api/folders', {
      data: { path: 'Pasta Bloqueada Viewer' },
    });
    expect(createFolderRes.status()).toBe(403);

    const createRunRes = await page.request.post('/api/test-runs', {
      data: {
        projectId: 'proj-default',
        appVersion: '1.0.0',
        platform: 'Web',
        environment: 'Local',
        milestone: 'M1',
        suiteType: 'Smoke',
      },
    });
    expect(createRunRes.status()).toBe(403);

    const resetDbRes = await page.request.post('/api/database/reset');
    expect(resetDbRes.status()).toBe(403);

    const clearExecRes = await page.request.post('/api/database/clear-executions');
    expect(clearExecRes.status()).toBe(403);

    const settingsRes = await page.request.put('/api/terminal/settings', {
      data: { resultsDirectory: 'results/' },
    });
    expect(settingsRes.status()).toBe(403);
  });
});

