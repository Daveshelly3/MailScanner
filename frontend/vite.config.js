import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': { target: 'http://localhost:3001', changeOrigin: true, credentials: true },
      '/scan': { target: 'http://localhost:3001', changeOrigin: true, credentials: true },
      '/actions': { target: 'http://localhost:3001', changeOrigin: true, credentials: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
