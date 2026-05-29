import { defineConfig, devices } from '@playwright/test';
import { getE2EConfig, loadE2EEnv } from './tests/e2e/support/env';

loadE2EEnv();

const e2e = getE2EConfig();

export default defineConfig({
  testDir: './tests/e2e/specs',
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/e2e-results.json' }],
  ],
  use: {
    baseURL: e2e.baseURL,
    ignoreHTTPSErrors: e2e.ignoreHTTPSErrors,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 25_000,
    locale: 'fr-FR',
    timezoneId: 'Europe/Paris',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
