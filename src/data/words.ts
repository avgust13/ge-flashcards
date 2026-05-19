import type { Word } from '../types';

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

  const total = Number(response.headers.get('Content-Length')) || 0;
  const reader = response.body?.getReader();

  if (!reader) {
    const data = (await response.json()) as Word[];
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
  WORDS.splice(0, WORDS.length, ...data);
  return WORDS;
}
