import path from 'node:path';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));
const packages = path.resolve(root, '../../packages');

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  resolve: {
    alias: {
      '@novel-reader/shared': path.resolve(packages, 'shared/src/index.ts'),
      '@novel-reader/ui': path.resolve(packages, 'ui/src/index.ts'),
      '@novel-reader/file-parser/txt': path.resolve(packages, 'file-parser/src/txt-parser.ts'),
      '@novel-reader/file-parser': path.resolve(packages, 'file-parser/src/index.ts'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: false,
    proxy: { '/api': 'http://localhost:3001' },
  },
  envPrefix: ['VITE_', 'TAURI_'],
});
