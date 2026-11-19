/**
 * Live course content. Like `WORDS`, these arrays are filled in place by the
 * loader, so every importer holds the same reference.
 */
import type {
  Course,
  Letter,
  LetterGroup,
  LetterPair,
  Lexeme,
  PatternCell,
  Person,
  Sentence,
  Tense,
  Unit,
  Verb,
} from './types';

export const UNITS: Unit[] = [];
export const VERBS: Verb[] = [];
export const LEXICON: Lexeme[] = [];
export const PATTERNS: PatternCell[] = [];
export const SENTENCES: Sentence[] = [];
export const LETTERS: Letter[] = [];
export const LETTER_GROUPS: LetterGroup[] = [];
export const LETTER_PAIRS: LetterPair[] = [];

const letterByCh = new Map<string, Letter>();
const verbById = new Map<string, Verb>();
const lexById = new Map<number, Lexeme>();
const sentenceById = new Map<string, Sentence>();
const patternById = new Map<string, PatternCell>();
/** Sentences usable as an example of a card (its focus, or a pattern it contains). */
const examples = new Map<string, Sentence[]>();
const cardUnitMap = new Map<string, number>();
const cardOrder: string[] = [];
const audio = new Map<string, string>();
let version = '';

export function courseVersion(): string {
  return version;
}

/** Replace all content. Used by the loader and by tests. */
export function fillCourse(course: Course, sentences: Sentence[], audioIndex: Record<string, string> = {}): void {
  UNITS.splice(0, UNITS.length, ...course.units);
  VERBS.splice(0, VERBS.length, ...course.verbs);
  LEXICON.splice(0, LEXICON.length, ...course.lexicon);
  PATTERNS.splice(0, PATTERNS.length, ...course.patterns);
  SENTENCES.splice(0, SENTENCES.length, ...sentences);
  LETTERS.splice(0, LETTERS.length, ...(course.letters ?? []));
  LETTER_GROUPS.splice(0, LETTER_GROUPS.length, ...(course.letterGroups ?? []));
  LETTER_PAIRS.splice(0, LETTER_PAIRS.length, ...(course.letterPairs ?? []));
  version = course.version;

  letterByCh.clear();
  for (const l of LETTERS) letterByCh.set(l.ch, l);
  verbById.clear();
  lexById.clear();
  sentenceById.clear();
  patternById.clear();
  examples.clear();
  cardUnitMap.clear();
  cardOrder.length = 0;
  audio.clear();

  for (const v of VERBS) verbById.set(v.id, v);
  for (const l of LEXICON) lexById.set(l.id, l);
  for (const p of PATTERNS) patternById.set(p.id, p);
  for (const u of UNITS) {
    for (const step of u.steps) {
      if (step.kind !== 'cards') continue;
      for (const id of step.cards) {
        cardUnitMap.set(id, u.id);
        cardOrder.push(id);
      }
    }
  }
  const patternIds = new Set(PATTERNS.map((p) => `c:${p.id}`));
  const push = (card: string, s: Sentence) => {
    const list = examples.get(card);
    if (list) list.push(s);
    else examples.set(card, [s]);
  };
  for (const s of SENTENCES) {
    sentenceById.set(s.id, s);
    push(s.focus, s);
    for (const r of s.req) if (patternIds.has(r)) push(r, s);
  }
  for (const [text, id] of Object.entries(audioIndex)) audio.set(text, id);
}

let loading: Promise<void> | null = null;

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${import.meta.env.BASE_URL}content/${path}`, { signal });
  if (!res.ok) throw new Error(`Не удалось загрузить ${path}: ${res.status}`);
  return (await res.json()) as T;
}

/** Idempotent: fetch the small course files (a few hundred KB) and fill the stores. */
export function loadCourse(): Promise<void> {
  if (!loading) {
    loading = (async () => {
      const manifest = await getJson<{ version: string; sentences: string[] }>('manifest.json');
      const [course, audioIndex, ...parts] = await Promise.all([
        getJson<Course>('course.json'),
        getJson<Record<string, string>>('audio.json').catch(() => ({})),
        ...manifest.sentences.map((f) => getJson<Sentence[]>(f)),
      ]);
      fillCourse(course, parts.flat(), audioIndex);
    })().catch((e) => {
      loading = null;
      throw e;
    });
  }
  return loading;
}

export const getVerb = (id: string): Verb | undefined => verbById.get(id);
export const getLexeme = (id: number): Lexeme | undefined => lexById.get(id);
export const getSentence = (id: string): Sentence | undefined => sentenceById.get(id);
export const getPattern = (id: string): PatternCell | undefined => patternById.get(id);
export const getUnit = (id: number): Unit | undefined => UNITS.find((u) => u.id === id);
export const examplesFor = (cardId: string): readonly Sentence[] => examples.get(cardId) ?? [];
export const unitOfCard = (cardId: string): number | null => cardUnitMap.get(cardId) ?? null;
/** Every card of the course in the order it is introduced. */
export const allCardIds = (): readonly string[] => cardOrder;
/** Audio clip id for a Georgian text, if one has been generated. */
export const audioIdFor = (text: string): string | null => audio.get(text) ?? null;
/** Every generated clip the course refers to. */
export const allAudioIds = (): string[] => [...new Set(audio.values())];
export const audioUrl = (id: string): string =>
  `${import.meta.env.BASE_URL}audio/${id.slice(0, 2)}/${id}.mp3`;

export const getLetter = (ch: string): Letter | undefined => letterByCh.get(ch);
/** Letter cards in the order the letters are taught. */
export const letterCardIds = (): string[] => LETTERS.map((l) => `l:${l.ch}`);
/** The minimal pair a letter takes part in, with its own word first. */
export function pairFor(ch: string): { mine: LetterPair['a']; other: LetterPair['a'] } | null {
  for (const p of LETTER_PAIRS) {
    if (p.a.ch === ch) return { mine: p.a, other: p.b };
    if (p.b.ch === ch) return { mine: p.b, other: p.a };
  }
  return null;
}

export type ParsedCard =
  | { kind: 'word'; lexId: number }
  | { kind: 'cell'; verb: string; tense: Tense; person: Person }
  | { kind: 'pattern'; pattern: string }
  | { kind: 'phrase'; sentenceId: string }
  | { kind: 'letter'; ch: string };

export function parseCardId(id: string): ParsedCard | null {
  if (id.startsWith('l:')) return { kind: 'letter', ch: id.slice(2) };
  if (id.startsWith('w:')) return { kind: 'word', lexId: Number(id.slice(2)) };
  if (id.startsWith('s:')) return { kind: 'phrase', sentenceId: id.slice(2) };
  const cell = /^c:([a-z]+)\.(prs|aor|fut)\.(1sg|2sg|3sg|1pl|2pl|3pl)$/.exec(id);
  if (cell) return { kind: 'cell', verb: cell[1], tense: cell[2] as Tense, person: cell[3] as Person };
  if (id.startsWith('c:')) return { kind: 'pattern', pattern: id.slice(2) };
  return null;
}

export interface CardView {
  id: string;
  kind: ParsedCard['kind'];
  /** Georgian side; empty for pattern cards, which are a rule rather than a word. */
  ka: string;
  ru: string;
  note: string | null;
}

/** What a card "is", for lists, intros and the summary. */
export function describeCard(id: string): CardView | null {
  const p = parseCardId(id);
  if (!p) return null;
  if (p.kind === 'letter') {
    const l = letterByCh.get(p.ch);
    return l ? { id, kind: 'letter', ka: l.ch, ru: `${l.ru} — ${l.hintRu}`, note: `Например: ${l.word.ka} — ${l.word.ru}` } : null;
  }
  if (p.kind === 'word') {
    const l = lexById.get(p.lexId);
    return l ? { id, kind: 'word', ka: l.ka, ru: l.ru, note: l.note } : null;
  }
  if (p.kind === 'phrase') {
    const s = sentenceById.get(p.sentenceId);
    return s ? { id, kind: 'phrase', ka: s.ka, ru: s.ru, note: null } : null;
  }
  if (p.kind === 'cell') {
    const v = verbById.get(p.verb);
    return v
      ? { id, kind: 'cell', ka: v.forms[p.tense][p.person], ru: v.ruCells[p.tense][p.person], note: null }
      : null;
  }
  const pat = patternById.get(p.pattern);
  return pat ? { id, kind: 'pattern', ka: '', ru: pat.titleRu, note: pat.noteRu } : null;
}

/** Resolve the `{а}` speaker-gender marker in a Russian prompt. */
export function ruText(ru: string, gender: 'm' | 'f'): string {
  return ru.replace(/\{а\}/g, gender === 'f' ? 'а' : '');
}
