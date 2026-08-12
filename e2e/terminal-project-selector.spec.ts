import path from 'node:path';
import { test, expect } from './fixtures';

test.describe('Terminal project selector', () => {
  test('uses the stored Test Tags value when compiling and executing a feature', async ({ terminal, page }) => {
    let submittedCommand = '';
    await page.route('**/api/terminal/robot-tags', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          projectFolders: ['mobile_automation_robot'],
          tags: [{
            tag: 'adicionar_dinheiro_via_boleto',
            sourceFile: 'adicionar_boleto_tests.robot',
            sourceFolder: 'mobile_automation_robot',
            isSuiteTestTag: true,
          }, {
            tag: 'ADIB02',
            sourceFile: 'adicionar_boleto_tests.robot',
            sourceFolder: 'mobile_automation_robot',
            isSuiteTestTag: false,
          }],
        }),
      });
    });
    await page.route('**/api/terminal/settings', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ resultsDirectory: 'results/' }),
      });
    });
    await page.route('**/api/terminal/run', async (route) => {
      submittedCommand = (route.request().postDataJSON() as { command: string }).command;
      await route.fulfill({ status: 200, contentType: 'text/plain', body: 'Robot finished.' });
    });
    await page.route('**/api/terminal/output', async (route) => {
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'No output for mocked run.' }) });
    });

    await terminal.open();

    await page.getByTestId('terminal-execution-tag-select').selectOption('ADIB02');

    const py = process.platform === 'win32' ? 'python' : 'python3';
    await expect(page.getByTestId('terminal-compiled-command')).toContainText(
      `${py} -m robot --outputdir "results/" -i adicionar_dinheiro_via_boleto ./`,
    );

    await terminal.executeFeatureButton.click();
    await expect.poll(() => submittedCommand).toBe(
      `${py} -m robot --outputdir "results/" -i adicionar_dinheiro_via_boleto ./`,
    );
  });

  test('lists only test_projects folders and ignores imported features', async ({ terminal, page }) => {
    await terminal.open();

    const projectSelect = page.getByTestId('terminal-project-select');
    await expect(projectSelect).toBeVisible();
    const projectOptions = projectSelect.locator('option');
    await expect.poll(() => projectOptions.count()).toBeGreaterThan(0);

    const readOptionLabels = async () => projectOptions.allTextContents();

    const initialOptions = (await readOptionLabels()).map((text) => text.trim()).filter(Boolean);
    expect(initialOptions.length).toBeGreaterThan(0);

    const featureFile = path.resolve(process.cwd(), 'features', 'tms.feature');
    await page.getByTestId('terminal-file-input').setInputFiles(featureFile);

    await expect(projectOptions).toHaveCount(initialOptions.length);
    const optionsAfterImport = (await readOptionLabels()).map((text) => text.trim()).filter(Boolean);
    expect(optionsAfterImport).toEqual(initialOptions);
  });

  test('shows the effective project path in the execution log', async ({ terminal, page }) => {
    await terminal.open();

    const projectSelect = page.getByTestId('terminal-project-select');
    const firstProject = projectSelect.locator('option').first();
    await expect(projectSelect).toBeVisible();
    await expect.poll(() => projectSelect.locator('option').count()).toBeGreaterThan(0);
    const projectFolder = await firstProject.getAttribute('value');
    expect(projectFolder).toBeTruthy();
    await projectSelect.selectOption(projectFolder!);

    await terminal.executeFeatureButton.click();

    await expect(page.locator('main')).toContainText(`[PROJECT] test_projects/${projectFolder}/`);
  });
});