import { test, expect } from '@playwright/test';

test.describe('Theme Toggle across all screens', () => {
  test('renders modern theme toggle on all screens and persists Light/Dark switching', async ({
    page,
  }) => {
    // Login with viewer credentials to access authenticated feature screens
    await page.goto('/login');
    await page.fill('#email-input', 'consulta@tms.local');
    await page.fill('#login-password', 'Consulta@QA2026!Pass');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/tms', { timeout: 15000 });

    // 1. Start at /terminal (defaults to dark)
    await page.goto('/terminal');
    const toggleBtn = page.getByTestId('theme-toggle-btn');
    await expect(toggleBtn).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Toggle to light on /terminal
    await toggleBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('[data-theme-base="dark"]')).toHaveCSS(
      'background-color',
      'rgb(248, 250, 252)',
    );

    // 2. Visit /tms -> should stay light and allow switching to dark
    await page.goto('/tms');
    await expect(toggleBtn).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await toggleBtn.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('[data-theme-base="light"]')).toHaveCSS(
      'background-color',
      'rgb(11, 15, 25)',
    );

    // 3. Verify theme toggle button is also present on all other routes
    for (const route of [
      '/reports',
      '/sqlite',
      '/test-runs',
      '/test-runs/scorecard',
      '/login',
      '/register',
    ]) {
      await page.goto(route);
      await expect(page.getByTestId('theme-toggle-btn')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    }
  });
});
