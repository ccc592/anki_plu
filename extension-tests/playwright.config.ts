import { defineConfig } from '@playwright/test';
import path from 'node:path';

const EXTENSION_DIST = path.resolve(__dirname, '../extension/dist');

export default defineConfig({
  testDir: path.resolve(__dirname, 'e2e'),
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: {
    headless: false,
    trace: 'on-first-retry',
    launchOptions: {
      args: [
        `--disable-extensions-except=${EXTENSION_DIST}`,
        `--load-extension=${EXTENSION_DIST}`
      ]
    }
  }
});
