// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',  // Changed from '/instabear/' to './' for relative paths
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Ensure assets use relative paths
    rollupOptions: {
      output: {
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          return `assets/${info[0]}.[hash].${ext}`
        },
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: '[name].[hash].js',
      }
    }
  }
})