import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { env } from 'node:process';

const analyzeBundle = env.ANALYZE === 'true';

const resolveVendorChunk = (id) => {
  if (!id.includes('node_modules')) return undefined;
  if (id.includes('react-router-dom') || id.includes('/react/') || id.includes('react-dom')) return 'vendor-react';
  if (id.includes('@tanstack/react-query')) return 'vendor-query';
  if (id.includes('recharts')) return 'vendor-charts';
  if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor-maps';
  if (id.includes('swiper')) return 'vendor-swiper';
  if (id.includes('pusher-js') || id.includes('laravel-echo')) return 'vendor-realtime';
  if (id.includes('lucide-react')) return 'vendor-icons';
  return 'vendor-misc';
};

export default defineConfig({
  plugins: [
    react(),
    analyzeBundle &&
      visualizer({
        filename: 'dist/stats.html',
        template: 'treemap',
        gzipSize: true,
        brotliSize: true,
        open: false,
      }),
  ].filter(Boolean),
  // Use root-absolute asset URLs so deep SPA routes don't resolve JS/CSS from nested paths.
  base: '/',

  build: {
    rollupOptions: {
      output: {
        manualChunks: resolveVendorChunk,
      },
    },
  },

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