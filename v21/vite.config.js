import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  publicDir: 'public',
  build: { outDir: 'dist', assetsDir: 'build', emptyOutDir: true, target: 'es2020' },
});
