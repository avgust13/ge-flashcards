/**
 * Cross-check the hand-entered verb table against independent evidence and
 * write a status for every cell. Nothing unverified is ever shipped.
 *
 *   npm run content:verify -- [--blind <json>[,<json>…]] [--freq <wordlist>]
 *
 * Evidence per form:
 *   wiktionary  the form appears in a conjugation table on the en.wiktionary
 *               page of the verb's dictionary form (or of the pages listed in
 *               `wikt` for verbs that borrow their future / past from another root)
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
import { PERSONS, SCREEVES, type Person, type ReviewStatus } from '../../src/content/types';
import { loadFreq, wiktionaryWords } from './evidence';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const STATUS_FILE = join(ROOT, 'content-src/generated/verb-status.json');
const REPORT_FILE = join(ROOT, 'content-src/review/verbs-report.md');
const BLIND_FILE = join(ROOT, 'content-src/review/blind-verbs.json');

const PI: Record<Person, number> = { '1sg': 0, '2sg': 1, '3sg': 2, '1pl': 3, '2pl': 4, '3pl': 5 };

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

type BlindRow = 'prs' | 'fut' | 'past' | 'opt';
interface BlindVerb {
  prs?: string[];
  fut?: string[];
  past?: string[];
  opt?: string[];
  low?: string[];
}
interface Blind {
  verbs: Record<string, BlindVerb>;
}

/** Several blind passes may cover different verbs or rows; later files add to earlier ones. */
function loadBlind(paths: string[]): Blind | null {
  const out: Blind = { verbs: {} };
  let any = false;
  for (const p of paths) {
    if (!existsSync(p)) continue;
    any = true;
    const part = JSON.parse(readFileSync(p, 'utf8')) as Blind;
    for (const [id, v] of Object.entries(part.verbs)) {
      const prev = out.verbs[id] ?? {};
      out.verbs[id] = { ...prev, ...v, low: [...(prev.low ?? []), ...(v.low ?? [])] };
    }
  }
  return any ? out : null;
}

async function main(): Promise<void> {
  const blind = loadBlind((arg('--blind') ?? BLIND_FILE).split(','));
  const freq = await loadFreq(arg('--freq'));

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
    const pages = v.wikt ?? [v.lemma];
    const wikt = new Set<string>();
    const missing: string[] = [];
    for (const page of pages) {
      const words = await wiktionaryWords(page);
      if (!words) missing.push(page);
      else for (const w of words) wikt.add(w);
    }
    status[v.id] = {};
    lines.push(`## ${v.ru} — ${v.lemma}`, '');
    if (missing.length) lines.push(`_Нет страницы Викисловаря или таблиц на ней: ${missing.join(', ')}._`, '');
    lines.push('| Клетка | Форма | Викисловарь | Второй прогон | Корпус | Статус |', '|---|---|---|---|---|---|');

    for (const t of SCREEVES) {
      const row = t === 'opt' ? v.opt : v.forms[t];
      if (!row) continue;
      for (const p of PERSONS) {
        const form = row[PI[p]];
        const key = `${t}.${p}`;
        const sources: string[] = [];

        const inWikt = wikt.has(form);
        if (inWikt) sources.push('wiktionary');

        const blindRow: BlindRow = t === 'aor' ? 'past' : t;
        const b = blind?.verbs?.[v.id];
        const blindForm = b?.[blindRow]?.[PI[p]];
        const blindLow = b?.low?.includes(`${blindRow}.${p}`) ?? false;
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
