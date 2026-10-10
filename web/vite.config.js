import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Local dev: forward /api to Spring Boot so no CORS is needed
    proxy: { '/api': 'http://localhost:8080' },
  },
})
