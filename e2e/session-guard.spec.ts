import { test, expect } from '@playwright/test';

test.describe('Controle de Sessão e Proteção de Rotas', () => {
  test('redireciona todas as páginas de features para /login quando não autenticado e bloqueia APIs protegidas', async ({
    page,
    request,
  }) => {
    const protectedRoutes = [
      '/',
      '/terminal',
      '/tms',
      '/reports',
      '/sqlite',
      '/test-runs',
      '/test-runs/scorecard',
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await page.waitForURL(/\/login/, { timeout: 15000 });
      await expect(page.locator('#email-input')).toBeVisible();
    }

    // APIs protegidas devem retornar 401 sem sessão válida
    for (const apiRoute of ['/api/database', '/api/executions', '/api/test-runs']) {
      const res = await request.get(apiRoute);
      expect(res.status()).toBe(401);
    }
  });

  test('rejeita cookie de sessão forjado e redireciona para /login', async ({ page, context }) => {
    await context.addCookies([
      {
        name: 'tms_session',
        value: '0'.repeat(64),
        domain: 'localhost',
        path: '/',
      },
    ]);

    await page.goto('/tms');
    await page.waitForURL(/\/login/, { timeout: 15000 });
    await expect(page.locator('#email-input')).toBeVisible();
  });

  test('permite acesso após login, preserva ?next= e revoga acesso após logout', async ({
    page,
  }) => {
    // Tenta acessar /reports sem login -> redireciona para /login?next=%2Freports
    await page.goto('/reports');
    await page.waitForURL(/\/login\?next=%2Freports/, { timeout: 15000 });

    // Preenche usuário de consulta e autentica -> volta automaticamente para /reports
    await page.fill('#email-input', 'consulta@tms.local');
    await page.fill('#login-password', 'Consulta@QA2026!Pass');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/reports', { timeout: 15000 });

    // Consegue acessar /tms normalmente
    await page.goto('/tms');
    await expect(page).toHaveURL(/\/tms/);

    // Faz logout via API e verifica que o acesso volta a ser bloqueado
    await page.evaluate(async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
    });

    await page.goto('/tms');
    await page.waitForURL(/\/login/, { timeout: 15000 });
    await expect(page.locator('#email-input')).toBeVisible();
  });
});

