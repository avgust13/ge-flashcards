/**
 * Building blocks for sentences. A sentence is never typed as free Georgian
 * text: every word is a reference — to a lexicon surface or to a cell of the
 * verb table — so each token is known by construction, and the validator can
 * re-check case and agreement on the result.
 */
import type {
  KaForm,
  Person,
  Polarity,
  Screeve,
  Sentence,
  Tense,
  Token,
  TokenRole,
} from '../src/content/types';
import { cellCardId, joinTokens, seriesTense, wordCardId } from '../src/content/types';
import { lex, surface } from './lexicon';
import { PATTERN_UNIT } from './patterns';
import { VERB_BY_ID, type VerbSrc } from './verbs';

export const PI: Record<Person, number> = { '1sg': 0, '2sg': 1, '3sg': 2, '1pl': 3, '2pl': 4, '3pl': 5 };

/** Lexeme keys of the Georgian subject pronouns, by case. */
export const KA_NOM: Record<Person, string> = {
  '1sg': 'me', '2sg': 'shen', '3sg': 'is', '1pl': 'chven', '2pl': 'tkven', '3pl': 'isini',
};
export const KA_DAT: Record<Person, string> = {
  '1sg': 'me', '2sg': 'shen', '3sg': 'mas', '1pl': 'chven', '2pl': 'tkven', '3pl': 'mat',
};
export const KA_ERG: Record<Person, string> = {
  '1sg': 'me', '2sg': 'shen', '3sg': 'man', '1pl': 'chven', '2pl': 'tkven', '3pl': 'mat',
};
export const RU_NOM: Record<Person, string> = {
  '1sg': 'я', '2sg': 'ты', '3sg': 'он', '1pl': 'мы', '2pl': 'вы', '3pl': 'они',
};
export const RU_DAT: Record<Person, string> = {
  '1sg': 'мне', '2sg': 'тебе', '3sg': 'ему', '1pl': 'нам', '2pl': 'вам', '3pl': 'им',
};
export const RU_U: Record<Person, string> = {
  '1sg': 'у меня', '2sg': 'у тебя', '3sg': 'у него', '1pl': 'у нас', '2pl': 'у вас', '3pl': 'у них',
};

export function verb(id: string): VerbSrc {
  const v = VERB_BY_ID.get(id);
  if (!v) throw new Error(`Unknown verb ${id}`);
  return v;
}

export function formOf(v: VerbSrc, s: Screeve, p: Person): string {
  const row = s === 'opt' ? v.opt : v.forms[s];
  if (!row) throw new Error(`Verb ${v.id} has no ${s} row`);
  return row[PI[p]];
}

export interface Part {
  t: string;
  role: TokenRole;
  lexKey?: string;
  form?: KaForm;
  /** Pattern card this token exercises (`c:shi`). */
  card?: string;
  alts?: string[];
  cell?: { verb: VerbSrc; s: Screeve; p: Person };
  after?: string;
}

/** A lexicon word in one of its surfaces. */
export const word = (key: string, role: TokenRole, extra: Partial<Part> = {}): Part => ({
  t: surface(key, extra.form),
  role,
  lexKey: key,
  ...extra,
});
/** A cell of the verb table. */
export const V = (verbId: string, s: Screeve, p: Person): Part => {
  const v = verb(verbId);
  return { t: formOf(v, s, p), role: 'verb', cell: { verb: v, s, p } };
};
export const NEG: Part = { t: 'არ', role: 'neg' };

/** The case a verb wants for its object in this tense. */
export function objForm(v: VerbSrc, s: Screeve): KaForm | undefined {
  const c = v.objCase?.[seriesTense(s)];
  if (!c) throw new Error(`Verb ${v.id} takes no object`);
  return c === 'nom' ? undefined : c;
}

/**
 * An attribute (adjective, possessive, numeral) in front of a noun. Before a
 * bare, genitive or instrumental noun it keeps its own form; before -ს and the
 * postpositions built on it, it takes its short form; before -მა, its own -მა.
 */
const ATTR_BY_NOUN: Partial<Record<KaForm, KaForm>> = {
  dat: 'dat', shi: 'dat', ze: 'dat', tan: 'dat', adv: 'dat', erg: 'erg',
};
export function attrFor(key: string, nounForm?: KaForm): Part {
  const want = nounForm ? ATTR_BY_NOUN[nounForm] : undefined;
  // Words ending in a vowel (პატარა, რვა) do not change.
  const form = want && lex(key).k?.[want] ? want : undefined;
  if (want && !form && /ი$/.test(lex(key).ka)) throw new Error(`Attribute ${key} needs a "${want}" form`);
  return word(key, 'attr', { form });
}

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function ruSentence(parts: Array<string | false | null | undefined>, pol: Polarity): string {
  const text = parts.filter((x): x is string => !!x).join(' ');
  return cap(text) + (pol === 'q' ? '?' : '.');
}

export interface Draft {
  id: string;
  focus: string;
  frame: string;
  verb?: VerbSrc;
  tense?: Screeve;
  person?: Person;
  polarity: Polarity;
  parts: Part[];
  ru: string;
  fixed?: boolean;
  strict?: boolean;
  /** Sentence-final mark when it is not implied by the polarity (an order: "!"). */
  end?: '.' | '?' | '!';
  /** Pattern cards the sentence shows besides those carried by its tokens. */
  cards?: string[];
  /** Unit of the focus card itself. */
  unit: number;
}

export function cellUnitOf(v: VerbSrc, s: Screeve, p: Person): number {
  const u = v.cellUnit(s, p);
  if (u == null) throw new Error(`Cell ${v.id}.${s}.${p} is reference only and cannot be used in a sentence`);
  return u;
}

export function build(d: Draft): Sentence {
  const req = new Set<string>();
  let unit = d.unit;
  const need = (card: string, u: number | undefined) => {
    req.add(card);
    if (u != null) unit = Math.max(unit, u);
  };
  // A set phrase is learned as one chunk: it may use words that are taught later.
  if (!d.fixed) {
    for (const p of d.parts) {
      if (p.lexKey) {
        const l = lex(p.lexKey);
        need(wordCardId(l.id), l.unit);
      }
      if (p.card) need(p.card, PATTERN_UNIT[p.card]);
      if (p.cell) need(cellCardId(p.cell.verb.id, p.cell.s, p.cell.p), cellUnitOf(p.cell.verb, p.cell.s, p.cell.p));
    }
    for (const c of d.cards ?? []) need(c, PATTERN_UNIT[c]);
    if (d.polarity === 'neg' && d.parts.some((p) => p.t === NEG.t)) req.add('c:neg');
    if (d.polarity === 'q') req.add('c:q');
  }
  req.delete(d.focus);
  const tokens: Token[] = d.parts.map((p) => {
    const t: Token = { t: p.t, role: p.role };
    if (p.alts?.length) t.alts = p.alts;
    if (p.card) t.pat = p.card;
    if (p.lexKey) {
      t.lex = lex(p.lexKey).id;
      if (p.form) t.form = p.form;
    }
    if (p.cell) t.cell = `${p.cell.verb.id}.${p.cell.s}.${p.cell.p}`;
    if (p.after) t.after = p.after;
    return t;
  });
  const end = d.end ?? (d.polarity === 'q' ? '?' : '.');
  const s: Sentence = {
    id: d.id,
    unit,
    focus: d.focus,
    frame: d.frame,
    verb: d.verb?.id ?? null,
    tense: d.tense ?? null,
    person: d.person ?? null,
    polarity: d.polarity,
    ka: joinTokens(tokens, end),
    ru: d.ru,
    tokens,
    req: [...req].sort(),
    fixed: !!d.fixed,
  };
  // An attribute must stay in front of its noun, so the order is fixed even in a generated frame.
  if (d.strict ?? d.parts.some((p) => p.role === 'attr')) s.strict = true;
  return s;
}

/** Round-robin picker, so fillers are spread evenly and the output is stable between builds. */
export function cycler<T>(items: readonly T[]): () => T {
  let i = 0;
  return () => items[i++ % items.length];
}

// ── hand-written lines ──────────────────────────────────────────────────────

export type Bit = Part | Part[];

/** Token helpers for hand-written lines: the role is in the name. */
export const sj = (key: string, form?: KaForm): Part => word(key, 'subj', { form });
export const ob = (key: string, form?: KaForm): Part => word(key, 'obj', { form });
export const at = (key: string, form?: KaForm): Part => word(key, 'place', { form });
export const av = (key: string, form?: KaForm): Part => word(key, 'adv', { form });
export const qw = (key: string, form?: KaForm): Part => word(key, 'qword', { form });
export const x = (key: string, form?: KaForm): Part => word(key, 'other', { form });
export const no = (key: string): Part => word(key, 'neg');
/** Attribute + noun, agreeing: np('chemi', 'megobari', 'dat') → ჩემს მეგობარს. */
export const np = (attr: string, noun: string, form?: KaForm, role: TokenRole = 'other'): Part[] => [
  attrFor(attr, form),
  word(noun, role, { form }),
];
/** The same token with decoys for the pattern card it shows. */
export const pat = (p: Part, card: string, ...alts: string[]): Part => ({ ...p, card, alts });
/** The same token followed by a comma. */
export const comma = (p: Part): Part => ({ ...p, after: ',' });

export interface LineOpts {
  /** Own card `s:<id>` — a set phrase or a line of a dialogue. Give the unit that teaches it. */
  fixed?: number;
  strict?: boolean;
  frame?: string;
  cards?: string[];
}

function focusUnit(focus: string): number {
  if (PATTERN_UNIT[focus] != null) return PATTERN_UNIT[focus];
  const m = /^c:([a-z0-9]+)\.(prs|aor|fut|opt)\.(1sg|2sg|3sg|1pl|2pl|3pl)$/.exec(focus);
  if (m) return cellUnitOf(verb(m[1]), m[2] as Screeve, m[3] as Person);
  return 1;
}

/**
 * One hand-written sentence. `focus` is the card it exercises (a verb cell or
 * a pattern); for a set phrase pass `fixed` and the card is the line itself.
 * The final mark comes from the Russian text.
 */
export function line(id: string, focus: string | null, ru: string, bits: Bit[], opts: LineOpts = {}): Sentence {
  const parts = bits.flat();
  const last = ru.slice(-1);
  const end = last === '?' || last === '!' ? last : '.';
  const negative = parts.some((p) => p.role === 'neg');
  const polarity: Polarity = end === '?' ? 'q' : negative ? 'neg' : 'aff';
  const verbs = parts.filter((p) => p.cell);
  const card = opts.fixed != null ? `s:${id}` : focus;
  if (!card) throw new Error(`Line ${id} needs a focus card`);
  const main = verbs.find((p) => cellCardId(p.cell!.verb.id, p.cell!.s, p.cell!.p) === card) ?? verbs[verbs.length - 1];
  const mainIdx = main ? parts.indexOf(main) : -1;
  // Free word order is only safe for the simplest shape: one verb, at the end.
  // Free word order is only safe for the simplest shape: one verb at the end, and before it
  // nothing whose place matters (an attribute before its noun, a conjunction, a predicate).
  const rigid = parts.some((p) => p.role === 'attr' || p.role === 'other');
  const strict = opts.strict ?? (opts.fixed != null || rigid || verbs.length !== 1 || mainIdx !== parts.length - 1);
  return build({
    id,
    focus: card,
    frame: opts.frame ?? (opts.fixed != null ? 'phrase' : 'line'),
    verb: main?.cell!.verb,
    tense: main?.cell!.s,
    person: main?.cell!.p,
    polarity,
    parts,
    ru,
    fixed: opts.fixed != null,
    strict,
    end,
    cards: opts.cards,
    unit: opts.fixed ?? focusUnit(card),
  });
}

export const tenseOf = (s: Screeve): Tense => seriesTense(s);
