import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class TestRunsPage extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  async registerAndLoginAs(
    request: APIRequestContext,
    role: 'tester' | 'analyst' | 'admin',
  ): Promise<{ email: string; password: string }> {
    const stamp = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const email = `${role}.testruns.${stamp}@tms.local`;
    const password = `Segura@QA2026#${stamp.slice(-4)}`;

    await request.post('/api/auth/register', {
      data: {
        name: `Operador ${role.toUpperCase()}`,
        email,
        role,
        password,
        confirmPassword: password,
      },
    });

    await this.page.goto('/login');
    await this.page.fill('#email-input', email);
    await this.page.fill('#login-password', password);
    await this.page.click('button[type="submit"]');
    await this.page.waitForURL('**/terminal', { timeout: 15000 });

    return { email, password };
  }

  async navigateToTestRunsFromMenu(): Promise<void> {
    await this.page.locator('#side-drawer-trigger').click();
    const menuItem = this.page.getByTestId('nav-panel-item-test-runs');
    await expect(menuItem).toBeVisible();
    await menuItem.click();
    await this.page.waitForURL('**/test-runs', { timeout: 15000 });
  }

  async createTestRun(params: {
    appVersion: string;
    platform: 'Web' | 'Mobile' | 'Desktop';
    environment: 'Local' | 'Dev' | 'Homologação' | 'Produção';
    browserOrDevice?: string;
    milestone: string;
    suiteType: 'Smoke' | 'Regressão' | 'Feature' | 'Sanidade';
    customName?: string;
  }): Promise<void> {
    await this.page.getByTestId('new-test-run-btn').click();
    await expect(this.page.getByTestId('test-run-form')).toBeVisible();

    await this.page.getByTestId('test-run-version-input').fill(params.appVersion);
    await this.page.getByTestId('test-run-platform-select').selectOption(params.platform);
    await this.page.getByTestId('test-run-environment-select').selectOption(params.environment);

    if (params.browserOrDevice !== undefined) {
      await this.page.getByTestId('test-run-browser-input').fill(params.browserOrDevice);
    }

    await this.page.getByTestId('test-run-milestone-input').fill(params.milestone);
    await this.page.getByTestId('test-run-suite-type-select').selectOption(params.suiteType);

    if (params.customName) {
      await this.page.getByTestId('test-run-name-input').fill(params.customName);
    }

    await this.page.getByTestId('test-run-submit-btn').click();
    await expect(this.page.getByTestId('test-run-detail-card')).toBeVisible();
  }

  async includeFolderFromSelector(folderPath?: string): Promise<void> {
    if (folderPath) {
      await this.page.getByTestId('selector-folder-select').selectOption(folderPath);
    }
    await this.page.getByTestId('include-folder-cases-btn').click();
    await expect(this.page.getByTestId('test-run-cases-list')).toBeVisible();
  }

  async recordCaseResult(params: {
    sourceTestCaseId: string;
    status: 'Passed' | 'Failed' | 'Blocked' | 'Skipped';
    notes?: string;
    durationS?: string;
  }): Promise<void> {
    await this.page.getByTestId(`open-case-result-btn-${params.sourceTestCaseId}`).click();
    await expect(this.page.getByTestId('case-result-panel')).toBeVisible();

    await this.page.getByTestId(`result-status-${params.status}`).click();
    if (params.notes !== undefined) {
      await this.page.getByTestId('result-notes-input').fill(params.notes);
    }
    if (params.durationS !== undefined) {
      await this.page.getByTestId('result-duration-input').fill(params.durationS);
    }
    await this.page.getByTestId('save-case-result-btn').click();
  }

  async attachLinkEvidenceToActiveCase(url: string, title?: string): Promise<void> {
    await this.page.getByTestId('evidence-mode-link-btn').click();
    await this.page.getByTestId('evidence-link-url-input').fill(url);
    if (title) {
      await this.page.getByTestId('evidence-link-title-input').fill(title);
    }
    await this.page.getByTestId('save-link-evidence-btn').click();
    await expect(this.page.getByTestId('run-case-evidence-list')).toContainText(url);
  }
}

