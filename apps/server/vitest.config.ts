import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    exclude: ['**/api.integration.test.ts', '**/node_modules/**', '**/dist/**'],
  },
});
