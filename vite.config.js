import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Define process.env globally
      'process.env': {
        VITE_GITHUB_TOKEN: JSON.stringify(env.VITE_GITHUB_TOKEN),
        VITE_INSTAGRAM_ACCESS_TOKEN: JSON.stringify(env.VITE_INSTAGRAM_ACCESS_TOKEN),
        VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID: JSON.stringify(env.VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID),
        VITE_SLACK_WEBHOOK_URL: JSON.stringify(env.VITE_SLACK_WEBHOOK_URL),
        VITE_INSTAGRAM_USERNAME: JSON.stringify(env.VITE_INSTAGRAM_USERNAME),
      },
    },
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
  };
});
