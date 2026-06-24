import { type Page, type Locator, expect } from '@playwright/test';

export type WorkspaceTab = 'terminal' | 'sqlite' | 'reports' | 'tms';

/**
 * Shared, app-wide behaviours used across every screen: navigating by relative
 * path, waiting for the client-only shell to hydrate, and the global header
 * controls (DB status, language toggle, settings, panel navigator) that are
 * present on all of the dashboard panels.
 */
export class BasePage {
  protected readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** Opens a workspace panel by its `tab` query param and waits for hydration. */
  async open(tab: WorkspaceTab = 'terminal'): Promise<void> {
    await this.page.goto(`/${tab}`);
    await this.waitForAppReady();
  }

  /** Resolves once the client-only app has mounted and finished its first paint. */
  async waitForAppReady(): Promise<void> {
    await expect(this.page.locator('body')).not.toBeEmpty();
  }

  get appTitle(): Locator {
    return this.page.getByRole('heading', {
      level: 1,
      name: 'TMS - QA Execution Center',
    });
  }

  get databaseStatus(): Locator {
    return this.page.getByText(/^(CONECTADO|CONNECTED)$/);
  }

  get languageToggle(): Locator {
    return this.page.getByRole('button', { name: /(PT 🇧🇷|EN 🇺🇸)/ });
  }

  get settingsButton(): Locator {
    return this.page.getByRole('button', { name: /(Configurações|Settings)/ });
  }

  get panelNavigatorButton(): Locator {
    return this.page.getByRole('button', { name: /Navegar Painéis/ });
  }

  async toggleLanguage(): Promise<void> {
    await this.languageToggle.click();
  }

  async openSettings(): Promise<void> {
    await this.settingsButton.click();
  }

  async openPanelNavigator(): Promise<void> {
    await this.panelNavigatorButton.click();
  }
}
