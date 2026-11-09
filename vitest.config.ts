import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './src',
  testMatch: [
    'server/services/testRunScorecard.test.ts',
    'server/validation/testRunSchemas.test.ts',
    'components/testRuns/TestRunsComponents.test.tsx',
  ],
  fullyParallel: true,
  reporter: [['list']],
});
