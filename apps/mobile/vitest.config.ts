import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    exclude: ['**/api.integration.test.ts', '**/node_modules/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@novel-reader/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});
