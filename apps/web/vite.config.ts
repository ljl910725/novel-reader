import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));
const packages = path.resolve(root, '../../packages');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@novel-reader/shared': path.resolve(packages, 'shared/src/index.ts'),
      '@novel-reader/file-parser/txt': path.resolve(packages, 'file-parser/src/txt-parser.ts'),
      '@novel-reader/file-parser': path.resolve(packages, 'file-parser/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
});
