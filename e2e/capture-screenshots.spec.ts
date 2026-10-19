import { test, expect } from '@playwright/test';
import path from 'node:path';

test.describe('Captura de Screenshots Oficiais de Autenticação para Especificação', () => {
  test.use({ viewport: { width: 1280, height: 850 } });

  const imagesDir = path.resolve(process.cwd(), 'docs', 'images');

  test('Capturar fluxo visual completo de login, tentativas, bloqueio, cadastro e gestão admin', async ({ page, request }) => {
    // 1. Garante que exista um usuário para teste de bloqueio
    const timestamp = Date.now();
    const lockedUserEmail = `bloqueado.${timestamp}@tms.local`;
    const lockedUserPassword = `Forte@QA2026#Valida${timestamp.toString().slice(-4)}`;

    await request.post('/api/auth/register', {
      data: {
        name: 'Roberto Rocha (Operador)',
        email: lockedUserEmail,
        role: 'tester',
        password: lockedUserPassword,
        confirmPassword: lockedUserPassword,
      },
    });

    // -------------------------------------------------------------
    // Print 1: Tela de Login Padrão
    // -------------------------------------------------------------
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('TMS - QA Execution Center');
    await page.fill('#email-input', 'analista.qa@tms.local');
    await page.waitForTimeout(400);

    await page.screenshot({
      path: path.join(imagesDir, 'auth_login.png'),
      fullPage: false,
    });

    // -------------------------------------------------------------
    // Print 2: Alerta Progressivo de Tentativas (Tentativa 1 ou 2 de 3)
    // -------------------------------------------------------------
    await page.fill('#email-input', lockedUserEmail);
    await page.fill('#login-password', 'SenhaErrada@1');
    await page.click('button[type="submit"]');

    await expect(page.getByText(/Tentativa 1 de 3/i)).toBeVisible();
    await page.waitForTimeout(300);

    // Realiza 2ª falha para exibir aviso de risco crítico
    await page.fill('#login-password', 'SenhaErrada@2');
    await page.click('button[type="submit"]');
    await expect(page.getByText(/Tentativa 2 de 3/i)).toBeVisible();
    await page.waitForTimeout(400);

    await page.screenshot({
      path: path.join(imagesDir, 'auth_login_attempts.png'),
      fullPage: false,
    });

    // -------------------------------------------------------------
    // Print 3: Bloqueio Crítico (3 de 3 Falhas - LockedAccountNotice)
    // -------------------------------------------------------------
    await page.fill('#login-password', 'SenhaErrada@3');
    await page.click('button[type="submit"]');

    await expect(page.getByText('Acesso Bloqueado Permanentemente')).toBeVisible();
    await expect(page.getByText('Bloqueio Crítico de Segurança (3/3)')).toBeVisible();
    await page.waitForTimeout(400);

    await page.screenshot({
      path: path.join(imagesDir, 'auth_account_locked.png'),
      fullPage: false,
    });

    // -------------------------------------------------------------
    // Print 4: Tela de Cadastro com RoleSelector e PasswordStrengthMeter
    // -------------------------------------------------------------
    await page.goto('/register');
    await expect(page.locator('h1')).toContainText('Cadastro de Usuário QA');

    await page.fill('#register-name', 'Camila Rodrigues');
    await page.fill('#register-email', 'camila.rodrigues@tms.local');
    await page.click('button:has-text("Analyst (Analista QA)")');

    await page.fill('#register-password', 'Segura@QA2026#Valida');
    await expect(page.getByText('Excelente / Senha Forte')).toBeVisible();
    await page.fill('#register-confirm-password', 'Segura@QA2026#Valida');
    await page.waitForTimeout(400);

    await page.screenshot({
      path: path.join(imagesDir, 'auth_register_strength.png'),
      fullPage: false,
    });

    // -------------------------------------------------------------
    // Print 5: Painel de Gestão e Desbloqueio Admin (AdminUserManagementModal)
    // -------------------------------------------------------------
    await page.goto('/login');
    await page.fill('#email-input', 'admin@tms.local');
    await page.fill('#login-password', 'Admin@QA2026!Secure');
    await page.click('button[type="submit"]');

    await page.waitForURL('**/terminal', { timeout: 15000 });
    await expect(page.locator('header')).toBeVisible();

    // Clica no botão com ícone de escudo (Governança Admin)
    const adminButton = page.locator('header button[title*="Gestão de Usuários"]');
    await expect(adminButton).toBeVisible();
    await adminButton.click();

    // Aguarda o modal abrir com os usuários
    await expect(page.getByText('Painel de Gestão e Governança de Usuários')).toBeVisible();
    await expect(page.getByText('ADMIN ONLY')).toBeVisible();
    await page.waitForTimeout(600);

    await page.screenshot({
      path: path.join(imagesDir, 'auth_admin_governance.png'),
      fullPage: false,
    });

    // -------------------------------------------------------------
    // Print 6: Header com Usuário Autenticado e Badge RBAC (Admin)
    // -------------------------------------------------------------
    await page.keyboard.press('Escape');
    await expect(page.getByText('Painel de Gestão e Governança de Usuários')).not.toBeVisible();
    await page.waitForTimeout(400);

    const header = page.locator('header');
    await expect(header).toBeVisible();
    await page.screenshot({
      path: path.join(imagesDir, 'auth_user_header_badge.png'),
      fullPage: false,
    });

    // -------------------------------------------------------------
    // Print 7: Validação de Senha com Caracteres Proibidos e Espaços
    // -------------------------------------------------------------
    await page.goto('/register');
    await page.fill('#register-name', 'Lucas Albuquerque');
    await page.fill('#register-email', 'lucas.albuquerque@tms.local');
    await page.fill('#register-password', 'Senha " Inválida = 2026');
    await page.waitForTimeout(400);
    await expect(page.getByText(/Caracteres proibidos identificados/i)).toBeVisible();
    await expect(page.getByText(/Proibido conter espaços/i)).toBeVisible();

    await page.screenshot({
      path: path.join(imagesDir, 'auth_register_forbidden_chars.png'),
      fullPage: false,
    });
  });
});
