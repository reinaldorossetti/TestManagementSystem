import path from 'node:path';
import { type Page } from '@playwright/test';
import { test, expect } from './fixtures';

const boletoFile = path.resolve(
  process.cwd(),
  'test_projects',
  'mobile_automation_robot',
  'atests',
  'mobile_tests',
  'features',
  'adicionar_spec',
  'adicionar_boleto_tests.robot',
);

const pixFile = path.resolve(
  process.cwd(),
  'test_projects',
  'mobile_automation_robot',
  'atests',
  'mobile_tests',
  'features',
  'adicionar_spec',
  'adicionar_pix_tests.robot',
);

const cadastroFile = path.resolve(
  process.cwd(),
  'test_projects',
  'mobile_automation_robot',
  'atests',
  'mobile_tests',
  'features',
  'cadastro_spec',
  'cadastro_tests.robot',
);

async function importRobotFile(page: Page, filePath: string, expectedCount: number) {
  const fileInput = page.getByTestId('terminal-file-input');
  await expect(fileInput).toBeAttached({ timeout: 30_000 });
  await fileInput.setInputFiles(filePath);
  const scenarioCards = page.getByTestId('terminal-scenario-list').locator(':scope > div');
  await expect(scenarioCards).toHaveCount(expectedCount);
  await expect(page.getByText(/Cenários Mapeados pelo Parser|Scenarios Mapped by Parser/)).toContainText(
    `Cenários Mapeados pelo Parser (${expectedCount})`,
  );
}

async function openTerminalForImport(page: Page) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await page.goto('/terminal');
    await expect(page).toHaveURL(/\/terminal$/);

    const retryRenderButton = page.getByTestId('app-retry-render-button');
    if (await retryRenderButton.isVisible()) {
      await retryRenderButton.click();
    }

    const fileInput = page.getByTestId('terminal-file-input');
    if ((await fileInput.count()) > 0) {
      await expect(fileInput).toBeAttached({ timeout: 30_000 });
      return;
    }

    await page.reload({ waitUntil: 'domcontentloaded' });
  }

  await expect(page.getByTestId('terminal-file-input')).toBeAttached({ timeout: 30_000 });
}

async function storeAndOpenTms(page: Page) {
  const popupPromise = page.waitForEvent('popup');
  await page.getByTestId('terminal-store-tests-button').click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  await expect(popup.getByRole('heading', { name: /Sistema de Gestão de Testes|Test Management System/ })).toBeVisible();
  return popup;
}

async function expectFolderCount(
  tmsPage: Page,
  label: string,
  expectedCount: number,
) {
  const folder = tmsPage
    .getByTestId('tms-folder-entry')
    .filter({ hasText: label });

  await expect(folder).toHaveCount(1);
  await expect(folder.getByTestId('tms-folder-case-count')).toHaveText(String(expectedCount));

  await folder.click();
  await expect(
    tmsPage.getByText(new RegExp(`^${expectedCount} itens$|^${expectedCount} items$`)),
  ).toBeVisible();
}

test.describe('Armazenar Testes do Workspace no TMS', () => {
  test.afterEach(async ({ request }) => {
    await request.post('/api/database/reset');
  });

  test('mantém 8 boletos e 6 Pix, sem pastas vazias ou duplicação ao importar novamente', async ({ page }) => {
    test.setTimeout(120_000);
    await page.request.post('/api/database/reset');
    await openTerminalForImport(page);

    await importRobotFile(page, boletoFile, 8);
    const boletoTms = await storeAndOpenTms(page);
    await expectFolderCount(boletoTms, 'Adicionar Dinheiro Via Boleto', 8);
    await boletoTms.close();

    // Reimporting the same suite must update the existing eight cases.
    await importRobotFile(page, boletoFile, 8);
    const boletoTmsAfterReimport = await storeAndOpenTms(page);
    await expectFolderCount(boletoTmsAfterReimport, 'Adicionar Dinheiro Via Boleto', 8);
    await boletoTmsAfterReimport.close();

    await importRobotFile(page, pixFile, 6);
    const pixTms = await storeAndOpenTms(page);
    await expectFolderCount(pixTms, 'Adicionar Dinheiro Via Pix', 6);

    // The two suites have overlapping numeric scenario prefixes, so both
    // folders must coexist and retain their independent counts.
    await expectFolderCount(pixTms, 'Adicionar Dinheiro Via Boleto', 8);
    await expect(pixTms.getByTestId('tms-folder-entry').filter({ hasText: 'Adicionar Dinheiro Via Pix' })).toHaveCount(1);
    await expect(pixTms.getByTestId('tms-folder-entry').filter({ hasText: 'Adicionar Dinheiro Via Boleto' })).toHaveCount(1);
  });

  test('preserva os 17 cenários quando títulos diferentes se repetem na suíte', async ({ page }) => {
    test.setTimeout(120_000);
    await page.request.post('/api/database/reset');
    await openTerminalForImport(page);

    await importRobotFile(page, cadastroFile, 17);
    const tmsPage = await storeAndOpenTms(page);

    // Casos distintos da suíte devem permanecer separados no TMS durante a importação.
    await expectFolderCount(tmsPage, 'Cadastro Onboarding', 17);
  });
});
