import { chromium } from 'playwright';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

const base = process.argv[2] || 'http://localhost:3001';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ acceptDownloads: true });
const page = await context.newPage();

const screenshotCalls = [];
page.on('request', (req) => {
  if (req.url().includes('/api/terminal/screenshot')) {
    screenshotCalls.push(req.url());
  }
});

await page.goto(`${base}/reports`, { waitUntil: 'networkidle' });

const detailBtn = page.getByRole('button', { name: /Detalhar|View Details/ }).first();
await detailBtn.waitFor({ state: 'visible', timeout: 15000 });
await detailBtn.click();

const pdfBtn = page.getByRole('button', { name: /^PDF$/ }).first();
await pdfBtn.waitFor({ state: 'visible' });

const [download] = await Promise.all([
  page.waitForEvent('download', { timeout: 60000 }),
  pdfBtn.click(),
]);

const savePath = path.join('scripts', 'browser-export-test.pdf');
await download.saveAs(savePath);
const info = await stat(savePath);

console.log('PDF size:', info.size, 'bytes');
console.log('Screenshot API calls:', screenshotCalls.length);
screenshotCalls.slice(0, 5).forEach((u) => console.log(' ', u));

const evidenceCheck = await page.evaluate(async () => {
  const dbRes = await fetch('/api/database');
  const dbPayload = await dbRes.json();
  const db = dbPayload.data ?? dbPayload;
  const ex = db.executions[0];
  if (!ex) return { error: 'no execution' };
  const normalized = ex.results_path.replace(/\\/g, '/');
  const match = normalized.match(/(?:^|\/)results\/([^/]+)(?:\/|$)/i);
  const folder = match?.[1] || ex.id;
  const evRes = await fetch(`/api/terminal/evidence?folder=${encodeURIComponent(folder)}`);
  const evidence = await evRes.json();
  const shotRes = await fetch(
    `/api/terminal/screenshot?folder=${encodeURIComponent(folder)}&path=${encodeURIComponent(evidence.browserScreenshots?.[0] || '')}`,
  );
  return {
    folder,
    browserShots: evidence.browserScreenshots?.length ?? 0,
    firstShotStatus: shotRes.status,
    firstShotType: shotRes.headers.get('content-type'),
  };
});
console.log('Evidence check:', evidenceCheck);

await browser.close();

if (info.size < 500_000) {
  console.error('FAIL: PDF too small — images likely missing');
  process.exit(1);
}
if (screenshotCalls.length < 3) {
  console.error('FAIL: too few screenshot API calls during export');
  process.exit(1);
}
console.log('PASS: PDF export loaded screenshots');
