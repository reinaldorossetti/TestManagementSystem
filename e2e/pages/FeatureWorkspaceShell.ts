import { type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * The dashboard shell shared by the Terminal/History/Reports panels: KPI stat
 * cards, the settings drawer, and the panel navigator drawer.
 */
export class FeatureWorkspaceShell extends BasePage {
  get statCards(): Locator {
    return this.page.getByText(
      /(Total de Execuções|Taxa de Sucesso|Duração Média das Suites|SQLite Estabilidade)/,
    );
  }

  statCard(label: string): Locator {
    return this.page.getByText(label, { exact: true });
  }

  get syncStatusLabel(): Locator {
    return this.page.getByText('Sincronização Ativa');
  }

  get resetDatabaseButton(): Locator {
    return this.page.getByRole('button', { name: /Resetar Banco de Dados/ });
  }

  get panelNavigatorTmsOption(): Locator {
    return this.page.getByRole('button', { name: 'Test Management System' });
  }

  activePanelLabel(): Locator {
    return this.page.getByText(/(Painel Ativo:|Active Panel:)/);
  }
}
