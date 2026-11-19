/**
 * When to show the Latin transliteration under Georgian text.
 *
 * In `auto` mode it is a crutch that falls away by itself: a text gets a
 * transliteration only while it contains a letter the learner has not yet
 * learned (a letter card that has left its learning steps counts as learned).
 */
import { getCard, getSettings } from '../db/progress';

const GEORGIAN_LETTER = /[ა-ჿ]/;

/** Every Georgian letter of the text has been learned. */
export function lettersKnown(text: string): boolean {
  for (const ch of text) {
    if (!GEORGIAN_LETTER.test(ch)) continue;
    if (getCard(`l:${ch}`)?.state !== 2) return false;
  }
  return true;
}

/** Should a transliteration be shown under this text where the learner has to read it? */
export function trVisible(text: string): boolean {
  const mode = getSettings().translit;
  if (mode === 'always') return true;
  if (mode === 'never') return false;
  return !lettersKnown(text);
}

/**
 * Transliteration next to a revealed answer. It stays on in `auto` mode even
 * for known letters: after an attempt it confirms the reading rather than
 * replacing it.
 */
export function trOnReveal(): boolean {
  return getSettings().translit !== 'never';
}
