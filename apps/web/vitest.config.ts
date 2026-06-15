import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const root = path.dirname(fileURLToPath(import.meta.url));
const packages = path.resolve(root, '../../packages');

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    exclude: ['e2e/**'],
    environment: 'jsdom',
  },
  resolve: {
    alias: {
      '@novel-reader/shared': path.resolve(packages, 'shared/src/index.ts'),
      '@novel-reader/file-parser/txt': path.resolve(packages, 'file-parser/src/txt-parser.ts'),
      '@novel-reader/file-parser': path.resolve(packages, 'file-parser/src/index.ts'),
    },
  },
});
