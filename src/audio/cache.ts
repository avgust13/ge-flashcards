/**
 * Offline copy of the course audio.
 *
 * Clips live in the Cache Storage bucket the service worker also uses for
 * `/audio/*.mp3` (CacheFirst), so what is downloaded here is what the worker
 * serves later — and the player can read it directly even without a worker.
 */
import { allAudioIds, audioUrl } from '../content/store';

export const AUDIO_CACHE = 'audio-v1';

export function offlineSupported(): boolean {
  return typeof caches !== 'undefined';
}

function isAudio(res: Response): boolean {
  return res.ok && (res.headers.get('Content-Type') ?? '').startsWith('audio/');
}

/**
 * A clip from the offline cache, or from the network (and then kept).
 * Null when it cannot be had — a missing file must never be cached as audio.
 */
export async function getClip(id: string): Promise<Response | null> {
  const url = audioUrl(id);
  try {
    const cache = offlineSupported() ? await caches.open(AUDIO_CACHE) : null;
    const hit = await cache?.match(url);
    if (hit) return hit;
    const res = await fetch(url);
    if (!isAudio(res)) return null;
    void cache?.put(url, res.clone()).catch(() => undefined);
    return res;
  } catch {
    return null;
  }
}

export interface OfflineStatus {
  cached: number;
  total: number;
}

export async function offlineStatus(): Promise<OfflineStatus> {
  const ids = allAudioIds();
  if (!offlineSupported()) return { cached: 0, total: ids.length };
  const cache = await caches.open(AUDIO_CACHE);
  const have = new Set((await cache.keys()).map((r) => new URL(r.url).pathname));
  const cached = ids.filter((id) => have.has(new URL(audioUrl(id), location.href).pathname)).length;
  return { cached, total: ids.length };
}

/** Download every clip that is not in the cache yet. Safe to call again after a failure. */
export async function downloadAllAudio(
  onProgress: (s: OfflineStatus) => void,
): Promise<{ failed: number }> {
  const ids = allAudioIds();
  const cache = await caches.open(AUDIO_CACHE);
  const have = new Set((await cache.keys()).map((r) => new URL(r.url).pathname));
  const todo = ids.filter((id) => !have.has(new URL(audioUrl(id), location.href).pathname));
  let done = ids.length - todo.length;
  let failed = 0;
  let next = 0;
  onProgress({ cached: done, total: ids.length });
  const worker = async (): Promise<void> => {
    while (next < todo.length) {
      const url = audioUrl(todo[next++]);
      try {
        const res = await fetch(url);
        if (!isAudio(res)) throw new Error('not audio');
        await cache.put(url, res);
        done++;
      } catch {
        failed++;
      }
      onProgress({ cached: done, total: ids.length });
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  return { failed };
}

/** Space used by this site, in bytes, when the browser can tell. */
export async function storageUsed(): Promise<number | null> {
  try {
    const est = await navigator.storage?.estimate?.();
    return est?.usage ?? null;
  } catch {
    return null;
  }
}
