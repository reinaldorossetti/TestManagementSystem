import { test, expect } from './fixtures';

test.describe('Test Management System — Active Project selector', () => {
  test('Given the TMS panel, then a seeded default project is shown as active', async ({
    tms,
  }) => {
    // Given the user opens the standalone TMS
    await tms.open();

    // Then a seeded project is selected by default (the seed always ships one project)
    await expect(tms.activeProjectSelect).toBeVisible();
    await expect(tms.activeProjectSelect).toHaveValue('PROJ-DEFAULT');
    await expect(tms.activeProjectSelect.locator('option:checked')).not.toHaveText('');
  });

  test('Given the TMS panel, when the user creates a new project, then it becomes the active project', async ({
    tms,
  }) => {
    // Given the standalone TMS is open
    await tms.open();

    // When the user creates a new project
    const projectName = `Projeto QA ${Date.now()}`;
    await tms.createProject(projectName, 'Projeto criado via teste automatizado.');

    // Then the new project is selected as the active project
    await expect(
      tms.activeProjectSelect.locator('option', { hasText: projectName }),
    ).toHaveCount(1);
    await expect(
      tms.activeProjectSelect.locator('option:checked'),
    ).toHaveText(projectName);
  });

  test('Given an active project, when the user renames it, then the selector reflects the new name', async ({
    tms,
  }) => {
    // Given the standalone TMS is open with the seeded project active
    await tms.open();
    const originalName = await tms.activeProjectSelect.locator('option:checked').textContent();
    expect(originalName).toBeTruthy();

    // When the user renames the active project
    const renamedTo = `Projeto Renomeado ${Date.now()}`;
    await tms.renameSelectedProject(renamedTo);

    // Then the selector shows the updated name
    await expect(
      tms.activeProjectSelect.locator('option:checked'),
    ).toHaveText(renamedTo);

    // Cleanup: restore the original name so other tests relying on the
    // seeded default project are not affected by shared, non-isolated app state.
    await tms.renameSelectedProject(originalName!.trim());
  });

  test('Given a selected active project, when a new folder/feature is created, then it is linked to that project', async ({
    tms,
    page,
  }) => {
    // Given the standalone TMS is open with a seeded project active
    await tms.open();
    await expect(tms.activeProjectSelect).toHaveValue('PROJ-DEFAULT');

    // When the user creates a new folder/feature
    const folderPath = `qa-e2e-folder-${Date.now()}`;
    await tms.createFolder(folderPath);

    // Then the folder appears in the tree, and no "no project" warning is shown
    await expect(tms.folderByName(folderPath)).toBeVisible();
    await expect(page.getByText('Nenhum projeto cadastrado')).toHaveCount(0);
  });

  test('Given folders with numeric and alphabetic names, then the folder tree uses natural order', async ({
    tms,
    page,
  }) => {
    await page.request.post('/api/database/reset');

    const customFolders = ['10 Pasta', '2 Pasta', 'Alpha Pasta', 'beta Pasta'];
    for (const folder of customFolders) {
      const response = await page.request.post('/api/folders', {
        data: { path: folder },
      });
      expect(response.ok()).toBeTruthy();
    }

    try {
      await tms.open();
      await expect(page.getByTestId('tms-folder-entry').first()).toBeVisible();

      const folderLabels = await page.getByTestId('tms-folder-entry').evaluateAll((entries, expectedFolders) =>
        entries
          .map((entry) => entry.querySelector('span.truncate')?.textContent?.trim() ?? '')
          .filter((label) => expectedFolders.includes(label)),
        customFolders,
      );

      expect(folderLabels).toEqual(['2 Pasta', '10 Pasta', 'Alpha Pasta', 'beta Pasta']);
    } finally {
      await page.request.post('/api/database/reset');
    }
  });

  test('Given the TMS panel, when Importar Testes is used, then the file is imported and saved in one flow', async ({
    tms,
    page,
  }) => {
    await page.request.post('/api/database/reset');
    const folderLabel = `TMS Import E2E ${Date.now()}`;
    const featureContent = `# language: pt
Funcionalidade: ${folderLabel}

  @TMSIMP01
  Cenário: Importação combinada pelo TMS
    Dado que o operador abriu a tela TMS
    Quando seleciona a ação Importar Testes
    Então o caso é salvo na pasta correta
`;

    try {
      await tms.open();
      await expect(tms.importTestsButton).toBeVisible();
      await expect(tms.importTestsButton).toBeEnabled();

      await tms.importTests(featureContent);

      const folder = page
        .getByTestId('tms-folder-entry')
        .filter({ hasText: folderLabel });
      await expect(folder).toHaveCount(1);
      await expect(folder.getByTestId('tms-folder-case-count')).toHaveText('1');
      await expect(page.getByTestId('tms-case-tag')).toHaveText('TMSIMP01');
    } finally {
      await page.request.post('/api/database/reset');
    }
  });
});
