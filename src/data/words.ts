import type { Word } from '../types';
import { LEVELS } from './levels';

export const WORDS: Word[] = [];

export interface LoadProgress {
  loaded: number;
  total: number;
}

export async function loadWords(
  onProgress?: (p: LoadProgress) => void,
  signal?: AbortSignal,
  forceRedownload = false,
): Promise<Word[]> {
  const baseUrl = `${import.meta.env.BASE_URL}words.json`;
  const url = forceRedownload
    ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}_ts=${Date.now()}`
    : baseUrl;

  const response = await fetch(url, {
    signal,
    cache: forceRedownload ? 'no-store' : 'default',
  });
  if (!response.ok) throw new Error(`Failed to load words.json: ${response.status}`);

  // If the server serves the file with Gzip/Brotli compression, the Content-Length header 
  // is removed by the browser. In this case, use the approximate size of the uncompressed JSON (~63.7 MB).
  const APPROX_TOTAL = 66849908;
  const total = Number(response.headers.get('Content-Length')) || APPROX_TOTAL;
  const reader = response.body?.getReader();

  if (!reader) {
    const data = (await response.json()) as Word[];
    backfillLevels(data);
    WORDS.splice(0, WORDS.length, ...data);
    onProgress?.({ loaded: total || 1, total: total || 1 });
    return WORDS;
  }

  const chunks: Uint8Array[] = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress?.({ loaded, total });
  }

  const buf = new Uint8Array(loaded);
  let offset = 0;
  for (const c of chunks) {
    buf.set(c, offset);
    offset += c.length;
  }
  const data = JSON.parse(new TextDecoder().decode(buf)) as Word[];
  backfillLevels(data);
  WORDS.splice(0, WORDS.length, ...data);
  return WORDS;
}

function backfillLevels(data: Word[]): void {
  for (let i = 0; i < data.length; i++) {
    const w = data[i];
    if (w.level == null) {
      const found = LEVELS.find((l) => i >= l.range[0] && i < l.range[1]);
      w.level = found ? found.id : LEVELS.length - 1;
    }
    w.correct = sanitizeCorrect(w.correct);
    w.seen = sanitizeSeen(w.seen);
  }
}

function sanitizeCorrect(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function sanitizeSeen(v: unknown): number {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return 0;
  return v;
}
