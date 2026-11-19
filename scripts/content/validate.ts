/**
 * Closed-world check of the compiled course. Every Georgian token must come
 * from the verified verb table or the lexicon, and grammar that the templates
 * rely on (negation placement, subject case, question marks, unit order) is
 * re-checked on the output rather than trusted.
 *
 * Pure: returns a list of problems, empty when the course is shippable.
 */
import {
  PERSONS,
  TENSES,
  type Course,
  type Person,
  type Sentence,
  type Tense,
  type Verb,
} from '../../src/content/types';
import { isGeorgianWord } from '../../src/content/translit';

const NOM_PRON: Record<Person, string> = {
  '1sg': 'მე', '2sg': 'შენ', '3sg': 'ის', '1pl': 'ჩვენ', '2pl': 'თქვენ', '3pl': 'ისინი',
};
const DAT_PRON: Record<Person, string> = {
  '1sg': 'მე', '2sg': 'შენ', '3sg': 'მას', '1pl': 'ჩვენ', '2pl': 'თქვენ', '3pl': 'მათ',
};
const ALL_PRONOUNS = new Set([...Object.values(NOM_PRON), ...Object.values(DAT_PRON), 'მან']);
const NEG = 'არ';

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

function parseCell(id: string): { verb: string; tense: Tense; person: Person } | null {
  const m = /^c:([a-z]+)\.(prs|aor|fut)\.(1sg|2sg|3sg|1pl|2pl|3pl)$/.exec(id);
  return m ? { verb: m[1], tense: m[2] as Tense, person: m[3] as Person } : null;
}

/** Sentences that can serve as an example for the given card. */
export function examplesFor(cardId: string, sentences: Sentence[]): Sentence[] {
  return sentences.filter((s) => s.focus === cardId || s.req.includes(cardId));
}

export function validateCourse(course: Course, sentences: Sentence[]): string[] {
  const errors: string[] = [];
  const err = (msg: string) => errors.push(msg);

  const verbs = new Map<string, Verb>(course.verbs.map((v) => [v.id, v]));
  const lexById = new Map(course.lexicon.map((l) => [l.id, l]));
  const patterns = new Map(course.patterns.map((p) => [p.id, p]));
  const fixed = new Map(sentences.filter((s) => s.fixed).map((s) => [s.id, s]));
  const readyUnits = new Set(course.units.filter((u) => u.ready).map((u) => u.id));

  // ── verbs ──────────────────────────────────────────────────────────────
  for (const v of course.verbs) {
    for (const t of TENSES) {
      for (const p of PERSONS) {
        const f = v.forms[t]?.[p];
        if (!f || !isGeorgianWord(f)) err(`verb ${v.id}: form ${t}.${p} is missing or not Georgian: "${f}"`);
        if (!v.ruCells[t]?.[p]) err(`verb ${v.id}: Russian gloss ${t}.${p} is missing`);
      }
    }
    if (!isGeorgianWord(v.lemma)) err(`verb ${v.id}: lemma is not Georgian`);
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
      if (!fixed.has(id.slice(2))) err(`card ${id}: no such fixed phrase`);
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
        const st = v.status[key];
        if (st !== 'verified' && st !== 'auto-verified') err(`card ${id}: form "${v.forms[cell.tense][cell.person]}" is not verified (${st ?? 'no status'})`);
      } else {
        const p = patterns.get(id.slice(2));
        if (!p) err(`card ${id}: unknown pattern`);
        else if (p.unit !== unit) err(`card ${id}: pattern says unit ${p.unit}, introduced in unit ${unit}`);
      }
    } else {
      err(`card ${id}: unknown card kind`);
    }
  }

  // Every cell the verb table schedules for a ready unit must actually be taught.
  // (Cells held back as unverified are reported by the build, not here.)
  for (const v of course.verbs) {
    for (const [key, unit] of Object.entries(v.cellUnit)) {
      const st = v.status[key as keyof typeof v.status];
      const shippable = st === 'verified' || st === 'auto-verified';
      if (unit != null && shippable && readyUnits.has(unit) && !cardUnit.has(`c:${v.id}.${key}`)) {
        err(`cell c:${v.id}.${key} belongs to unit ${unit} but no step introduces it`);
      }
    }
  }

  // ── sentences ──────────────────────────────────────────────────────────
  const seen = new Set<string>();
  for (const s of sentences) {
    const where = `sentence ${s.id}`;
    if (seen.has(s.id)) err(`${where}: duplicate id`);
    seen.add(s.id);

    const isQ = s.ka.endsWith('?');
    if (!isQ && !s.ka.endsWith('.')) err(`${where}: must end with "." or "?"`);
    if (isQ !== (s.polarity === 'q')) err(`${where}: question mark and polarity "${s.polarity}" disagree`);
    if (s.ka.slice(0, -1) !== s.tokens.map((t) => t.t).join(' ')) err(`${where}: text does not match its tokens`);
    if (!s.ru.trim()) err(`${where}: empty Russian prompt`);
    for (const t of s.tokens) {
      if (!isGeorgianWord(t.t)) err(`${where}: token "${t.t}" is not a Georgian word`);
      for (const a of t.alts ?? []) if (!isGeorgianWord(a)) err(`${where}: decoy "${a}" is not a Georgian word`);
    }
    if (!readyUnits.has(s.unit)) err(`${where}: unit ${s.unit} is not ready`);

    for (const r of s.req) {
      const u = cardUnit.get(r);
      if (u == null) err(`${where}: requires ${r}, which no unit introduces`);
      else if (u > s.unit) err(`${where}: requires ${r} from unit ${u}, but the sentence is in unit ${s.unit}`);
    }

    if (s.fixed) {
      if (s.focus !== `s:${s.id}`) err(`${where}: fixed phrase must focus on its own card`);
      continue;
    }

    const cell = parseCell(s.focus);
    const v = s.verb ? verbs.get(s.verb) : undefined;
    if (!cell || !v || !s.tense || !s.person) {
      err(`${where}: template sentence without a verb cell`);
      continue;
    }
    if (cell.verb !== s.verb || cell.tense !== s.tense || cell.person !== s.person) {
      err(`${where}: focus ${s.focus} disagrees with its verb tags`);
    }
    const focusUnit = cardUnit.get(s.focus);
    if (focusUnit == null) err(`${where}: focus ${s.focus} is not introduced by any unit`);
    else if (focusUnit > s.unit) err(`${where}: focus ${s.focus} is from unit ${focusUnit}, sentence in unit ${s.unit}`);

    const verbIdx = s.tokens.map((t, i) => (t.role === 'verb' ? i : -1)).filter((i) => i >= 0);
    if (verbIdx.length !== 1) {
      err(`${where}: expected exactly one verb token, found ${verbIdx.length}`);
      continue;
    }
    const vi = verbIdx[0];
    const expected = v.forms[s.tense][s.person];
    if (s.tokens[vi].t !== expected) err(`${where}: verb token "${s.tokens[vi].t}" is not ${v.id}.${s.tense}.${s.person} ("${expected}")`);
    if (vi !== s.tokens.length - 1) err(`${where}: the verb must be the last word`);

    const negIdx = s.tokens.map((t, i) => (t.t === NEG ? i : -1)).filter((i) => i >= 0);
    if (s.polarity === 'neg') {
      if (negIdx.length !== 1 || negIdx[0] !== vi - 1) err(`${where}: "არ" must stand exactly once, directly before the verb`);
      if (s.tokens[negIdx[0]]?.role !== 'neg') err(`${where}: "არ" token must have role neg`);
    } else if (negIdx.length > 0) {
      err(`${where}: "არ" in a sentence that is not negative`);
    }

    s.tokens.forEach((t, i) => {
      if (i === vi || t.t === NEG) return;
      if (!surfaces.has(t.t)) err(`${where}: token "${t.t}" is not in the lexicon`);
      if (t.role === 'qword') {
        const next = s.tokens[i + 1];
        const ok = i + 1 === vi || (next?.t === NEG && i + 2 === vi);
        if (!ok) err(`${where}: question word "${t.t}" must stand directly before the verb`);
      }
    });

    // Subject pronoun must be in the case this verb takes in this tense.
    const subjCase = v.kind === 'dative' ? 'dat' : v.subjectCase[s.tense];
    if (subjCase === 'erg' && (s.person === '3sg' || s.person === '3pl')) {
      err(`${where}: 3rd-person subject with an ergative verb form — not taught yet`);
    }
    for (const t of s.tokens) {
      if (t.role !== 'subj' || !ALL_PRONOUNS.has(t.t)) continue;
      const want = subjCase === 'dat' ? DAT_PRON[s.person] : NOM_PRON[s.person];
      if (t.t !== want) err(`${where}: subject pronoun "${t.t}" should be "${want}" (${subjCase}, ${s.person})`);
    }
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
