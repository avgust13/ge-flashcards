import { beforeAll, describe, expect, it } from 'vitest';
import { fillCourse, allCardIds, examplesFor, getUnit, UNITS } from '../../src/content/store';
import type { Course, Sentence } from '../../src/content/types';
import { buildExercise, cardInfo, pickExample, verbDistractors, type BuildCtx } from '../../src/engine/build';
import { checkAssemble } from '../../src/engine/grade';
import { seededRng } from '../../src/engine/rng';
import { afterAnswer, startSession } from '../../src/engine/session';
import { composeDaily, composeUnitPractice, interleave, type ComposerInput } from '../../src/srs/composer';
import { newSrsCard, review } from '../../src/srs/fsrs';
import { EXERCISE_COST_MS } from '../../src/srs/ladder';
import { nextUnlocked, noteAttempt, unitProgress } from '../../src/srs/mastery';
import { DEFAULT_SETTINGS, type SrsCard } from '../../src/srs/types';
import { compile } from './build';
import { cardsInOrder, validateCourse } from './validate';

let course: Course;
let sentences: Sentence[];

beforeAll(() => {
  ({ course, sentences } = compile());
  fillCourse(course, sentences, {});
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
    for (const v of course.verbs) {
      for (const [key, unit] of Object.entries(v.cellUnit)) {
        if (unit <= 4) expect(['verified', 'auto-verified'], `${v.id}.${key}`).toContain(v.status[key as never]);
      }
    }
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
    expect(problems(bad).join('\n')).toMatch(/verb token/);
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
    expect(problems(bad).join('\n')).toMatch(/not in the lexicon/);
  });

  it('a nominative pronoun with a "мне…" verb', () => {
    const s = sentences.find((x) => x.id === 'want.prs.3sg.po')!;
    const tokens = s.tokens.map((t) => (t.role === 'subj' ? { ...t, t: 'ის' } : t));
    const bad = { ...s, tokens, ka: tokens.map((t) => t.t).join(' ') + '.' };
    expect(problems(bad).join('\n')).toMatch(/subject pronoun/);
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
