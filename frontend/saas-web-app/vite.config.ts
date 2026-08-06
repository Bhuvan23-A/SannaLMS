import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://103.160.144.225:8010',
        changeOrigin: true,
        secure: false
      },
      '/auth': {
        target: 'https://sannalms.sannainnovations.com',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
