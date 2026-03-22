import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e/browser',
  globalSetup: './tests/e2e/browser/global-setup.ts',
  globalTeardown: './tests/e2e/browser/global-teardown.ts',
  timeout: 30000,
  retries: 0,
  use: {
    headless: true,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
})
