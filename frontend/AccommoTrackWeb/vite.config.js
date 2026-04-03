import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Use root-absolute asset URLs so deep SPA routes don't resolve JS/CSS from nested paths.
  base: '/',

  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    open: false,
  },
  
  preview: {
    host: '0.0.0.0',
    port: 5173,
  },
});