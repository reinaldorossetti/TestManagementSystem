import { test, expect } from './fixtures';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';

test.describe('Reports PDF export with visual evidence', () => {
  test.setTimeout(180_000);

  test('Given a completed Robot output, when importing the latest report, then its physical path is persisted', async ({
    request,
  }) => {
    const importResponse = await request.post('/api/terminal/output', { data: {} });
    if (!importResponse.ok()) {
      test.skip(true, 'Nenhum output.xml Robot disponível em results/ para importar.');
    }

    const imported = await importResponse.json() as {
      execution: { id: string; results_path: string; results_folder?: string };
      importedFrom: { runId: string; resultsFolder?: string; outputXmlPath: string };
    };

    expect(imported.importedFrom.runId).toBe(imported.execution.id);
    expect(imported.importedFrom.outputXmlPath).toBe(imported.execution.results_path);
    expect(imported.execution.results_path).toMatch(/[\\/]results[\\/][^\\/]+[\\/]output\.xml$/i);
    expect(imported.execution.results_folder).toBe(imported.importedFrom.resultsFolder);

    const dbResponse = await request.get('/api/database');
    expect(dbResponse.ok()).toBeTruthy();
    const dbPayload = await dbResponse.json() as {
      data?: { executions: Array<{ id: string; results_path: string; results_folder?: string }> };
      executions?: Array<{ id: string; results_path: string; results_folder?: string }>;
    };
    const executions = dbPayload.data?.executions ?? dbPayload.executions ?? [];
    const persisted = executions.find((execution) => execution.id === imported.execution.id);

    expect(persisted).toMatchObject({
      results_path: imported.importedFrom.outputXmlPath,
      results_folder: imported.importedFrom.resultsFolder,
    });
  });

  test('Given a real Robot run folder, when exporting PDF, then screenshot APIs are used', async ({
    page,
    reports,
    request,
  }) => {
    const parseRes = await request.post('/api/terminal/output', {
      data: {
        runId: 'login_tests_screenshots',
        command: 'python -m robot -i login_tests test_projects/login_tests.robot',
        timestamp: '2026-06-25 17:30:57',
      },
    });
    if (!parseRes.ok()) {
      test.skip(true, 'Pasta results/login_tests_screenshots ausente — execute os testes Robot localmente primeiro.');
    }
    const parsed = await parseRes.json();

    const dbRes = await request.get('/api/database');
    expect(dbRes.ok()).toBeTruthy();
    const dbPayload = await dbRes.json();
    const db = dbPayload.data ?? dbPayload;

    const merged = {
      ...db,
      executions: [parsed.execution, ...db.executions.filter((e: { id: string }) => e.id !== parsed.execution.id)],
      test_cases: [
        ...parsed.testCases,
        ...db.test_cases.filter((tc: { execution_id: string }) => tc.execution_id !== parsed.execution.id),
      ],
      steps: [
        ...parsed.steps,
        ...db.steps.filter(
          (st: { test_case_id: string }) =>
            !parsed.testCases.some((tc: { id: string }) => tc.id === st.test_case_id),
        ),
      ],
    };

    const putRes = await request.put('/api/database', { data: merged });
    expect(putRes.ok()).toBeTruthy();

    const screenshotCalls: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/terminal/screenshot')) screenshotCalls.push(req.url());
    });

    await reports.open();
    await expect(reports.viewDetailsButtons.first()).toBeVisible({ timeout: 90_000 });
    await reports.openFirstReportDetail();

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 120_000 }),
      page.getByRole('button', { name: /^PDF$/ }).click(),
    ]);

    const savePath = path.join(test.info().outputDir, 'execution-report.pdf');
    await download.saveAs(savePath);
    const info = await stat(savePath);
    const header = (await readFile(savePath)).subarray(0, 5).toString('utf8');

    expect(header).toBe('%PDF-');
    expect(info.size).toBeGreaterThan(300_000);
    expect(screenshotCalls.length).toBeGreaterThan(5);
  });
});
