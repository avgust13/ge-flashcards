/**
 * Offline copy of the audio clips (the course and the picture dictionary).
 *
 * Clips live in the Cache Storage bucket the service worker also uses for
 * `/audio/*.mp3` (CacheFirst), so what is downloaded here is what the worker
 * serves later — and the player can read it directly even without a worker.
 */
import { allAudioIds, audioUrl } from '../content/store';
import { cachedCount, downloadMissing, offlineSupported, type OfflineStatus } from '../offline';

export const AUDIO_CACHE = 'audio-v1';

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

export function offlineStatus(): Promise<OfflineStatus> {
  return cachedCount(AUDIO_CACHE, allAudioIds().map(audioUrl));
}

/** Download every clip that is not in the cache yet. Safe to call again after a failure. */
export function downloadAllAudio(onProgress: (s: OfflineStatus) => void): Promise<{ failed: number }> {
  return downloadMissing(AUDIO_CACHE, allAudioIds().map(audioUrl), isAudio, onProgress);
}
