import { chromium } from 'playwright';
import { stat } from 'node:fs/promises';
import path from 'node:path';

const base = process.argv[2] || 'http://localhost:3001';
const loginOnly = process.argv.includes('--login-only');

function buildRunFolderName(timestamp) {
  const [datePart, timePart] = timestamp.trim().split(/\s+/);
  const safeDate = (datePart || '1970-01-01').replace(/[^0-9-]/g, '');
  const safeTime = (timePart || '00-00-00').replace(/:/g, '-');
  const suffix = `${Date.now()}`.slice(-5);
  return `RUN-${safeDate}_${safeTime}-${suffix}`;
}

const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
const runFolder = buildRunFolderName(timestamp);
const command = loginOnly
  ? 'python -m robot -i login_tests test_projects/login_tests.robot'
  : 'python -m robot test_projects/';

console.log('Run folder:', runFolder);
console.log('Command:', command);

console.log('1) Executing Robot...');
const runRes = await fetch(`${base}/api/terminal/run`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ command, persist: true, runId: runFolder }),
});
if (!runRes.ok) {
  console.error('Run failed:', runRes.status, await runRes.text());
  process.exit(1);
}
const runText = await runRes.text();
console.log('Run exit snippet:', runText.slice(-200));
if (!runText.includes('[PROCESSO FINALIZADO]')) {
  console.error('Run did not complete');
  process.exit(1);
}

console.log('2) Parsing output.xml...');
const outRes = await fetch(`${base}/api/terminal/output`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ runId: runFolder, command, timestamp }),
});
const parsed = await outRes.json();
if (!outRes.ok) {
  console.error('Parse failed:', parsed);
  process.exit(1);
}
console.log('Parsed:', parsed.execution.id, parsed.testCases.length, 'tests');

console.log('3) Persisting to database...');
const dbRes = await fetch(`${base}/api/database`);
const dbPayload = await dbRes.json();
const db = dbPayload.data ?? dbPayload;
const updated = {
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
  body: JSON.stringify(updated),
});
if (!putRes.ok) {
  console.error('DB put failed:', putRes.status, await putRes.text());
  process.exit(1);
}

const evidence = await fetch(`${base}/api/terminal/evidence?folder=${encodeURIComponent(runFolder)}`).then(
  (r) => r.json(),
);
console.log('Evidence:', evidence.browserScreenshots?.length ?? 0, 'browser shots,', Object.keys(evidence.testReports ?? {}).length, 'log shots');

console.log('4) Exporting PDF via browser...');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ acceptDownloads: true });
const page = await context.newPage();

const screenshotCalls = [];
page.on('request', (req) => {
  if (req.url().includes('/api/terminal/screenshot')) screenshotCalls.push(req.url());
});

await page.goto(`${base}/reports`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Detalhar|View Details/ }).first().click();
const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 120000 }),
  page.getByRole('button', { name: /^PDF$/ }).first().click(),
]);
const savePath = path.join('scripts', `full-flow-${runFolder}.pdf`);
await download.saveAs(savePath);
const info = await stat(savePath);
await browser.close();

console.log('PDF size:', info.size);
console.log('Screenshot calls:', screenshotCalls.length);

if (info.size < 300_000 || screenshotCalls.length < 3) {
  console.error('FAIL: PDF missing images for new run');
  process.exit(1);
}
console.log('PASS: full app flow with images');
