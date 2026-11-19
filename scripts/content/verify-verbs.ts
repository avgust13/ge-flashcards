/**
 * Cross-check the hand-entered verb table against independent evidence and
 * write a status for every cell. Nothing unverified is ever shipped.
 *
 *   npm run content:verify -- [--blind <json>] [--freq <wordlist>]
 *
 * Evidence per form:
 *   wiktionary  the form appears in a conjugation table on the en.wiktionary
 *               page of the verb's dictionary form
 *   blind       an independent derivation (made without seeing this table)
 *               gives the same form and marks it as confident
 *   corpus      the form is attested in a frequency list built from real text
 *
 * Status: `verified` = wiktionary; `auto-verified` = blind + corpus;
 * anything else = `needs-review`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VERBS } from '../../content-src/verbs';
import { PERSONS, TENSES, type Person, type ReviewStatus, type Tense } from '../../src/content/types';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CACHE = join(ROOT, 'node_modules/.cache/verify-verbs');
const STATUS_FILE = join(ROOT, 'content-src/generated/verb-status.json');
const REPORT_FILE = join(ROOT, 'content-src/review/verbs-report.md');

const PI: Record<Person, number> = { '1sg': 0, '2sg': 1, '3sg': 2, '1pl': 3, '2pl': 4, '3pl': 5 };
const GEORGIAN = /[ა-ჿ]+/g;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Rendered HTML of a Wiktionary page, or null when the page does not exist.
 * A throttled or failed request is retried and finally thrown — it must never
 * be mistaken for "no such page", which would silently unverify a whole verb.
 */
async function fetchPage(title: string): Promise<string | null> {
  const url =
    'https://en.wiktionary.org/w/api.php?action=parse&prop=text&format=json&formatversion=2&redirects=1&maxlag=5&page=' +
    encodeURIComponent(title);
  let lastError = '';
  for (let attempt = 0; attempt < 5; attempt++) {
    await sleep(attempt === 0 ? 1500 : 4000 * 2 ** (attempt - 1));
    const res = await fetch(url, { headers: { 'User-Agent': 'content-verifier/1.0 (verb table check)' } });
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

/** Georgian words found inside tables of the rendered Wiktionary page (the conjugation tables). */
async function wiktionaryForms(lemma: string): Promise<Set<string> | null> {
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, `${encodeURIComponent(lemma)}.html`);
  let html: string;
  if (existsSync(file)) {
    html = readFileSync(file, 'utf8');
  } else {
    const fetched = await fetchPage(lemma);
    if (fetched == null) return null;
    html = fetched;
    writeFileSync(file, html);
  }
  const words = new Set<string>();
  for (const table of html.match(/<table[\s\S]*?<\/table>/g) ?? []) {
    const text = table.replace(/<[^>]+>/g, ' ');
    for (const w of text.match(GEORGIAN) ?? []) words.add(w);
  }
  return words;
}

interface Blind {
  verbs: Record<string, { prs: string[]; fut: string[]; past: string[]; low?: string[] }>;
}

function loadFreq(path: string | undefined): Map<string, number> | null {
  if (!path || !existsSync(path)) return null;
  const map = new Map<string, number>();
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const [w, n] = line.trim().split(/\s+/);
    if (w) map.set(w, Number(n) || 1);
  }
  return map;
}

async function main(): Promise<void> {
  const blindPath = arg('--blind');
  const blind: Blind | null = blindPath && existsSync(blindPath) ? (JSON.parse(readFileSync(blindPath, 'utf8')) as Blind) : null;
  const freq = loadFreq(arg('--freq'));

  const status: Record<string, Record<string, { status: ReviewStatus; sources: string[] }>> = {};
  const lines: string[] = [
    '# Проверка таблицы глаголов',
    '',
    'Файл создаётся скриптом `scripts/content/verify-verbs.ts`. Его можно показать преподавателю или носителю языка.',
    '',
    `Источники: Викисловарь (таблицы спряжения), независимый второй прогон${blind ? '' : ' — НЕ ПОДКЛЮЧЁН'}, корпусный частотный список${freq ? '' : ' — НЕ ПОДКЛЮЧЁН'}.`,
    '',
  ];
  const tally: Record<ReviewStatus, number> = { verified: 0, 'auto-verified': 0, 'needs-review': 0 };
  const disagreements: string[] = [];

  for (const v of VERBS) {
    const wikt = await wiktionaryForms(v.lemma);
    status[v.id] = {};
    lines.push(`## ${v.ru} — ${v.lemma}`, '');
    if (!wikt) lines.push('_Страница Викисловаря не найдена или без таблиц._', '');
    lines.push('| Клетка | Форма | Викисловарь | Второй прогон | Корпус | Статус |', '|---|---|---|---|---|---|');

    for (const t of TENSES) {
      for (const p of PERSONS) {
        const form = v.forms[t as Tense][PI[p]];
        const key = `${t}.${p}`;
        const sources: string[] = [];

        const inWikt = !!wikt?.has(form);
        if (inWikt) sources.push('wiktionary');

        const row = t === 'aor' ? 'past' : t;
        const b = blind?.verbs?.[v.id];
        const blindForm = b?.[row as 'prs' | 'fut' | 'past']?.[PI[p]];
        const blindLow = b?.low?.includes(`${row}.${p}`) ?? false;
        const blindOk = !!blindForm && blindForm === form && !blindLow;
        if (blindOk) sources.push('blind');
        if (blindForm && blindForm !== form) {
          disagreements.push(`${v.id}.${key}: таблица «${form}», второй прогон «${blindForm}»`);
        }

        const count = freq?.get(form) ?? 0;
        if (count > 0) sources.push(`corpus:${count}`);

        const st: ReviewStatus = inWikt ? 'verified' : blindOk && count > 0 ? 'auto-verified' : 'needs-review';
        status[v.id][key] = { status: st, sources };
        tally[st]++;
        const blindCell = !blindForm ? '—' : blindForm === form ? (blindLow ? 'совпало, но не уверен' : 'совпало') : `**${blindForm}**`;
        lines.push(`| ${key} | ${form} | ${inWikt ? 'да' : '—'} | ${blindCell} | ${freq ? count || '—' : 'н/д'} | ${st === 'needs-review' ? '⚠ needs-review' : st} |`);
      }
    }
    lines.push('');
  }

  lines.splice(
    6,
    0,
    `**Итог:** verified ${tally.verified}, auto-verified ${tally['auto-verified']}, needs-review ${tally['needs-review']}.`,
    '',
    ...(disagreements.length
      ? ['**Расхождения со вторым прогоном:**', '', ...disagreements.map((d) => `- ${d}`), '']
      : []),
  );

  mkdirSync(dirname(STATUS_FILE), { recursive: true });
  mkdirSync(dirname(REPORT_FILE), { recursive: true });
  writeFileSync(STATUS_FILE, JSON.stringify(status, null, 2) + '\n');
  writeFileSync(REPORT_FILE, lines.join('\n') + '\n');

  console.log(`verified ${tally.verified}, auto-verified ${tally['auto-verified']}, needs-review ${tally['needs-review']}`);
  if (disagreements.length) {
    console.log(`\n${disagreements.length} disagreement(s) with the blind pass:`);
    for (const d of disagreements) console.log('  ' + d);
  }
  const pending = Object.entries(status).flatMap(([id, cells]) =>
    Object.entries(cells).filter(([, c]) => c.status === 'needs-review').map(([k]) => `${id}.${k}`),
  );
  if (pending.length) console.log(`\nneeds-review: ${pending.join(', ')}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
