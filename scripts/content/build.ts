/**
 * Compile content-src/ into public/content/.
 *
 *   npm run content            build + validate (fails on any problem)
 *   npm run content -- --check validate only, write nothing
 *
 * Deterministic and offline: no model, no network. Verb cells without a
 * `verified` / `auto-verified` status never reach the output.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LETTERS, LETTER_GROUPS, LETTER_PAIRS } from '../../content-src/letters';
import { LEXICON } from '../../content-src/lexicon';
import { RU_DAT, RU_NOM, RU_U, buildSentences } from '../../content-src/sentences';
import { PATTERNS, UNITS } from '../../content-src/units';
import { VERBS, type VerbSrc } from '../../content-src/verbs';
import {
  PERSONS,
  TENSES,
  type CellKey,
  type Course,
  type Lexeme,
  type Person,
  type ReviewStatus,
  type Sentence,
  type Tense,
  type Verb,
} from '../../src/content/types';
import { validateCourse } from './validate';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'public/content');
const STATUS_FILE = join(ROOT, 'content-src/generated/verb-status.json');
const AUDIO_MANIFEST = join(ROOT, 'content-src/audio-manifest.json');
const AUDIO_DIR = join(ROOT, 'public/audio');

type StatusFile = Record<string, Record<string, { status: ReviewStatus; sources: string[] }>>;

function readJson<T>(path: string, fallback: T): T {
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as T) : fallback;
}

const PI: Record<Person, number> = { '1sg': 0, '2sg': 1, '3sg': 2, '1pl': 3, '2pl': 4, '3pl': 5 };

function compileVerb(v: VerbSrc, status: StatusFile): Verb {
  const pron = v.ruSubject === 'dat' ? RU_DAT : v.ruSubject === 'u' ? RU_U : RU_NOM;
  const forms = {} as Verb['forms'];
  const ruCells = {} as Verb['ruCells'];
  const cellUnit: Verb['cellUnit'] = {};
  const st: Verb['status'] = {};
  for (const t of TENSES) {
    forms[t] = {} as Record<Person, string>;
    ruCells[t] = {} as Record<Person, string>;
    for (const p of PERSONS) {
      const i = PI[p];
      forms[t][p] = v.forms[t][i];
      const gloss = v.zeroCopula && t === 'prs' ? `(${v.ruForms[t][i]})` : v.ruForms[t][i];
      ruCells[t][p] = `${pron[p]} ${gloss}`;
      const key = `${t}.${p}` as CellKey;
      const unit = v.cellUnit(t as Tense, p);
      if (unit != null) cellUnit[key] = unit;
      st[key] = status[v.id]?.[key]?.status ?? 'needs-review';
    }
  }
  return {
    id: v.id,
    ru: v.ru,
    lemma: v.lemma,
    kind: v.kind,
    subjectCase: v.subjectCase,
    pastLabel: v.pastLabel,
    forms,
    ruCells,
    cellUnit,
    status: st,
    noteRu: v.noteRu ?? null,
  };
}

export function compile(): { course: Course; sentences: Sentence[]; dropped: string[] } {
  const status = readJson<StatusFile>(STATUS_FILE, {});
  const verbs = VERBS.map((v) => compileVerb(v, status));
  const lexicon: Lexeme[] = LEXICON.map((l) => ({
    id: l.id,
    ka: l.ka,
    ru: l.ru,
    unit: l.unit,
    note: l.note ?? null,
    forms: l.forms ?? [],
  }));

  // Shipping rule: an unverified verb cell takes its card and its sentences with it.
  const verbById = new Map(verbs.map((v) => [v.id, v]));
  const shippable = (cardId: string): boolean => {
    const m = /^c:([a-z]+)\.((?:prs|aor|fut)\.(?:1sg|2sg|3sg|1pl|2pl|3pl))$/.exec(cardId);
    if (!m) return true;
    const st = verbById.get(m[1])?.status[m[2] as CellKey];
    return st === 'verified' || st === 'auto-verified';
  };
  const dropped: string[] = [];
  const units = UNITS.map((u) => ({
    ...u,
    steps: u.steps.map((step) => {
      if (step.kind !== 'cards') return step;
      const keep = step.cards.filter((c) => {
        const ok = shippable(c);
        if (!ok) dropped.push(c);
        return ok;
      });
      return { ...step, cards: keep };
    }),
  }));
  const sentences = buildSentences().filter((s) => shippable(s.focus));

  const body = {
    units,
    verbs,
    lexicon,
    patterns: PATTERNS,
    letters: LETTERS,
    letterGroups: LETTER_GROUPS,
    letterPairs: LETTER_PAIRS,
  };
  const version = createHash('sha1')
    .update(JSON.stringify(body))
    .update(JSON.stringify(sentences))
    .digest('hex')
    .slice(0, 10);
  return { course: { version, ...body }, sentences, dropped };
}

/** Clips where the consonant itself is the lesson: letter sounds and minimal pairs. Recorded at a higher bitrate. */
export function hiFiTexts(course: Course): string[] {
  return [...course.letters.map((l) => l.say), ...course.letterPairs.flatMap((p) => [p.a.ka, p.b.ka])];
}

/** Every text the alphabet trainer plays ("unit 0" for the audio tooling). */
export function letterTexts(course: Course): string[] {
  return [...hiFiTexts(course), ...course.letters.map((l) => l.word.ka)];
}

/** Texts the app may want to play, in priority order (cheapest way to cover the most cards first). */
export function audioTexts(course: Course, sentences: Sentence[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (t: string) => {
    if (!seen.has(t)) {
      seen.add(t);
      out.push(t);
    }
  };
  // The alphabet first: letter sounds, the minimal pairs, then each letter's example word.
  for (const t of letterTexts(course)) add(t);
  const readyUnits = course.units.filter((u) => u.ready).map((u) => u.id);
  for (const unit of readyUnits) {
    for (const l of course.lexicon) if (l.unit === unit) add(l.ka);
    const mine = sentences.filter((s) => s.unit === unit);
    for (const s of mine) if (s.fixed) add(s.ka);
    // One clip per cell first (the plain affirmative), then the remaining frames.
    const first = new Set<string>();
    for (const s of mine) {
      if (!s.fixed && !first.has(s.focus)) {
        first.add(s.focus);
        add(s.ka);
      }
    }
    for (const s of mine) add(s.ka);
  }
  return out;
}

function audioPath(id: string): string {
  return join(AUDIO_DIR, id.slice(0, 2), `${id}.mp3`);
}

function main(): void {
  const checkOnly = process.argv.includes('--check');
  const { course, sentences, dropped } = compile();
  const errors = validateCourse(course, sentences);

  if (dropped.length) {
    console.warn(`! ${dropped.length} card(s) held back: verb form not verified yet`);
    for (const d of dropped.slice(0, 20)) console.warn(`    ${d}`);
  }
  if (errors.length) {
    console.error(`✗ ${errors.length} content problem(s):`);
    for (const e of errors.slice(0, 60)) console.error(`    ${e}`);
    process.exit(1);
  }

  const byUnit = new Map<number, Sentence[]>();
  for (const s of sentences) byUnit.set(s.unit, [...(byUnit.get(s.unit) ?? []), s]);

  // Only audio that exists on disk is advertised to the app.
  const manifest = readJson<Record<string, string>>(AUDIO_MANIFEST, {});
  const audio: Record<string, string> = {};
  const wanted = audioTexts(course, sentences);
  for (const text of wanted) {
    const id = manifest[text];
    if (id && existsSync(audioPath(id))) audio[text] = id;
  }

  const cells = course.units.flatMap((u) => u.steps.flatMap((s) => (s.kind === 'cards' ? s.cards : [])));
  console.log(
    `✓ course ${course.version}: ${cells.length} cards, ${sentences.length} sentences, ` +
      `${course.verbs.length} verbs, ${course.lexicon.length} words, audio ${Object.keys(audio).length}/${wanted.length}`,
  );
  if (checkOnly) return;

  mkdirSync(join(OUT, 'sentences'), { recursive: true });
  for (const f of readdirSync(join(OUT, 'sentences'))) rmSync(join(OUT, 'sentences', f));
  const files: string[] = [];
  for (const [unit, list] of [...byUnit].sort((a, b) => a[0] - b[0])) {
    const name = `sentences/u${String(unit).padStart(2, '0')}.json`;
    writeFileSync(join(OUT, name), JSON.stringify(list));
    files.push(name);
  }
  writeFileSync(join(OUT, 'course.json'), JSON.stringify(course));
  writeFileSync(join(OUT, 'audio.json'), JSON.stringify(audio));
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({ version: course.version, sentences: files }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
