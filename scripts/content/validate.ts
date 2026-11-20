/**
 * Closed-world check of the compiled course. Every Georgian token must come
 * from the verified verb table or the lexicon, and the grammar the sentences
 * rely on (negation placement, the case of subjects and objects, agreement of
 * attributes, question marks, unit order) is re-checked on the output rather
 * than trusted.
 *
 * Pure: returns a list of problems, empty when the course is shippable.
 */
import {
  CELL_RE,
  PERSONS,
  SCREEVES,
  TENSES,
  endMark,
  joinTokens,
  seriesTense,
  verbForm,
  type Course,
  type KaForm,
  type Lexeme,
  type Person,
  type Screeve,
  type Sentence,
  type Token,
  type Verb,
} from '../../src/content/types';
import { isGeorgianWord, translit } from '../../src/content/translit';

const NEG = 'არ';
/** «Должен»: the one particle that may stand between "не" (or a question word) and the verb. */
const MUST = 'უნდა';
const GEORGIAN = /[ა-ჿ]+/g;

/** Pronouns whose form does not show the case. */
const CASELESS = new Set(['მე', 'შენ', 'ჩვენ', 'თქვენ', 'მეც']);
/** Pronouns that are a case form in themselves. */
const PRON_CASE: Record<string, Array<'nom' | 'dat' | 'erg'>> = {
  ის: ['nom'],
  ისინი: ['nom'],
  ეს: ['nom'],
  მას: ['dat'],
  მათ: ['dat', 'erg'],
  მან: ['erg'],
  ვინ: ['nom', 'erg'],
};

/** Form an attribute takes in front of a noun in the given form (independent of the builder's own table). */
function attrFormFor(nounForm: KaForm | undefined): 'dat' | 'erg' | null {
  switch (nounForm) {
    case 'dat':
    case 'shi':
    case 'ze':
    case 'tan':
    case 'adv':
      return 'dat';
    case 'erg':
      return 'erg';
    default:
      return null;
  }
}

export interface CardInfo {
  id: string;
  unit: number;
}

/** Every card the course defines, in introduction order. */
export function cardsInOrder(course: Course): CardInfo[] {
  const out: CardInfo[] = [];
  for (const unit of course.units) {
    for (const step of unit.steps) {
      if (step.kind !== 'cards') continue;
      for (const id of step.cards) out.push({ id, unit: unit.id });
    }
  }
  return out;
}

function parseCell(id: string): { verb: string; tense: Screeve; person: Person } | null {
  const m = CELL_RE.exec(id);
  return m ? { verb: m[1], tense: m[2] as Screeve, person: m[3] as Person } : null;
}

/** Sentences that can serve as an example for the given card. */
export function examplesFor(cardId: string, sentences: Sentence[]): Sentence[] {
  return sentences.filter((s) => s.focus === cardId || s.req.includes(cardId));
}

const shipped = (st: string | undefined): boolean => st === 'verified' || st === 'auto-verified';

export function validateCourse(course: Course, sentences: Sentence[]): string[] {
  const errors: string[] = [];
  const err = (msg: string) => errors.push(msg);

  const verbs = new Map<string, Verb>(course.verbs.map((v) => [v.id, v]));
  const lexById = new Map(course.lexicon.map((l) => [l.id, l]));
  const patterns = new Map(course.patterns.map((p) => [p.id, p]));
  const fixed = new Map(sentences.filter((s) => s.fixed).map((s) => [s.id, s]));
  const readyUnits = new Set(course.units.filter((u) => u.ready).map((u) => u.id));

  // ── verbs ──────────────────────────────────────────────────────────────
  /** Every verb form that may appear in a sentence. */
  const verbForms = new Set<string>();
  for (const v of course.verbs) {
    for (const t of TENSES) {
      for (const p of PERSONS) {
        const f = v.forms[t]?.[p];
        if (!f || !isGeorgianWord(f)) err(`verb ${v.id}: form ${t}.${p} is missing or not Georgian: "${f}"`);
        if (!v.ruCells[t]?.[p]) err(`verb ${v.id}: Russian gloss ${t}.${p} is missing`);
      }
    }
    if (v.opt) {
      for (const p of PERSONS) {
        if (!isGeorgianWord(v.opt[p] ?? '')) err(`verb ${v.id}: optative ${p} is missing or not Georgian`);
        if (!v.ruOpt?.[p]) err(`verb ${v.id}: Russian gloss opt.${p} is missing`);
      }
    }
    if (!isGeorgianWord(v.lemma)) err(`verb ${v.id}: lemma is not Georgian`);
    for (const s of SCREEVES) {
      for (const p of PERSONS) {
        const f = verbForm(v, s, p);
        if (f && shipped(v.status[`${s}.${p}`])) verbForms.add(f);
      }
    }
  }

  // ── lexicon ────────────────────────────────────────────────────────────
  if (lexById.size !== course.lexicon.length) err('lexicon: duplicate ids');
  const surfaces = new Set<string>();
  for (const l of course.lexicon) {
    if (!isGeorgianWord(l.ka)) err(`lexeme ${l.id}: "${l.ka}" is not a single Georgian word`);
    surfaces.add(l.ka);
    for (const f of l.forms) {
      if (!isGeorgianWord(f)) err(`lexeme ${l.id}: form "${f}" is not Georgian`);
      surfaces.add(f);
    }
    if (l.status === 'needs-review') err(`lexeme ${l.id} "${l.ka}": a surface is confirmed by neither Wiktionary nor the corpus`);
  }
  const known = (word: string): boolean => word === NEG || surfaces.has(word) || verbForms.has(word);

  // ── letters ────────────────────────────────────────────────────────────
  const letters = new Map(course.letters.map((l) => [l.ch, l]));
  const groups = new Set(course.letterGroups.map((g) => g.id));
  if (course.letters.length !== 33 || letters.size !== 33) err(`alphabet: expected 33 distinct letters, got ${letters.size}`);
  const labels = new Set<string>();
  for (const l of course.letters) {
    const where = `letter ${l.ch}`;
    if ([...l.ch].length !== 1 || !isGeorgianWord(l.ch)) err(`${where}: not a single Mkhedruli letter`);
    if (translit(l.ch) !== l.tr) err(`${where}: transliteration "${l.tr}" disagrees with translit() ("${translit(l.ch)}")`);
    if (labels.has(l.ru)) err(`${where}: sound label "${l.ru}" is used by another letter — pairs would be indistinguishable`);
    labels.add(l.ru);
    if (!l.hintRu.trim()) err(`${where}: no pronunciation hint`);
    if (!groups.has(l.group)) err(`${where}: unknown group ${l.group}`);
    if (!l.say.startsWith(l.ch) || !isGeorgianWord(l.say)) err(`${where}: clip text "${l.say}" must start with the letter`);
    if (!isGeorgianWord(l.word.ka) || !l.word.ka.startsWith(l.ch)) err(`${where}: example word "${l.word.ka}" must start with the letter`);
    for (const other of [...l.lookAlike, ...l.soundAlike]) {
      if (other === l.ch) err(`${where}: lists itself as a look-alike`);
      if (!letters.has(other)) err(`${where}: unknown similar letter "${other}"`);
    }
  }
  for (const p of course.letterPairs) {
    const a = [...p.a.ka];
    const b = [...p.b.ka];
    const diff = a.length === b.length ? a.map((c, i) => (c === b[i] ? -1 : i)).filter((i) => i >= 0) : [];
    if (diff.length !== 1 || a[diff[0]] !== p.a.ch || b[diff[0]] !== p.b.ch) {
      err(`pair ${p.a.ka}/${p.b.ka}: the words must differ in exactly one letter, ${p.a.ch} vs ${p.b.ch}`);
    }
    if (!letters.get(p.a.ch)?.soundAlike.includes(p.b.ch)) err(`pair ${p.a.ka}/${p.b.ka}: ${p.a.ch} and ${p.b.ch} are not marked as sounding alike`);
  }

  // ── cards and units ────────────────────────────────────────────────────
  const order = cardsInOrder(course);
  const cardUnit = new Map<string, number>();
  for (const { id, unit } of order) {
    if (cardUnit.has(id)) err(`card ${id} is introduced twice`);
    cardUnit.set(id, unit);
    if (!readyUnits.has(unit)) err(`card ${id} sits in unit ${unit}, which is not ready`);

    if (id.startsWith('w:')) {
      const l = lexById.get(Number(id.slice(2)));
      if (!l) err(`card ${id}: no such lexeme`);
      else if (l.unit !== unit) err(`card ${id}: lexeme says unit ${l.unit}, introduced in unit ${unit}`);
    } else if (id.startsWith('s:')) {
      const s = fixed.get(id.slice(2));
      if (!s) err(`card ${id}: no such fixed phrase`);
      else if (s.unit !== unit) err(`card ${id}: the phrase says unit ${s.unit}, introduced in unit ${unit}`);
    } else if (id.startsWith('c:')) {
      const cell = parseCell(id);
      if (cell) {
        const v = verbs.get(cell.verb);
        if (!v) {
          err(`card ${id}: unknown verb`);
          continue;
        }
        const key = `${cell.tense}.${cell.person}` as const;
        if (v.cellUnit[key] !== unit) err(`card ${id}: verb table says unit ${v.cellUnit[key]}, introduced in unit ${unit}`);
        if (!shipped(v.status[key])) err(`card ${id}: form "${verbForm(v, cell.tense, cell.person)}" is not verified (${v.status[key] ?? 'no status'})`);
      } else {
        const p = patterns.get(id.slice(2));
        if (!p) err(`card ${id}: unknown pattern`);
        else if (p.unit !== unit) err(`card ${id}: pattern says unit ${p.unit}, introduced in unit ${unit}`);
      }
    } else {
      err(`card ${id}: unknown card kind`);
    }
  }

  // Everything scheduled for a ready unit must actually be taught there.
  // (Cells held back as unverified are reported by the build, not here.)
  for (const v of course.verbs) {
    for (const [key, unit] of Object.entries(v.cellUnit)) {
      if (unit != null && shipped(v.status[key as keyof typeof v.status]) && readyUnits.has(unit) && !cardUnit.has(`c:${v.id}.${key}`)) {
        err(`cell c:${v.id}.${key} belongs to unit ${unit} but no step introduces it`);
      }
    }
  }
  for (const l of course.lexicon) {
    if (readyUnits.has(l.unit) && !cardUnit.has(`w:${l.id}`)) err(`lexeme ${l.id} "${l.ka}" belongs to unit ${l.unit} but no step introduces it`);
  }
  for (const p of course.patterns) {
    if (readyUnits.has(p.unit) && !cardUnit.has(`c:${p.id}`)) err(`pattern c:${p.id} belongs to unit ${p.unit} but no step introduces it`);
  }
  for (const s of fixed.values()) {
    if (!cardUnit.has(`s:${s.id}`)) err(`fixed phrase ${s.id} is a card of unit ${s.unit} but no step introduces it`);
  }

  // Examples under the explanations are Georgian text too.
  for (const unit of course.units) {
    for (const step of unit.steps) {
      if (step.kind !== 'explain') continue;
      for (const e of step.examples) {
        for (const word of e.ka.match(GEORGIAN) ?? []) {
          if (!known(word)) err(`unit ${unit.id}, "${step.titleRu}": example word "${word}" is not a known form`);
        }
      }
    }
  }

  // …and so is every Georgian word quoted inside a Russian explanation or note.
  // Endings and prefixes written with a hyphen (-ში, მო-) and single letters are notation, not words.
  const quoted = (text: string): string[] => {
    const out: string[] = [];
    for (const m of text.matchAll(GEORGIAN)) {
      const before = text[m.index - 1];
      const after = text[m.index + m[0].length];
      if (before === '-' || after === '-' || [...m[0]].length === 1) continue;
      out.push(m[0]);
    }
    return out;
  };
  const prose = (where: string, text: string | null | undefined) => {
    for (const word of quoted(text ?? '')) {
      if (!known(word)) err(`${where}: the text quotes "${word}", which is not a known form`);
    }
  };
  for (const unit of course.units) {
    for (const step of unit.steps) {
      if (step.kind !== 'explain') continue;
      prose(`unit ${unit.id}, "${step.titleRu}"`, [step.titleRu, ...step.bodyRu].join(' '));
    }
  }
  for (const p of course.patterns) prose(`pattern c:${p.id}`, `${p.titleRu} ${p.noteRu}`);
  for (const l of course.lexicon) prose(`lexeme ${l.id} note`, l.note);
  for (const v of course.verbs) prose(`verb ${v.id} note`, v.noteRu);

  // ── sentences ──────────────────────────────────────────────────────────
  const seen = new Set<string>();
  const isVerb = (t: Token) => t.role === 'verb';
  for (const s of sentences) {
    const where = `sentence ${s.id}`;
    if (seen.has(s.id)) err(`${where}: duplicate id`);
    seen.add(s.id);

    const end = endMark(s.ka);
    if (end !== '.' && end !== '?' && end !== '!') err(`${where}: must end with ".", "?" or "!"`);
    if ((end === '?') !== (s.polarity === 'q')) err(`${where}: question mark and polarity "${s.polarity}" disagree`);
    if (s.ka !== joinTokens(s.tokens, end)) err(`${where}: text does not match its tokens`);
    if (!s.ru.trim()) err(`${where}: empty Russian prompt`);
    if (!readyUnits.has(s.unit)) err(`${where}: unit ${s.unit} is not ready`);

    // Closed world: where each word comes from.
    for (const t of s.tokens) {
      if (!isGeorgianWord(t.t)) err(`${where}: token "${t.t}" is not a Georgian word`);
      for (const a of t.alts ?? []) if (!isGeorgianWord(a)) err(`${where}: decoy "${a}" is not a Georgian word`);
      if (t.after && t.after !== ',') err(`${where}: unexpected punctuation "${t.after}" after "${t.t}"`);
      if (t.cell) {
        const cell = parseCell(`c:${t.cell}`);
        const v = cell ? verbs.get(cell.verb) : undefined;
        if (!cell || !v) err(`${where}: token "${t.t}" points at an unknown cell ${t.cell}`);
        else {
          if (verbForm(v, cell.tense, cell.person) !== t.t) err(`${where}: token "${t.t}" is not the form of ${t.cell}`);
          if (!shipped(v.status[`${cell.tense}.${cell.person}`])) err(`${where}: token "${t.t}" uses an unverified cell ${t.cell}`);
        }
        if (!isVerb(t)) err(`${where}: token "${t.t}" is a verb form without the verb role`);
      } else if (t.lex != null) {
        const l = lexById.get(t.lex);
        const want = l ? (t.form ? l.cases[t.form] : l.ka) : undefined;
        if (want !== t.t) err(`${where}: token "${t.t}" is not the ${t.form ?? 'dictionary'} form of lexeme ${t.lex}`);
      } else if (!known(t.t)) {
        err(`${where}: token "${t.t}" is neither a verified verb form nor in the lexicon`);
      }
    }

    for (const r of s.req) {
      const u = cardUnit.get(r);
      if (u == null) err(`${where}: requires ${r}, which no unit introduces`);
      else if (u > s.unit) err(`${where}: requires ${r} from unit ${u}, but the sentence is in unit ${s.unit}`);
    }

    if (s.fixed) {
      if (s.focus !== `s:${s.id}`) err(`${where}: fixed phrase must focus on its own card`);
      continue;
    }

    const focusUnit = cardUnit.get(s.focus);
    if (focusUnit == null) err(`${where}: focus ${s.focus} is not introduced by any unit`);
    else if (focusUnit > s.unit) err(`${where}: focus ${s.focus} is from unit ${focusUnit}, sentence in unit ${s.unit}`);

    const verbIdx = s.tokens.map((t, i) => (isVerb(t) ? i : -1)).filter((i) => i >= 0);
    const main = s.verb ? verbs.get(s.verb) : undefined;
    const focusCell = parseCell(s.focus);
    if (focusCell && (focusCell.verb !== s.verb || focusCell.tense !== s.tense || focusCell.person !== s.person)) {
      err(`${where}: focus ${s.focus} disagrees with its verb tags`);
    }
    if (s.verb) {
      if (!main || !s.tense || !s.person) {
        err(`${where}: incomplete verb tags`);
        continue;
      }
      const expected = verbForm(main, s.tense, s.person);
      if (!verbIdx.some((i) => s.tokens[i].t === expected)) err(`${where}: no token is ${main.id}.${s.tense}.${s.person} ("${expected}")`);
    } else if (verbIdx.length) {
      err(`${where}: has a verb token but no verb tags`);
    } else if (focusCell) {
      err(`${where}: focuses on a verb cell but has no verb`);
    }

    /** The verb a word depends on: the next one in the sentence, else the one before. */
    const governing = (i: number): { v: Verb; screeve: Screeve } | null => {
      const idx = verbIdx.find((x) => x > i) ?? [...verbIdx].reverse().find((x) => x < i);
      if (idx == null) return null;
      const cell = s.tokens[idx].cell ? parseCell(`c:${s.tokens[idx].cell}`) : null;
      if (cell) {
        const v = verbs.get(cell.verb);
        return v ? { v, screeve: cell.tense } : null;
      }
      return main && s.tense ? { v: main, screeve: s.tense } : null;
    };

    if (!s.strict) {
      if (verbIdx.length !== 1) err(`${where}: free word order needs exactly one verb, found ${verbIdx.length}`);
      else if (verbIdx[0] !== s.tokens.length - 1) err(`${where}: the verb must be the last word`);
    }

    const negIdx = s.tokens.map((t, i) => (t.role === 'neg' ? i : -1)).filter((i) => i >= 0);
    if (s.polarity === 'neg' && negIdx.length === 0) err(`${where}: negative sentence without a negation word`);
    if (s.polarity === 'aff' && negIdx.length > 0) err(`${where}: negation word in a sentence that is not negative`);
    for (const i of negIdx) {
      const next = s.tokens[i + 1];
      const ok = !!next && (isVerb(next) || (next.t === MUST && !!s.tokens[i + 2] && isVerb(s.tokens[i + 2])));
      if (!ok) err(`${where}: "${s.tokens[i].t}" must stand directly before the verb`);
    }
    for (const t of s.tokens) if (t.t === NEG && t.role !== 'neg') err(`${where}: "არ" token must have role neg`);

    s.tokens.forEach((t, i) => {
      const l: Lexeme | undefined = t.lex != null ? lexById.get(t.lex) : undefined;

      if (t.role === 'qword') {
        const next = s.tokens[i + 1];
        const ok = !!next && (isVerb(next) || next.role === 'neg' || next.t === MUST);
        if (!ok) err(`${where}: question word "${t.t}" must stand directly before the verb`);
      }

      if (t.role === 'subj' && l) {
        // A subject stands before its verb. With no verb after it («ეს კარგია») it is in the dictionary form.
        const g = verbIdx.some((x) => x > i) ? governing(i) : null;
        const want = g ? g.v.subjectCase[seriesTense(g.screeve)] : 'nom';
        if (want && !CASELESS.has(t.t)) {
          const has = PRON_CASE[t.t] ?? [t.form === 'pl' || !t.form ? 'nom' : t.form === 'dat' || t.form === 'erg' ? t.form : 'other'];
          if (!has.includes(want as never)) err(`${where}: subject "${t.t}" should be in the ${want} case`);
        }
        if ((t.form === 'erg' || t.t === 'მან') && s.focus !== 'c:erg' && !s.req.includes('c:erg')) {
          err(`${where}: an ergative subject ("${t.t}") without the pattern card c:erg`);
        }
      }

      if (t.role === 'obj' && l) {
        const g = governing(i);
        if (!g) err(`${where}: object "${t.t}" without a verb`);
        else if (!g.v.objCase) err(`${where}: verb ${g.v.id} takes no object, but "${t.t}" is marked as one`);
        else {
          const want = g.v.objCase[seriesTense(g.screeve)];
          const has = !t.form || t.form === 'pl' ? 'nom' : t.form;
          if (has !== want) err(`${where}: object "${t.t}" of ${g.v.id}.${g.screeve} should be in the ${want} case`);
        }
      }

      if (t.role === 'attr' && l) {
        const head = s.tokens.slice(i + 1).find((x) => x.role !== 'attr');
        if (!head || head.lex == null) {
          err(`${where}: attribute "${t.t}" is not followed by a word of the lexicon`);
          return;
        }
        const want = attrFormFor(head.form);
        const expected = want && l.cases[want] ? l.cases[want] : l.ka;
        if (want && !l.cases[want] && l.ka.endsWith('ი')) err(`${where}: attribute "${l.ka}" has no ${want} form for "${head.t}"`);
        else if (t.t !== expected) err(`${where}: attribute "${t.t}" before "${head.t}" should be "${expected}"`);
      }
    });
  }

  // ── an example must exist the moment a card is introduced ──────────────
  const introduced = new Set<string>();
  for (const { id } of order) {
    if (id.startsWith('c:') || id.startsWith('s:')) {
      const usable = examplesFor(id, sentences).some((s) =>
        [s.focus, ...s.req].every((r) => r === id || introduced.has(r)),
      );
      if (!usable) err(`card ${id}: no example sentence uses only material introduced before it`);
    }
    introduced.add(id);
  }

  return errors;
}
