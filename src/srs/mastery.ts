/**
 * "Automatism" tracking and the gate that opens the next unit.
 *
 * Each card remembers its last three production attempts (speak / assemble):
 * whether they passed and whether they were fast. A unit is done when most of
 * its skeleton cards are not just known but produced without hesitation.
 */
import type { Unit } from '../content/types';
import type { SrsCard } from './types';

const KEEP = 3;
const MASK = (1 << KEEP) - 1;

export const GATE = {
  /** Share of the unit's skeleton cards that must have left the learning steps. */
  inReview: 0.9,
  /** Share whose last three production attempts all passed. */
  passed: 0.85,
  /** Share that is also fast. */
  automatic: 0.7,
} as const;

/** Record one production attempt on the card's rolling 3-attempt history. */
export function noteAttempt(card: SrsCard, passed: boolean, fast: boolean, ms: number): SrsCard {
  return {
    ...card,
    recent: ((card.recent << 1) | (passed ? 1 : 0)) & MASK,
    fast: ((card.fast << 1) | (passed && fast ? 1 : 0)) & MASK,
    attempts: Math.min(KEEP, card.attempts + 1),
    lastMs: ms,
  };
}

function bits(n: number): number {
  let c = 0;
  for (let v = n & MASK; v; v >>= 1) c += v & 1;
  return c;
}

/** Last three production attempts were all Good or better. */
export function isPassed(card: SrsCard | undefined): boolean {
  return !!card && card.attempts >= KEEP && (card.recent & MASK) === MASK;
}

/** Passed, and at least two of those three answers were under the "automatic" threshold. */
export function isAutomatic(card: SrsCard | undefined): boolean {
  return isPassed(card) && bits(card!.fast) >= 2;
}

/** Cards that make up the skeleton of a unit: verb cells, patterns and set phrases (not single words). */
export function skeletonCards(unit: Unit): string[] {
  return unitCards(unit).filter((id) => !id.startsWith('w:'));
}

export function unitCards(unit: Unit): string[] {
  return unit.steps.flatMap((s) => (s.kind === 'cards' ? s.cards : []));
}

export interface UnitProgress {
  total: number;
  introduced: number;
  skeleton: number;
  inReview: number;
  passed: number;
  automatic: number;
  allIntroduced: boolean;
  gateMet: boolean;
  /** 0..1, for progress bars: introduction counts for half, automatism for the other half. */
  fraction: number;
}

export function unitProgress(unit: Unit, getCard: (id: string) => SrsCard | undefined): UnitProgress {
  const all = unitCards(unit);
  const skel = skeletonCards(unit);
  const introduced = all.filter((id) => getCard(id)).length;
  let inReview = 0;
  let passed = 0;
  let automatic = 0;
  for (const id of skel) {
    const c = getCard(id);
    if (!c) continue;
    if (c.state === 2) inReview++;
    if (isPassed(c)) passed++;
    if (isAutomatic(c)) automatic++;
  }
  const allIntroduced = all.length > 0 && introduced === all.length;
  const n = Math.max(1, skel.length);
  const gateMet =
    allIntroduced &&
    inReview / n >= GATE.inReview &&
    passed / n >= GATE.passed &&
    automatic / n >= GATE.automatic;
  const fraction = all.length === 0 ? 0 : 0.5 * (introduced / all.length) + 0.5 * (automatic / n);
  return {
    total: all.length,
    introduced,
    skeleton: skel.length,
    inReview,
    passed,
    automatic,
    allIntroduced,
    gateMet,
    fraction,
  };
}

/**
 * Highest unit that should be open: the current one, plus every following
 * ready unit whose predecessor's gate is met.
 */
export function nextUnlocked(
  units: Unit[],
  unlocked: number,
  getCard: (id: string) => SrsCard | undefined,
): number {
  let cur = unlocked;
  for (;;) {
    const unit = units.find((u) => u.id === cur);
    const next = units.find((u) => u.id === cur + 1);
    if (!unit || !next?.ready || !unitProgress(unit, getCard).gateMet) return cur;
    cur++;
  }
}
