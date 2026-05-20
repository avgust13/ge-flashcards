import type { Word } from '../types';

const KEY = 'ge-flashcards/stats/v1';
const DAILY_KEY = 'ge-flashcards/daily/v1';
const EMA_ALPHA = 0.2;

export const DAILY_GOAL = 100;

export interface WordStat {
  correct: number;
  seen: number;
  lastSeen: number;
}

export type StatsMap = Record<number, WordStat>;

function sanitizeStat(v: unknown): WordStat | null {
  if (!v || typeof v !== 'object') return null;
  const s = v as Partial<WordStat>;
  const correct =
    typeof s.correct === 'number' && Number.isFinite(s.correct)
      ? Math.max(0, Math.min(1, s.correct))
      : 0;
  const seen =
    typeof s.seen === 'number' && Number.isFinite(s.seen) && s.seen >= 0 ? s.seen : 0;
  const lastSeen =
    typeof s.lastSeen === 'number' && Number.isFinite(s.lastSeen) ? s.lastSeen : 0;
  return { correct, seen, lastSeen };
}

export function loadStats(): StatsMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: StatsMap = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      const id = Number(k);
      if (!Number.isFinite(id)) continue;
      const stat = sanitizeStat(v);
      if (stat) out[id] = stat;
    }
    return out;
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
  const base: WordStat = sanitizeStat(prev) ?? { correct: 0, seen: 0, lastSeen: 0 };
  const target = right ? 1 : 0;
  const next = base.correct + EMA_ALPHA * (target - base.correct);
  return {
    correct: Math.max(0, Math.min(1, next)),
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

interface Daily {
  date: string;
  count: number;
}

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function readDaily(): Daily {
  const today = todayKey();
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return { date: today, count: 0 };
    const parsed = JSON.parse(raw) as Partial<Daily>;
    if (parsed?.date === today && typeof parsed.count === 'number') {
      return { date: today, count: parsed.count };
    }
    return { date: today, count: 0 };
  } catch {
    return { date: today, count: 0 };
  }
}

export function getDailyCount(): number {
  return readDaily().count;
}

export function incrementDaily(): number {
  const next: Daily = { date: todayKey(), count: readDaily().count + 1 };
  try {
    localStorage.setItem(DAILY_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next.count;
}

export function clearDaily(): void {
  try {
    localStorage.removeItem(DAILY_KEY);
  } catch {
    // ignore
  }
}
