import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/gym/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/gym/api': 'http://127.0.0.1:8002',
    },
  },
})
