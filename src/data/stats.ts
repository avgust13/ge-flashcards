/**
 * Legacy per-word mastery score (an exponential moving average, 0..1) used by
 * the free-practice flashcards, the selection graph and the level map.
 * Storage now lives in IndexedDB behind `db/progress`; this module keeps the
 * small API the legacy screens rely on.
 */
import { allWordStats, bumpDay, getWordStat, putWordStat } from '../db/progress';
import { now } from '../srs/clock';
import type { WordStat } from '../srs/types';
import type { Word } from '../types';

export type { WordStat } from '../srs/types';

const EMA_ALPHA = 0.2;

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export function updateStat(prev: WordStat | undefined, right: boolean): WordStat {
  const base: WordStat = prev ?? { correct: 0, seen: 0, lastSeen: 0 };
  const target = right ? 1 : 0;
  return {
    correct: clamp01(base.correct + EMA_ALPHA * (target - base.correct)),
    seen: base.seen + 1,
    lastSeen: now(),
  };
}

/** Copy the saved scores onto the live `WORDS` objects (they are mutated in place by design). */
export function applyStatsToWords(words: Word[]): void {
  const stats = allWordStats();
  for (const w of words) {
    const s = stats.get(w.id);
    w.correct = s ? s.correct : 0;
    w.seen = s ? s.seen : 0;
  }
}

/** One graded flashcard: update the score, the live word object and today's activity. */
export function recordWordAnswer(word: Word, right: boolean): void {
  const next = updateStat(getWordStat(word.id), right);
  putWordStat(word.id, next);
  word.correct = next.correct;
  word.seen = next.seen;
  bumpDay({ reviews: 1 });
}
