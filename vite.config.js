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
  },
})
