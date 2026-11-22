/**
 * Check the Georgian spelling of every word of the picture dictionary against
 * independent evidence.
 *
 *   npm run content:verify-dictionary
 *   npm run content:verify-dictionary -- --lookup <word> [<word> ...]
 *                                        what the sources say about any word
 *                                        (to choose a correction); writes nothing
 *
 *   verified      en.wiktionary has a Georgian entry for the word
 *   attested      the word occurs at least MIN_COUNT times in the corpus list
 *   needs-review  neither — the build holds the word back
 *
 * An entry of several words («რა თქმა უნდა», «ჭექა-ქუხილი») is confirmed by a
 * page of its own, or word by word.
 *
 * Writes content-src/generated/dictionary-status.json and a report for a
 * human with the English definitions next to our Russian ones: the check
 * says the word exists, not that the translation is right.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { LexStatus } from '../../src/content/types';
import { DICT_STATUS_FILE, dictTokens, readDictionarySource, type DictStatusFile } from './dictionary';
import { loadFreq, wiktionaryEntries } from './evidence';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const REPORT_FILE = join(ROOT, 'content-src/review/dictionary-report.md');
/** A lone hit in a web corpus can be a typo; a handful is a word people write. */
const MIN_COUNT = 5;

interface Evidence {
  status: LexStatus;
  sources: string[];
  /** English definitions, for the report. */
  gloss: string[];
  /** Corpus hits, per part for an entry of several words. */
  counts: number[];
}

function weigh(ka: string, entries: Map<string, string[] | null>, freq: Map<string, number> | null): Evidence {
  const whole = entries.get(ka) ?? null;
  if (whole) {
    const n = freq?.get(ka) ?? 0;
    return { status: 'verified', sources: ['wiktionary', ...(n ? [`corpus:${n}`] : [])], gloss: whole, counts: n ? [n] : [] };
  }
  // Word by word: each part needs an entry of its own or enough corpus hits.
  const parts = dictTokens(ka);
  const counts = parts.map((p) => freq?.get(p) ?? 0);
  const paged = parts.map((p) => !!entries.get(p));
  const ok = parts.every((_, i) => paged[i] || counts[i] >= MIN_COUNT);
  const sources: string[] = [];
  if (paged.some(Boolean)) sources.push('wiktionary:parts');
  if (counts.some((n) => n > 0)) sources.push(`corpus:${counts.join('+')}`);
  return {
    status: !ok ? 'needs-review' : paged.every(Boolean) ? 'verified' : 'attested',
    sources,
    gloss: parts.length > 1 ? parts.flatMap((p) => (entries.get(p)?.[0] ? [`${p}: ${entries.get(p)?.[0]}`] : [])) : [],
    counts: counts.some((n) => n > 0) ? counts : [],
  };
}

const titlesOf = (ka: string): string[] => [ka, ...dictTokens(ka)];

async function lookup(words: string[]): Promise<void> {
  const freq = await loadFreq();
  const entries = await wiktionaryEntries(words.flatMap(titlesOf));
  for (const w of words) {
    const e = weigh(w, entries, freq);
    console.log(`${w}: ${e.status} · корпус ${e.counts.join('+') || '—'} · ${e.gloss.slice(0, 4).join('; ') || 'статьи нет'}`);
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args[0] === '--lookup') return lookup(args.slice(1));

  const freq = await loadFreq();
  const { words } = readDictionarySource();
  const entries = await wiktionaryEntries(words.flatMap((w) => titlesOf(w.ka)));
  const status: DictStatusFile = {};
  const tally: Record<LexStatus, number> = { verified: 0, attested: 0, 'needs-review': 0 };
  const rows: string[] = [];
  const problems: string[] = [];

  for (const w of words) {
    const e = weigh(w.ka, entries, freq);
    status[w.ka] = { status: e.status, sources: e.sources };
    tally[e.status]++;
    const count = e.counts.join('+');
    const en = e.gloss.slice(0, 3).join('; ').replace(/\|/g, '/').slice(0, 160);
    rows.push(`| ${w.id} | ${w.ka} | ${w.ru} | ${en || '—'} | ${count || '—'} | ${e.status === 'needs-review' ? '⚠ needs-review' : e.status} |`);
    if (e.status === 'needs-review') problems.push(`${w.id} «${w.ka}» — ${w.ru}${count ? ` (корпус: ${count})` : ''}`);
  }

  const lines = [
    '# Проверка словаря с картинками',
    '',
    'Файл создаётся скриптом `scripts/content/verify-dictionary.ts`. Проверяется написание каждого слова: статья с грузинским разделом в английском Викисловаре (`verified`) или не меньше ' +
      `${MIN_COUNT} вхождений в корпусном частотном списке${freq ? '' : ' — НЕ ПОДКЛЮЧЁН'} (\`attested\`). Остальные слова (\`needs-review\`) в приложение не попадают.`,
    '',
    'Колонка «Викисловарь» — английские значения из статьи: по ней человек может сверить наш русский перевод. Автоматически перевод не проверяется.',
    '',
    `**Итог:** verified ${tally.verified}, attested ${tally.attested}, needs-review ${tally['needs-review']}.`,
    '',
    ...(problems.length ? ['**Не подтверждено:**', '', ...problems.map((p) => `- ${p}`), ''] : []),
    '| № | Слово | Перевод | Викисловарь | Корпус | Статус |',
    '|---|---|---|---|---|---|',
    ...rows,
  ];

  mkdirSync(dirname(DICT_STATUS_FILE), { recursive: true });
  mkdirSync(dirname(REPORT_FILE), { recursive: true });
  writeFileSync(DICT_STATUS_FILE, JSON.stringify(status, null, 1) + '\n');
  writeFileSync(REPORT_FILE, lines.join('\n') + '\n');

  console.log(`verified ${tally.verified}, attested ${tally.attested}, needs-review ${tally['needs-review']}`);
  if (problems.length) {
    console.log('\nneeds-review:');
    for (const p of problems) console.log('  ' + p);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
