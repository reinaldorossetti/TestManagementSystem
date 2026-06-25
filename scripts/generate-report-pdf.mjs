import { chromium } from 'playwright';
import { stat, copyFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const base = process.argv[2] || 'http://localhost:3001';
const runFolder = process.argv[3] || 'RUN-2026-06-25_21-29-52-92370';
const outPdf = path.resolve('results', 'Relatorio_Execucao_com_evidencias.pdf');

console.log('Base URL:', base);
console.log('Run folder:', runFolder);

const parseRes = await fetch(`${base}/api/terminal/output`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    runId: runFolder,
    command: 'python -m robot -i login_tests robot-sample/login_tests.robot',
    timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '),
  }),
});
const parsed = await parseRes.json();
if (!parseRes.ok) {
  console.error('Parse falhou:', parsed);
  process.exit(1);
}
console.log('Execução:', parsed.execution.id, `(${parsed.testCases.length} testes)`);

const dbRes = await fetch(`${base}/api/database`);
const dbPayload = await dbRes.json();
const db = dbPayload.data ?? dbPayload;

const merged = {
  ...db,
  executions: [parsed.execution, ...db.executions.filter((e) => e.id !== parsed.execution.id)],
  test_cases: [
    ...parsed.testCases,
    ...db.test_cases.filter((tc) => tc.execution_id !== parsed.execution.id),
  ],
  steps: [
    ...parsed.steps,
    ...db.steps.filter((st) => !parsed.testCases.some((tc) => tc.id === st.test_case_id)),
  ],
};

const putRes = await fetch(`${base}/api/database`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(merged),
});
if (!putRes.ok) {
  console.error('Persistência falhou:', putRes.status, await putRes.text());
  process.exit(1);
}
console.log('Banco atualizado.');

const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ acceptDownloads: true })).newPage();

let screenshotCalls = 0;
page.on('request', (req) => {
  if (req.url().includes('/api/terminal/screenshot')) screenshotCalls++;
});

await page.goto(`${base}/reports`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Detalhar|View Details/ }).first().click({ timeout: 60_000 });

const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 120_000 }),
  page.getByRole('button', { name: /^PDF$/ }).first().click(),
]);

await mkdir(path.dirname(outPdf), { recursive: true });
const tmpPath = path.join('scripts', '_last-export.pdf');
await download.saveAs(tmpPath);
await copyFile(tmpPath, outPdf);
await browser.close();

const info = await stat(outPdf);
console.log('\n✓ PDF gerado:', outPdf);
console.log('  Tamanho:', (info.size / 1024 / 1024).toFixed(2), 'MB');
console.log('  Screenshots carregados:', screenshotCalls);

if (info.size < 300_000 || screenshotCalls < 3) {
  process.exit(1);
}
