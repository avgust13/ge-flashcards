/**
 * The closed world of Georgian the course vouches for: every lexicon surface
 * and every verified verb form. Anything an AI writes is measured against it —
 * text made only of these forms is "in the tables", anything else is marked
 * as unchecked. The check says the WORDS exist; it cannot vouch for the
 * sentence as a whole.
 */
import { LEXICON, VERBS, courseVersion } from './store';
import { PERSONS, SCREEVES, joinTokens, verbForm, type Sentence, type Token } from './types';

const GEORGIAN = /[ა-ჿ]+/g;
const NEG = 'არ';
const shipped = (st: string | undefined): boolean => st === 'verified' || st === 'auto-verified';

let cache: { version: string; forms: Set<string>; byUnit: Array<{ unit: number; forms: string[] }> } | null = null;

function build() {
  const version = courseVersion();
  if (cache && cache.version === version) return cache;
  const forms = new Set<string>([NEG]);
  const units = new Map<number, string[]>();
  const add = (unit: number, form: string) => {
    if (forms.has(form) && form !== NEG) return;
    forms.add(form);
    const list = units.get(unit);
    if (list) list.push(form);
    else units.set(unit, [form]);
  };
  add(1, NEG);
  for (const l of LEXICON) {
    add(l.unit, l.ka);
    for (const f of l.forms) add(l.unit, f);
  }
  for (const v of VERBS) {
    for (const s of SCREEVES) {
      for (const p of PERSONS) {
        const form = verbForm(v, s, p);
        const key = `${s}.${p}` as const;
        if (!form || !shipped(v.status[key])) continue;
        // A form the course never turns into a card is still a real, checked form: unit 99 = "reference".
        add(v.cellUnit[key] ?? 99, form);
      }
    }
  }
  const byUnit = [...units].sort((a, b) => a[0] - b[0]).map(([unit, list]) => ({ unit, forms: list }));
  cache = { version, forms, byUnit };
  return cache;
}

/** Every Georgian word form the course has verified. */
export function knownForms(): ReadonlySet<string> {
  return build().forms;
}

/** The same forms grouped by the unit that teaches them, in a stable order (for prompts). */
export function knownFormsByUnit(): ReadonlyArray<{ unit: number; forms: string[] }> {
  return build().byUnit;
}

export interface GeorgianCheck {
  /** Distinct Georgian words of the text, in order of appearance. */
  words: string[];
  /** Those that are not in the tables. */
  unknown: string[];
  /** The text has Georgian in it and every word of it is a known form. */
  ok: boolean;
}

export function checkGeorgian(text: string): GeorgianCheck {
  const known = knownForms();
  const seen = new Set<string>();
  for (const m of text.matchAll(GEORGIAN)) {
    // Endings and prefixes written with a hyphen (-მა, მო-) and single letters are notation, not words.
    const before = text[m.index - 1];
    const after = text[m.index + m[0].length];
    if (before === '-' || after === '-' || [...m[0]].length === 1) continue;
    seen.add(m[0]);
  }
  const words = [...seen];
  const unknown = words.filter((w) => !known.has(w));
  return { words, unknown, ok: words.length > 0 && unknown.length === 0 };
}

const TRIM_START = /^[«"“„'(\[—–-]+/;
const TRIM_END = /[»"”'’)\].!?;:…—–-]+$/;

/**
 * Split a phrase into tiles: one word per token, a comma kept as the word's
 * trailing punctuation, everything else dropped. The final mark is the
 * phrase's own, "." when it has none.
 */
export function tokenizePhrase(text: string): { tokens: Token[]; end: '.' | '?' | '!' } {
  const trimmed = text.trim();
  const last = trimmed.slice(-1);
  const end = last === '?' || last === '!' ? last : '.';
  const tokens: Token[] = [];
  for (const chunk of trimmed.split(/\s+/)) {
    const comma = /,[»"”'’)\]]*$/.test(chunk);
    const word = chunk.replace(/,+/g, '').replace(TRIM_START, '').replace(TRIM_END, '');
    if (!word) continue;
    tokens.push(comma ? { t: word, role: 'other', after: ',' } : { t: word, role: 'other' });
  }
  // A comma before the final mark would read as ",." — drop it.
  const tail = tokens[tokens.length - 1];
  if (tail?.after) delete tail.after;
  return { tokens, end };
}

/** A phrase of the learner's own as a sentence the engine can drill. Its card is `s:<id>`. */
export function phraseSentence(id: string, ka: string, ru: string): Sentence {
  const { tokens, end } = tokenizePhrase(ka);
  return {
    id,
    // Not part of any unit; a high number lets every course phrase serve as a wrong option next to it.
    unit: 99,
    focus: `s:${id}`,
    frame: 'user',
    verb: null,
    tense: null,
    person: null,
    polarity: end === '?' ? 'q' : 'aff',
    ka: joinTokens(tokens, end),
    ru,
    tokens,
    req: [],
    fixed: true,
    strict: true,
  };
}
