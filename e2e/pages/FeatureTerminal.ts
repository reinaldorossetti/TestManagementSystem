import { type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Terminal panel: the Robot Framework argument builder, the workspace test tree
 * and the feature/batch execution controls.
 */
export class FeatureTerminal extends BasePage {
  get robotArgumentsHeading(): Locator {
    return this.page.getByRole('heading', {
      name: /Argumentos do Robot Framework|Robot Framework Arguments/,
    });
  }

  get executeFeatureButton(): Locator {
    return this.page.getByRole('button', { name: /Executar Feature|Execute Feature/ });
  }

  get runAutomatedTestsButton(): Locator {
    return this.page.getByRole('button', { name: /Run Automated Tests|Executar Testes/ });
  }

  async open(): Promise<void> {
    await super.open('terminal');
  }
}
