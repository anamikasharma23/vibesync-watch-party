import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  root: 'client',
  plugins: [react()],
  build: { outDir: '../dist', emptyOutDir: true, target: 'es2020' },
  server: {
    host: true,
    fs: { allow: [path.resolve('.')] },
    proxy: { '/api': 'http://localhost:3000', '/ws': { target: 'ws://localhost:3000', ws: true } },
  },
});
