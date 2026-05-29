import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  css: {
    devSourcemap: false,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
    watch: {
      usePolling: true,
      useFsEvents: false,
      interval: 1000,
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/.git/**',
        '**/backend/**',
        '**/database/**',
        '**/docs/**',
        '**/*.md',
        '**/package-lock.json',
      ],
    },
    hmr: {
      overlay: false,
    },
    host: true,
    port: 5173,
    fs: {
      strict: false,
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['leaflet', '@zxing/library', 'react-is'],
  },
});
