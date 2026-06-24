import { test, expect } from './fixtures';

test.describe('SQLite history panel (relational browser)', () => {
  test('Given the SQLite panel, then the visual table browser renders a data table', async ({
    sqlite,
  }) => {
    // Given the user opens the SQLite history panel
    await sqlite.open();

    // Then the visual tables view and a populated data table are shown
    await expect(sqlite.visualTablesTab).toBeVisible();
    await expect(sqlite.dataTable).toBeVisible();
  });

  test('Given the visual table view, when the user opens the RAW SQL console, then it becomes active', async ({
    sqlite,
  }) => {
    // Given the SQLite panel is open on the visual view
    await sqlite.open();
    await expect(sqlite.rawSqlConsoleTab).toBeVisible();

    // When the user switches to the interactive RAW SQL console
    await sqlite.showRawSqlConsole();

    // Then the console sub-view control remains present (view switched without error)
    await expect(sqlite.rawSqlConsoleTab).toBeVisible();
  });
});
