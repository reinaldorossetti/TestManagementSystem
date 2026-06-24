import { test, expect } from './fixtures';

test.describe('Terminal panel (Robot Framework console)', () => {
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
