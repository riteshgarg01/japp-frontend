import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  server: {
    // Allow dev access via tunnels like ngrok/Cloudflare
    host: true,           // listen on all addresses
    allowedHosts: true,   // disable host check (or list specific hosts)
    proxy: {
      // Proxy API calls to FastAPI backend running on localhost:8000
      '/products': { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/orders':   { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/ai':       { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/config':   { target: 'http://127.0.0.1:8000', changeOrigin: true },
      '/health':   { target: 'http://127.0.0.1:8000', changeOrigin: true },
    },
  },
})
