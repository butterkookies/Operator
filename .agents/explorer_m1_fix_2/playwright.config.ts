import { defineConfig } from '@playwright/test';

export default defineConfig({
  globalSetup: './setup.ts',
  webServer: {
    command: 'node server.js',
    port: 3000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
