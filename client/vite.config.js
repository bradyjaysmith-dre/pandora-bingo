import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Service worker only handles static asset caching for installability —
      // it must never intercept API calls or Socket.io, both of which need
      // live network access every time.
      workbox: {
        navigateFallbackDenylist: [/^\/api\//, /^\/auth\//, /^\/socket\.io\//],
        runtimeCaching: [
          { urlPattern: /^\/api\//, handler: 'NetworkOnly' },
          { urlPattern: /^\/auth\//, handler: 'NetworkOnly' },
          { urlPattern: /^\/socket\.io\//, handler: 'NetworkOnly' },
        ],
      },
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'Pandora Bingo',
        short_name: 'Pandora Bingo',
        description: 'Real-time multiplayer music prediction game',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1a1a2e',
        theme_color: '#1a1a2e',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icons/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  base: '/',
  server: {
    host: '0.0.0.0',
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3002',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
