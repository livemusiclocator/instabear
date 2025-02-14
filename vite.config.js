import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // No need to define environment variables here as they're handled by Vite automatically
  server: {
    host: true, // Needed for GitHub Actions environment
  },
  preview: {
    host: true, // Needed for GitHub Actions environment
  },
  build: {
    // Ensure source maps for better debugging
    sourcemap: true,
  },
});
