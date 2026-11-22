/**
 * One shared <audio> element for the whole app.
 *
 * Clips are fetched as blobs (a plain 200 response the service worker can
 * cache) and played from object URLs. Reusing a single element that was
 * started inside a user gesture keeps later programmatic plays allowed.
 */
import { getClip } from './cache';

let el: HTMLAudioElement | null = null;
const blobUrls = new Map<string, string>();
const MAX_BLOBS = 60;
let token = 0;

function element(): HTMLAudioElement {
  if (!el) {
    el = new Audio();
    el.preload = 'auto';
  }
  return el;
}

/** Call from a tap handler before a session: unlocks programmatic playback. */
export function unlockAudio(): void {
  const a = element();
  if (a.src) return;
  // 44-byte silent WAV
  a.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
  void a.play().catch(() => undefined);
}

async function blobUrl(id: string): Promise<string | null> {
  const cached = blobUrls.get(id);
  if (cached) return cached;
  try {
    // Offline cache first, then the network; never anything that is not audio.
    const res = await getClip(id);
    if (!res) return null;
    const url = URL.createObjectURL(await res.blob());
    blobUrls.set(id, url);
    if (blobUrls.size > MAX_BLOBS) {
      const [oldId, oldUrl] = blobUrls.entries().next().value as [string, string];
      blobUrls.delete(oldId);
      URL.revokeObjectURL(oldUrl);
    }
    return url;
  } catch {
    return null;
  }
}

/** Play a generated clip by id. Resolves false when it is unavailable (offline and not cached). */
export async function playClip(id: string | null | undefined): Promise<boolean> {
  if (!id) return false;
  const mine = ++token;
  const url = await blobUrl(id);
  // A newer request started while this one was loading: let the newer one win.
  if (!url || mine !== token) return false;
  const a = element();
  a.pause();
  a.src = url;
  try {
    await a.play();
    return true;
  } catch {
    return false;
  }
}

export function stopAudio(): void {
  ++token;
  el?.pause();
}

/** Warm the cache for clips a session is about to use. Failures are ignored. */
export function prefetchClips(ids: Array<string | null | undefined>): void {
  for (const id of new Set(ids)) {
    if (id && !blobUrls.has(id)) void getClip(id);
  }
}
