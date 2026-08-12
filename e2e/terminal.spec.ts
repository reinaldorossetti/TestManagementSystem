import { test, expect } from './fixtures';
import { access } from 'node:fs/promises';
import path from 'node:path';

test.describe('Terminal panel (Robot Framework console)', () => {
  test('Given Robot settings, when the results repository is updated, then SQLite retains it', async ({
    request,
  }) => {
    const configuredDirectory = 'results/e2e-runtime/';

    try {
      const updateResponse = await request.put('/api/terminal/settings', {
        data: { resultsDirectory: configuredDirectory },
      });
      expect(updateResponse.ok()).toBeTruthy();
      expect(await updateResponse.json()).toMatchObject({
        resultsDirectory: configuredDirectory,
        resolvedDirectory: expect.stringMatching(/results[\\/]e2e-runtime$/i),
      });
      await expect(access(path.resolve(process.cwd(), 'results', 'e2e-runtime'))).resolves.toBeUndefined();

      const getResponse = await request.get('/api/terminal/settings');
      expect(getResponse.ok()).toBeTruthy();
      expect(await getResponse.json()).toMatchObject({
        resultsDirectory: configuredDirectory,
        resolvedDirectory: expect.stringMatching(/results[\\/]e2e-runtime$/i),
      });
    } finally {
      await request.put('/api/terminal/settings', {
        data: { resultsDirectory: 'results/' },
      });
    }
  });

  test('Given the terminal panel, then the Robot Framework argument builder is shown', async ({
    terminal,
  }) => {
    // Given the user opens the terminal panel
    await terminal.open();

    // Then the argument builder header is visible
    await expect(terminal.robotArgumentsHeading).toBeVisible();
  });

  test('Given the terminal panel, then the full-feature execution control is available', async ({
    terminal,
  }) => {
    // Given the terminal panel is open
    await terminal.open();

    // Then the user can trigger a full feature run
    await expect(terminal.executeFeatureButton).toBeVisible();
    await expect(terminal.executeFeatureButton).toBeEnabled();
  });
});
