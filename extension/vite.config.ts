import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.config';

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  build: {
    outDir: 'dist',
    sourcemap: true,
    emptyOutDir: true
  },
  resolve: {
    alias: {
      '@background': '/src/background',
      '@content': '/src/content',
      '@overlay': '/src/overlay',
      '@options': '/src/options',
      '@messaging': '/src/messaging',
      '@shared': '/src/shared'
    }
  }
});
