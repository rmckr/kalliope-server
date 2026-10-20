import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'src',

  plugins: [react()],

  server: {
    host: '127.0.0.1',
    port: 80,
    strictPort: true,

    proxy: {
      '/login': { target: 'http://localhost:8080' },

      '/logout': { target: 'http://localhost:8080' },

      '/auth': { target: 'http://localhost:8080' },

      '/api': { target: 'http://localhost:8080' },

      '/dev': {
        target: 'ws://localhost:8080',
        ws: true,
        rewrite: (path) => path.replace(/^\/dev/, '')
      }
    }
  },

  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: true
  }
})
