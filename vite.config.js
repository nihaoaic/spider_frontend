import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Proxy frontend requests to the backend running on 127.0.0.1:5000 (use IPv4 to avoid ::1 ECONNREFUSED)
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/redis': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      },
      '/hosts': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      },
      '/mongo': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true
      }
    }
  }
})
