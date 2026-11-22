/**
 * Independent evidence for Georgian word forms, shared by the verb, the
 * lexicon and the dictionary checks: Wiktionary (inflection tables of a
 * rendered page, or the plain entry of many words at once) and a corpus
 * frequency list. All of it is cached under node_modules/.cache, so a second
 * run is offline.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const WIKT_CACHE = join(ROOT, 'node_modules/.cache/verify-verbs');
const TEXT_CACHE = join(ROOT, 'node_modules/.cache/wikt-text');
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

const NO_PAGE = '<no such page>';
/** Titles per request: the API allows 50 for an anonymous client. */
const BATCH = 40;

/** Wikitext of several pages in one request; null for a page that does not exist. */
async function fetchWikitext(titles: string[]): Promise<Map<string, string | null>> {
  const body = new URLSearchParams({
    action: 'query',
    prop: 'revisions',
    rvprop: 'content',
    rvslots: 'main',
    format: 'json',
    formatversion: '2',
    redirects: '1',
    maxlag: '5',
    titles: titles.join('|'),
  });
  let lastError = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    await sleep(attempt === 0 ? 1000 : 4000 * 2 ** (attempt - 1));
    // POST: forty Georgian titles are several kilobytes once percent-encoded.
    const res = await fetch('https://en.wiktionary.org/w/api.php', {
      method: 'POST',
      headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const text = await res.text();
    let data: {
      query?: {
        pages?: Array<{ title: string; missing?: boolean; revisions?: Array<{ slots?: { main?: { content?: string } } }> }>;
        normalized?: Array<{ from: string; to: string }>;
        redirects?: Array<{ from: string; to: string }>;
      };
      error?: { code?: string };
    };
    try {
      data = JSON.parse(text);
    } catch {
      lastError = `HTTP ${res.status}: ${text.slice(0, 80)}`;
      continue;
    }
    if (!data.query?.pages) {
      lastError = `API error ${data.error?.code ?? res.status}`;
      continue;
    }
    const pages = new Map(data.query.pages.map((p) => [p.title, p]));
    const alias = new Map<string, string>();
    for (const { from, to } of [...(data.query.normalized ?? []), ...(data.query.redirects ?? [])]) alias.set(from, to);
    const out = new Map<string, string | null>();
    for (const t of titles) {
      let title = t;
      for (let hop = 0; hop < 3 && alias.has(title); hop++) title = alias.get(title) as string;
      const page = pages.get(title);
      // A title the answer does not mention at all is a failed request, not a missing page.
      if (!page) throw new Error(`Wiktionary did not answer for "${t}"`);
      out.set(t, page.missing ? null : (page.revisions?.[0]?.slots?.main?.content ?? null));
    }
    return out;
  }
  throw new Error(`Wiktionary request for ${titles.length} titles failed: ${lastError}`);
}

/** What a template stands for in a definition line, roughly: enough for a human reader. */
function templateText(inner: string): string {
  const [rawName, ...args] = inner.split('|');
  const name = rawName.trim();
  const pos = args.map((a) => a.trim()).filter((a) => !/^[A-Za-z0-9_]+=/.test(a));
  if (['lb', 'lbl', 'label', 'tlb'].includes(name)) return `(${pos.slice(1).filter((a) => !['_', 'and', 'or'].includes(a)).join(', ')})`;
  if (['l', 'm', 'link', 'mention', 'l-self', 'm-self'].includes(name)) return pos[2] || pos[1] || '';
  if (['gloss', 'gl', 'q', 'qualifier', 'i', 'qual', 'sense', 's'].includes(name)) return `(${pos.join(', ')})`;
  if (['w', 'non-gloss definition', 'non-gloss', 'n-g', 'ngd', 'vern', 'taxlink', 'taxfmt'].includes(name)) return pos[0] ?? '';
  // "verbal noun of|ka|X", "plural of|ka|X" and their relatives.
  return `${name} ${pos.slice(1).join(' ')}`.trim();
}

/** The definition lines of the Georgian entry in a page's wikitext; null when it has no Georgian section. */
export function georgianGloss(wikitext: string): string[] | null {
  const head = /^==\s*Georgian\s*==\s*$/m.exec(wikitext);
  if (!head) return null;
  const rest = wikitext.slice(head.index + head[0].length);
  const next = /^==[^=].*==\s*$/m.exec(rest);
  const section = next ? rest.slice(0, next.index) : rest;
  const out: string[] = [];
  for (const line of section.split('\n')) {
    if (!/^#\s*[^#:*\s]/.test(line)) continue;
    let t = line.replace(/^#\s*/, '').replace(/<ref[^>]*>[\s\S]*?<\/ref>/g, '').replace(/<ref[^>]*\/>/g, '');
    for (let i = 0; i < 6 && /\{\{[^{}]*\}\}/.test(t); i++) t = t.replace(/\{\{([^{}]*)\}\}/g, (_, inner: string) => templateText(inner));
    t = t
      .replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1')
      .replace(/'{2,}/g, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (t && !out.includes(t)) out.push(t);
  }
  return out;
}

/**
 * The Georgian entry of each title on en.wiktionary: its definition lines, or
 * null when the page does not exist or has no Georgian section. Asked forty
 * titles at a time and cached per title — far cheaper than rendering each
 * page, which is only needed where an inflection table has to be read.
 */
export async function wiktionaryEntries(titles: string[]): Promise<Map<string, string[] | null>> {
  mkdirSync(TEXT_CACHE, { recursive: true });
  const fileOf = (t: string) => join(TEXT_CACHE, `${encodeURIComponent(t)}.txt`);
  const unique = [...new Set(titles)];
  const todo = unique.filter((t) => !existsSync(fileOf(t)));
  for (let i = 0; i < todo.length; i += BATCH) {
    const got = await fetchWikitext(todo.slice(i, i + BATCH));
    for (const [t, text] of got) writeFileSync(fileOf(t), text ?? NO_PAGE);
  }
  const out = new Map<string, string[] | null>();
  for (const t of unique) {
    const text = readFileSync(fileOf(t), 'utf8');
    out.set(t, text === NO_PAGE ? null : georgianGloss(text));
  }
  return out;
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
