/**
 * The picture dictionary ("free practice"): everyday words outside the course
 * skeleton, each with a picture. Source: content-src/dictionary.json, one word
 * per line; pictures are files `public/pics/<id>.webp`.
 *
 * A word reaches the app only when its Georgian spelling is confirmed by
 * `npm run content:verify-dictionary` (content-src/generated/dictionary-status.json).
 * The others are held back, like unverified verb cells: the word list came
 * from a model and was never checked by a speaker.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DictCategory, DictWord, Dictionary, LexStatus } from '../../src/content/types';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SOURCE = join(ROOT, 'content-src/dictionary.json');
export const DICT_STATUS_FILE = join(ROOT, 'content-src/generated/dictionary-status.json');
const PICS_DIR = join(ROOT, 'public/pics');

export interface DictSource {
  categories: DictCategory[];
  words: DictWord[];
}

/** Evidence per Georgian text (not per id): a corrected spelling has to be confirmed again. */
export type DictStatusFile = Record<string, { status: LexStatus; sources: string[] }>;

/** Ids from here up belong to words the course added (content-src/lexicon.ts). */
const FIRST_COURSE_ID = 2001;
const LEVELS = 5;
/** Georgian words separated by single spaces or hyphens. */
const KA_TEXT = /^[ა-ჿ]+(?:[ -][ა-ჿ]+)*$/;

export function readDictionarySource(): DictSource {
  return JSON.parse(readFileSync(SOURCE, 'utf8')) as DictSource;
}

export function readDictionaryStatus(): DictStatusFile {
  return existsSync(DICT_STATUS_FILE) ? (JSON.parse(readFileSync(DICT_STATUS_FILE, 'utf8')) as DictStatusFile) : {};
}

/** The parts of an entry that are checked one by one: «ჭექა-ქუხილი» and «რა თქმა უნდა» are several words. */
export function dictTokens(ka: string): string[] {
  return ka.split(/[ -]/).filter(Boolean);
}

/** Problems of the source itself. `lexicon` is the course vocabulary: shared ids must mean the same word. */
export function validateDictionary(src: DictSource, lexicon: ReadonlyArray<{ id: number; ka: string }>): string[] {
  const errors: string[] = [];
  const cats = new Set(src.categories.map((c) => c.id));
  if (cats.size !== src.categories.length) errors.push('dictionary: a category id is used twice');
  const ids = new Map<number, DictWord>();
  const texts = new Map<string, DictWord>();
  for (const w of src.words) {
    const at = `dictionary word ${w.id} «${w.ka}»`;
    if (!Number.isInteger(w.id) || w.id < 1 || w.id >= FIRST_COURSE_ID) errors.push(`${at}: id must be 1..${FIRST_COURSE_ID - 1}`);
    if (ids.has(w.id)) errors.push(`${at}: id is already used by «${ids.get(w.id)?.ka}»`);
    ids.set(w.id, w);
    if (typeof w.ka !== 'string' || !KA_TEXT.test(w.ka)) errors.push(`${at}: Georgian text must be Georgian words separated by single spaces or hyphens`);
    else if (texts.has(w.ka)) errors.push(`${at}: the same text as word ${texts.get(w.ka)?.id}`);
    texts.set(w.ka, w);
    if (typeof w.ru !== 'string' || !w.ru.trim() || w.ru !== w.ru.trim()) errors.push(`${at}: empty or untrimmed translation`);
    if (w.cat === 'all' || !cats.has(w.cat)) errors.push(`${at}: unknown category "${w.cat}"`);
    if (!Number.isInteger(w.level) || w.level < 0 || w.level >= LEVELS) errors.push(`${at}: level must be 0..${LEVELS - 1}`);
  }
  // A course word with a dictionary id keeps the learner's old score and the picture: it must be that very word.
  for (const l of lexicon) {
    if (l.id >= FIRST_COURSE_ID) continue;
    const w = ids.get(l.id);
    if (!w) errors.push(`lexicon word ${l.id} «${l.ka}»: no dictionary word with this id`);
    else if (w.ka !== l.ka) errors.push(`lexicon word ${l.id} «${l.ka}»: the dictionary has «${w.ka}» under this id`);
  }
  return errors;
}

const confirmed = (status: DictStatusFile, ka: string): boolean => {
  const st = status[ka]?.status;
  return st === 'verified' || st === 'attested';
};

export interface CompiledDictionary {
  dictionary: Dictionary;
  /** Words left out because nothing confirms their spelling yet. */
  held: DictWord[];
  /** Picture files that belong to no word of the source. */
  orphanPics: string[];
}

export function compileDictionary(
  src: DictSource = readDictionarySource(),
  status: DictStatusFile = readDictionaryStatus(),
): CompiledDictionary {
  const words = src.words.filter((w) => confirmed(status, w.ka));
  const held = src.words.filter((w) => !confirmed(status, w.ka));
  const pics = new Set(existsSync(PICS_DIR) ? readdirSync(PICS_DIR) : []);
  const known = new Set(src.words.map((w) => `${w.id}.webp`));
  return {
    dictionary: {
      categories: src.categories,
      words,
      noPic: words.filter((w) => !pics.has(`${w.id}.webp`)).map((w) => w.id),
    },
    held,
    orphanPics: [...pics].filter((f) => !known.has(f)).sort(),
  };
}

/** Texts of the dictionary the app may play: the confirmed words. */
export function dictionaryTexts(): string[] {
  return compileDictionary().dictionary.words.map((w) => w.ka);
}
