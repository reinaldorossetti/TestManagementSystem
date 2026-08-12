import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolvePersistedResultsDir, resolveResultsDir } from '@/src/server/robot/resultsPaths';

const ARTIFACTS_DIR = 'artifacts';
const RENDER_WAIT_MS = 3_500;

export interface ReportCaptureTestInput {
  id: string;
  robotTestId?: string;
}

export interface ReportCaptureResult {
  /** Caminho relativo: artifacts/robot-report.png */
  suiteReportPath?: string;
  /** testCaseId → artifacts/robot-log-<id>.png */
  testReportPaths: Record<string, string>;
}

const relArtifact = (name: string): string => `${ARTIFACTS_DIR}/${name}`;

/**
 * Captura screenshots do report.html (suíte) e trechos do log.html (por cenário)
 * gerados pelo Robot Framework, para embed no PDF do TMS.
 */
export async function captureRobotReportImages(
  runId: string,
  tests: ReportCaptureTestInput[],
  resultsPath?: string,
): Promise<ReportCaptureResult> {
  const result: ReportCaptureResult = { testReportPaths: {} };
  const resultsDir = resultsPath
    ? resolvePersistedResultsDir(resultsPath, runId)
    : await resolveResultsDir(runId);
  const reportHtml = path.join(resultsDir, 'report.html');
  const logHtml = path.join(resultsDir, 'log.html');
  const artifactsAbs = path.join(resultsDir, ARTIFACTS_DIR);

  let chromium: typeof import('playwright').chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.warn('[TMS] Playwright indisponível — captura de report.html ignorada.');
    return result;
  }

  await mkdir(artifactsAbs, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

    // --- report.html (estatísticas da suíte) ---
    try {
      await page.goto(pathToFileURL(reportHtml).href, { waitUntil: 'load', timeout: 30_000 });
      await page.waitForTimeout(RENDER_WAIT_MS);

      const suiteOut = path.join(artifactsAbs, 'robot-report.png');
      const stats = page.locator('#statistics-container');
      if ((await stats.count()) > 0) {
        await stats.screenshot({ path: suiteOut });
      } else {
        await page.screenshot({ path: suiteOut, fullPage: false });
      }
      result.suiteReportPath = relArtifact('robot-report.png');
    } catch (err) {
      console.warn('[TMS] Falha ao capturar report.html:', (err as Error).message);
    }

    // --- log.html (detalhe por cenário) ---
    try {
      await page.goto(pathToFileURL(logHtml).href, { waitUntil: 'load', timeout: 30_000 });
      await page.waitForTimeout(RENDER_WAIT_MS);

      for (const test of tests) {
        const robotId = test.robotTestId?.trim();
        if (!robotId) continue;

        const safeName = robotId.replace(/[^a-zA-Z0-9._-]/g, '');
        const outRel = relArtifact(`robot-log-${safeName}.png`);
        const outAbs = path.join(artifactsAbs, `robot-log-${safeName}.png`);

        try {
          const locator = page.locator(`#${robotId}`);
          if ((await locator.count()) === 0) continue;

          await locator.scrollIntoViewIfNeeded();
          await page.evaluate((tid) => {
            const root = document.getElementById(tid);
            const header = root?.querySelector('.element-header');
            if (header?.classList.contains('closed')) {
              (header as HTMLElement).click();
            }
          }, robotId);
          await page.waitForTimeout(400);
          await locator.screenshot({ path: outAbs });
          result.testReportPaths[test.id] = outRel;
        } catch {
          /* ignora teste individual */
        }
      }
    } catch (err) {
      console.warn('[TMS] Falha ao capturar log.html:', (err as Error).message);
    }
  } finally {
    await browser.close();
  }

  return result;
}
