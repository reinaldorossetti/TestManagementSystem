import { expect, type Locator } from '@playwright/test';
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

  get editCaseButton(): Locator {
    return this.page.getByTestId('tms-edit-case-button');
  }

  get observationInput(): Locator {
    return this.page.getByTestId('tms-observation-input');
  }

  get applyObservationToFolderCheckbox(): Locator {
    return this.page.getByTestId('tms-apply-observation-to-folder');
  }

  get saveCaseButton(): Locator {
    return this.page.getByTestId('tms-save-case-button');
  }

  get importTestsButton(): Locator {
    return this.page.getByTestId('tms-import-tests-button');
  }

  get importTestsFileInput(): Locator {
    return this.page.getByTestId('tms-import-tests-file-input');
  }

  get caseHeadings(): Locator {
    // Each case in the list is rendered as a level-4 heading with its title.
    return this.page.locator('main h4, h4');
  }

  caseByName(name: string | RegExp): Locator {
    return this.page.getByRole('heading', { level: 4, name });
  }

  folderByName(name: string | RegExp): Locator {
    return this.page.getByText(name, { exact: typeof name === 'string' });
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

  get runManualButton(): Locator {
    return this.page.getByRole('button', { name: /Executar Manualmente|Run Manually/ });
  }

  get manualExecutionDialog(): Locator {
    return this.page.getByRole('dialog', { name: /Execução Manual|Manual Execution/ });
  }

  get manualTextScaleValue(): Locator {
    return this.page.getByTestId('manual-execution-text-scale-value');
  }

  get increaseManualTextButton(): Locator {
    return this.page.getByTestId('manual-execution-text-scale-increase');
  }

  get decreaseManualTextButton(): Locator {
    return this.page.getByTestId('manual-execution-text-scale-decrease');
  }

  get manualEvidenceLinkModeButton(): Locator {
    return this.page.getByTestId('manual-evidence-link-mode');
  }

  get manualEvidenceFileModeButton(): Locator {
    return this.page.getByTestId('manual-evidence-file-mode');
  }

  get manualEvidenceLinkUrlInput(): Locator {
    return this.page.getByTestId('manual-evidence-link-url');
  }

  get manualEvidenceLinkTitleInput(): Locator {
    return this.page.getByTestId('manual-evidence-link-title');
  }

  get manualEvidenceSaveLinkButton(): Locator {
    return this.page.getByTestId('manual-evidence-save-link');
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

  async selectFirstCase(): Promise<void> {
    const firstCase = this.caseHeadings.first();
    await expect(firstCase).toBeVisible();
    await firstCase.click({ force: true });
  }

  async editSelectedCase(): Promise<void> {
    await this.editCaseButton.click();
  }

  async selectFolder(name: string): Promise<void> {
    await this.page.getByText(name, { exact: true }).click();
  }

  get importAcceptanceCriteriaButton(): Locator {
    return this.page.getByRole('button', {
      name: /Importar Critérios de Aceite|Import Acceptance Criteria/,
    });
  }

  get acceptanceCriteriaLink(): Locator {
    return this.page.getByRole('link').filter({ hasText: /\.md$/ });
  }

  get activeProjectSelect(): Locator {
    return this.page.getByTitle(/Projeto ao qual novas pastas/);
  }

  get createProjectButton(): Locator {
    return this.page.getByTitle(/Criar Novo Projeto|Create New Project/);
  }

  get renameProjectButton(): Locator {
    return this.page.getByTitle(/Renomear Projeto Selecionado|Rename Selected Project/);
  }

  get newProjectNameInput(): Locator {
    return this.page.getByPlaceholder(/Nome do novo projeto|New project name/);
  }

  get newProjectDetailsInput(): Locator {
    return this.page.getByPlaceholder(/Detalhes do Projeto|Project Details/);
  }

  get confirmCreateProjectButton(): Locator {
    return this.page.getByRole('button', { name: /^(Criar|Create)$/ });
  }

  get editProjectNameInput(): Locator {
    return this.page.getByPlaceholder(/Novo nome do projeto|New project name/);
  }

  get confirmRenameProjectButton(): Locator {
    return this.page.getByRole('button', { name: /^(Salvar|Save)$/ });
  }

  get newFolderButton(): Locator {
    return this.page.getByTitle(/Criar Nova Pasta \/ Feature|Create New Folder \/ Feature/);
  }

  get newFolderPathInput(): Locator {
    return this.page.getByPlaceholder(/Nome da pasta\/caminho|Folder name \/ path/);
  }

  get confirmCreateFolderButton(): Locator {
    return this.page.getByRole('button', { name: /^(Criar|Create)$/ });
  }

  async selectProject(name: string): Promise<void> {
    await this.activeProjectSelect.selectOption({ label: name });
  }

  async createProject(name: string, details = ''): Promise<void> {
    await this.createProjectButton.click();
    await this.newProjectNameInput.fill(name);
    if (details) await this.newProjectDetailsInput.fill(details);
    await this.confirmCreateProjectButton.click();
  }

  async renameSelectedProject(newName: string): Promise<void> {
    await this.renameProjectButton.click();
    await this.editProjectNameInput.fill(newName);
    await this.confirmRenameProjectButton.click();
  }

  async createFolder(folderPath: string): Promise<void> {
    await this.newFolderButton.click();
    await this.newFolderPathInput.fill(folderPath);
    await this.confirmCreateFolderButton.click();
  }

  async importTests(content: string, fileName = 'tms-import.feature'): Promise<void> {
    await this.importTestsButton.click();
    await this.importTestsFileInput.setInputFiles({
      name: fileName,
      mimeType: 'text/plain',
      buffer: Buffer.from(content, 'utf-8'),
    });
  }
}
