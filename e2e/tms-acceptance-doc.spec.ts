import path from 'node:path';
import { test, expect } from './fixtures';

test.describe('TMS acceptance criteria import', () => {
  test('Given a selected folder, when importing a markdown file, then the case detail links to the rendered doc', async ({
    tms,
    page,
  }) => {
    await tms.open();

    const folderName = 'Recarga de telefone';
    await tms.folderByName(folderName).first().click();
    await expect(tms.importAcceptanceCriteriaButton).toBeEnabled();

    const fixturePath = path.join(
      process.cwd(),
      'e2e',
      'fixtures',
      'acceptance-login-feature.md',
    );

    const fileChooserPromise = page.waitForEvent('filechooser');
    await tms.importAcceptanceCriteriaButton.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(fixturePath);

    await tms.selectCase('Realizar uma nova recarga de telefonia Claro.');
    await expect(tms.acceptanceCriteriaLink).toBeVisible();

    const href = await tms.acceptanceCriteriaLink.getAttribute('href');
    expect(href).toMatch(/\/tms\/docs\/acceptance\/recarga-de-telefone$/);

    const docPage = await page.context().newPage();
    await docPage.goto(new URL(href!, page.url()).toString());
    await expect(docPage.getByRole('heading', { name: folderName })).toBeVisible();
    await expect(docPage.getByText('Validar o fluxo de autenticação')).toBeVisible();
    await docPage.close();
  });

  test('Given all folders selected, then the import button stays disabled', async ({ tms }) => {
    await tms.open();
    await tms.folderByName(/Todas as Pastas|All Folders/).click();
    await expect(tms.importAcceptanceCriteriaButton).toBeDisabled();
  });
});
