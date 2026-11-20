/**
 * Example sentences for the verb cells taught from unit 5 on: three per cell
 * (a statement, a negation, a question or a second statement), built from each
 * verb's own list of things it is naturally said with. Deterministic, like the
 * templates of units 1–4.
 */
import type { KaForm, Person, Polarity, Screeve, Sentence, Tense } from '../src/content/types';
import { PERSONS, TENSES, cellCardId, seriesTense } from '../src/content/types';
import {
  KA_DAT,
  KA_ERG,
  KA_NOM,
  NEG,
  PI,
  RU_DAT,
  RU_NOM,
  RU_U,
  V,
  attrFor,
  build,
  cycler,
  objForm,
  ruSentence,
  verb,
  word,
  type Part,
} from './dsl';
import { lex, type LexSrc, type RuGender } from './lexicon';
import type { VerbSrc } from './verbs';

/** Cells of units 1–4 get their sentences from the older templates. */
const TEMPLATE_UNITS = 4;
const ERG_UNIT = 10;

/** Something a verb is said with: an object, a place, a time. */
interface Comp {
  /** Russian wording, already in the right case. */
  ru: string;
  /** The Russian phrase opens the sentence («завтра я…»). */
  pre?: boolean;
  parts: (v: VerbSrc, s: Screeve) => Part[];
  only?: Tense[];
  /** Makes no sense under a negation («не всё», «не иду оттуда») — statements and questions only. */
  noNeg?: boolean;
}

const ruNom = (l: LexSrc): string => l.ru.replace(/\s*\(.*\)$/, '');

/** A direct object: its case follows the verb and the tense. */
function O(key: string, opts: { only?: Tense[]; ru?: string; noNeg?: boolean } = {}): Comp {
  const l = lex(key);
  return {
    ru: opts.ru ?? l.acc ?? ruNom(l),
    only: opts.only,
    noNeg: opts.noNeg,
    parts: (v, s) => {
      const form = objForm(v, s);
      // Where the -ს comes and goes with the tense, it is a card of its own.
      const split = v.objCase!.prs !== v.objCase!.aor;
      return [form === 'dat' && split ? word(key, 'obj', { form, card: 'c:dat', alts: [l.ka] }) : word(key, 'obj', { form })];
    },
  };
}

/** «Всё» as an object: fine in a statement, awkward under "не". */
const ALL = (): Comp => O('qvelaperi', { noNeg: true });

/** Attribute + object: «десять лари». */
function AO(attr: string, noun: string, ru: string): Comp {
  return {
    ru,
    parts: (v, s) => {
      const form = objForm(v, s);
      return [attrFor(attr, form), word(noun, 'obj', { form })];
    },
  };
}

const POST_CARD: Partial<Record<KaForm, string>> = { shi: 'c:shi', ze: 'c:ze', dan: 'c:dan', tan: 'c:tan', ins: 'c:it' };

/** A word with a postposition or in the "by means of" form: where, where from, to whom, on what. */
function P(key: string, form: KaForm, ru: string, opts: { plain?: boolean; only?: Tense[]; noNeg?: boolean } = {}): Comp {
  const l = lex(key);
  // `plain`: the form is just a time word (დილით), not an instance of the pattern.
  const card = opts.plain ? undefined : POST_CARD[form];
  return {
    ru,
    only: opts.only,
    noNeg: opts.noNeg,
    parts: () => [word(key, 'place', { form, card, alts: card ? [l.ka] : undefined })],
  };
}

/** Attribute + a word in a named form: ნაღდი ფულით — «наличными». */
function AP(attr: string, noun: string, form: KaForm, ru: string): Comp {
  return { ru, parts: () => [attrFor(attr, form), word(noun, 'place', { form })] };
}

/** An adverb. Time words open the Russian sentence, manner words close it. */
function A(key: string, ru: string, opts: { pre?: boolean; only?: Tense[]; noNeg?: boolean } = {}): Comp {
  return { ru, pre: opts.pre, only: opts.only, noNeg: opts.noNeg, parts: () => [word(key, 'adv')] };
}

/** Two complements side by side: «в Тбилиси долго». */
function both(a: Comp, b: Comp, ru: string): Comp {
  return { ru, parts: (v, s) => [...a.parts(v, s), ...b.parts(v, s)] };
}

const TIME: Comp[] = [
  A('dghes', 'сегодня', { pre: true, only: ['prs'] }),
  A('khval', 'завтра', { pre: true, only: ['fut'] }),
  A('gushin', 'вчера', { pre: true, only: ['aor'] }),
];
/** Time words for verbs whose present needs an object to make sense («говорю что-то»). */
const TIME_NOT_NOW = TIME.filter((c) => !c.only!.includes('prs'));
const NOW = A('akhla', 'сейчас', { pre: true, only: ['prs'] });

interface Pick {
  (t: Tense, opts?: { neg?: boolean; avoid?: Comp[] }): Comp;
  /** Step the cycle once, so neighbouring cells do not all get the same complements. */
  rotate(): void;
}

/** Next complement that fits the tense, cycling through the list. */
function picker(comps: Comp[]): Pick {
  const next = cycler(comps);
  const pick = ((t, opts = {}) => {
    let fallback: Comp | null = null;
    for (let i = 0; i < comps.length; i++) {
      const c = next();
      if (c.only && !c.only.includes(t)) continue;
      if (opts.neg && c.noNeg) continue;
      // Prefer something the cell's other sentences have not used.
      if (opts.avoid?.includes(c)) {
        fallback ??= c;
        continue;
      }
      return c;
    }
    if (fallback) return fallback;
    throw new Error('No complement fits the tense ' + t);
  }) as Pick;
  pick.rotate = () => void next();
  return pick;
}

const firstPerson = (p: Person) => p === '1sg' || p === '1pl';
const third = (p: Person) => p === '3sg' || p === '3pl';

/** The subject pronoun in the case this verb wants in this tense. */
function subject(v: VerbSrc, s: Screeve, p: Person, cellUnit: number): Part | null {
  const c = v.subjectCase[seriesTense(s)];
  if (c === 'dat') return word(KA_DAT[p], 'subj');
  if (c === 'nom') return word(KA_NOM[p], 'subj');
  if (!third(p)) return word(KA_ERG[p], 'subj');
  // "Он" as the doer is მან, taught in unit 10; earlier cells simply go without a pronoun.
  if (cellUnit < ERG_UNIT) return null;
  return word(KA_ERG[p], 'subj', { card: 'c:erg', alts: p === '3sg' ? ['ის', 'მას'] : ['ისინი'] });
}

interface ActionOpts {
  /** Which "не" the verb takes: ვერ for «не понял», «не смогу». */
  neg?: (t: Tense) => 'ar' | 'ver';
  /**
   * How many of the first complements are safe for the first sentence of a
   * cell — they use only words taught before the verb itself, so the cell
   * always has an example the moment it is introduced.
   */
  early?: number;
}

function actionCells(verbId: string, comps: Comp[], out: Sentence[], opts: ActionOpts = {}): void {
  const v = verb(verbId);
  const next = picker(comps);
  const nextEarly = picker(comps.slice(0, opts.early ?? comps.length));
  for (const t of TENSES) {
    for (const p of PERSONS) {
      const unit = v.cellUnit(t, p);
      if (unit == null || unit <= TEMPLATE_UNITS) continue;
      const i = PI[p];
      const focus = cellCardId(v.id, t, p);
      const vt = V(v.id, t, p);
      const vp = v.ruForms[t][i];
      const pron = RU_NOM[p];
      const base = { focus, verb: v, tense: t, person: p, unit };
      const id = (frame: string) => `${v.id}.${t}.${p}.${frame}`;
      const ru = (c: Comp, pol: Polarity) =>
        ruSentence([c.pre && c.ru, pron, pol === 'neg' && 'не', vp, !c.pre && c.ru], pol);
      const negPart: Part = opts.neg?.(t) === 'ver' ? word('ver', 'neg', { card: 'c:ver', alts: ['არ'] }) : NEG;

      next.rotate();
      const c1 = nextEarly(t);
      const subj = subject(v, t, p, unit);
      out.push(build({
        ...base, id: id('ca'), frame: 'ca', polarity: 'aff',
        parts: [...(subj ? [subj] : []), ...c1.parts(v, t), vt], ru: ru(c1, 'aff'),
      }));
      const c2 = next(t, { neg: true, avoid: [c1] });
      out.push(build({
        ...base, id: id('cn'), frame: 'cn', polarity: 'neg',
        parts: [...c2.parts(v, t), negPart, vt], ru: ru(c2, 'neg'),
      }));
      // Shift by the person, so «я», «ты», «он»… do not all end up with the same third sentence.
      for (let k = 0; k < i; k++) next.rotate();
      const c3 = next(t, { avoid: [c1, c2] });
      out.push(build(firstPerson(p)
        ? { ...base, id: id('cb'), frame: 'cb', polarity: 'aff', parts: [...c3.parts(v, t), vt], ru: ru(c3, 'aff') }
        : { ...base, id: id('cq'), frame: 'cq', polarity: 'q', parts: [...c3.parts(v, t), vt], ru: ru(c3, 'q') }));
    }
  }
}

// ── Глаголы «мне…» ─────────────────────────────────────────────────────────

const RU_WAS: Record<RuGender, string> = { m: 'был', f: 'была', n: 'было', pl: 'были' };
const RU_NEEDED: Record<RuGender, string> = { m: 'нужен', f: 'нужна', n: 'нужно', pl: 'нужны' };
const RU_LIKED: Record<RuGender, string> = { m: 'понравился', f: 'понравилась', n: 'понравилось', pl: 'понравились' };

function dativeRu(v: VerbSrc, t: Tense, p: Person, obj: LexSrc, pol: Polarity): string {
  const i = PI[p];
  const neg = pol === 'neg';
  const g = obj.g ?? 'm';
  const nom = ruNom(obj);
  const gen = obj.gen ?? nom;
  const plural = g === 'pl';
  switch (v.id) {
    case 'want':
    case 'love':
      return ruSentence([RU_NOM[p], neg && 'не', v.ruForms[t][i], obj.acc ?? nom], pol);
    case 'can':
      // «Я это могу», «я всё мог»: the object goes in front, as Russian says it.
      return ruSentence([RU_NOM[p], obj.acc ?? nom, neg && 'не', v.ruForms[t][i]], pol);
    case 'have':
    case 'havea':
      if (t === 'prs') return neg ? ruSentence([RU_U[p], 'нет', gen], pol) : ruSentence([RU_U[p], 'есть', nom], pol);
      if (t === 'aor') return neg ? ruSentence([RU_U[p], 'не было', gen], pol) : ruSentence([RU_U[p], RU_WAS[g], nom], pol);
      return neg ? ruSentence([RU_U[p], 'не будет', gen], pol) : ruSentence([RU_U[p], plural ? 'будут' : 'будет', nom], pol);
    case 'need':
      if (t === 'prs') return ruSentence([RU_DAT[p], neg && 'не', RU_NEEDED[g], nom], pol);
      if (t === 'aor') return ruSentence([RU_DAT[p], neg && 'не', RU_WAS[g], RU_NEEDED[g], nom], pol);
      return ruSentence([RU_DAT[p], neg && 'не', plural ? 'понадобятся' : 'понадобится', nom], pol);
    case 'like':
      if (t === 'prs') return ruSentence([RU_DAT[p], neg && 'не', plural ? 'нравятся' : 'нравится', nom], pol);
      if (t === 'aor') return ruSentence([RU_DAT[p], neg && 'не', RU_LIKED[g], nom], pol);
      return ruSentence([RU_DAT[p], neg && 'не', plural ? 'понравятся' : 'понравится', nom], pol);
    default:
      throw new Error(`No Russian pattern for dative verb ${v.id}`);
  }
}

interface DativeOpts {
  /** The first `early` objects are taught before the verb itself. */
  early?: number;
  /** Objects that read badly under a negation («не могу всё»). */
  noNeg?: string[];
}

function dativeCells(verbId: string, objects: string[], out: Sentence[], opts: DativeOpts = {}): void {
  const v = verb(verbId);
  const all = objects.map(lex);
  const next = cycler(all);
  const nextEarly = cycler(all.slice(0, opts.early ?? all.length));
  /** Next object, skipping the ones already used in this cell and (for a negation) the unsuitable ones. */
  const pick = (used: LexSrc[], neg = false): LexSrc => {
    let fallback: LexSrc | null = null;
    for (let i = 0; i < all.length; i++) {
      const o = next();
      if (neg && opts.noNeg?.includes(o.key)) continue;
      if (used.includes(o)) {
        fallback ??= o;
        continue;
      }
      return o;
    }
    if (fallback) return fallback;
    throw new Error(`No object left for ${verbId}`);
  };
  for (const t of TENSES) {
    for (const p of PERSONS) {
      const unit = v.cellUnit(t, p);
      if (unit == null || unit <= TEMPLATE_UNITS) continue;
      const focus = cellCardId(v.id, t, p);
      const vt = V(v.id, t, p);
      const pron = word(KA_DAT[p], 'subj');
      const base = { focus, verb: v, tense: t, person: p, unit };
      const id = (frame: string) => `${v.id}.${t}.${p}.${frame}`;
      const obj = (o: LexSrc): Part => word(o.key, 'obj');

      const o1 = nextEarly();
      out.push(build({
        ...base, id: id('dp'), frame: 'dp', polarity: 'aff',
        parts: [pron, obj(o1), vt], ru: dativeRu(v, t, p, o1, 'aff'),
      }));
      const o2 = pick([o1], true);
      out.push(build({
        ...base, id: id('dn'), frame: 'dn', polarity: 'neg',
        parts: [obj(o2), NEG, vt], ru: dativeRu(v, t, p, o2, 'neg'),
      }));
      const o3 = pick([o1, o2]);
      out.push(build(firstPerson(p)
        ? { ...base, id: id('do'), frame: 'do', polarity: 'aff', parts: [obj(o3), vt], ru: dativeRu(v, t, p, o3, 'aff') }
        : { ...base, id: id('dq'), frame: 'dq', polarity: 'q', parts: [obj(o3), vt], ru: dativeRu(v, t, p, o3, 'q') }));
    }
  }
}

// ── «Могу / должен / хочу» + действие ──────────────────────────────────────

/** Russian infinitive of the verbs that have a «чтобы»-form. */
const RU_INF: Record<string, string> = {
  do: 'сделать',
  work: 'работать',
  speak: 'говорить',
  be: 'быть',
  buy: 'купить',
  go: 'пойти',
  come: 'прийти',
  see: 'увидеть',
  eat: 'поесть',
  drink: 'выпить',
};
const RU_MUST: Record<Person, string> = {
  '1sg': 'долж{ен|на}', '2sg': 'должен', '3sg': 'должен', '1pl': 'должны', '2pl': 'должны', '3pl': 'должны',
};

const UNDA = (): Part => word('unda', 'other', { card: 'c:unda' });

/**
 * «Могу» with a second verb: შემიძლია გავაკეთო. Present only — after the
 * past შემეძლო Georgian wants a different form (the pluperfect), which the
 * course does not teach.
 */
function canWithVerb(others: string[], out: Sentence[]): void {
  const v = verb('can');
  const next = cycler(others);
  const t: Tense = 'prs';
  for (const p of PERSONS) {
    const unit = v.cellUnit(t, p);
    if (unit == null) continue;
    const focus = cellCardId(v.id, t, p);
    const vt = V(v.id, t, p);
    const vp = v.ruForms[t][PI[p]];
    const base = { focus, verb: v, tense: t, person: p, unit, strict: true };
    const id = (frame: string) => `${v.id}.${t}.${p}.${frame}`;
    const x1 = next();
    out.push(build({
      ...base, id: id('vv'), frame: 'vv', polarity: 'aff',
      parts: [vt, V(x1, 'opt', p)], ru: ruSentence([RU_NOM[p], vp, RU_INF[x1]], 'aff'),
    }));
    const x2 = next();
    out.push(build({
      ...base, id: id('vvn'), frame: 'vvn', polarity: 'neg',
      parts: [NEG, vt, V(x2, 'opt', p)], ru: ruSentence([RU_NOM[p], 'не', vp, RU_INF[x2]], 'neg'),
    }));
  }
}

function optCells(verbId: string, comps: Comp[], out: Sentence[]): void {
  const v = verb(verbId);
  if (!v.opt) throw new Error(`Verb ${verbId} has no optative`);
  const next = picker(comps);
  const inf = RU_INF[verbId];
  for (const p of PERSONS) {
    const unit = v.cellUnit('opt', p);
    if (unit == null) continue;
    const focus = cellCardId(v.id, 'opt', p);
    const vt = V(v.id, 'opt', p);
    const base = { focus, verb: v, tense: 'opt' as Screeve, person: p, unit, strict: true };
    const id = (frame: string) => `${v.id}.opt.${p}.${frame}`;

    // «Хочу пойти» for the speaker and the listener; «он может пойти» for the rest.
    const helper = third(p) ? 'can' : 'want';
    const hv = verb(helper);
    out.push(build({
      ...base, id: id('ow'), frame: 'ow', polarity: 'aff',
      parts: [V(helper, 'prs', p), vt],
      ru: ruSentence([RU_NOM[p], hv.ruForms.prs[PI[p]], inf], 'aff'),
    }));
    const c = next('aor');
    out.push(build({
      ...base, id: id('om'), frame: 'om', polarity: 'aff',
      parts: [...c.parts(v, 'opt'), UNDA(), vt],
      ru: ruSentence([c.pre && c.ru, RU_NOM[p], RU_MUST[p], inf, !c.pre && c.ru], 'aff'),
    }));
    out.push(build(firstPerson(p)
      ? {
          ...base, id: id('on'), frame: 'on', polarity: 'neg',
          parts: [NEG, UNDA(), vt], ru: ruSentence([RU_NOM[p], 'не', RU_MUST[p], inf], 'neg'),
        }
      : {
          ...base, id: id('oq'), frame: 'oq', polarity: 'q',
          parts: [UNDA(), vt], ru: ruSentence([RU_NOM[p], RU_MUST[p], inf], 'q'),
        }));
  }
}

// ── Что с чем говорят ──────────────────────────────────────────────────────

const HOME = P('sakhli', 'shi', 'домой');
const LANG_OBJ = [O('kartuli'), O('rusuli'), O('inglisuri')];
const LANG_ADV = [A('kartulad', 'по-грузински'), A('rusulad', 'по-русски'), A('inglisurad', 'по-английски')];
/** After a "должен": the tense words that make sense with a plan. */
const PLAN_TIME = [A('khval', 'завтра', { pre: true }), A('dghes', 'сегодня', { pre: true })];
const LONG = A('didkhans', 'долго');

export function cellSentences(): Sentence[] {
  const out: Sentence[] = [];
  const ver = (t: Tense) => (t === 'prs' ? 'ar' : 'ver');

  // The 3rd-person past of the first verbs, held back until the ergative (unit 10).
  actionCells('do', [O('es'), ...TIME, ALL()], out);
  actionCells('work', [P('tbilisi', 'shi', 'в Тбилиси'), ...TIME, P('batumi', 'shi', 'в Батуми')], out);
  actionCells('speak', LANG_ADV, out);
  // «Жил» as a finished stretch needs its length: «долго жил в Тбилиси».
  actionCells(
    'live',
    [
      both(P('tbilisi', 'shi', ''), LONG, 'в Тбилиси долго'),
      both(P('ruseti', 'shi', ''), LONG, 'в России долго'),
      both(P('batumi', 'shi', ''), LONG, 'в Батуми долго'),
    ],
    out,
  );

  actionCells('know', [O('kartuli'), O('es'), O('rusuli'), O('inglisuri'), ALL()], out, { early: 4 });
  actionCells(
    'understand',
    [O('kartuli', { only: ['prs'] }), O('es'), O('rusuli', { only: ['prs'] }), ALL(), O('inglisuri', { only: ['prs'] })],
    out,
    { neg: ver, early: 2 },
  );
  actionCells('learn', LANG_OBJ, out);
  actionCells(
    'buy',
    [O('puri'), O('bileti'), O('ghvino'), O('tsigni'), O('es'), O('qveli'), O('khili'), O('khachapuri')],
    out,
    { early: 5 },
  );
  // Places one walks to; cities take «ехать» in Russian and live in the hand-written lines.
  actionCells(
    'go',
    [
      HOME, P('samsakhuri', 'shi', 'на работу'), P('maghazia', 'shi', 'в магазин'), P('megobari', 'tan', 'к другу'),
      P('bazari', 'shi', 'на рынок'), P('zghva', 'ze', 'на море'), ...TIME, P('tsentri', 'shi', 'в центр'),
      P('kafe', 'shi', 'в кафе'),
    ],
    out,
    { early: 2 },
  );
  // «Иду сюда» already says "here", so the present takes "from where" and "now"; «приду домой» comes later.
  actionCells(
    'come',
    [
      NOW, P('sakhli', 'shi', 'домой', { only: ['fut', 'aor'] }), A('ak', 'сюда', { only: ['fut', 'aor'] }),
      P('samsakhuri', 'dan', 'с работы', { noNeg: true }), ...TIME, P('maghazia', 'dan', 'из магазина', { noNeg: true }),
      P('bazari', 'dan', 'с рынка', { noNeg: true }), P('megobari', 'tan', 'к другу', { only: ['fut', 'aor'] }),
    ],
    out,
    { early: 3 },
  );
  actionCells('see', [O('zghva'), O('megobari'), O('sakhli'), O('mankana'), O('kalaki')], out);
  actionCells(
    'eat',
    [O('khachapuri'), O('khili'), O('puri'), O('khortsi'), O('tevzi'), O('khinkali'), O('salati'), O('supi')],
    out,
    { early: 3 },
  );
  actionCells('drink', [O('qava'), O('tsqali'), O('chai'), O('ghvino'), O('ludi'), O('tsveni'), O('rdze')], out, { early: 4 });
  actionCells(
    'pay',
    [
      A('ak', 'здесь'), ...TIME, P('barati', 'ins', 'картой'), O('angarishi', { ru: 'по счёту' }),
      AP('naghdi', 'puli', 'ins', 'наличными'), AO('ati', 'lari', 'десять лари'), AO('otsi', 'lari', 'двадцать лари'),
    ],
    out,
    { early: 4 },
  );
  actionCells('wait', [O('megobari'), O('avtobusi'), O('deda'), O('taksi'), O('ekimi'), A('ak', 'здесь')], out);
  // «Говорю» alone reads as "разговариваю", so the present always names what is said.
  actionCells('say', [O('es'), ALL(), ...TIME_NOT_NOW, A('ase', 'так')], out, { early: 4 });
  actionCells('think', [P('es', 'ze', 'об этом'), ...TIME, NOW, A('ase', 'так')], out, { early: 5 });
  actionCells('write', [O('es'), A('kartulad', 'по-грузински'), O('tserili'), O('misamarti')], out, { early: 2 });
  actionCells('read', [O('tsigni'), O('es'), A('kartulad', 'по-грузински'), O('tserili')], out, { early: 3 });
  actionCells(
    'begin',
    [O('es'), ...TIME, A('adre', 'рано'), O('mushaoba'), P('dila', 'ins', 'утром', { plain: true })],
    out,
    { early: 5 },
  );

  // «Мне…» verbs: the past (unit 10) and the future (unit 11) of the unit-4 verbs, and «иметь кого-то».
  dativeCells('want', ['qava', 'chai', 'tsqali', 'ghvino', 'puri', 'es'], out);
  dativeCells('have', ['dro', 'puli', 'bileti', 'kitkhva', 'telefoni', 'gasaghebi'], out);
  dativeCells('need', ['dro', 'puli', 'tsqali', 'bileti', 'gasaghebi', 'es'], out);
  dativeCells('like', ['es', 'tbilisi', 'sakartvelo', 'qava', 'ghvino', 'khachapuri', 'pilmi'], out);
  // No «сестра» here: without a pronoun in front, და at the start of a sentence reads as "и".
  dativeCells('havea', ['megobari', 'mankana', 'dzma', 'dzaghli', 'bavshvi', 'kata', 'shvili'], out, { early: 2 });
  dativeCells('can', ['es', 'qvelaperi'], out, { noNeg: ['qvelaperi'] });
  canWithVerb(['do', 'go', 'buy', 'see', 'work'], out);

  optCells('do', [O('es'), ...PLAN_TIME, ALL()], out);
  optCells('go', [HOME, P('samsakhuri', 'shi', 'на работу'), ...PLAN_TIME, P('maghazia', 'shi', 'в магазин')], out);
  optCells('buy', [O('bileti'), O('puri'), O('khili'), O('ghvino')], out);
  optCells('see', [O('megobari'), O('zghva'), O('tbilisi'), O('es')], out);
  optCells('work', [...PLAN_TIME, P('sakhli', 'shi', 'дома')], out);
  optCells('be', [P('sakhli', 'shi', 'дома'), P('samsakhuri', 'shi', 'на работе'), A('ak', 'здесь'), A('ik', 'там')], out);
  optCells('come', [A('ak', 'сюда'), HOME, ...PLAN_TIME], out);
  optCells('eat', [O('khachapuri'), O('khili'), O('supi'), O('khinkali')], out);
  optCells('drink', [O('tsqali'), O('chai'), O('qava'), O('tsveni')], out);
  optCells('speak', LANG_ADV, out);

  return out;
}
