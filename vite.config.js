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
      // Ensure environment variables are properly replaced at build time
      'import.meta.env.VITE_GITHUB_TOKEN': JSON.stringify(env.VITE_GITHUB_TOKEN),
      'import.meta.env.VITE_INSTAGRAM_ACCESS_TOKEN': JSON.stringify(env.VITE_INSTAGRAM_ACCESS_TOKEN),
      'import.meta.env.VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID': JSON.stringify(env.VITE_INSTAGRAM_BUSINESS_ACCOUNT_ID),
      'import.meta.env.VITE_SLACK_WEBHOOK_URL': JSON.stringify(env.VITE_SLACK_WEBHOOK_URL),
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
