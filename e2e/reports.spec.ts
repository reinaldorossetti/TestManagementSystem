import { test, expect } from './fixtures';

test.describe('Reports panel (Allure-style execution reports)', () => {
  test('Given the reports panel, then status filters and report cards render', async ({
    reports,
  }) => {
    // Given the user opens the reports panel
    await reports.open();

    // Then the status filters and at least one report card are visible
    await expect(reports.passFilterButton).toBeVisible();
    await expect(reports.failFilterButton).toBeVisible();
    await expect(reports.viewDetailsButtons.first()).toBeVisible();
  });

  test('Given a report card, when the user opens its detail, then the run command is shown', async ({
    reports,
  }) => {
    // Given the reports panel with seeded executions
    await reports.open();
    await expect(reports.viewDetailsButtons.first()).toBeVisible();

    // When the user drills into the first report
    await reports.openFirstReportDetail();

    // Then the execution detail exposes the Robot command and a way back
    await expect(reports.robotCommandLabel).toBeVisible();
    await expect(reports.exitDetailButton).toBeVisible();
  });

  test('Given the cards view, when the user switches to table view, then a records table renders', async ({
    reports,
    page,
  }) => {
    // Given the reports panel on the default cards view
    await reports.open();

    // When the user switches to the records table view
    await reports.switchToTableView();

    // Then a tabular list of executions is rendered
    await expect(page.getByRole('table').first()).toBeVisible();
  });
});
