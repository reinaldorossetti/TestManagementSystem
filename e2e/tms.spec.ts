import { test, expect } from './fixtures';

test.describe('Test Management System (standalone)', () => {
  test('Given the TMS panel, then the standalone header and folder tree render', async ({
    tms,
  }) => {
    // Given the user opens the standalone TMS
    await tms.open();

    // Then the standalone identity, export action and back control are shown
    await expect(tms.standaloneHeading).toBeVisible();
    await expect(tms.exportExcelButton).toBeVisible();
    await expect(tms.backButton).toBeVisible();
  });

  test('Given the TMS panel, then the case list and its actions render', async ({ tms }) => {
    // Given the standalone TMS is open
    await tms.open();

    // Then the case list shows seeded cases and management actions
    await expect(tms.caseHeadings.first()).toBeVisible();
    await expect(tms.createCaseButton).toBeVisible();
    await expect(tms.runTestsButton).toBeVisible();
  });

  test('Given the TMS case list, then cases are ordered by their numeric tag', async ({
    tms,
    page,
  }) => {
    // The seeded Recarga folder contains RECEL01 through RECEL16. The list
    // must keep their numeric tag order instead of relying on database order.
    await tms.open();

    await expect(page.getByTestId('tms-case-tag').first()).toHaveText('RECEL01');
    const caseTags = await page.getByTestId('tms-case-tag').allTextContents();
    expect(caseTags).toEqual([
      'RECEL01', 'RECEL02', 'RECEL03', 'RECEL04', 'RECEL05', 'RECEL06', 'RECEL07', 'RECEL08',
      'RECEL09', 'RECEL10', 'RECEL11', 'RECEL12', 'RECEL13', 'RECEL14', 'RECEL15', 'RECEL16',
    ]);
  });

  test('Given a populated case list, when the user filters by a term, then only matches remain', async ({
    tms,
  }) => {
    // Given the standalone TMS with many recharge cases
    await tms.open();
    await expect(tms.caseByName(/recarga de telefonia Vivo/)).toBeVisible();

    // When the user filters by a unique operator name
    await tms.filterCases('Claro');

    // Then the non-matching case is hidden and the matching one remains
    await expect(tms.caseByName(/recarga de telefonia Vivo/)).toHaveCount(0);
    await expect(tms.caseByName(/recarga de telefonia Claro/)).toBeVisible();
  });

  test('Given a selected case, then the detail panel exposes its sub-tabs', async ({ tms }) => {
    // Given the standalone TMS is open
    await tms.open();

    // When the user selects a specific case
    await tms.selectCase('Realizar uma nova recarga de telefonia Claro.');

    // Then the detail panel shows the overview, audit log and scripts tabs
    await expect(tms.detailOverviewTab).toBeVisible();
    await expect(tms.detailAuditTab).toBeVisible();
    await expect(tms.detailScriptsTab).toBeVisible();
    await expect(tms.runSingleAutomatedTestButton).toBeVisible();
  });

  test('Given the selected Calculadora feature, when plural execution starts, then its suite tag is used', async ({
    tms,
    page,
  }) => {
    const suffix = Date.now();
    const folderName = `E2E Calculadora Cobrar ${suffix}`;
    const folderResponse = await page.request.post('/api/folders', {
      data: { path: folderName },
    });
    expect(folderResponse.ok()).toBeTruthy();

    for (const [tag, title] of [
      ['CALCQC01', `CT01 - Calculadora case one ${suffix}`],
      ['CALCQC02', `CT02 - Calculadora case two ${suffix}`],
    ]) {
      const response = await page.request.post('/api/test-cases-sphere', {
        data: {
          id: `E2E-BATCH-${tag}-${suffix}`,
          folder: folderName,
          title,
          preconditions: `*** Variables ***\n\${DEFAULT_TAG}=    @${tag}`,
          steps: 'Dado que o caso está pronto\nQuando a feature é executada\nEntão o caso termina',
          expected_result: 'Execução concluída',
        },
      });
      expect(response.ok()).toBeTruthy();
    }

    await tms.open();
    await tms.selectFolder(folderName);

    await page.route('**/api/terminal/robot-tags', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          projectFolders: ['mobile_automation_robot'],
          tags: [
            {
              tag: 'adicionar_dinheiro_via_boleto',
              sourceFile: 'adicionar_boleto_tests.robot',
              sourceFolder: 'mobile_automation_robot',
              isSuiteTestTag: true,
            },
            {
              tag: 'calculadora_cobrar',
              sourceFile: 'calculadora_quero_cobrar_tests.robot',
              sourceFolder: 'mobile_automation_robot',
              isSuiteTestTag: true,
            },
            {
              tag: 'CALCQC01',
              sourceFile: 'calculadora_quero_cobrar_tests.robot',
              sourceFolder: 'mobile_automation_robot',
              isSuiteTestTag: false,
            },
            {
              tag: 'CALCQC02',
              sourceFile: 'calculadora_quero_cobrar_tests.robot',
              sourceFolder: 'mobile_automation_robot',
              isSuiteTestTag: false,
            },
          ],
        }),
      });
    });

    await page.route('**/api/terminal/run', async (route) => {
      await route.fulfill({ status: 200, contentType: 'text/plain', body: 'robot output' });
    });
    await page.route('**/api/terminal/output', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Batch execution intercepted by regression test' }),
      });
    });

    const runRequestPromise = page.waitForRequest('**/api/terminal/run');
    await tms.runTestsButton.click();
    const runRequest = await runRequestPromise;
    const requestBody = runRequest.postDataJSON() as {
      command: string;
      workingDirectory?: string;
    };

    const py = process.platform === 'win32' ? 'python' : 'python3';
    expect(requestBody.command).toBe(
      `${py} -m robot -i calculadora_cobrar ./`,
    );
    expect(requestBody.command).not.toContain('adicionar_dinheiro_via_boleto');
    expect(requestBody.workingDirectory).toBe('mobile_automation_robot');
  });

  test('Given a case observation, when applied to the folder, then all folder cases receive only that observation', async ({
    tms,
    page,
  }) => {
    const suffix = Date.now();
    const folderName = `E2E Observation Folder ${suffix}`;
    const firstCaseTitle = `OBS01 - Caso de observação ${suffix}`;
    const secondCaseTitle = `OBS02 - Caso de observação ${suffix}`;
    const firstCaseId = `E2E-OBS-01-${suffix}`;
    const secondCaseId = `E2E-OBS-02-${suffix}`;
    const folderResponse = await page.request.post('/api/folders', {
      data: { path: folderName },
    });
    expect(folderResponse.ok()).toBeTruthy();

    for (const [id, title, observation] of [
      [firstCaseId, firstCaseTitle, 'Observação original 1'],
      [secondCaseId, secondCaseTitle, 'Observação original 2'],
    ]) {
      const response = await page.request.post('/api/test-cases-sphere', {
        data: {
          id,
          folder: folderName,
          title,
          preconditions: 'VAR_TESTE=original',
          steps: 'Dado que o caso existe',
          expected_result: 'O caso permanece com os mesmos dados',
          observation,
        },
      });
      expect(response.ok()).toBeTruthy();
    }

    await tms.open();
    await tms.selectFolder(folderName);
    await tms.selectCase(firstCaseTitle);
    await tms.editSelectedCase();

    await expect(tms.applyObservationToFolderCheckbox).toBeVisible();
    await tms.observationInput.fill('Observação compartilhada pela feature');
    await tms.applyObservationToFolderCheckbox.check();
    await tms.saveCaseButton.click();

    await expect.poll(async () => {
      const response = await page.request.get('/api/database');
      const payload = (await response.json()) as {
        data: {
          test_cases_sphere: Array<{
            id: string;
            folder: string;
            title: string;
            observation?: string;
            preconditions: string;
            expected_result: string;
          }>;
        };
      };
      return payload.data.test_cases_sphere
        .filter((testCase) => testCase.folder === folderName)
        .map((testCase) => ({
          id: testCase.id,
          title: testCase.title,
          observation: testCase.observation,
          preconditions: testCase.preconditions,
          expected_result: testCase.expected_result,
        }));
    }).toEqual([
      {
        id: firstCaseId,
        title: firstCaseTitle,
        observation: 'Observação compartilhada pela feature',
        preconditions: 'VAR_TESTE=original',
        expected_result: 'O caso permanece com os mesmos dados',
      },
      {
        id: secondCaseId,
        title: secondCaseTitle,
        observation: 'Observação compartilhada pela feature',
        preconditions: 'VAR_TESTE=original',
        expected_result: 'O caso permanece com os mesmos dados',
      },
    ]);
  });

  test('Given a selected case, when automated execution starts, then only its Robot tag is included', async ({
    tms,
    page,
  }) => {
    const caseTitle = `CT01 - E2E singular execution ${Date.now()}`;
    const regressionFolder = `E2E Robot Execution ${Date.now()}`;
    const folderResponse = await page.request.post('/api/folders', {
      data: { path: regressionFolder },
    });
    expect(folderResponse.ok()).toBeTruthy();
    const createResponse = await page.request.post('/api/test-cases-sphere', {
      data: {
        id: `E2E-SINGLE-${Date.now()}`,
        folder: regressionFolder,
        title: caseTitle,
        preconditions: '@CT01',
        steps: 'Dado que o teste foi selecionado',
        expected_result: 'Somente CT01 deve executar',
      },
    });
    expect(createResponse.ok()).toBeTruthy();

    await tms.open();
    await tms.selectFolder(regressionFolder);
    await tms.selectCase(caseTitle);
    await expect(tms.runSingleAutomatedTestButton).toBeVisible();

    await page.route('**/api/terminal/run', async (route) => {
      await route.fulfill({ status: 200, contentType: 'text/plain', body: 'robot output' });
    });
    await page.route('**/api/terminal/output', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Execution intercepted by regression test' }),
      });
    });

    const runRequestPromise = page.waitForRequest('**/api/terminal/run');
    await tms.runSingleAutomatedTestButton.click();
    const runRequest = await runRequestPromise;
    const requestBody = runRequest.postDataJSON() as {
      command: string;
      workingDirectory?: string;
    };

    const py = process.platform === 'win32' ? 'python' : 'python3';
    expect(requestBody.command).toContain('--include CT01');
    expect(requestBody.command).not.toContain('-i cadastro_onboarding');
    expect(requestBody.command).toBe(`${py} -m robot --include CT01 ./`);
    expect(requestBody.workingDirectory).toBe('mobile_automation_robot');
  });

  test('Given manual execution is open, when text is increased, then it stops at 3x', async ({ tms }) => {
    await tms.open();
    await tms.selectFolder('Todas as Pastas');
    await tms.selectFirstCase();

    await tms.runManualButton.click();
    await expect(tms.manualExecutionDialog).toBeVisible();
    await expect(tms.manualTextScaleValue).toHaveText('1x');

    await tms.manualEvidenceLinkModeButton.click();
    await expect(tms.manualEvidenceLinkUrlInput).toBeVisible();
    await expect(tms.manualEvidenceLinkTitleInput).toBeVisible();
    await expect(tms.manualEvidenceSaveLinkButton).toBeVisible();
    await tms.manualEvidenceFileModeButton.click();

    await tms.increaseManualTextButton.click();
    await tms.increaseManualTextButton.click();
    await expect(tms.manualTextScaleValue).toHaveText('3x');
    await expect(tms.increaseManualTextButton).toBeDisabled();

    await tms.decreaseManualTextButton.click();
    await expect(tms.manualTextScaleValue).toHaveText('2x');
    await tms.decreaseManualTextButton.click();
    await expect(tms.manualTextScaleValue).toHaveText('1x');
    await expect(tms.decreaseManualTextButton).toBeDisabled();

    await tms.manualExecutionDialog.getByRole('button', { name: /Fechar|Close/ }).click();
  });

  // Regression: exporting used to revoke the blob URL synchronously after click,
  // so Chromium aborted the download and opened the blob URL in a new tab
  // (blob:http://localhost:3000/...). The export must produce a real file download.
  test('Given the TMS panel, when the user exports to Excel, then a real .xlsx file is downloaded', async ({
    tms,
    page,
  }) => {
    // Given the standalone TMS with seeded cases
    await tms.open();
    await expect(tms.caseHeadings.first()).toBeVisible();

    // When the user triggers the Excel export
    const downloadPromise = page.waitForEvent('download');
    await tms.exportExcelButton.click();
    const download = await downloadPromise;

    // Then a real spreadsheet file is saved (not navigated to as a blob URL)
    expect(download.suggestedFilename()).toMatch(/^Plano_de_Testes_QA_Platform_TMS_.*\.xlsx$/);
  });
});
