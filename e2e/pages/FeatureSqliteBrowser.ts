import { type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * SQLite History panel: the visual table browser and the interactive RAW SQL
 * console sub-views.
 */
export class FeatureSqliteBrowser extends BasePage {
  get visualTablesTab(): Locator {
    return this.page.getByRole('button', { name: /Tabelas do Banco/ });
  }

  get rawSqlConsoleTab(): Locator {
    return this.page.getByRole('button', { name: /Console SQL Interativo/ });
  }

  get dataTable(): Locator {
    return this.page.getByRole('table').first();
  }

  async open(): Promise<void> {
    await super.open('sqlite');
  }

  async showRawSqlConsole(): Promise<void> {
    await this.rawSqlConsoleTab.click();
  }

  async showVisualTables(): Promise<void> {
    await this.visualTablesTab.click();
  }
}
