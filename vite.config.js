import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // Keep console logs for debugging
        drop_debugger: false,
      },
    },
  },
  server: {
    host: true,
  },
  preview: {
    host: true,
  },
  // Vite automatically handles import.meta.env variables
  // No need to manually define them
});
