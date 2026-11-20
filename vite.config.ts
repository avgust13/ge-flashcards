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
        // Precache the app shell and the small course JSON, so the course works
        // offline right after install. The 67 MB word library and the audio
        // clips are cached lazily instead (see runtimeCaching).
        globPatterns: ['**/*.{js,css,html,svg,woff2}', 'icon-*.png', 'categories.json', 'content/**/*.json'],
        globIgnores: ['words.json', 'audio/**'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/audio\//, /^\/content\//, /\.json$/],
        runtimeCaching: [
          {
            urlPattern: /\/audio\/.+\.mp3$/,
            handler: 'CacheFirst',
            options: { cacheName: 'audio-v1', cacheableResponse: { statuses: [200] } },
          },
          {
            urlPattern: /\/words\.json/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'legacy-words-v1',
              cacheableResponse: { statuses: [200] },
              matchOptions: { ignoreSearch: true },
              expiration: { maxEntries: 1 },
            },
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
