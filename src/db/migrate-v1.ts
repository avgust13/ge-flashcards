import type { DayStat } from '../srs/types';
import type { AppDb, WordStatRow } from './db';

export const V1_STATS_KEY = 'ge-flashcards/stats/v1';
export const V1_DAILY_KEY = 'ge-flashcards/daily/v1';
const FLAG = 'migratedV1';

/** Pure: parse the old `{[wordId]: {correct, seen, lastSeen}}` blob, dropping anything malformed. */
export function parseV1Stats(raw: string | null): WordStatRow[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!parsed || typeof parsed !== 'object') return [];
  const out: WordStatRow[] = [];
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    const id = Number(k);
    if (!Number.isInteger(id) || !v || typeof v !== 'object') continue;
    const s = v as Record<string, unknown>;
    const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : 0);
    out.push({
      id,
      correct: Math.max(0, Math.min(1, num(s.correct))),
      seen: Math.max(0, num(s.seen)),
      lastSeen: num(s.lastSeen),
    });
  }
  return out;
}

/** Pure: the old daily counter only counts if it belongs to the current calendar day. */
export function parseV1Daily(raw: string | null, today: string): DayStat | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as { date?: unknown; count?: unknown };
    if (p?.date !== today || typeof p.count !== 'number' || !(p.count > 0)) return null;
    return { day: today, reviews: Math.floor(p.count), newCards: 0, ms: 0 };
  } catch {
    return null;
  }
}

/**
 * One-time copy of the localStorage progress into IndexedDB.
 *
 * The word scores are carried over unchanged so the legacy screens look the
 * same. No FSRS cards are created here: the old evidence is leaky (the answer
 * was visible on the card front), so words are re-checked lazily instead.
 * The localStorage keys are left in place for one release as a rollback.
 */
export async function migrateV1IfNeeded(db: AppDb, today: string): Promise<boolean> {
  if (await db.get('kv', FLAG)) return false;

  let statsRaw: string | null = null;
  let dailyRaw: string | null = null;
  try {
    statsRaw = globalThis.localStorage?.getItem(V1_STATS_KEY) ?? null;
    dailyRaw = globalThis.localStorage?.getItem(V1_DAILY_KEY) ?? null;
  } catch {
    // storage unavailable: nothing to migrate
  }

  const rows = parseV1Stats(statsRaw);
  const day = parseV1Daily(dailyRaw, today);

  const tx = db.transaction(['wordStats', 'days', 'kv'], 'readwrite');
  for (const r of rows) void tx.objectStore('wordStats').put(r);
  if (day) void tx.objectStore('days').put(day);
  void tx.objectStore('kv').put({ k: FLAG, v: { at: Date.now(), words: rows.length } });
  await tx.done;
  return true;
}
