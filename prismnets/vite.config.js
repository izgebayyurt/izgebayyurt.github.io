import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // Honour PORT (e.g. preview tooling assigns one); default to Vite's 5173 otherwise.
  server: { open: !process.env.PORT, port: process.env.PORT ? Number(process.env.PORT) : undefined },
  build: { target: 'es2020', outDir: 'dist' },
});
