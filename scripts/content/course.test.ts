import { beforeAll, describe, expect, it } from 'vitest';
import { LEXICON as LEXICON_SRC } from '../../content-src/lexicon';
import { fillCourse, allCardIds, examplesFor, getUnit, ruText, sentencesWithWord, UNITS } from '../../src/content/store';
import type { Course, DictWord, Sentence } from '../../src/content/types';
import { CATEGORIES } from '../../src/data/categories';
import { WORDS, fillWords } from '../../src/data/words';
import {
  buildExercise,
  cardInfo,
  letterDistractors,
  pickExample,
  verbDistractors,
  type BuildCtx,
} from '../../src/engine/build';
import { checkAssemble } from '../../src/engine/grade';
import { seededRng } from '../../src/engine/rng';
import { afterAnswer, startSession } from '../../src/engine/session';
import {
  composeAlphabet,
  composeDaily,
  composeUnitPractice,
  interleave,
  type ComposerInput,
} from '../../src/srs/composer';
import { newSrsCard, review } from '../../src/srs/fsrs';
import { EXERCISE_COST_MS, pickExercise } from '../../src/srs/ladder';
import { nextUnlocked, noteAttempt, unitProgress } from '../../src/srs/mastery';
import { DEFAULT_SETTINGS, type SrsCard } from '../../src/srs/types';
import { audioTexts, compile } from './build';
import { compileDictionary, dictTokens, readDictionarySource, validateDictionary } from './dictionary';
import { cardsInOrder, validateCourse } from './validate';

let course: Course;
let sentences: Sentence[];

beforeAll(() => {
  ({ course, sentences } = compile());
  // Sentences have no audio in these tests; letter sounds and pair words do,
  // so the listening rung of the alphabet can be exercised.
  const audio: Record<string, string> = {};
  for (const l of course.letters) audio[l.say] = 'a'.repeat(12);
  for (const p of course.letterPairs) {
    audio[p.a.ka] = 'b'.repeat(12);
    audio[p.b.ka] = 'c'.repeat(12);
  }
  fillCourse(course, sentences, audio);
});

const NOW = new Date(2026, 10, 20, 10).getTime();

function ctxFor(cards: Map<string, SrsCard>, seed = 1): BuildCtx {
  return {
    introduced: (id) => cards.has(id),
    exposure: () => undefined,
    getCard: (id) => cards.get(id),
    gender: 'm',
    rng: seededRng(seed),
  };
}

function inputFor(cards: Map<string, SrsCard>, patch: Partial<ComposerInput> = {}): ComposerInput {
  return {
    cards: cards.values(),
    getCard: (id) => cards.get(id),
    units: UNITS,
    // The alphabet track is switched on only in the tests that are about it.
    letterIds: [],
    unlocked: 1,
    seenExplain: new Set(),
    settings: DEFAULT_SETTINGS,
    now: NOW,
    studiedMs: 0,
    info: cardInfo,
    rng: seededRng(7),
    ...patch,
  };
}

/** A card that has been learned and is waiting in review. */
function reviewCard(id: string, dueIn: number): SrsCard {
  let c = newSrsCard(id, id.startsWith('w:') ? 'w' : 'c', 1, NOW - 3 * 86_400_000);
  c = review(c, 3, c.introducedAt, 0.9);
  c = review(c, 3, c.due, 0.9);
  c = review(c, 3, c.due, 0.9);
  if (c.state !== 2) throw new Error('test helper: card did not reach review');
  return { ...c, due: NOW + dueIn };
}

describe('compiled course', () => {
  it('passes the validator', () => {
    expect(validateCourse(course, sentences)).toEqual([]);
  });

  it('ships only verified verb forms', () => {
    const verbs = new Map(course.verbs.map((v) => [v.id, v]));
    let cells = 0;
    for (const { id } of cardsInOrder(course)) {
      const m = /^c:([a-z0-9]+)\.((?:prs|aor|fut|opt)\.\w+)$/.exec(id);
      if (!m) continue;
      cells++;
      expect(['verified', 'auto-verified'], id).toContain(verbs.get(m[1])!.status[m[2] as never]);
    }
    expect(cells).toBeGreaterThan(500);
  });

  it('has an example for every card using only earlier material', () => {
    const introduced = new Map<string, SrsCard>();
    for (const { id } of cardsInOrder(course)) {
      if (!id.startsWith('w:')) {
        const s = pickExample(id, ctxFor(introduced));
        expect(s, id).not.toBeNull();
        for (const r of [s!.focus, ...s!.req]) {
          if (r !== id) expect(introduced.has(r), `${id} example ${s!.id} needs ${r}`).toBe(true);
        }
      }
      introduced.set(id, newSrsCard(id, 'c', 1, NOW));
    }
  });
});

describe('validator catches broken content', () => {
  const base = () => sentences.find((s) => s.id === 'work.prs.1sg.advneg')!;
  const withSentence = (s: Sentence) => sentences.map((x) => (x.id === s.id ? s : x));
  const problems = (s: Sentence) => validateCourse(course, withSentence(s));

  it('a verb form that is not the tagged cell', () => {
    const s = base();
    const tokens = s.tokens.map((t) => (t.role === 'verb' ? { ...t, t: 'მუშაობ' } : t));
    const bad = { ...s, tokens, ka: tokens.map((t) => t.t).join(' ') + '.' };
    expect(problems(bad).join('\n')).toMatch(/no token is work\.prs\.1sg/);
  });

  it('"არ" away from the verb', () => {
    const s = base();
    const [adv, neg, verb] = s.tokens;
    const tokens = [neg, adv, verb];
    const bad = { ...s, tokens, ka: tokens.map((t) => t.t).join(' ') + '.' };
    expect(problems(bad).join('\n')).toMatch(/directly before the verb/);
  });

  it('a question without a question mark', () => {
    const s = sentences.find((x) => x.id === 'work.prs.2sg.q')!;
    expect(problems({ ...s, ka: s.ka.replace('?', '.') }).join('\n')).toMatch(/question mark/);
  });

  it('a word that is not in the lexicon', () => {
    const s = base();
    const tokens = s.tokens.map((t, i) => (i === 0 ? { ...t, t: 'ზეგ' } : t));
    const bad = { ...s, tokens, ka: tokens.map((t) => t.t).join(' ') + '.' };
    expect(problems(bad).join('\n')).toMatch(/is not the dictionary form of lexeme/);
    // The same word without a claim about where it comes from is caught by the closed world.
    const loose = s.tokens.map((t, i) => (i === 0 ? { t: 'ზეგ', role: t.role } : t));
    const bad2 = { ...s, tokens: loose, ka: loose.map((t) => t.t).join(' ') + '.' };
    expect(problems(bad2).join('\n')).toMatch(/neither a verified verb form nor in the lexicon/);
  });

  it('a nominative pronoun with a "мне…" verb', () => {
    const s = sentences.find((x) => x.id === 'want.prs.3sg.po')!;
    const tokens = s.tokens.map((t) => (t.role === 'subj' ? { ...t, t: 'ის' } : t));
    const bad = { ...s, tokens, ka: tokens.map((t) => t.t).join(' ') + '.' };
    expect(problems(bad).join('\n')).toMatch(/should be in the dat case/);
  });

  it('vocabulary from a later unit', () => {
    const s = base();
    expect(problems({ ...s, req: [...s.req, 'w:59'] }).join('\n')).toMatch(/from unit 4/);
  });

  it('an unverified verb cell in a lesson', () => {
    const broken: Course = {
      ...course,
      verbs: course.verbs.map((v) =>
        v.id === 'work' ? { ...v, status: { ...v.status, 'prs.1sg': 'needs-review' } } : v,
      ),
    };
    expect(validateCourse(broken, sentences).join('\n')).toMatch(/not verified/);
  });
});

describe('exercise building', () => {
  it('gives four distinct options with the right answer among them', () => {
    const cards = new Map<string, SrsCard>();
    for (const id of allCardIds()) cards.set(id, newSrsCard(id, 'c', 1, NOW));
    for (const id of allCardIds()) {
      const ex = buildExercise(id, 'recognise', ctxFor(cards, 3));
      expect(ex, id).not.toBeNull();
      if (ex?.kind !== 'recognise') continue;
      const texts = ex.options.map((o) => o.text);
      expect(new Set(texts).size, id).toBe(texts.length);
      expect(texts.length, id).toBeGreaterThanOrEqual(3);
      expect(ex.correct).toBeGreaterThanOrEqual(0);
    }
  });

  it('never offers the correct form as a distractor', () => {
    const cards = new Map<string, SrsCard>();
    for (const v of course.verbs) {
      const d = verbDistractors(v, 'prs', '2pl', 3, ctxFor(cards));
      expect(d).not.toContain(v.forms.prs['2pl']);
      expect(new Set(d).size).toBe(d.length);
    }
  });

  it('builds tile exercises whose own solution passes the check', () => {
    const cards = new Map<string, SrsCard>();
    for (const id of allCardIds()) cards.set(id, newSrsCard(id, 'c', 1, NOW));
    let built = 0;
    for (const id of allCardIds()) {
      const ex = buildExercise(id, 'assemble', ctxFor(cards, 5));
      if (ex?.kind !== 'assemble') continue;
      built++;
      expect(checkAssemble(ex.solution, ex).ok, `${id}: ${ex.solution.join(' ')}`).toBe(true);
      // Every solution word is available as a tile.
      const bank = ex.tiles.map((t) => t.t);
      for (const w of ex.solution) expect(bank, id).toContain(w);
    }
    expect(built).toBeGreaterThan(100);
  });

  it('rotates examples: the least-shown sentence comes first', () => {
    const cards = new Map<string, SrsCard>();
    for (const id of allCardIds()) cards.set(id, newSrsCard(id, 'c', 1, NOW));
    const id = 'c:work.prs.1sg';
    const all = examplesFor(id);
    const unseen = all[all.length - 1];
    const ctx: BuildCtx = {
      ...ctxFor(cards),
      exposure: (sid) => (sid === unseen.id ? undefined : { n: 2, last: NOW }),
    };
    expect(pickExample(id, ctx)?.id).toBe(unseen.id);
  });
});

describe('units 5–16', () => {
  const withSentence = (x: Sentence) => sentences.map((o) => (o.id === x.id ? x : o));
  const problems = (x: Sentence) => validateCourse(course, withSentence(x)).join('\n');
  const find = (id: string) => {
    const x = sentences.find((o) => o.id === id);
    if (!x) throw new Error('no sentence ' + id);
    return x;
  };
  const retext = (x: Sentence, tokens: Sentence['tokens']): Sentence => ({
    ...x,
    tokens,
    ka: tokens.map((t) => t.t + (t.after ?? '')).join(' ') + x.ka.slice(-1),
  });

  it('every unit is ready and teaches something', () => {
    expect(course.units).toHaveLength(16);
    for (const u of course.units) {
      expect(u.ready, 'unit ' + u.id).toBe(true);
      const cards = u.steps.flatMap((st) => (st.kind === 'cards' ? st.cards : []));
      expect(cards.length, 'unit ' + u.id).toBeGreaterThan(20);
      expect(sentences.some((x) => x.unit === u.id), 'unit ' + u.id).toBe(true);
    }
  });

  it('every word of the lexicon is confirmed and introduced', () => {
    const order = new Set(cardsInOrder(course).map((c) => c.id));
    for (const l of course.lexicon) {
      expect(l.status, l.ka).not.toBe('needs-review');
      expect(order.has('w:' + l.id), l.ka).toBe(true);
    }
  });

  it('rejects a word whose form nothing confirms', () => {
    const broken: Course = {
      ...course,
      lexicon: course.lexicon.map((l) => (l.id === 59 ? { ...l, status: 'needs-review' } : l)),
    };
    expect(validateCourse(broken, sentences).join('\n')).toMatch(/confirmed by neither/);
  });

  it('rejects an object in the wrong case for the tense', () => {
    // «ყავას ვსვამ»: the present wants -ს; the bare word belongs to the past.
    const x = find('drink.prs.1sg.ca');
    const lexeme = course.lexicon.find((l) => l.id === x.tokens.find((t) => t.role === 'obj')!.lex)!;
    const tokens = x.tokens.map((t) => (t.role === 'obj' ? { t: lexeme.ka, role: t.role, lex: t.lex } : t));
    expect(problems(retext(x, tokens))).toMatch(/should be in the dat case/);

    const past = find('drink.aor.1sg.ca');
    const pl = course.lexicon.find((l) => l.id === past.tokens.find((t) => t.role === 'obj')!.lex)!;
    const wrong = past.tokens.map((t) => (t.role === 'obj' ? { ...t, t: pl.cases.dat!, form: 'dat' as const } : t));
    expect(problems(retext(past, wrong))).toMatch(/should be in the nom case/);
  });

  it('rejects an attribute that does not agree with its noun', () => {
    // «ცხელ ყავას»: before a word with -ს the adjective drops its -ი.
    const x = find('u9.tskhel-qavas');
    const tokens = x.tokens.map((t) => (t.role === 'attr' ? { ...t, t: 'ცხელი', form: undefined } : t));
    expect(problems(retext(x, tokens))).toMatch(/should be "ცხელ"/);
  });

  it('rejects a plain "он" as the doer in the past', () => {
    const x = find('do.aor.3sg.ca');
    const subj = x.tokens.find((t) => t.role === 'subj')!;
    expect(subj.t).toBe('მან');
    const is = course.lexicon.find((l) => l.ka === 'ის')!;
    const tokens = x.tokens.map((t) => (t === subj ? { t: 'ის', role: t.role, lex: is.id } : t));
    expect(problems(retext(x, tokens))).toMatch(/should be in the erg case/);
  });

  it('rejects an unknown word in an explanation example', () => {
    const broken: Course = {
      ...course,
      units: course.units.map((u) =>
        u.id !== 5
          ? u
          : {
              ...u,
              steps: u.steps.map((st) =>
                st.kind === 'explain' ? { ...st, examples: [...st.examples, { ka: 'ქართული ვიცით ხოლმე', ru: '…' }] } : st,
              ),
            },
      ),
    };
    expect(validateCourse(broken, sentences).join('\n')).toMatch(/example word "ხოლმე" is not a known form/);
  });

  it('rejects an unknown Georgian word quoted in a note', () => {
    const broken: Course = {
      ...course,
      patterns: course.patterns.map((p) => (p.id === 'dat' ? { ...p, noteRu: p.noteRu + ' Например: ყავას ვყიდულობთო.' } : p)),
    };
    const out = validateCourse(broken, sentences).join('\n');
    expect(out).toMatch(/pattern c:dat: the text quotes "ვყიდულობთო"/);
    // Hyphenated endings and prefixes are notation and pass.
    expect(validateCourse(course, sentences)).toEqual([]);
  });

  it('holds back a sentence that uses an unverified cell anywhere', () => {
    // «подождать»: two cells have no corpus attestation and are not taught.
    const wait = course.verbs.find((v) => v.id === 'wait')!;
    const held = Object.entries(wait.status).filter(([, st]) => st === 'needs-review').map(([k]) => k);
    for (const key of held) {
      expect(allCardIds()).not.toContain('c:wait.' + key);
      expect(sentences.some((x) => x.tokens.some((t) => t.cell === 'wait.' + key))).toBe(false);
    }
  });

  it('resolves both gender markers in Russian prompts', () => {
    expect(ruText('Я пош{ёл|ла} домой и сделал{а} чай.', 'm')).toBe('Я пошёл домой и сделал чай.');
    expect(ruText('Я пош{ёл|ла} домой и сделал{а} чай.', 'f')).toBe('Я пошла домой и сделала чай.');
    expect(ruText('Я не смог{|ла}.', 'f')).toBe('Я не смогла.');
    for (const x of sentences) expect(ruText(x.ru, 'f'), x.id).not.toMatch(/[{}|]/);
  });

  it('offers other rows of the verb as distractors for the «чтобы» form', () => {
    const v = course.verbs.find((o) => o.id === 'do')!;
    const d = verbDistractors(v, 'opt', '1sg', 3, ctxFor(new Map()));
    expect(d).toHaveLength(3);
    expect(d).not.toContain(v.opt!['1sg']);
    expect(d.some((f) => f === v.forms.aor['1sg'] || f === v.forms.fut['1sg'] || f === v.forms.prs['1sg'])).toBe(true);
  });

  it('keeps one word order for sentences that have only one', () => {
    const cards = new Map<string, SrsCard>();
    for (const id of allCardIds()) cards.set(id, newSrsCard(id, 'c', 1, NOW));
    // «უნდა გავაკეთო»: two verb-like words, an attribute before its noun, a clause after a comma.
    for (const sid of ['do.opt.1sg.om', 'u9.tskhel-qavas', 'u14.vitsi-rom']) {
      const x = find(sid);
      expect(x.strict, sid).toBe(true);
      const ex = buildExercise(x.focus, 'assemble', {
        ...ctxFor(cards),
        exposure: (id) => (id === sid ? undefined : { n: 9, last: NOW }),
      });
      if (ex?.kind !== 'assemble') throw new Error('no tile exercise for ' + sid);
      expect(ex.sentenceId).toBe(sid);
      expect(checkAssemble(ex.solution, ex).ok).toBe(true);
      const swapped = [ex.solution[1], ex.solution[0], ...ex.solution.slice(2)];
      expect(checkAssemble(swapped, ex).ok, sid).toBe(false);
    }
  });

  it('practises a learned word inside a sentence', () => {
    const cards = new Map<string, SrsCard>();
    for (const id of allCardIds()) cards.set(id, reviewCard(id, -1000));
    const word = 'w:' + course.lexicon.find((l) => l.ka === 'მაღაზია')!.id;
    expect(sentencesWithWord(word).length).toBeGreaterThan(0);
    cards.set(word, { ...cards.get(word)!, reps: 5 });
    const ex = buildExercise(word, 'speak', ctxFor(cards));
    expect(ex?.card).toBe(word);
    expect(ex?.sentenceId).not.toBeNull();
    expect(ex?.reveal.ka).toMatch(/მაღაზი/);
    // An even repetition stays the bare word.
    cards.set(word, { ...cards.get(word)!, reps: 6 });
    expect(buildExercise(word, 'speak', ctxFor(cards))?.sentenceId).toBeNull();
  });

  it('tests a pattern on its own token even when the sentence shows two', () => {
    const cards = new Map<string, SrsCard>();
    for (const id of allCardIds()) cards.set(id, newSrsCard(id, 'c', 1, NOW));
    const x = find('buy.aor.3sg.ca'); // «მან … იყიდა»: the doer form, no -ს on the object
    expect(x.req).toContain('c:erg');
    const ex = buildExercise('c:erg', 'recognise', {
      ...ctxFor(cards),
      exposure: (id) => (id === x.id ? undefined : { n: 9, last: NOW }),
    });
    if (ex?.kind !== 'recognise') throw new Error('no choice exercise');
    const wrong = ex.options.filter((_, i) => i !== ex.correct).map((o) => o.text);
    expect(wrong.some((t) => t.startsWith('ის ') || t.startsWith('მას '))).toBe(true);
  });
});

describe('daily session', () => {
  it('starts a beginner with the first explanation, then new cards', () => {
    const plan = composeDaily(inputFor(new Map()));
    expect(plan.items[0]).toMatchObject({ type: 'explain', stepId: 'u1-matrix' });
    expect(plan.items[1].type).toBe('intro');
    expect(plan.newCount).toBeGreaterThan(0);
    expect(plan.newCount).toBeLessThanOrEqual(13);
    expect(plan.backlog).toBe(false);
  });

  it('introduces cards strictly in course order', () => {
    const plan = composeDaily(inputFor(new Map()));
    const fresh = plan.items.flatMap((i) => (i.type === 'card' && i.isNew ? [i.card] : []));
    expect(fresh).toEqual(allCardIds().slice(0, fresh.length));
  });

  it('does not replay an explanation that was already seen', () => {
    const plan = composeDaily(inputFor(new Map(), { seenExplain: new Set(['u1-matrix']) }));
    expect(plan.items.some((i) => i.type === 'explain' && i.stepId === 'u1-matrix')).toBe(false);
  });

  it('gives no new material when reviews exceed the time budget', () => {
    const cards = new Map<string, SrsCard>();
    for (const id of allCardIds().slice(0, 160)) cards.set(id, reviewCard(id, -3_600_000));
    const plan = composeDaily(inputFor(cards));
    expect(plan.backlog).toBe(true);
    expect(plan.newCount).toBe(0);
    expect(plan.reviewCount).toBeLessThan(plan.dueCount);
    expect(plan.estMs).toBeLessThanOrEqual(plan.budgetMs + EXERCISE_COST_MS.assemble);
  });

  it('leaves cards that are not due yet out of the plan', () => {
    const cards = new Map<string, SrsCard>();
    const ids = allCardIds().slice(0, 6);
    ids.forEach((id, i) => cards.set(id, reviewCard(id, i < 3 ? -1000 : 5 * 86_400_000)));
    const plan = composeDaily(inputFor(cards));
    const reviewed = plan.items.flatMap((i) => (i.type === 'card' && !i.isNew ? [i.card] : []));
    expect(reviewed.sort()).toEqual(ids.slice(0, 3).sort());
  });

  it('counts the new-card allowance per day, not per session', () => {
    const cards = new Map<string, SrsCard>();
    // Everything a first sitting introduces today…
    const first = composeDaily(inputFor(cards));
    for (const item of first.items) {
      if (item.type === 'card' && item.isNew) {
        const kind = item.card.startsWith('w:') ? 'w' : 'c';
        cards.set(item.card, review(newSrsCard(item.card, kind, 1, NOW), 3, NOW, 0.9));
      }
    }
    // …leaves nothing new for a second sitting on the same day,
    const again = composeDaily(inputFor(cards, { seenExplain: new Set(['u1-matrix', 'u1-negq']) }));
    expect(first.newCount).toBeGreaterThan(0);
    expect(again.newCount).toBe(0);
    // but the next day the allowance is back.
    const tomorrow = composeDaily(
      inputFor(cards, { now: NOW + 86_400_000, seenExplain: new Set(['u1-matrix', 'u1-negq']) }),
    );
    expect(tomorrow.newCount).toBeGreaterThan(0);
  });

  it('eases off new material when tomorrow is already full', () => {
    const cards = new Map<string, SrsCard>();
    // ~150 mature cards all falling due tomorrow.
    for (const id of allCardIds().slice(20, 168)) cards.set(id, reviewCard(id, 30 * 3_600_000));
    const busy = composeDaily(inputFor(cards));
    const calm = composeDaily(inputFor(new Map()));
    expect(busy.newCount).toBeLessThan(calm.newCount);
  });

  it('is deterministic for the same inputs', () => {
    const a = composeDaily(inputFor(new Map()));
    const b = composeDaily(inputFor(new Map()));
    expect(a.items).toEqual(b.items);
  });

  it('keeps same-verb, same-tense cards apart when it can', () => {
    const ids = ['c:do.prs.1sg', 'c:do.prs.2sg', 'c:work.prs.1sg', 'c:work.prs.2sg'];
    const out = interleave(ids, (id) => cardInfo(id).group);
    for (let i = 1; i < out.length; i++) {
      expect(cardInfo(out[i]).group).not.toBe(cardInfo(out[i - 1]).group);
    }
  });

  it('unit practice only uses introduced cards and counts only due ones', () => {
    const cards = new Map<string, SrsCard>();
    cards.set('c:do.prs.1sg', reviewCard('c:do.prs.1sg', -1000));
    cards.set('c:do.prs.2sg', reviewCard('c:do.prs.2sg', 86_400_000));
    const plan = composeUnitPractice(inputFor(cards), getUnit(1)!);
    expect(plan.items).toHaveLength(2);
    const counted = Object.fromEntries(plan.items.map((i) => (i.type === 'card' ? [i.card, i.counted] : ['', false])));
    expect(counted).toMatchObject({ 'c:do.prs.1sg': true, 'c:do.prs.2sg': false });
  });
});

describe('alphabet', () => {
  const letterIds = () => course.letters.map((l) => `l:${l.ch}`);
  const learned = (ids: string[], state: 1 | 2, reps: number): Map<string, SrsCard> => {
    const cards = new Map<string, SrsCard>();
    for (const id of ids) cards.set(id, { ...newSrsCard(id, 'l', null, NOW), state, reps, stability: 5, due: NOW + 86_400_000 });
    return cards;
  };

  it('has 33 letters, each with its own sound label', () => {
    expect(course.letters).toHaveLength(33);
    expect(new Set(course.letters.map((l) => l.ru)).size).toBe(33);
  });

  it('the validator rejects two letters sharing a sound label', () => {
    const broken: Course = {
      ...course,
      letters: course.letters.map((l) => (l.ch === 'ტ' ? { ...l, ru: 'тʰ' } : l)),
    };
    expect(validateCourse(broken, sentences).join('\n')).toMatch(/indistinguishable/);
  });

  it('offers the confusable partner as a distractor', () => {
    const cards = learned(letterIds(), 2, 3);
    const byCh = new Map(course.letters.map((l) => [l.ch, l]));
    for (const [a, b] of [['თ', 'ტ'], ['ქ', 'კ'], ['ფ', 'პ'], ['ც', 'წ'], ['ჩ', 'ჭ']]) {
      const d = letterDistractors(byCh.get(a)!, 'sound', ctxFor(cards)).map((x) => x.ch);
      expect(d, a).toContain(b);
      expect(d).not.toContain(a);
      expect(new Set(d).size).toBe(3);
    }
  });

  it('does not use a letter from a later group as a distractor before it is introduced', () => {
    const e = course.letters.find((l) => l.ch === 'ე')!; // looks like ვ, which is in group 2
    const none = letterDistractors(e, 'look', ctxFor(new Map())).map((x) => x.ch);
    expect(none).not.toContain('ვ');
    const withV = letterDistractors(e, 'look', ctxFor(learned(['l:ვ'], 1, 1))).map((x) => x.ch);
    expect(withV).toContain('ვ');
  });

  it('first shows the letter and asks for its sound, never revealing the transliteration', () => {
    for (const l of course.letters) {
      const ex = buildExercise(`l:${l.ch}`, 'recognise', ctxFor(new Map(), 2));
      if (ex?.kind !== 'recognise') throw new Error(`no exercise for ${l.ch}`);
      expect(ex.dir).toBe('ka-ru');
      expect(ex.prompt).toBe(l.ch);
      expect(ex.noTranslit).toBe(true);
      expect(ex.options[ex.correct].text).toBe(l.ru);
      expect(new Set(ex.options.map((o) => o.text)).size).toBe(ex.options.length);
      expect(ex.options.length).toBeGreaterThanOrEqual(4);
    }
  });

  it('then plays the sound and asks for the letter', () => {
    const cards = learned(letterIds(), 1, 1);
    for (const l of course.letters) {
      const ex = buildExercise(`l:${l.ch}`, 'listen', ctxFor(cards, 4));
      if (ex?.kind !== 'listen') throw new Error(`no listening exercise for ${l.ch}`);
      expect(ex.options[ex.correct].text).toBe(l.ch);
      expect(ex.options.every((o) => o.ka)).toBe(true);
      expect(ex.noTranslit).toBe(true);
    }
  });

  it('tests a mature pair letter on real words some of the time', () => {
    const cards = learned(letterIds(), 2, 4);
    const seen = new Set<string>();
    for (let seed = 1; seed <= 12; seed++) {
      const ex = buildExercise('l:ქ', 'listen', ctxFor(cards, seed));
      if (ex?.kind !== 'listen') continue;
      seen.add(ex.options.length === 2 ? 'pair' : 'letter');
      if (ex.options.length === 2) {
        expect(ex.options.map((o) => o.text).sort()).toEqual(['კარი', 'ქარი'].sort());
        expect(ex.options[ex.correct].text).toBe('ქარი');
      }
    }
    expect([...seen].sort()).toEqual(['letter', 'pair']);
  });

  it('follows the letter ladder: see → hear → sound-to-letter', () => {
    const info = cardInfo('l:ბ');
    expect(info.cardKind).toBe('letter');
    expect(info.hasAudio).toBe(true);
    const card = (state: 0 | 1 | 2, reps: number) => ({ ...newSrsCard('l:ბ', 'l', null, NOW), state, reps });
    expect(pickExercise(undefined, info)).toBe('recognise');
    expect(pickExercise(card(1, 1), info)).toBe('listen');
    expect(pickExercise(card(1, 2), info)).toBe('recognise');
    expect(pickExercise(card(2, 4), info)).toBe('listen');
    expect(pickExercise(card(2, 5), info)).toBe('recognise');
  });

  it('brings four new letters a day into the daily session, in order', () => {
    const cards = new Map<string, SrsCard>();
    const plan = composeDaily(inputFor(cards, { letterIds: letterIds() }));
    const intro = plan.items.find((i) => i.type === 'intro');
    expect(intro).toMatchObject({ title: 'Буквы', cards: letterIds().slice(0, 4) });
    expect(plan.newLetters).toBe(4);
    // The course itself still gets its own new material after the letters.
    expect(plan.newCount).toBeGreaterThan(4);

    for (const id of letterIds().slice(0, 4)) cards.set(id, review(newSrsCard(id, 'l', null, NOW), 3, NOW, 0.9));
    const again = composeDaily(inputFor(cards, { letterIds: letterIds() }));
    expect(again.newLetters).toBe(0);
    const tomorrow = composeDaily(inputFor(cards, { letterIds: letterIds(), now: NOW + 86_400_000 }));
    expect(tomorrow.newLetters).toBe(4);
    const next = tomorrow.items.find((i) => i.type === 'intro' && i.title === 'Буквы');
    expect(next).toMatchObject({ cards: letterIds().slice(4, 8) });
  });

  it('extra practice can introduce the next group and repeats the learned letters', () => {
    const ids = letterIds();
    const cards = learned(ids.slice(0, 5), 2, 3);
    const group2 = course.letters.filter((l) => l.group === 2).map((l) => `l:${l.ch}`);
    const plan = composeAlphabet(inputFor(cards, { letterIds: ids }), group2);
    expect(plan.items[0]).toMatchObject({ type: 'intro', cards: group2 });
    expect(plan.newLetters).toBe(group2.length);
    const repeated = plan.items.flatMap((i) => (i.type === 'card' && !i.isNew ? [i.card] : []));
    expect(repeated.sort()).toEqual(ids.slice(0, 5).sort());

    const onlyReview = composeAlphabet(inputFor(cards, { letterIds: ids }), []);
    expect(onlyReview.items.every((i) => i.type === 'card' && !i.isNew)).toBe(true);
  });
});

describe('session flow and unit gate', () => {
  it('brings a card that is still being learned back later in the same session', () => {
    const plan = composeDaily(inputFor(new Map()));
    let s = startSession(plan, 'daily', '2026-11-20', NOW, '/');
    const idx = s.items.findIndex((i) => i.type === 'card');
    s = { ...s, pos: idx };
    const item = s.items[idx];
    if (item.type !== 'card') throw new Error('expected a card');
    const learned = review(newSrsCard(item.card, 'c', 1, NOW), 3, NOW, 0.9);
    const before = s.items.length;
    s = afterAnswer(s, learned, { card: item.card, ex: 'recognise', rating: 3, ka: '', ru: '' }, 3000);
    expect(s.items.length).toBe(before + 1);
    const again = s.items.findIndex((i, k) => k > idx && i.type === 'card' && i.card === item.card);
    expect(again - idx).toBeGreaterThanOrEqual(4);
  });

  it('opens unit 2 only when unit 1 is automatic', () => {
    const unit = getUnit(1)!;
    const cards = new Map<string, SrsCard>();
    for (const id of allCardIds()) {
      if (cardsInOrder(course).find((c) => c.id === id)?.unit === 1) cards.set(id, reviewCard(id, 86_400_000));
    }
    const get = (id: string) => cards.get(id);
    expect(unitProgress(unit, get).allIntroduced).toBe(true);
    expect(nextUnlocked(UNITS, 1, get)).toBe(1);

    for (const [id, c] of cards) {
      let x = c;
      for (let i = 0; i < 3; i++) x = noteAttempt(x, true, true, 1500);
      cards.set(id, x);
    }
    expect(unitProgress(unit, get).gateMet).toBe(true);
    expect(nextUnlocked(UNITS, 1, get)).toBe(2);
  });
});

describe('picture dictionary', () => {
  const src = readDictionarySource();
  const problems = (words: DictWord[]) => validateDictionary({ ...src, words }, LEXICON_SRC).join('\n');

  it('the source is well-formed and agrees with the course on shared ids', () => {
    expect(validateDictionary(src, LEXICON_SRC)).toEqual([]);
  });

  it('rejects a reused id, a foreign letter, a repeated word and an unknown category', () => {
    const w = src.words[0];
    expect(problems([...src.words, { ...w, ka: 'ახალისიტყვა' }])).toMatch(/id is already used/);
    expect(problems([...src.words, { ...w, id: 1999, ka: 'gamarjoba' }])).toMatch(/must be Georgian words/);
    expect(problems([...src.words, { ...w, id: 1999 }])).toMatch(/the same text as word/);
    expect(problems([...src.words, { ...w, id: 1999, ka: 'ახალისიტყვა', cat: 'nope' }])).toMatch(/unknown category/);
    // Ids from 2001 up belong to the words the course added.
    expect(problems([...src.words, { ...w, id: 2001, ka: 'ახალისიტყვა' }])).toMatch(/id must be/);
  });

  it('rejects a course word whose dictionary id means another word', () => {
    const shared = LEXICON_SRC.find((l) => l.id < 2000)!;
    const moved = src.words.map((w) => (w.id === shared.id ? { ...w, ka: 'სხვასიტყვა' } : w));
    expect(problems(moved)).toMatch(/the dictionary has «სხვასიტყვა» under this id/);
    expect(problems(src.words.filter((w) => w.id !== shared.id))).toMatch(/no dictionary word with this id/);
  });

  it('ships only words whose spelling is confirmed, each with a picture', () => {
    const { dictionary, held } = compileDictionary(src);
    expect(dictionary.words.length + held.length).toBe(src.words.length);
    expect(dictionary.words.length).toBeGreaterThan(800);
    expect(dictionary.noPic).toEqual([]);
    // Without any evidence nothing ships.
    expect(compileDictionary(src, {}).dictionary.words).toEqual([]);
    const one = src.words[0];
    const only = compileDictionary(src, { [one.ka]: { status: 'attested', sources: [] } });
    expect(only.dictionary.words).toEqual([one]);
    expect(only.held).toHaveLength(src.words.length - 1);
  });

  it('checks an entry of several words part by part', () => {
    expect(dictTokens('ჭექა-ქუხილი')).toEqual(['ჭექა', 'ქუხილი']);
    expect(dictTokens('რა თქმა უნდა')).toEqual(['რა', 'თქმა', 'უნდა']);
  });

  it('records dictionary words after everything the course needs, each text once', () => {
    const shared = course.lexicon[0].ka;
    const texts = audioTexts(course, sentences, ['ახალისიტყვა', shared]);
    expect(texts[texts.length - 1]).toBe('ახალისიტყვა');
    expect(texts.filter((t) => t === shared)).toHaveLength(1);
    expect(audioTexts(course, sentences, [])).toHaveLength(texts.length - 1);
  });

  it('the app computes the transliteration and the address of the picture', () => {
    fillWords({
      categories: src.categories,
      words: [
        { id: 82, ka: 'ფული', ru: 'деньги', cat: 'core', level: 0 },
        { id: 3, ka: 'კი', ru: 'да', cat: 'core', level: 0 },
      ],
      noPic: [3],
    });
    expect(WORDS).toHaveLength(2);
    expect(WORDS[0]).toMatchObject({ tr: 'puli', image: '/pics/82.webp', correct: 0, seen: 0 });
    expect(WORDS[1].image).toBeNull();
    expect(CATEGORIES).toHaveLength(src.categories.length);
  });
});
