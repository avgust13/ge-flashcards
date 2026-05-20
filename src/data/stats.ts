import type { Word } from '../types';

const KEY = 'ge-flashcards/stats/v1';
const EMA_ALPHA = 0.2;

export interface WordStat {
  correct: number;
  seen: number;
  lastSeen: number;
}

export type StatsMap = Record<number, WordStat>;

export function loadStats(): StatsMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return parsed as StatsMap;
  } catch {
    return {};
  }
}

export function saveStats(stats: StatsMap): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    // Quota exceeded or storage disabled — fail silently; in-memory state is still updated.
  }
}

export function clearStats(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function updateStat(prev: WordStat | undefined, right: boolean): WordStat {
  const base: WordStat = prev ?? { correct: 0, seen: 0, lastSeen: 0 };
  const target = right ? 1 : 0;
  return {
    correct: base.correct + EMA_ALPHA * (target - base.correct),
    seen: base.seen + 1,
    lastSeen: Date.now(),
  };
}

export function applyStatsToWords(words: Word[], stats: StatsMap): void {
  for (const w of words) {
    const s = stats[w.id];
    if (s) {
      w.correct = s.correct;
      w.seen = s.seen;
    }
  }
}
