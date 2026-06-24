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
