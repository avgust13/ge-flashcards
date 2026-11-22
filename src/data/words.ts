/**
 * The picture dictionary ("free practice"). The words are a small text file
 * (`content/dictionary.json`, built from content-src/dictionary.json); each
 * picture is a separate file fetched when a card shows it, and a word's audio
 * is a clip of the course store, found by its Georgian text.
 */
import { translit } from '../content/translit';
import type { Dictionary } from '../content/types';
import type { Category, Word } from '../types';
import { CATEGORIES } from './categories';

export const WORDS: Word[] = [];

export const pictureUrl = (id: number): string => `${import.meta.env.BASE_URL}pics/${id}.webp`;

/** Replace the dictionary in place (the arrays are shared by reference). Used by the loader and by tests. */
export function fillWords(dict: Dictionary): Word[] {
  const noPic = new Set(dict.noPic ?? []);
  const words = dict.words.map(
    (w): Word => ({
      id: w.id,
      ka: w.ka,
      tr: translit(w.ka),
      ru: w.ru,
      image: noPic.has(w.id) ? null : pictureUrl(w.id),
      cat: w.cat as Word['cat'],
      level: w.level,
      correct: 0,
      seen: 0,
    }),
  );
  CATEGORIES.splice(0, CATEGORIES.length, ...(dict.categories as Category[]));
  WORDS.splice(0, WORDS.length, ...words);
  return WORDS;
}

let loading: Promise<Word[]> | null = null;

/** Idempotent: fetch the dictionary (text only, well under 100 KB) and fill `WORDS` and `CATEGORIES`. */
export function loadWords(): Promise<Word[]> {
  if (!loading) {
    loading = (async () => {
      const response = await fetch(`${import.meta.env.BASE_URL}content/dictionary.json`);
      if (!response.ok) throw new Error(`Не удалось загрузить словарь: ${response.status}`);
      return fillWords((await response.json()) as Dictionary);
    })().catch((e) => {
      loading = null;
      throw e;
    });
  }
  return loading;
}
