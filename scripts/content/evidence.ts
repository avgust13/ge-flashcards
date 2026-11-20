/**
 * Independent evidence for Georgian word forms, shared by the verb and the
 * lexicon checks: Wiktionary inflection tables and a corpus frequency list.
 * Both are cached under node_modules/.cache, so a second run is offline.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const WIKT_CACHE = join(ROOT, 'node_modules/.cache/verify-verbs');
const FREQ_FILE = join(ROOT, 'node_modules/.cache/freq-ka/freq363.txt');
/** 363k word forms with counts, built from Georgian web text (github.com/irakli97/Frequency_Dictionary_GE_363_202). */
const FREQ_URL =
  'https://raw.githubusercontent.com/irakli97/Frequency_Dictionary_GE_363_202/master/Frequency_Dictionary_GE_363_202.txt';

const GEORGIAN = /[ა-ჿ]+/g;
const UA = 'content-verifier/1.0 (word form check)';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Rendered HTML of a Wiktionary page, or null when the page does not exist.
 * A throttled or failed request is retried and finally thrown — it must never
 * be mistaken for "no such page", which would silently unverify a whole word.
 */
async function fetchPage(title: string): Promise<string | null> {
  const url =
    'https://en.wiktionary.org/w/api.php?action=parse&prop=text&format=json&formatversion=2&redirects=1&maxlag=5&page=' +
    encodeURIComponent(title);
  let lastError = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    await sleep(attempt === 0 ? 1500 : 4000 * 2 ** (attempt - 1));
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const body = await res.text();
    let data: { parse?: { text?: string }; error?: { code?: string } };
    try {
      data = JSON.parse(body);
    } catch {
      lastError = `HTTP ${res.status}: ${body.slice(0, 80)}`;
      continue;
    }
    if (data.parse?.text) return data.parse.text;
    if (data.error?.code === 'missingtitle') return null;
    lastError = `API error ${data.error?.code ?? res.status}`;
  }
  throw new Error(`Wiktionary request for "${title}" failed: ${lastError}`);
}

const MISSING = '<!-- no such page -->';

export interface WiktPage {
  /** Georgian words inside the page's tables (conjugation / declension). */
  words: Set<string>;
  /** The page has a Georgian entry (not only Mingrelian, Laz or Svan). */
  georgian: boolean;
}

/** What a Wiktionary page says about a word; null when the page does not exist. */
export async function wiktionaryPage(title: string): Promise<WiktPage | null> {
  mkdirSync(WIKT_CACHE, { recursive: true });
  const file = join(WIKT_CACHE, `${encodeURIComponent(title)}.html`);
  let html: string;
  if (existsSync(file)) {
    html = readFileSync(file, 'utf8');
  } else {
    html = (await fetchPage(title)) ?? MISSING;
    writeFileSync(file, html);
  }
  if (html === MISSING) return null;
  const words = new Set<string>();
  for (const table of html.match(/<table[\s\S]*?<\/table>/g) ?? []) {
    const text = table.replace(/<[^>]+>/g, ' ');
    for (const w of text.match(GEORGIAN) ?? []) words.add(w);
  }
  return { words, georgian: /id="Georgian"/.test(html) };
}

/**
 * Georgian words found inside tables of the rendered Wiktionary page — its
 * conjugation or declension tables. Null when the page does not exist.
 */
export async function wiktionaryWords(title: string): Promise<Set<string> | null> {
  return (await wiktionaryPage(title))?.words ?? null;
}

/** The corpus list as form → count. Downloaded once; null only when it cannot be had. */
export async function loadFreq(path?: string): Promise<Map<string, number> | null> {
  let file = path ?? FREQ_FILE;
  if (!existsSync(file)) {
    if (path) return null;
    try {
      const res = await fetch(FREQ_URL, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      mkdirSync(dirname(FREQ_FILE), { recursive: true });
      writeFileSync(FREQ_FILE, await res.text());
      file = FREQ_FILE;
    } catch (e) {
      console.warn(`! corpus list unavailable: ${(e as Error).message}`);
      return null;
    }
  }
  const map = new Map<string, number>();
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const [w, n] = line.trim().split(/\s+/);
    if (w) map.set(w, Number(n) || 1);
  }
  return map;
}
