import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      '@extension': path.resolve(__dirname, '../extension/src'),
      '@tests/shared': path.resolve(__dirname, 'shared')
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [path.resolve(__dirname, 'shared/test-setup.ts')]
  }
});
