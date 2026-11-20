/**
 * Numbers for the statistics screen. Pure: everything is computed from the
 * cards, the per-day counters and (for retention) the review log.
 */
import { dayEnd, dayKey, prevDayKey } from './day';
import { isAutomatic } from './mastery';
import type { CardKind, DayStat, ReviewLogEntry, SrsCard } from './types';

const DAY = 86_400_000;
/** A card whose memory is expected to last three weeks counts as firmly learned. */
export const MATURE_DAYS = 21;
const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];

export interface DayPoint {
  day: string;
  /** Short weekday, «пн». */
  label: string;
  minutes: number;
  reviews: number;
  newCards: number;
}

export interface ForecastPoint {
  /** 0 = today (everything already due), 1 = tomorrow… */
  offset: number;
  label: string;
  count: number;
}

export interface Summary {
  total: number;
  /** Still in the learning steps (or being relearned). */
  learning: number;
  /** In spaced review. */
  review: number;
  mature: number;
  automatic: number;
  suspended: number;
  byKind: Record<CardKind, number>;
  activity: DayPoint[];
  forecast: ForecastPoint[];
  totalMinutes: number;
  totalReviews: number;
  studyDays: number;
}

function weekday(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return WEEKDAYS[new Date(y, m - 1, d, 12).getDay()];
}

export function summarise(
  cards: Iterable<SrsCard>,
  days: ReadonlyMap<string, DayStat>,
  now: number,
  startHour = 4,
  span = 14,
): Summary {
  const end = dayEnd(now, startHour);
  const today = dayKey(now, startHour);
  const forecast: ForecastPoint[] = Array.from({ length: 7 }, (_, offset) => ({
    offset,
    label: offset === 0 ? 'сегодня' : weekday(dayKey(now + offset * DAY, startHour)),
    count: 0,
  }));
  const s: Summary = {
    total: 0,
    learning: 0,
    review: 0,
    mature: 0,
    automatic: 0,
    suspended: 0,
    byKind: { w: 0, c: 0, s: 0, l: 0 },
    activity: [],
    forecast,
    totalMinutes: 0,
    totalReviews: 0,
    studyDays: 0,
  };

  for (const c of cards) {
    s.total++;
    s.byKind[c.kind]++;
    if (c.suspended) {
      s.suspended++;
      continue;
    }
    if (c.state === 2) {
      s.review++;
      if (c.stability >= MATURE_DAYS) s.mature++;
    } else if (c.state === 1 || c.state === 3) {
      s.learning++;
    }
    if (isAutomatic(c)) s.automatic++;
    if (c.state !== 0) {
      const offset = c.due <= end ? 0 : Math.ceil((c.due - end) / DAY);
      if (offset < forecast.length) forecast[offset].count++;
    }
  }

  let key = today;
  for (let i = 0; i < span; i++) {
    const d = days.get(key);
    s.activity.unshift({
      day: key,
      label: weekday(key),
      minutes: Math.round((d?.ms ?? 0) / 60_000),
      reviews: d?.reviews ?? 0,
      newCards: d?.newCards ?? 0,
    });
    key = prevDayKey(key);
  }

  let ms = 0;
  for (const d of days.values()) {
    ms += d.ms;
    s.totalReviews += d.reviews;
    if (d.reviews > 0) s.studyDays++;
  }
  s.totalMinutes = Math.round(ms / 60_000);
  return s;
}

export interface Retention {
  /** Reviews of cards that were already in spaced review. */
  n: number;
  /** …of which the answer was recalled (anything but "Снова"). */
  recalled: number;
  /** 0..1, or null when there is too little to go on. */
  rate: number | null;
}

/** How often a card in review was still remembered when it came up. The scheduler aims at 0.9. */
export function retention(logs: Iterable<ReviewLogEntry>, minSample = 20): Retention {
  let n = 0;
  let recalled = 0;
  for (const l of logs) {
    if (!l.counted || l.prev.state !== 2) continue;
    n++;
    if (l.rating > 1) recalled++;
  }
  return { n, recalled, rate: n >= minSample ? recalled / n : null };
}
