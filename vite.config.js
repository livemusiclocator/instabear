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
  define: {
    // Make environment variables available at runtime
    '__ENV__': {
      VITE_GITHUB_TOKEN: JSON.stringify(process.env.VITE_GITHUB_TOKEN),
      VITE_INSTAGRAM_ACCESS_TOKEN: JSON.stringify(process.env.VITE_INSTAGRAM_ACCESS_TOKEN),
      VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID: JSON.stringify(process.env.VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID),
      VITE_SLACK_WEBHOOK_URL: JSON.stringify(process.env.VITE_SLACK_WEBHOOK_URL),
      VITE_INSTAGRAM_USERNAME: JSON.stringify(process.env.VITE_INSTAGRAM_USERNAME),
    }
  }
});
