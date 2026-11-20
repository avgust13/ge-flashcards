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
import { PATTERNS, UNITS, type ExampleSrc } from '../../content-src/units';
import { VERBS, type VerbSrc } from '../../content-src/verbs';
import {
  CELL_RE,
  PERSONS,
  SCREEVES,
  TENSES,
  type CellKey,
  type Course,
  type KaForm,
  type LexStatus,
  type Lexeme,
  type Person,
  type ReviewStatus,
  type Sentence,
  type Unit,
  type Verb,
} from '../../src/content/types';
import { validateCourse } from './validate';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = join(ROOT, 'public/content');
const STATUS_FILE = join(ROOT, 'content-src/generated/verb-status.json');
const LEX_STATUS_FILE = join(ROOT, 'content-src/generated/lexicon-status.json');
const AUDIO_MANIFEST = join(ROOT, 'content-src/audio-manifest.json');
const AUDIO_DIR = join(ROOT, 'public/audio');

type StatusFile = Record<string, Record<string, { status: ReviewStatus; sources: string[] }>>;
type LexStatusFile = Record<string, Record<string, { status: LexStatus; sources: string[] }>>;

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
      ruCells[t][p] = `${pron[p]} ${gloss}${v.ruHint ?? ''}`;
    }
  }
  let opt: Verb['opt'] = null;
  let ruOpt: Verb['ruOpt'] = null;
  if (v.opt) {
    opt = {} as Record<Person, string>;
    ruOpt = {} as Record<Person, string>;
    for (const p of PERSONS) {
      opt[p] = v.opt[PI[p]];
      // The Russian «чтобы» takes the past form, which is exactly how the Georgian one is built.
      ruOpt[p] = `чтобы ${RU_NOM[p]} ${v.ruForms.aor[PI[p]]}`;
    }
  }
  for (const s of SCREEVES) {
    if (s === 'opt' && !v.opt) continue;
    for (const p of PERSONS) {
      const key = `${s}.${p}` as CellKey;
      const unit = v.cellUnit(s, p);
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
    objCase: v.objCase ?? null,
    pastLabel: v.pastLabel,
    forms,
    opt,
    ruCells,
    ruOpt,
    cellUnit,
    status: st,
    noteRu: v.noteRu ?? null,
  };
}

const RANK: Record<LexStatus, number> = { verified: 2, attested: 1, 'needs-review': 0 };

function compileLexicon(status: LexStatusFile): Lexeme[] {
  return LEXICON.map((l) => {
    const cases: Partial<Record<KaForm, string>> = { ...(l.k ?? {}) };
    // A word is only as trustworthy as its least confirmed surface.
    let worst: LexStatus = 'verified';
    for (const form of ['ka', ...Object.keys(cases)]) {
      const st = status[l.key]?.[form]?.status ?? 'needs-review';
      if (RANK[st] < RANK[worst]) worst = st;
    }
    return {
      id: l.id,
      ka: l.ka,
      ru: l.ru,
      unit: l.unit,
      note: l.note ?? null,
      forms: Object.values(cases),
      cases,
      status: worst,
    };
  });
}

export function compile(): { course: Course; sentences: Sentence[]; dropped: string[] } {
  const status = readJson<StatusFile>(STATUS_FILE, {});
  const verbs = VERBS.map((v) => compileVerb(v, status));
  const lexicon = compileLexicon(readJson<LexStatusFile>(LEX_STATUS_FILE, {}));

  // Shipping rule: an unverified verb cell takes its card and its sentences with it.
  const verbById = new Map(verbs.map((v) => [v.id, v]));
  const cellOk = (verbId: string, key: string): boolean => {
    const st = verbById.get(verbId)?.status[key as CellKey];
    return st === 'verified' || st === 'auto-verified';
  };
  const shippable = (cardId: string): boolean => {
    const m = CELL_RE.exec(cardId);
    return m ? cellOk(m[1], `${m[2]}.${m[3]}`) : true;
  };
  const sentences = buildSentences().filter(
    (s) => shippable(s.focus) && s.tokens.every((t) => !t.cell || shippable(`c:${t.cell}`)),
  );
  const sentenceById = new Map(sentences.map((s) => [s.id, s]));
  const lexByKey = new Map(LEXICON.map((l) => [l.key, l]));

  const example = (unit: number, e: ExampleSrc): { ka: string; ru: string; who?: string } => {
    const who = e.who ? { who: e.who } : {};
    if ('ref' in e) {
      const s = sentenceById.get(e.ref);
      if (!s) throw new Error(`Unit ${unit}: example refers to an unknown sentence "${e.ref}"`);
      return { ka: s.ka, ru: s.ru, ...who };
    }
    if ('w' in e) {
      const l = lexByKey.get(e.w);
      if (!l) throw new Error(`Unit ${unit}: example refers to an unknown word "${e.w}"`);
      return { ka: l.ka, ru: l.ru.charAt(0).toUpperCase() + l.ru.slice(1), ...who };
    }
    return { ka: e.ka, ru: e.ru, ...who };
  };

  const dropped: string[] = [];
  const units: Unit[] = UNITS.map((u) => ({
    ...u,
    steps: u.steps.map((step) => {
      if (step.kind === 'explain') return { ...step, examples: step.examples.map((e) => example(u.id, e)) };
      const keep = step.cards.filter((c) => {
        const ok = shippable(c) && (!c.startsWith('s:') || sentenceById.has(c.slice(2)));
        if (!ok) dropped.push(c);
        return ok;
      });
      return { ...step, cards: keep };
    }),
  }));

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
    for (const e of errors.slice(0, 80)) console.error(`    ${e}`);
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
