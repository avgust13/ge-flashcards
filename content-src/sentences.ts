/**
 * Deterministic sentence bank: templates × verified verb forms × core words.
 * No model is involved, so every Georgian token is known by construction —
 * `scripts/content/validate.ts` re-checks that claim on the output.
 *
 * This file holds the hand-tuned templates of units 1–4. The generic
 * generators for later verbs are in cells.ts, hand-written lines in lines.ts.
 */
import type { Person, Polarity, Sentence, Tense } from '../src/content/types';
import { PERSONS, TENSES, cellCardId } from '../src/content/types';
import { cellSentences } from './cells';
import { KA_DAT, KA_NOM, NEG, PI, RU_DAT, RU_NOM, RU_U, build, cycler, ruSentence, word, type Part } from './dsl';
import { lex, type LexSrc, type RuGender } from './lexicon';
import { lineSentences } from './lines';
import { VERB_BY_ID, type VerbSrc } from './verbs';

export { RU_DAT, RU_NOM, RU_U };

/** Units that have content. Sentences that need anything from a later unit are not built. */
export const READY_UNITS = 16;

/** Units 1–4 keep their original schedule: a cell that arrives later gets its sentences from cells.ts. */
const TEMPLATE_UNITS = 4;

/** Unit of a cell, if these templates are the ones that teach it. */
function liveUnit(v: VerbSrc, t: Tense, p: Person): number | null {
  const u = v.cellUnit(t, p);
  return u != null && u <= TEMPLATE_UNITS ? u : null;
}

// ── Action verbs: делать, работать, говорить ───────────────────────────────

const ADVERBS: Record<Tense, ReadonlyArray<readonly [string, string]>> = {
  prs: [['dghes', 'сегодня'], ['akhla', 'сейчас']],
  fut: [['khval', 'завтра'], ['dghes', 'сегодня']],
  aor: [['gushin', 'вчера'], ['dghes', 'сегодня']],
};

const LANGS: ReadonlyArray<readonly [string, string]> = [
  ['kartulad', 'по-грузински'],
  ['rusulad', 'по-русски'],
  ['inglisurad', 'по-английски'],
];

function coreActionSentences(v: VerbSrc, out: Sentence[]): void {
  const nextLang = cycler(LANGS);
  for (const t of TENSES) {
    const advs = ADVERBS[t];
    for (const p of PERSONS) {
      const unit = liveUnit(v, t, p);
      if (unit == null) continue;
      const i = PI[p];
      const focus = cellCardId(v.id, t, p);
      const verb: Part = { t: v.forms[t][i], role: 'verb' };
      const vp = v.ruForms[t][i];
      const pron = RU_NOM[p];
      const base = { focus, verb: v, tense: t, person: p, unit };
      const id = (frame: string) => `${v.id}.${t}.${p}.${frame}`;
      const [a1, a2] = advs;
      const firstPerson = p === '1sg' || p === '1pl';

      out.push(build({
        ...base, id: id('pv'), frame: 'pv', polarity: 'aff',
        parts: [word(KA_NOM[p], 'subj'), verb],
        ru: ruSentence([pron, vp], 'aff'),
      }));
      out.push(build({
        ...base, id: id('neg'), frame: 'neg', polarity: 'neg',
        parts: [NEG, verb],
        ru: ruSentence([pron, 'не', vp], 'neg'),
      }));
      if (v.id === 'speak') {
        const [l1, r1] = nextLang();
        const [l2, r2] = nextLang();
        out.push(build({
          ...base, id: id('lang'), frame: 'lang', polarity: 'aff',
          parts: [word(l1, 'adv'), verb],
          ru: ruSentence([pron, vp, r1], 'aff'),
        }));
        out.push(build({
          ...base, id: id('langneg'), frame: 'langneg', polarity: 'neg',
          parts: [word(l2, 'adv'), NEG, verb],
          ru: ruSentence([pron, 'не', vp, r2], 'neg'),
        }));
      } else {
        out.push(build({
          ...base, id: id('adv'), frame: 'adv', polarity: 'aff',
          parts: [word(a1[0], 'adv'), verb],
          ru: ruSentence([a1[1], pron, vp], 'aff'),
        }));
        out.push(build({
          ...base, id: id('advneg'), frame: 'advneg', polarity: 'neg',
          parts: [word(a2[0], 'adv'), NEG, verb],
          ru: ruSentence([a2[1], pron, 'не', vp], 'neg'),
        }));
      }
      // A bare first-person question ("Я работаю?") is unnatural; anchor it with a time word.
      out.push(build(firstPerson
        ? {
            ...base, id: id('q'), frame: 'q', polarity: 'q',
            parts: [word(a1[0], 'adv'), verb],
            ru: ruSentence([a1[1], pron, vp], 'q'),
          }
        : {
            ...base, id: id('q'), frame: 'q', polarity: 'q',
            parts: [word(KA_NOM[p], 'subj'), verb],
            ru: ruSentence([pron, vp], 'q'),
          }));
    }
  }
}

// ── быть / жить + где ──────────────────────────────────────────────────────

interface Place {
  lexKey: string;
  ka: string;
  ru: string;
  card?: string;
  alts?: string[];
}

const PLACE = {
  ak: { lexKey: 'ak', ka: 'აქ', ru: 'здесь' },
  ik: { lexKey: 'ik', ka: 'იქ', ru: 'там' },
  sakhli: { lexKey: 'sakhli', ka: 'სახლში', ru: 'дома', card: 'c:shi', alts: ['სახლი', 'სახლზე'] },
  samsakhuri: { lexKey: 'samsakhuri', ka: 'სამსახურში', ru: 'на работе', card: 'c:shi', alts: ['სამსახური', 'სამსახურზე'] },
  tbilisi: { lexKey: 'tbilisi', ka: 'თბილისში', ru: 'в Тбилиси', card: 'c:shi', alts: ['თბილისი', 'თბილისზე'] },
  batumi: { lexKey: 'batumi', ka: 'ბათუმში', ru: 'в Батуми', card: 'c:shi', alts: ['ბათუმი', 'ბათუმზე'] },
  sakartvelo: { lexKey: 'sakartvelo', ka: 'საქართველოში', ru: 'в Грузии', card: 'c:shi', alts: ['საქართველო', 'საქართველოზე'] },
  kalaki: { lexKey: 'kalaki', ka: 'ქალაქში', ru: 'в городе', card: 'c:shi', alts: ['ქალაქი', 'ქალაქზე'] },
} satisfies Record<string, Place>;

const BE_PLACES: Place[] = [
  PLACE.ak, PLACE.sakhli, PLACE.tbilisi, PLACE.samsakhuri, PLACE.ik, PLACE.sakartvelo, PLACE.kalaki, PLACE.batumi,
];
const LIVE_PLACES: Place[] = [
  PLACE.tbilisi, PLACE.ak, PLACE.batumi, PLACE.sakartvelo, PLACE.ik, PLACE.kalaki,
];

const placePart = (pl: Place): Part => ({
  t: pl.ka, role: 'place', lexKey: pl.lexKey, card: pl.card, alts: pl.alts,
  form: pl.card === 'c:shi' ? 'shi' : undefined,
});

function placeVerbSentences(v: VerbSrc, places: Place[], out: Sentence[]): void {
  const next = cycler(places);
  // "быть" is taught before the -ში places, so each of its cells needs one
  // sentence that uses only «здесь / там».
  const nextSimple = v.id === 'be' ? cycler<Place>([PLACE.ak, PLACE.ik]) : next;
  for (const t of TENSES) {
    const [a1] = ADVERBS[t];
    for (const p of PERSONS) {
      const unit = liveUnit(v, t, p);
      if (unit == null) continue;
      const i = PI[p];
      const focus = cellCardId(v.id, t, p);
      const verb: Part = { t: v.forms[t][i], role: 'verb' };
      // Russian present of "быть" has no verb: «я дома».
      const vp = v.zeroCopula && t === 'prs' ? '' : v.ruForms[t][i];
      const pron = RU_NOM[p];
      const base = { focus, verb: v, tense: t, person: p, unit };
      const id = (frame: string) => `${v.id}.${t}.${p}.${frame}`;
      const firstPerson = p === '1sg' || p === '1pl';

      const p1 = nextSimple();
      out.push(build({
        ...base, id: id('ppl'), frame: 'ppl', polarity: 'aff',
        parts: [word(KA_NOM[p], 'subj'), placePart(p1), verb],
        ru: ruSentence([pron, vp, p1.ru], 'aff'),
      }));
      const p2 = next();
      out.push(build({
        ...base, id: id('plneg'), frame: 'plneg', polarity: 'neg',
        parts: [placePart(p2), NEG, verb],
        ru: ruSentence([pron, 'не', vp, p2.ru], 'neg'),
      }));
      const p3 = next();
      // "Вчера я жил в Батуми" is grammatical but odd; time words go only with "быть".
      if (t === 'prs' || v.id === 'live') {
        out.push(build({
          ...base, id: id('pl'), frame: 'pl', polarity: 'aff',
          parts: [placePart(p3), verb],
          ru: ruSentence([pron, vp, p3.ru], 'aff'),
        }));
      } else {
        out.push(build({
          ...base, id: id('advpl'), frame: 'advpl', polarity: 'aff',
          parts: [word(a1[0], 'adv'), placePart(p3), verb],
          ru: ruSentence([a1[1], pron, vp, p3.ru], 'aff'),
        }));
      }
      if (!firstPerson) {
        const p4 = next();
        out.push(build({
          ...base, id: id('plq'), frame: 'plq', polarity: 'q',
          parts: [placePart(p4), verb],
          ru: ruSentence([pron, vp, p4.ru], 'q'),
        }));
      }
      out.push(build({
        ...base, id: id('sad'), frame: 'sad', polarity: 'q',
        parts: [word('sad', 'qword'), verb],
        ru: ruSentence(['где', pron, vp], 'q'),
      }));
    }
  }
}

// ── «на столе»: вещи и -ზე ─────────────────────────────────────────────────

const RU_WAS: Record<RuGender, string> = { m: 'был', f: 'была', n: 'было', pl: 'были' };

function thingSentences(out: Sentence[]): void {
  const be = VERB_BY_ID.get('be')!;
  const onTable: Part = {
    t: 'მაგიდაზე', role: 'place', lexKey: 'magida', form: 'ze', card: 'c:ze', alts: ['მაგიდა', 'მაგიდაში'],
  };
  const things = ['telefoni', 'gasaghebi', 'tsigni'].map(lex);
  const unit = 3;
  const mk = (
    thing: LexSrc, t: Tense, frame: string, polarity: Polarity, parts: Part[], ru: string,
  ) =>
    out.push(build({
      id: `be.${t}.3sg.${frame}.${thing.key}`, focus: cellCardId('be', t, '3sg'), frame,
      verb: be, tense: t, person: '3sg', polarity, parts, ru, unit,
    }));

  for (const thing of things) {
    const subj = word(thing.key, 'subj');
    const prs: Part = { t: be.forms.prs[2], role: 'verb' };
    const aor: Part = { t: be.forms.aor[2], role: 'verb' };
    const was = RU_WAS[thing.g ?? 'm'];
    mk(thing, 'prs', 'thing', 'aff', [subj, onTable, prs], ruSentence([thing.ru, 'на столе'], 'aff'));
    mk(thing, 'prs', 'thingneg', 'neg', [subj, onTable, NEG, prs], ruSentence([thing.ru, 'не на столе'], 'neg'));
    mk(thing, 'prs', 'thingq', 'q', [subj, onTable, prs], ruSentence([thing.ru, 'на столе'], 'q'));
    mk(thing, 'prs', 'thingsad', 'q', [subj, word('sad', 'qword'), prs], ruSentence(['где', thing.ru], 'q'));
    mk(thing, 'aor', 'thing', 'aff', [subj, onTable, aor], ruSentence([thing.ru, was, 'на столе'], 'aff'));
  }
}

// ── Глаголы «мне…» ─────────────────────────────────────────────────────────

const RU_NEEDED: Record<RuGender, string> = { m: 'нужен', f: 'нужна', n: 'нужно', pl: 'нужны' };

const DATIVE_OBJECTS: Record<string, string[]> = {
  want: ['qava', 'chai', 'tsqali', 'ghvino', 'puri', 'es'],
  have: ['dro', 'puli', 'bileti', 'kitkhva', 'telefoni', 'gasaghebi'],
  need: ['dro', 'puli', 'tsqali', 'bileti', 'gasaghebi', 'es'],
  like: ['es', 'tbilisi', 'sakartvelo', 'qava', 'ghvino'],
  love: ['tbilisi', 'sakartvelo', 'qava', 'chai', 'ghvino'],
};

function dativeRu(v: VerbSrc, p: Person, obj: LexSrc, pol: Polarity): string {
  const i = PI[p];
  const neg = pol === 'neg';
  const g = obj.g ?? 'm';
  switch (v.id) {
    case 'want':
    case 'love':
      return ruSentence([RU_NOM[p], neg && 'не', v.ruForms.prs[i], obj.acc ?? obj.ru], pol);
    case 'have':
      return neg
        ? ruSentence([RU_U[p], 'нет', obj.gen ?? obj.ru], pol)
        : ruSentence([RU_U[p], 'есть', obj.ru], pol);
    case 'need':
      return ruSentence([RU_DAT[p], neg && 'не', RU_NEEDED[g], obj.ru], pol);
    case 'like':
      return ruSentence([RU_DAT[p], neg && 'не', g === 'pl' ? 'нравятся' : 'нравится', obj.ru], pol);
    default:
      throw new Error(`No Russian pattern for dative verb ${v.id}`);
  }
}

function dativeSentences(v: VerbSrc, out: Sentence[]): void {
  const next = cycler(DATIVE_OBJECTS[v.id].map(lex));
  const t: Tense = 'prs';
  for (const p of PERSONS) {
    const unit = liveUnit(v, t, p);
    if (unit == null) continue;
    const focus = cellCardId(v.id, t, p);
    const verb: Part = { t: v.forms[t][PI[p]], role: 'verb' };
    const pron = word(KA_DAT[p], 'subj');
    const base = { focus, verb: v, tense: t, person: p, unit };
    const id = (frame: string) => `${v.id}.${t}.${p}.${frame}`;
    const obj = (o: LexSrc): Part => word(o.key, 'obj');

    const o1 = next();
    out.push(build({
      ...base, id: id('po'), frame: 'po', polarity: 'aff',
      parts: [pron, obj(o1), verb], ru: dativeRu(v, p, o1, 'aff'),
    }));
    const o2 = next();
    out.push(build({
      ...base, id: id('o'), frame: 'o', polarity: 'aff',
      parts: [obj(o2), verb], ru: dativeRu(v, p, o2, 'aff'),
    }));
    const o3 = next();
    out.push(build({
      ...base, id: id('oneg'), frame: 'oneg', polarity: 'neg',
      parts: [obj(o3), NEG, verb], ru: dativeRu(v, p, o3, 'neg'),
    }));
    const o4 = next();
    out.push(build({
      ...base, id: id('poneg'), frame: 'poneg', polarity: 'neg',
      parts: [pron, obj(o4), NEG, verb], ru: dativeRu(v, p, o4, 'neg'),
    }));
    if (p !== '1sg' && p !== '1pl') {
      const o5 = next();
      out.push(build({
        ...base, id: id('oq'), frame: 'oq', polarity: 'q',
        parts: [obj(o5), verb], ru: dativeRu(v, p, o5, 'q'),
      }));
    }
  }
}

// ── Готовые фразы ──────────────────────────────────────────────────────────

interface PhraseSrc {
  id: string;
  unit: number;
  ka: string[];
  end: '.' | '?';
  ru: string;
}

export const PHRASES: PhraseSrc[] = [
  { id: 'ar-vitsi', unit: 1, ka: ['არ', 'ვიცი'], end: '.', ru: 'Не знаю.' },
  { id: 'ar-mesmis', unit: 1, ka: ['არ', 'მესმის'], end: '.', ru: 'Не понимаю.' },
  { id: 'ras-aketeb', unit: 2, ka: ['რას', 'აკეთებ'], end: '?', ru: 'Что делаешь?' },
  { id: 'rogor-khar', unit: 3, ka: ['როგორ', 'ხარ'], end: '?', ru: 'Как дела?' },
  { id: 'kargad-var', unit: 3, ka: ['კარგად', 'ვარ'], end: '.', ru: 'У меня всё хорошо.' },
];

function phraseSentences(out: Sentence[]): void {
  for (const ph of PHRASES) {
    out.push({
      id: ph.id,
      unit: ph.unit,
      focus: `s:${ph.id}`,
      frame: 'phrase',
      verb: null,
      tense: null,
      person: null,
      polarity: ph.end === '?' ? 'q' : 'aff',
      ka: ph.ka.join(' ') + ph.end,
      ru: ph.ru,
      tokens: ph.ka.map((t) => ({ t, role: 'other' as const })),
      req: [],
      fixed: true,
    });
  }
}

export function buildSentences(): Sentence[] {
  const out: Sentence[] = [];
  const v = (id: string) => {
    const verb = VERB_BY_ID.get(id);
    if (!verb) throw new Error(`Unknown verb ${id}`);
    return verb;
  };
  coreActionSentences(v('do'), out);
  coreActionSentences(v('work'), out);
  coreActionSentences(v('speak'), out);
  placeVerbSentences(v('be'), BE_PLACES, out);
  placeVerbSentences(v('live'), LIVE_PLACES, out);
  thingSentences(out);
  for (const id of ['want', 'have', 'need', 'like', 'love']) dativeSentences(v(id), out);
  phraseSentences(out);
  out.push(...cellSentences(), ...lineSentences());
  return out.filter((s) => s.unit <= READY_UNITS);
}
