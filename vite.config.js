import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: 'client',
  plugins: [react()],
  resolve: { alias: { '@shared': path.resolve(__dirname, 'shared') } },
  server: {
    port: 5173,
    fs: { allow: ['..'] },
    proxy: { '/api': `http://localhost:${process.env.PORT || 3001}` },
  },
  build: { outDir: '../dist', emptyOutDir: true },
});
