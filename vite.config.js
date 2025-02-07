// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Define whether we're in GitHub Pages environment
const isGitHubPages = process.env.GITHUB_PAGES === 'true'

export default defineConfig({
  plugins: [react()],
  base: isGitHubPages ? '/instabear/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          return `assets/${info[0]}.[hash].${ext}`
        },
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: '[name].[hash].js'
      }
    }
  }
})