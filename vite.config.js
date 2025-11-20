import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist-renderer',
    assetsDir: 'assets',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    middlewareMode: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
    },
  },
})
