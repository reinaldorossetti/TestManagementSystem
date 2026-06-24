import { type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Standalone Test Management System: the folder/feature tree, the test-case
 * list with its filter, the case detail panel and its actions.
 */
export class FeatureTms extends BasePage {
  get standaloneHeading(): Locator {
    return this.page.getByRole('heading', { name: /Sistema de Gestão de Testes/ });
  }

  get backButton(): Locator {
    return this.page.getByRole('button', { name: /Voltar|Back/ });
  }

  get exportExcelButton(): Locator {
    return this.page.getByRole('button', { name: 'Excel' });
  }

  get filterInput(): Locator {
    return this.page.getByPlaceholder(/Filtrar por nome\/id|Filter by name\/id/);
  }

  get createCaseButton(): Locator {
    return this.page.getByRole('button', { name: /Criar Caso|Create Case/ });
  }

  get runTestsButton(): Locator {
    return this.page.getByRole('button', { name: /Executar Testes|Run Automated Tests/ });
  }

  get caseHeadings(): Locator {
    // Each case in the list is rendered as a level-4 heading with its title.
    return this.page.locator('main h4, h4');
  }

  caseByName(name: string): Locator {
    return this.page.getByRole('heading', { level: 4, name });
  }

  folderByName(name: string): Locator {
    return this.page.getByText(name, { exact: true });
  }

  get detailOverviewTab(): Locator {
    return this.page.getByRole('button', { name: /Visão Geral|Overview/ });
  }

  get detailAuditTab(): Locator {
    return this.page.getByRole('button', { name: /Log de Auditoria|Audit Log/ });
  }

  get detailScriptsTab(): Locator {
    return this.page.getByRole('button', { name: 'Scripts' });
  }

  get runSingleAutomatedTestButton(): Locator {
    return this.page.getByRole('button', { name: /Executar Teste Automatizado|Run Automated Test$/ });
  }

  async open(): Promise<void> {
    await super.open('tms');
  }

  async filterCases(term: string): Promise<void> {
    await this.filterInput.fill(term);
  }

  async selectCase(name: string): Promise<void> {
    await this.caseByName(name).click();
  }
}
