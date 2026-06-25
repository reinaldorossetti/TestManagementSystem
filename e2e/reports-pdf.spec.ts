import { test, expect } from './fixtures';
import path from 'node:path';
import { readFile, stat } from 'node:fs/promises';

test.describe('Reports PDF export with visual evidence', () => {
  test.setTimeout(180_000);

  test('Given a real Robot run folder, when exporting PDF, then screenshot APIs are used', async ({
    page,
    reports,
    request,
  }) => {
    const parseRes = await request.post('/api/terminal/output', {
      data: {
        runId: 'login_tests_screenshots',
        command: 'python -m robot -i login_tests robot-sample/login_tests.robot',
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
