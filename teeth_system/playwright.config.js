const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:8081',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'http-server -c-1 -p 8081',
    port: 8081,
    reuseExistingServer: true,
  },
});
