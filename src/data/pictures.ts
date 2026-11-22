/**
 * Offline copy of the dictionary pictures. They are fetched one by one as
 * cards show them and kept by the service worker; "download all" in Settings
 * fills the same bucket ahead of time.
 */
import { cachedCount, downloadMissing, type OfflineStatus } from '../offline';
import { loadWords } from './words';

/**
 * The bucket of the service worker's CacheFirst rule for `/pics/` (vite.config.ts).
 * A picture file is named by its word id, so a REPLACED picture keeps its URL:
 * bump this name (here and in vite.config.ts) to make devices fetch it again.
 */
export const PICS_CACHE = 'word-pics-v1';

function isImage(res: Response): boolean {
  return res.ok && (res.headers.get('Content-Type') ?? '').startsWith('image/');
}

async function pictureUrls(): Promise<string[]> {
  return (await loadWords()).flatMap((w) => (w.image ? [w.image] : []));
}

export async function picturesStatus(): Promise<OfflineStatus> {
  return cachedCount(PICS_CACHE, await pictureUrls());
}

/** Download every picture that is not in the cache yet. Safe to call again after a failure. */
export async function downloadAllPictures(onProgress: (s: OfflineStatus) => void): Promise<{ failed: number }> {
  return downloadMissing(PICS_CACHE, await pictureUrls(), isImage, onProgress);
}
