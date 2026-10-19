import { test, expect } from '@playwright/test';

test.describe('Interface de Login e Cadastro TMS - UX, Cores e Bloqueio Visual', () => {
  const timestamp = Date.now();
  const testUser = {
    name: `Analista Interface ${timestamp}`,
    email: `ui.tester.${timestamp}@tms.local`,
    password: `Forte@QA2026#Valid${timestamp.toString().slice(-4)}`,
  };

  test('TC-UI-01: Cadastro de usuário com medidor de senha em tempo real e redirecionamento', async ({ page }) => {
    await page.goto('/register');

    // Valida cabeçalho e títulos do card
    await expect(page.locator('h1')).toContainText('Cadastro de Usuário QA');
    await expect(page.getByText('Padrão de Senhas Fortes NIST SP 800-63B')).toBeVisible();

    // Preenche campos
    await page.fill('#register-name', testUser.name);
    await page.fill('#register-email', testUser.email);

    // Seleciona perfil Analyst
    await page.click('button:has-text("Analyst (Analista QA)")');

    // Digita senha fraca primeiro
    await page.fill('#register-password', 'fraca');
    await expect(page.getByText('Fraca')).toBeVisible();

    // Digita senha forte válida
    await page.fill('#register-password', testUser.password);
    await expect(page.getByText('Excelente / Senha Forte')).toBeVisible();

    // Confirmação de senha
    await page.fill('#register-confirm-password', testUser.password);

    // Submete formulário
    await page.click('button[type="submit"]');

    // Aguarda mensagem de sucesso e redirecionamento para o login
    await expect(page.getByText('Cadastro realizado com sucesso!')).toBeVisible();
    await page.waitForURL('**/login', { timeout: 10000 });
  });

  test('TC-UI-02: Tela de Login exibe avisos progressivos e bloqueia na 3ª tentativa', async ({ page }) => {
    await page.goto('/login');

    await expect(page.locator('h1')).toContainText('TMS - QA Execution Center');

    // 1ª Tentativa inválida
    await page.fill('#email-input', testUser.email);
    await page.fill('#login-password', 'SenhaIncorreta@1');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/Tentativa 1 de 3/i)).toBeVisible();

    // 2ª Tentativa inválida
    await page.fill('#login-password', 'SenhaIncorreta@2');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/Tentativa 2 de 3/i)).toBeVisible();

    // 3ª Tentativa inválida -> Aciona o bloqueio permanente e exibe LockedAccountNotice
    await page.fill('#login-password', 'SenhaIncorreta@3');
    await page.click('button[type="submit"]');

    await expect(page.getByText('Acesso Bloqueado Permanentemente')).toBeVisible();
    await expect(page.getByText('Bloqueio Crítico de Segurança (3/3)')).toBeVisible();
    await expect(page.getByText('Regra de Desbloqueio:')).toBeVisible();
    await expect(page.getByText(/perfil ADMIN pode realizar o destrave/i)).toBeVisible();
  });
});
