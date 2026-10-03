import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const coreDir = fileURLToPath(new URL('../core', import.meta.url));

export default defineConfig({
  // Relative asset URLs let one build serve from the site root and from PR preview subfolders.
  base: './',
  plugins: [react()],
  resolve: { alias: { '@core': coreDir } },
  server: { fs: { allow: ['..'] } },
  test: { include: ['src/**/*.test.js'], environment: 'node' },
});
