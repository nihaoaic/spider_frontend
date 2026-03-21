import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const BACKEND = 'http://127.0.0.1:5001'

const proxyTarget = { target: BACKEND, changeOrigin: true }

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/auth':    proxyTarget,
      '/redis':   proxyTarget,
      '/hosts':   proxyTarget,
      '/mongo':   proxyTarget,
      '/tasks':   proxyTarget,
      '/scrapyd': proxyTarget,
      '/socket.io': { ...proxyTarget, ws: true },
    }
  }
})
