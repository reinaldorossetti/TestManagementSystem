import path from 'node:path';
import { readFileSync } from 'node:fs';
import { test, expect } from './fixtures';

test.describe('Feature upload', () => {
  test('reads the selected .feature instead of keeping the default workspace', async ({ terminal, page }) => {
    await terminal.open();

    await expect(page.getByText('Cenários Mapeados pelo Parser (12)')).toBeVisible();

    const featureFile = path.resolve(process.cwd(), 'features', 'tms.feature');
    await page.getByTestId('terminal-file-input').setInputFiles(featureFile);

    await expect(page.getByText('Cenários Mapeados pelo Parser (31)')).toBeVisible();
    await expect(page.locator('main')).toContainText(
      'Senha de acesso válida ativa fluxo principal',
    );
    await expect(page.locator('main')).toContainText(
      '[IMPORT] Arquivo "tms.feature" carregado com sucesso via upload!',
    );
  });

  test('allows selecting the same feature file again', async ({ terminal, page }) => {
    await terminal.open();

    const featureFile = path.resolve(process.cwd(), 'features', 'tms.feature');
    const fileInput = page.getByTestId('terminal-file-input');

    await fileInput.setInputFiles(featureFile);
    await expect(page.getByText('Cenários Mapeados pelo Parser (31)')).toBeVisible();

    await fileInput.setInputFiles(featureFile);
    await expect(
      page.locator('main').getByText('[IMPORT] Arquivo "tms.feature" carregado com sucesso via upload!'),
    ).toHaveCount(1);
  });

  test('reads a Windows-1252 feature without falling back to two demo scenarios', async ({
    terminal,
    page,
  }) => {
    await terminal.open();

    const featureFile = path.resolve(process.cwd(), 'features', 'tms.feature');
    const legacyEncodedFeature = Buffer.from(readFileSync(featureFile, 'utf8'), 'latin1');

    await page.getByTestId('terminal-file-input').setInputFiles({
      name: 'tms-legacy.feature',
      mimeType: 'text/plain',
      buffer: legacyEncodedFeature,
    });

    await expect(page.getByText('Cenários Mapeados pelo Parser (31)')).toBeVisible();
    await expect(page.getByText('Bloqueio de conta após múltiplas tentativas falhas consecutivas')).toBeVisible();
    await expect(page.getByText('Cenários Mapeados pelo Parser (2)')).toHaveCount(0);
  });

  test('recovers the full initial suite from an old persisted two-scenario fallback', async ({
    terminal,
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem(
        'cardmais_gherkin_content',
        'conteúdo antigo salvo com encoding inválido',
      );
    });

    await terminal.open();

    await expect(page.getByText('Cenários Mapeados pelo Parser (12)')).toBeVisible();
    await expect(page.getByText('Cenários Mapeados pelo Parser (2)')).toHaveCount(0);
  });
});