import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E configuration
 * Docs: https://playwright.dev/docs/test-configuration
 *
 * The tests target the Vite dev server (client) + Express API (server).
 * In CI, set BASE_URL / API_URL env vars to point at the deployed app.
 */

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:5173'

export default defineConfig({
  testDir: './e2e',

  /** Run tests in files in parallel */
  fullyParallel: true,

  /** Fail the build on CI if test.only is accidentally committed */
  forbidOnly: !!process.env.CI,

  /** Retry on CI to handle transient flakiness */
  retries: process.env.CI ? 2 : 0,

  /** Limit workers on CI to reduce resource contention */
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
  ],

  use: {
    baseURL: BASE_URL,

    /** Collect trace on first retry */
    trace: 'on-first-retry',

    /** Capture screenshot on failure */
    screenshot: 'only-on-failure',

    /** Capture video on first retry */
    video: 'on-first-retry',
  },

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
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  /**
   * Dev server: start Vite + the Express API before running tests.
   * Comment this section out if your app is already running (e.g., in CI).
   */
  // webServer: [
  //   {
  //     command: 'npm run dev --prefix server',
  //     url: 'http://localhost:4000/api/ping',
  //     reuseExistingServer: !process.env.CI,
  //     timeout: 30_000,
  //   },
  //   {
  //     command: 'npm run dev --prefix client',
  //     url: BASE_URL,
  //     reuseExistingServer: !process.env.CI,
  //     timeout: 30_000,
  //   },
  // ],
})
