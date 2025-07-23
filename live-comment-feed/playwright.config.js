const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './',
  timeout: 45000, // Increased for NunDB connection time
  expect: {
    timeout: 10000, // Increased for real-time features
  },
  fullyParallel: false, // Sequential for real-time testing
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1, // Single worker for real-time sync testing
  reporter: 'html',
  webServer: {
    command: 'python3 -m http.server 8081',
    port: 8081,
    reuseExistingServer: !process.env.CI,
    timeout: 30000
  },
  use: {
    baseURL: 'http://localhost:8081',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    }/*,
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },*/
  ],
});
