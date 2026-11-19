/**
 * Exercise outcome → FSRS grade.
 *
 * Objective exercises never produce Easy: recognition overstates production
 * memory. A failure is always Again, never Hard — Hard is a pass in FSRS, and
 * using it for misses would inflate intervals.
 */
import type { Rating } from './types';

/** "Automatic" answer threshold: a base reaction time plus time per extra word. */
export function fastMsFor(tokens: number): number {
  return 2500 + 900 * Math.max(0, tokens - 1);
}

/** An answer slower than this is correct but effortful. */
export function slowMsFor(tokens: number): number {
  return fastMsFor(tokens) * 2.5;
}

export interface ChoiceResult {
  /** Wrong picks before the right one. */
  errs: number;
  ms: number;
  tokens: number;
}

/** Multiple choice: recognise, listen. */
export function rateChoice(r: ChoiceResult): Rating {
  if (r.errs > 0) return 1;
  return r.ms > slowMsFor(r.tokens) ? 2 : 3;
}

export interface ConstructResult {
  /** Failed checks before the answer was right. */
  errs: number;
  /** A failed check had the wrong form of the word being trained. */
  errOnFocus: boolean;
  /** The learner asked to see the answer. */
  gaveUp: boolean;
  ms: number;
  tokens: number;
}

/** Built answers: assemble. Tiles take longer than speech, so "slow" is more generous. */
export function rateConstruct(r: ConstructResult): Rating {
  if (r.gaveUp || r.errOnFocus || r.errs >= 2) return 1;
  if (r.errs === 1) return 2;
  return r.ms > slowMsFor(r.tokens) * 2 ? 2 : 3;
}

export const RATING_RU: Record<Rating, string> = {
  1: 'Не знал',
  2: 'С трудом',
  3: 'Хорошо',
  4: 'Легко',
};
