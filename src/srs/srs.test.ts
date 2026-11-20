import { describe, expect, it } from 'vitest';
import { dayEnd, dayKey, prevDayKey, streak } from './day';
import { newSrsCard, previewIntervals, review } from './fsrs';
import { pickExercise } from './ladder';
import { isAutomatic, isPassed, noteAttempt } from './mastery';
import { fastMsFor, rateChoice, rateConstruct, slowMsFor } from './rating';
import type { DayStat, SrsCard } from './types';

const at = (y: number, m: number, d: number, h: number, min = 0) => new Date(y, m - 1, d, h, min).getTime();

describe('study day', () => {
  it('rolls over at 04:00, not at midnight', () => {
    expect(dayKey(at(2026, 11, 20, 1, 30))).toBe('2026-11-19');
    expect(dayKey(at(2026, 11, 20, 3, 59))).toBe('2026-11-19');
    expect(dayKey(at(2026, 11, 20, 4, 0))).toBe('2026-11-20');
    expect(dayKey(at(2026, 11, 20, 23, 0))).toBe('2026-11-20');
  });

  it('ends at the next 04:00', () => {
    expect(dayEnd(at(2026, 11, 20, 22, 0))).toBe(at(2026, 11, 21, 4, 0));
    expect(dayEnd(at(2026, 11, 20, 2, 0))).toBe(at(2026, 11, 20, 4, 0));
  });

  it('steps back across a month boundary', () => {
    expect(prevDayKey('2026-12-01')).toBe('2026-11-30');
  });

  it('counts a streak that ends today or yesterday', () => {
    const days = new Map<string, DayStat>();
    const add = (day: string) => days.set(day, { day, reviews: 5, newCards: 0, ms: 1 });
    add('2026-11-17');
    add('2026-11-18');
    add('2026-11-19');
    expect(streak(days, '2026-11-19')).toBe(3);
    // Not studied yet today: yesterday's streak still stands.
    expect(streak(days, '2026-11-20')).toBe(3);
    // A missed day breaks it.
    expect(streak(days, '2026-11-21')).toBe(0);
  });
});

describe('rating', () => {
  const tokens = 2;
  const quick = fastMsFor(tokens);
  const slow = slowMsFor(tokens) + 1;

  it('choice: a clean answer is Good, a slow one Hard, any miss Again', () => {
    expect(rateChoice({ errs: 0, ms: quick, tokens })).toBe(3);
    expect(rateChoice({ errs: 0, ms: slow, tokens })).toBe(2);
    expect(rateChoice({ errs: 1, ms: quick, tokens })).toBe(1);
  });

  it('construct: one slip off the focus is Hard, a slip on the focus is Again', () => {
    const base = { errOnFocus: false, gaveUp: false, ms: quick, tokens };
    expect(rateConstruct({ ...base, errs: 0 })).toBe(3);
    expect(rateConstruct({ ...base, errs: 1 })).toBe(2);
    expect(rateConstruct({ ...base, errs: 1, errOnFocus: true })).toBe(1);
    expect(rateConstruct({ ...base, errs: 2 })).toBe(1);
    expect(rateConstruct({ ...base, errs: 0, gaveUp: true })).toBe(1);
  });

  it('never grades an objective exercise as Easy', () => {
    expect(rateChoice({ errs: 0, ms: 1, tokens })).toBeLessThan(4);
    expect(rateConstruct({ errs: 0, errOnFocus: false, gaveUp: false, ms: 1, tokens })).toBeLessThan(4);
  });
});

describe('fsrs adapter', () => {
  const t0 = at(2026, 11, 20, 10);

  it('moves a new card through the learning steps into review', () => {
    let c = newSrsCard('c:work.prs.1sg', 'c', 1, t0);
    expect(c.state).toBe(0);
    c = review(c, 3, t0, 0.9);
    expect(c.state).toBe(1);
    expect(c.due - t0).toBeLessThanOrEqual(15 * 60_000);
    // Two more passes — one per remaining rung of the ladder — before it graduates.
    c = review(c, 3, c.due, 0.9);
    expect(c.state).toBe(1);
    c = review(c, 3, c.due, 0.9);
    expect(c.state).toBe(2);
    expect(c.due - c.lastReview!).toBeGreaterThan(12 * 3_600_000);
    expect(c.reps).toBe(3);
  });

  it('sends a forgotten review card to relearning and counts the lapse', () => {
    let c = newSrsCard('w:19', 'w', 1, t0);
    for (let i = 0; i < 3; i++) c = review(c, 3, i === 0 ? t0 : c.due, 0.9);
    expect(c.state).toBe(2);
    const lapsed = review(c, 1, c.due, 0.9);
    expect(lapsed.state).toBe(3);
    expect(lapsed.lapses).toBe(1);
  });

  it('previews longer intervals for better grades', () => {
    let c = newSrsCard('c:work.prs.1sg', 'c', 1, t0);
    for (let i = 0; i < 3; i++) c = review(c, 3, i === 0 ? t0 : c.due, 0.9);
    const p = previewIntervals(c, c.due, 0.9);
    expect(p[1]).toBeLessThan(p[3]);
    expect(p[3]).toBeLessThanOrEqual(p[4]);
  });
});

describe('ladder', () => {
  const card = (patch: Partial<SrsCard>): SrsCard => ({ ...newSrsCard('c:x', 'c', 1, 0), ...patch });
  const cell = { cardKind: 'cell' as const, tokens: 2, hasAudio: true };

  it('climbs recognise → assemble → speak', () => {
    expect(pickExercise(undefined, cell)).toBe('recognise');
    expect(pickExercise(card({ state: 1, reps: 1 }), cell)).toBe('assemble');
    expect(pickExercise(card({ state: 1, reps: 2 }), cell)).toBe('speak');
    expect(pickExercise(card({ state: 2, reps: 5, stability: 20 }), cell)).toBe('speak');
  });

  it('mixes in listening only when a clip exists', () => {
    expect(pickExercise(card({ state: 2, reps: 4, stability: 20 }), cell)).toBe('listen');
    expect(pickExercise(card({ state: 2, reps: 4, stability: 20 }), { ...cell, hasAudio: false })).toBe('speak');
  });

  it('takes a word from meaning to saying it aloud', () => {
    const word = { cardKind: 'word' as const, tokens: 1, hasAudio: true };
    expect(pickExercise(undefined, word)).toBe('recognise');
    expect(pickExercise(card({ state: 1, reps: 1 }), word)).toBe('recognise');
    expect(pickExercise(card({ state: 1, reps: 2 }), word)).toBe('speak');
  });

  it('does not ask to assemble a one-word answer', () => {
    expect(pickExercise(card({ state: 3, reps: 3 }), { ...cell, tokens: 1 })).toBe('recognise');
  });
});

describe('automatism', () => {
  it('needs three passed production attempts, two of them fast', () => {
    let c = newSrsCard('c:x', 'c', 1, 0);
    c = noteAttempt(c, true, true, 1000);
    c = noteAttempt(c, true, false, 6000);
    expect(isPassed(c)).toBe(false);
    c = noteAttempt(c, true, true, 1000);
    expect(isPassed(c)).toBe(true);
    expect(isAutomatic(c)).toBe(true);
  });

  it('forgets an old success after three newer attempts', () => {
    let c = newSrsCard('c:x', 'c', 1, 0);
    for (let i = 0; i < 3; i++) c = noteAttempt(c, true, true, 1000);
    c = noteAttempt(c, false, false, 9000);
    expect(isPassed(c)).toBe(false);
    for (let i = 0; i < 3; i++) c = noteAttempt(c, true, false, 6000);
    expect(isPassed(c)).toBe(true);
    expect(isAutomatic(c)).toBe(false);
  });
});

describe('statistics', () => {
  const NOW = at(2026, 11, 20, 10);
  const card = (id: string, patch: Partial<SrsCard>): SrsCard => ({ ...newSrsCard(id, 'c', 1, NOW - 86_400_000), ...patch });

  it('counts cards by state and builds a week of due reviews', async () => {
    const { summarise } = await import('./stats');
    const cards = [
      card('a', { state: 2, stability: 30, due: NOW - 1000 }), // overdue, mature
      card('b', { state: 2, stability: 3, due: at(2026, 11, 21, 10) }), // tomorrow
      card('c', { state: 1, due: NOW + 60_000 }), // still learning, today
      card('d', { state: 2, stability: 3, due: at(2026, 11, 24, 10) }), // in four days
      card('e', { state: 2, stability: 3, due: NOW - 1000, suspended: true }),
      { ...card('w', { state: 0 }), kind: 'w' as const },
    ];
    const days = new Map<string, DayStat>([
      ['2026-11-20', { day: '2026-11-20', reviews: 40, newCards: 8, ms: 15 * 60_000 }],
      ['2026-11-18', { day: '2026-11-18', reviews: 10, newCards: 0, ms: 5 * 60_000 }],
    ]);
    const s = summarise(cards, days, NOW);
    expect(s.total).toBe(6);
    expect(s.review).toBe(3);
    expect(s.learning).toBe(1);
    expect(s.mature).toBe(1);
    expect(s.suspended).toBe(1);
    expect(s.byKind).toMatchObject({ c: 5, w: 1 });
    expect(s.forecast.map((f) => f.count)).toEqual([2, 1, 0, 0, 1, 0, 0]);
    expect(s.activity).toHaveLength(14);
    expect(s.activity[13]).toMatchObject({ day: '2026-11-20', minutes: 15, reviews: 40, newCards: 8, label: 'пт' });
    expect(s.activity[12]).toMatchObject({ day: '2026-11-19', minutes: 0, reviews: 0 });
    expect(s.totalMinutes).toBe(20);
    expect(s.studyDays).toBe(2);
  });

  it('measures retention only on cards that were already in review', async () => {
    const { retention } = await import('./stats');
    const log = (rating: 1 | 2 | 3 | 4, state: 0 | 1 | 2 | 3, counted = true) =>
      ({ rating, counted, prev: { state, due: 0, s: 0, d: 0 } }) as never;
    const logs = [
      ...Array.from({ length: 18 }, () => log(3, 2)),
      log(1, 2),
      log(1, 2),
      log(1, 1), // a miss while learning is not forgetting
      log(1, 2, false), // extra practice does not count
    ];
    expect(retention(logs)).toMatchObject({ n: 20, recalled: 18, rate: 0.9 });
    expect(retention(logs.slice(0, 5)).rate).toBeNull();
  });
});

describe('spreading a backlog', () => {
  const NOW = at(2026, 11, 20, 10);
  const END = at(2026, 11, 21, 4);
  const DAY = 86_400_000;
  const settings = { dailyMinutes: 10, dayStartHour: 4 };
  const cost = () => 60_000; // one minute a card → seven reviews fit a day (70% of ten minutes)
  const due = (id: string, stability: number, patch: Partial<SrsCard> = {}): SrsCard => ({
    ...newSrsCard(id, 'c', 1, NOW - 10 * DAY),
    state: 2,
    stability,
    due: NOW - DAY,
    ...patch,
  });

  it('keeps what fits today and moves the rest forward, weakest first', async () => {
    const { planSpread } = await import('./backlog');
    const cards = Array.from({ length: 20 }, (_, i) => due(`c${i}`, 20 - i));
    const plan = planSpread(cards, NOW, settings, cost);
    expect(plan.today).toBe(7);
    expect(plan.moved).toHaveLength(13);
    expect(plan.days).toBe(2);
    // The seven weakest stay for today.
    const movedIds = new Set(plan.moved.map((c) => c.id));
    for (let i = 13; i < 20; i++) expect(movedIds.has(`c${i}`)).toBe(false);
    // Nothing is moved into the past, and no day gets more than fits.
    const perDay = new Map<number, number>();
    for (const c of plan.moved) {
      expect(c.due).toBeGreaterThan(END - 1);
      const d = Math.ceil((c.due - END) / DAY);
      perDay.set(d, (perDay.get(d) ?? 0) + 1);
    }
    for (const n of perDay.values()) expect(n).toBeLessThanOrEqual(7);
    // Only the due date changes.
    expect(plan.moved[0].stability).toBe(cards.find((c) => c.id === plan.moved[0].id)!.stability);
  });

  it('respects what is already scheduled and leaves learning cards alone', async () => {
    const { planSpread } = await import('./backlog');
    const cards = [
      ...Array.from({ length: 10 }, (_, i) => due(`c${i}`, i + 1)),
      // Tomorrow is already full.
      ...Array.from({ length: 7 }, (_, i) => due(`t${i}`, 5, { due: END + DAY / 2 })),
      due('learning', 0.1, { state: 1 }),
      due('hidden', 1, { suspended: true }),
    ];
    const plan = planSpread(cards, NOW, settings, cost);
    // The learning card takes one of today's seven places.
    expect(plan.today).toBe(6);
    expect(plan.moved.map((c) => c.id)).not.toContain('learning');
    expect(plan.moved.map((c) => c.id)).not.toContain('hidden');
    // Tomorrow has no room, so the overflow starts the day after.
    expect(Math.min(...plan.moved.map((c) => c.due))).toBeGreaterThan(END + DAY);
    expect(plan.days).toBe(2);
  });

  it('does nothing when the day is not overloaded', async () => {
    const { planSpread } = await import('./backlog');
    const plan = planSpread([due('a', 1), due('b', 2)], NOW, settings, cost);
    expect(plan.moved).toEqual([]);
    expect(plan.today).toBe(2);
  });
});
