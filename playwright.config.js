// @ts-check
import { defineConfig, devices } from '@playwright/test';
import { loadEnvConfig } from '@next/env';
import { isDiscoveryPreviewUrl } from './scripts/discovery-preview-safety.mjs';
import { assertE2eSafety } from './scripts/e2e-safety.mjs';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
loadEnvConfig(process.cwd(), true);
assertE2eSafety();

const localBaseURL = 'http://127.0.0.1:3000';
const baseURL = String(process.env.ITHUB_E2E_BASE_URL || localBaseURL).trim().replace(/\/$/, '');
const usesLocalServer = baseURL === localBaseURL;
if (!usesLocalServer && !isDiscoveryPreviewUrl(baseURL)) {
  throw new Error('Remote E2E is limited to an immutable ITHub Preview deployment URL');
}

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  // Remote Server Actions include network and cold-start latency; keep local
  // feedback fast while allowing Preview assertions to observe their result.
  expect: { timeout: usesLocalServer ? 5_000 : 30_000 },
  // Node's unit-test runner owns these files; Playwright must not import them.
  testIgnore: ['**/unit/**'],
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('')`. */
    baseURL,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: usesLocalServer ? {
    command: 'npm start',
    url: localBaseURL,
    // Reusing an arbitrary local server could point guarded tests at a
    // different database than the verified _e2e environment.
    reuseExistingServer: false,
    timeout: 120_000,
  } : undefined,
});
