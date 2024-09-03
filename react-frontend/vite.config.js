import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000', // The target server for the proxy
        changeOrigin: true,  // Needed for virtual hosted sites
        secure: false,  // Set to false if you're working with an API that has an invalid or self-signed SSL certificate
        // rewrite: (path) => path.replace(/^\/api/, ''), // Remove /api from the request URL
      },
    },
  }
})
