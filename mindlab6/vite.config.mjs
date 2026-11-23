import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const entry = mode => fileURLToPath(new URL(mode === 'lab' ? './lab.html' : './index.html', import.meta.url));

export default defineConfig(({ mode }) => ({
  base: './', // Serve from a subdirectory without a hard-coded origin.
  build: {
    outDir: mode === 'lab' ? 'dist-lab' : 'dist',
    emptyOutDir: true,
    target: 'es2022',
    cssCodeSplit: true,
    rollupOptions: { input: entry(mode) },
  },
}));
