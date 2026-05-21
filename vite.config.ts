import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Uchikartuli — учи грузинский',
        short_name: 'Uchikartuli',
        description: 'Учи грузинский: карточки слов и алфавит мхедрули.',
        theme_color: '#FF6B47',
        background_color: '#FFF8EE',
        display: 'standalone',
        orientation: 'portrait',
        lang: 'ru',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 100 * 1024 * 1024, // 100 MiB
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
});
