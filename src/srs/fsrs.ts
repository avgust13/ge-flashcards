/**
 * The only module that imports ts-fsrs. The library is pinned to 5.x; our own
 * serialisable card shape and a complete review log are the source of truth,
 * so a future scheduler upgrade can replay the log.
 */
import { fsrs, generatorParameters, type Card, type FSRS, type Grade } from 'ts-fsrs';
import type { CardId, CardKind, CardState, Rating, SrsCard } from './types';

const DAY = 86_400_000;

let engine: FSRS | null = null;
let engineRetention = 0;

function getEngine(retention: number): FSRS {
  if (!engine || engineRetention !== retention) {
    engine = fsrs(
      generatorParameters({
        request_retention: retention,
        // A beginner's verb forms should not vanish for a year.
        maximum_interval: 180,
        enable_fuzz: true,
        enable_short_term: true,
        // Three steps = three passes on the day a card is introduced, one per
        // rung of the ladder: recognise, assemble, say aloud.
        learning_steps: ['1m', '5m', '10m'],
        relearning_steps: ['10m'],
      }),
    );
    engineRetention = retention;
  }
  return engine;
}

export function newSrsCard(id: CardId, kind: CardKind, unit: number | null, nowMs: number): SrsCard {
  return {
    id,
    kind,
    unit,
    due: nowMs,
    stability: 0,
    difficulty: 0,
    scheduledDays: 0,
    learningSteps: 0,
    reps: 0,
    lapses: 0,
    state: 0,
    lastReview: null,
    introducedAt: nowMs,
    lastMs: null,
    recent: 0,
    fast: 0,
    attempts: 0,
    suspended: false,
    unverified: false,
  };
}

function toFsrs(c: SrsCard, nowMs: number): Card {
  return {
    due: new Date(c.due),
    stability: c.stability,
    difficulty: c.difficulty,
    elapsed_days: c.lastReview ? Math.max(0, Math.floor((nowMs - c.lastReview) / DAY)) : 0,
    scheduled_days: c.scheduledDays,
    learning_steps: c.learningSteps,
    reps: c.reps,
    lapses: c.lapses,
    state: c.state,
    last_review: c.lastReview ? new Date(c.lastReview) : undefined,
  };
}

function merge(c: SrsCard, f: Card): SrsCard {
  return {
    ...c,
    due: f.due.getTime(),
    stability: f.stability,
    difficulty: f.difficulty,
    scheduledDays: f.scheduled_days,
    learningSteps: f.learning_steps,
    reps: f.reps,
    lapses: f.lapses,
    state: f.state as CardState,
    lastReview: f.last_review ? f.last_review.getTime() : c.lastReview,
  };
}

/** Apply one graded answer and return the rescheduled card. */
export function review(card: SrsCard, rating: Rating, nowMs: number, retention: number): SrsCard {
  const { card: next } = getEngine(retention).next(toFsrs(card, nowMs), new Date(nowMs), rating as Grade);
  return merge(card, next);
}

/** Time until the card would be due again for each grade, in ms — shown under the grade buttons. */
export function previewIntervals(card: SrsCard, nowMs: number, retention: number): Record<Rating, number> {
  const preview = getEngine(retention).repeat(toFsrs(card, nowMs), new Date(nowMs));
  const at = (r: Rating) => preview[r as Grade].card.due.getTime() - nowMs;
  return { 1: at(1), 2: at(2), 3: at(3), 4: at(4) };
}

/** Probability (0..1) that the card would be recalled right now. */
export function retrievability(card: SrsCard, nowMs: number, retention: number): number {
  if (card.state === 0 || !card.lastReview) return 0;
  return getEngine(retention).get_retrievability(toFsrs(card, nowMs), new Date(nowMs), false);
}

/** Place a word that passed a placement check straight into review (used for words known from the old app). */
export function seedReviewCard(card: SrsCard, stabilityDays: number, difficulty: number, nowMs: number): SrsCard {
  return {
    ...card,
    state: 2,
    stability: stabilityDays,
    difficulty,
    scheduledDays: Math.round(stabilityDays),
    due: nowMs + stabilityDays * DAY,
    reps: 1,
    lastReview: nowMs,
  };
}
