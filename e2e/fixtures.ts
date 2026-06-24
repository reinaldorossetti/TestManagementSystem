import { test as base } from '@playwright/test';
import { FeatureWorkspaceShell } from './pages/FeatureWorkspaceShell';
import { FeatureTerminal } from './pages/FeatureTerminal';
import { FeatureSqliteBrowser } from './pages/FeatureSqliteBrowser';
import { FeatureReports } from './pages/FeatureReports';
import { FeatureTms } from './pages/FeatureTms';

interface TmsFixtures {
  shell: FeatureWorkspaceShell;
  terminal: FeatureTerminal;
  sqlite: FeatureSqliteBrowser;
  reports: FeatureReports;
  tms: FeatureTms;
}

export const test = base.extend<TmsFixtures>({
  shell: async ({ page }, use) => {
    await use(new FeatureWorkspaceShell(page));
  },
  terminal: async ({ page }, use) => {
    await use(new FeatureTerminal(page));
  },
  sqlite: async ({ page }, use) => {
    await use(new FeatureSqliteBrowser(page));
  },
  reports: async ({ page }, use) => {
    await use(new FeatureReports(page));
  },
  tms: async ({ page }, use) => {
    await use(new FeatureTms(page));
  },
});

export { expect } from '@playwright/test';
