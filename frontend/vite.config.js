import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: ['demo3.inetmxli.com', '66.179.243.135'],

    hmr: {
    host: 'demo3.inetmxli.com',  // Tu dominio
    protocol: 'wss',              // Usa 'ws' (o 'wss' si ya tienes certificado SSL/candadito)
    clientPort: 443,              // Usa 80 para http (o 443 si usas https)
  },

    watch: {
       usePolling: true,
  }, 
 },
})
