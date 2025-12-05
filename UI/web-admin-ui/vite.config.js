import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// IP
const HOST_IP = '10.221.1.156';

export default defineConfig({
  plugins: [react()],

  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    open: false,
    proxy: {
      '/api': {
        target: `http://${HOST_IP}:8000`,
        changeOrigin: true,
        secure: false,
      },
    },
  },

  preview: {
    host: '0.0.0.0',
    port: 5174,
  },
});