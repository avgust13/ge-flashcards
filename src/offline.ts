/**
 * Offline copies of media files: the course audio and the dictionary pictures.
 *
 * Files are kept in the Cache Storage buckets the service worker also uses for
 * them (CacheFirst), so what is downloaded here is what the worker serves
 * later — and the app can read it directly even without a worker.
 */

export function offlineSupported(): boolean {
  return typeof caches !== 'undefined';
}

export interface OfflineStatus {
  cached: number;
  total: number;
}

const pathOf = (url: string): string => new URL(url, location.href).pathname;

async function missing(cacheName: string, urls: string[]): Promise<string[]> {
  const cache = await caches.open(cacheName);
  const have = new Set((await cache.keys()).map((r) => new URL(r.url).pathname));
  return urls.filter((u) => !have.has(pathOf(u)));
}

/** How many of these files are already in the bucket. */
export async function cachedCount(cacheName: string, urls: string[]): Promise<OfflineStatus> {
  if (!offlineSupported()) return { cached: 0, total: urls.length };
  return { cached: urls.length - (await missing(cacheName, urls)).length, total: urls.length };
}

/**
 * Download every file that is not in the bucket yet. Safe to call again after
 * a failure. `accept` keeps anything else out — a server's fallback page must
 * never be stored as a clip or a picture.
 */
export async function downloadMissing(
  cacheName: string,
  urls: string[],
  accept: (res: Response) => boolean,
  onProgress: (s: OfflineStatus) => void,
): Promise<{ failed: number }> {
  const cache = await caches.open(cacheName);
  const todo = await missing(cacheName, urls);
  let done = urls.length - todo.length;
  let failed = 0;
  let next = 0;
  onProgress({ cached: done, total: urls.length });
  const worker = async (): Promise<void> => {
    while (next < todo.length) {
      const url = todo[next++];
      try {
        const res = await fetch(url);
        if (!accept(res)) throw new Error('unexpected response');
        await cache.put(url, res);
        done++;
      } catch {
        failed++;
      }
      onProgress({ cached: done, total: urls.length });
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
