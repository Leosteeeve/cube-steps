import { defineConfig, devices } from '@playwright/test';
const production = process.env.CUBESTEPS_PRODUCTION === '1';
const port = production ? 4173 : 5173;
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  testMatch: production ? '**/production.spec.ts' : '**/*.spec.ts',
  testIgnore: production ? [] : ['**/production.spec.ts'],
  use: { baseURL: `http://127.0.0.1:${port}/cube-steps/`, trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
  webServer: {
    command: `${npm} run ${production ? 'preview' : 'dev'} -- --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}/cube-steps/`,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
