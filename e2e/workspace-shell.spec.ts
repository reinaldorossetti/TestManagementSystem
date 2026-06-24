import { test, expect } from './fixtures';

test.describe('Workspace shell (header, KPIs, global controls)', () => {
  test('Given the dashboard loads, then the header identity and DB status are shown', async ({
    shell,
  }) => {
    // Given the user opens the dashboard
    await shell.open('terminal');

    // Then the product title and a connected database indicator are visible
    await expect(shell.appTitle).toBeVisible();
    await expect(shell.databaseStatus).toBeVisible();
    await expect(shell.databaseStatus).toHaveText('CONECTADO');
  });

  test('Given the dashboard loads, then all four KPI stat cards render', async ({ shell }) => {
    // Given the dashboard is open
    await shell.open('terminal');

    // Then each executive KPI card is present
    await expect(shell.statCard('Total de Execuções')).toBeVisible();
    await expect(shell.statCard('Taxa de Sucesso (Pass)')).toBeVisible();
    await expect(shell.statCard('Duração Média das Suites')).toBeVisible();
    await expect(shell.statCard('SQLite Estabilidade')).toBeVisible();
  });

  test('Given Portuguese is active, when the user toggles language, then labels switch to English', async ({
    shell,
    page,
  }) => {
    // Given the dashboard renders in Portuguese
    await shell.open('terminal');
    await expect(shell.databaseStatus).toHaveText('CONECTADO');

    // When the user toggles the language
    await shell.toggleLanguage();

    // Then the connection indicator is shown in English
    await expect(page.getByText('CONNECTED')).toBeVisible();
  });

  test('Given the dashboard, when the user opens settings, then speed control and reset DB are available', async ({
    shell,
  }) => {
    // Given the dashboard is open
    await shell.open('terminal');

    // When the user opens the settings drawer
    await shell.openSettings();

    // Then the simulation speed control and a safely-located reset action appear
    await expect(shell.simulationSpeedLabel).toBeVisible();
    await expect(shell.resetDatabaseButton).toBeVisible();
  });

  test('Given the dashboard, when the user opens the panel navigator, then it lists the TMS panel', async ({
    shell,
  }) => {
    // Given the dashboard is open
    await shell.open('terminal');

    // When the user opens the panel navigator drawer
    await shell.openPanelNavigator();

    // Then the Test Management System destination is offered
    await expect(shell.panelNavigatorTmsOption).toBeVisible();
  });
});
