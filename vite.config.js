import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Needed for GitHub Actions environment
  },
  preview: {
    host: true, // Needed for GitHub Actions environment
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
});
