import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

const certDir = path.resolve(__dirname, '../certs')
const cert = fs.existsSync(path.join(certDir, '192.168.0.100+2.pem'))
  ? {
      key: fs.readFileSync(path.join(certDir, '192.168.0.100+2-key.pem')),
      cert: fs.readFileSync(path.join(certDir, '192.168.0.100+2.pem')),
    }
  : undefined

export default defineConfig({
  plugins: [react()],
  base: '/voicecall-pwa/',
  server: {
    host: true,
    port: 5173,
    https: cert,
    proxy: {
      '/ws': {
        target: 'ws://localhost:8080',
        ws: true,
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})