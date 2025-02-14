import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Define environment variables globally on window.__ENV__
      'window.__ENV__': JSON.stringify({
        GITHUB_TOKEN: env.VITE_GITHUB_TOKEN || '',
        INSTAGRAM_ACCESS_TOKEN: env.VITE_INSTAGRAM_ACCESS_TOKEN || '',
        INSTAGRAM_BUSINESS_ACCOUNT_ID: env.VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID || '',
        SLACK_WEBHOOK_URL: env.VITE_SLACK_WEBHOOK_URL || '',
        INSTAGRAM_USERNAME: env.VITE_INSTAGRAM_USERNAME || '',
      }),
    },
    server: {
      host: true,
    },
    preview: {
      host: true,
    },
    build: {
      sourcemap: true,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
    },
  };
});
