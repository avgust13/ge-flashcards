// Imported at the top of sw.js (workbox.importScripts in vite.config.ts).
//
// Until November 2026 the site ran the old flashcard app with an "autoUpdate"
// service worker. Its pages contain no code that could activate a newer
// worker, and this app's worker waits by design (src/pwa.ts applies an update
// from the home screen). Without this file anyone who had opened the old app
// would keep getting it until every tab and the installed app were closed.
//
// The old worker is recognised by its precache, which always holds
// /registerSW.js: the script vite-plugin-pwa injects in "autoUpdate" mode.
// This app registers through virtual:pwa-register and never ships that file
// (if it ever does, every update would take over at once: keep it that way).
// Every page under the old worker is the old app, so no session can be cut
// short: take over at once and reload those pages into the new app.
let replacingLegacy = false;

async function legacyWorkerIsActive() {
  if (!self.registration.active) return false;
  for (const name of await caches.keys()) {
    if (!name.startsWith('workbox-precache')) continue;
    const requests = await (await caches.open(name)).keys();
    if (requests.some((request) => new URL(request.url).pathname === '/registerSW.js')) return true;
  }
  return false;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    legacyWorkerIsActive().then((legacy) => {
      if (!legacy) return undefined;
      replacingLegacy = true;
      return self.skipWaiting();
    }),
  );
});

self.addEventListener('activate', (event) => {
  if (!replacingLegacy) return;
  // Start the reloads without waiting for them: a navigation is held until this
  // worker is activated, so awaiting it here would deadlock the activation.
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((windows) => {
      for (const client of windows) client.navigate(client.url).catch(() => null);
    }),
  );
});
