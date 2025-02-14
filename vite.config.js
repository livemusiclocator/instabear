import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      host: true,
    },
    preview: {
      host: true,
    },
    define: {
      __GITHUB_TOKEN__: JSON.stringify(env.VITE_GITHUB_TOKEN),
      __INSTAGRAM_ACCESS_TOKEN__: JSON.stringify(env.VITE_INSTAGRAM_ACCESS_TOKEN),
      __INSTAGRAM_BUSINESS_ACCOUNT_ID__: JSON.stringify(env.VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID),
      __SLACK_WEBHOOK_URL__: JSON.stringify(env.VITE_SLACK_WEBHOOK_URL),
      __INSTAGRAM_USERNAME__: JSON.stringify(env.VITE_INSTAGRAM_USERNAME),
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
