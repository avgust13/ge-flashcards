/**
 * The exercise ladder: recognise → assemble → speak, with listening mixed in
 * once a card is mature. FSRS learning steps drive the climb, so no separate
 * "stage" field is stored.
 */
import type { ExerciseKind, SrsCard } from './types';

export interface LadderInfo {
  cardKind: 'word' | 'cell' | 'pattern' | 'phrase';
  /** Words in the example sentence (1 for a single word). */
  tokens: number;
  hasAudio: boolean;
}

export function pickExercise(card: SrsCard | undefined, info: LadderInfo): ExerciseKind {
  const state = card?.state ?? 0;
  const reps = card?.reps ?? 0;

  if (info.cardKind === 'word') {
    // Meaning first (Georgian → Russian), then the other way round, then aloud.
    if (state === 0) return 'recognise';
    if (state === 3) return 'recognise';
    if (state === 1) return reps <= 1 ? 'recognise' : 'speak';
    if (info.hasAudio && reps % 3 === 0) return 'listen';
    return 'speak';
  }

  const canAssemble = info.tokens >= 2;
  if (state === 0) return 'recognise';
  if (state === 3) return canAssemble ? 'assemble' : 'recognise';
  if (state === 1) return reps <= 1 && canAssemble ? 'assemble' : 'speak';
  if (info.hasAudio && reps % 4 === 0) return 'listen';
  if (canAssemble && (card?.stability ?? 0) < 7 && reps % 3 === 0) return 'assemble';
  return 'speak';
}

/** Rough time one exercise takes, ms — used to fit a session into its time budget. */
export const EXERCISE_COST_MS: Record<ExerciseKind, number> = {
  intro: 10_000,
  recognise: 6_000,
  assemble: 14_000,
  speak: 10_000,
  listen: 8_000,
};

/** A new card climbs several rungs inside the session that introduces it. */
export function newCardCostMs(cardKind: LadderInfo['cardKind']): number {
  return cardKind === 'word'
    ? EXERCISE_COST_MS.recognise * 2 + EXERCISE_COST_MS.speak
    : EXERCISE_COST_MS.recognise + EXERCISE_COST_MS.assemble + EXERCISE_COST_MS.speak;
}
