import { type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Reports (Allure-style) panel: status filters, card/table view modes and the
 * per-execution detail drill-down.
 */
export class FeatureReports extends BasePage {
  get passFilterButton(): Locator {
    return this.page.getByRole('button', { name: /^PASS \(/ });
  }

  get failFilterButton(): Locator {
    return this.page.getByRole('button', { name: /^FAIL \(/ });
  }

  get viewDetailsButtons(): Locator {
    return this.page.getByRole('button', { name: /Detalhar|View Details/ });
  }

  get tableViewButton(): Locator {
    return this.page.getByTitle(/Visualizar Tabela de Registros|View Records Table/);
  }

  get robotCommandLabel(): Locator {
    return this.page.getByText(/Comando Robot:|Robot Command:/);
  }

  get exitDetailButton(): Locator {
    return this.page.getByRole('button', { name: /Sair do Detalhes|Exit Details/ });
  }

  async open(): Promise<void> {
    await super.open('reports');
  }

  async openFirstReportDetail(): Promise<void> {
    await this.viewDetailsButtons.first().click();
  }

  async switchToTableView(): Promise<void> {
    await this.tableViewButton.click();
  }
}
