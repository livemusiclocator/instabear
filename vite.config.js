// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Force all paths to be under /instabear/
  base: 'https://livemusiclocator.github.io/instabear/',
  build: {
    outDir: 'dist',
    assetsDir: '',  // Keep assets in root to maintain paths
    rollupOptions: {
      input: {
        main: './index.html'
      },
      output: {
        // Ensure all assets stay in the root
        entryFileNames: `[name].js`,
        chunkFileNames: `[name].js`,
        assetFileNames: `[name].[ext]`
      }
    }
  }
})