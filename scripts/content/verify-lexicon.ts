/**
 * Check every Georgian surface of the lexicon — the dictionary form and each
 * named form (case, plural, postposition) — against independent evidence.
 *
 *   npm run content:verify-lexicon
 *
 *   verified      the form stands in a declension table on the word's
 *                 en.wiktionary page (for the dictionary form: the page has a
 *                 Georgian entry)
 *   attested      the form occurs at least MIN_COUNT times in the corpus list
 *   needs-review  neither — the build refuses to ship the word
 *
 * Writes content-src/generated/lexicon-status.json and a report for a human.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEXICON } from '../../content-src/lexicon';
import type { LexStatus } from '../../src/content/types';
import { loadFreq, wiktionaryPage } from './evidence';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const STATUS_FILE = join(ROOT, 'content-src/generated/lexicon-status.json');
const REPORT_FILE = join(ROOT, 'content-src/review/lexicon-report.md');
/** A lone hit in a web corpus can be a typo; a handful is a word people write. */
const MIN_COUNT = 5;

export type LexStatusFile = Record<string, Record<string, { status: LexStatus; sources: string[] }>>;

async function main(): Promise<void> {
  const freq = await loadFreq();
  const status: LexStatusFile = {};
  const tally: Record<LexStatus, number> = { verified: 0, attested: 0, 'needs-review': 0 };
  const problems: string[] = [];
  const rows: string[] = [];

  for (const l of LEXICON) {
    const title = l.wikt === false ? null : (l.wikt ?? l.ka);
    const page = title ? await wiktionaryPage(title) : null;
    status[l.key] = {};
    const surfaces: Array<[string, string]> = [['ka', l.ka], ...Object.entries(l.k ?? {})];
    for (const [form, text] of surfaces) {
      const sources: string[] = [];
      const inTable = !!page?.words.has(text);
      // The dictionary form is confirmed by its own page; a borrowed page (`wikt`) must list it in a table.
      const ownPage = form === 'ka' && title === l.ka && !!page?.georgian;
      if (inTable || ownPage) sources.push('wiktionary');
      const count = freq?.get(text) ?? 0;
      if (count > 0) sources.push(`corpus:${count}`);
      const st: LexStatus = inTable || ownPage ? 'verified' : count >= MIN_COUNT ? 'attested' : 'needs-review';
      status[l.key][form] = { status: st, sources };
      tally[st]++;
      rows.push(`| ${l.unit} | ${l.key} | ${form} | ${text} | ${inTable || ownPage ? 'да' : '—'} | ${count || '—'} | ${st === 'needs-review' ? '⚠ needs-review' : st} |`);
      if (st === 'needs-review') problems.push(`${l.key}.${form} «${text}» (урок ${l.unit})`);
    }
  }

  const lines = [
    '# Проверка словаря курса',
    '',
    'Файл создаётся скриптом `scripts/content/verify-lexicon.ts`. Проверяется каждая форма слова, которая может попасть в предложение.',
    '',
    `Источники: Викисловарь (таблицы склонения), корпусный частотный список${freq ? '' : ' — НЕ ПОДКЛЮЧЁН'} (порог ${MIN_COUNT}).`,
    '',
    `**Итог:** verified ${tally.verified}, attested ${tally.attested}, needs-review ${tally['needs-review']}.`,
    '',
    ...(problems.length ? ['**Не подтверждено:**', '', ...problems.map((p) => `- ${p}`), ''] : []),
    '| Урок | Слово | Форма | Текст | Викисловарь | Корпус | Статус |',
    '|---|---|---|---|---|---|---|',
    ...rows,
  ];

  mkdirSync(dirname(STATUS_FILE), { recursive: true });
  mkdirSync(dirname(REPORT_FILE), { recursive: true });
  writeFileSync(STATUS_FILE, JSON.stringify(status, null, 1) + '\n');
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
