import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration.
 *
 * Tests run against a PRODUCTION build (`next build` + `next start`) on purpose:
 * Next.js 16 dev mode (Turbopack HMR) intermittently desyncs the React Client
 * Manifest (vercel/next.js#85883), which is a dev-only bundler bug — not an app
 * bug. The production server has no HMR and renders every panel reliably, giving
 * us a stable, deterministic target for component-level UI coverage.
 */
const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  // The app is backed by a single SQLite file served by one `next start` process,
  // so there is no per-test backend isolation. Running serially keeps the shared
  // server/DB responsive and the suite deterministic (heavy parallelism starved
  // the single Node process and left the client app unmounted).
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run build && npm run start',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
