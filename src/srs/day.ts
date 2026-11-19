import type { DayStat } from './types';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function fmt(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Study-day key. The day rolls over at `startHour` local time, not at midnight. */
export function dayKey(ts: number, startHour = 4): string {
  return fmt(new Date(ts - startHour * HOUR));
}

/** Timestamp at which the study day containing `ts` ends. */
export function dayEnd(ts: number, startHour = 4): number {
  const d = new Date(ts - startHour * HOUR);
  d.setHours(0, 0, 0, 0);
  return d.getTime() + DAY + startHour * HOUR;
}

export function prevDayKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  // Noon avoids DST edges when stepping back a calendar day.
  return fmt(new Date(new Date(y, m - 1, d, 12).getTime() - DAY));
}

/**
 * Consecutive study days ending today — or yesterday, so the streak does not
 * read as broken before today's session.
 */
export function streak(days: ReadonlyMap<string, DayStat>, today: string): number {
  const active = (k: string) => (days.get(k)?.reviews ?? 0) > 0;
  let cursor = active(today) ? today : prevDayKey(today);
  let n = 0;
  while (active(cursor)) {
    n++;
    cursor = prevDayKey(cursor);
  }
  return n;
}
