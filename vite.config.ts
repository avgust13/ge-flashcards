import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt', not 'autoUpdate': a new version must never reload the page in
      // the middle of a study session. `src/pwa.ts` applies it from the home screen.
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Uchikartuli — учи грузинский',
        short_name: 'Uchikartuli',
        description: 'Каркас грузинского по методу Петрова: глагольная матрица, повторения и словарь.',
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
        // Off by default: a service worker in dev serves stale content while authoring.
        enabled: process.env.PWA_DEV === '1',
        type: 'module',
      },
      workbox: {
        // Takes over from the old app's service worker at once (see the file).
        importScripts: ['sw-legacy-migrate.js'],
        // Precache the app shell and the small content JSON (the course and the
        // picture dictionary as text), so everything works offline right after
        // install. Audio clips and pictures are cached as they are used instead
        // (see runtimeCaching), or all at once from Settings.
        globPatterns: ['**/*.{js,css,html,svg,woff2}', 'icon-*.png', 'content/**/*.json'],
        globIgnores: ['audio/**', 'pics/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/audio\//, /^\/pics\//, /^\/content\//, /\.json$/],
        runtimeCaching: [
          {
            urlPattern: /\/audio\/.+\.mp3$/,
            handler: 'CacheFirst',
            options: { cacheName: 'audio-v1', cacheableResponse: { statuses: [200] } },
          },
          {
            // Dictionary pictures are named by word id: a replaced picture needs
            // a new cache name (see src/data/pictures.ts).
            urlPattern: /\/pics\/.+\.webp$/,
            handler: 'CacheFirst',
            options: { cacheName: 'word-pics-v1', cacheableResponse: { statuses: [200] } },
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
});
