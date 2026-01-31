/**
 * Wave V2 Playwright Configuration
 *
 * E2E testing configuration following aerospace safety standards.
 * Supports parallel execution and comprehensive reporting.
 */

import { defineConfig, devices } from "@playwright/test";

/**
 * Read environment variables
 */
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const CI = !!process.env.CI;

export default defineConfig({
  // Test directory
  testDir: "./e2e",

  // Test file pattern
  testMatch: "**/*.e2e.ts",

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: CI,

  // Retry on CI only
  retries: CI ? 2 : 0,

  // Opt out of parallel tests on CI for stability
  workers: CI ? 1 : undefined,

  // Reporter configuration
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report" }],
    ["json", { outputFile: "playwright-report/results.json" }],
    // JUnit for CI integration
    ...(CI ? [["junit", { outputFile: "playwright-report/junit.xml" }] as const] : [])
  ],

  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: BASE_URL,

    // Collect trace when retrying failed tests
    trace: "on-first-retry",

    // Screenshot on failure
    screenshot: "only-on-failure",

    // Video on failure
    video: "on-first-retry",

    // Timeout for each action
    actionTimeout: 10000,

    // Navigation timeout
    navigationTimeout: 30000
  },

  // Configure projects for major browsers
  projects: [
    // Desktop browsers
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] }
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] }
    },

    // Mobile viewports
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] }
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 12"] }
    },

    // Tablet
    {
      name: "tablet",
      use: { ...devices["iPad Pro 11"] }
    }
  ],

  // Global timeout
  timeout: 60000,

  // Expect timeout
  expect: {
    timeout: 10000
  },

  // Run local dev server before starting tests (optional)
  webServer: {
    command: "pnpm dev",
    url: BASE_URL,
    reuseExistingServer: !CI,
    timeout: 120000
  },

  // Output directory for test artifacts
  outputDir: "test-results"
});
