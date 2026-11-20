/**
 * "Распределить долг": when more reviews are due than fit into a day, spread
 * the overdue ones over the coming days instead of facing all of them at once.
 *
 * Only the due date moves. The memory model is untouched, so a card that is
 * seen later is simply graded on a longer gap — FSRS accounts for that.
 */
import { dayEnd } from './day';
import type { Settings, SrsCard } from './types';

const DAY = 86_400_000;
/** Share of the daily time that reviews may take (the rest is for new material). */
const REVIEW_SHARE = 0.7;
const MAX_DAYS = 21;

export interface Spread {
  /** Cards with their new due date; write these back to apply the plan. */
  moved: SrsCard[];
  /** How many days after today the last moved card lands on. */
  days: number;
  /** Reviews that stay for today. */
  today: number;
}

export function planSpread(
  cards: Iterable<SrsCard>,
  now: number,
  settings: Pick<Settings, 'dailyMinutes' | 'dayStartHour'>,
  cost: (c: SrsCard) => number,
): Spread {
  const end = dayEnd(now, settings.dayStartHour);
  const perDay = settings.dailyMinutes * 60_000 * REVIEW_SHARE;
  const load = new Array<number>(MAX_DAYS + 1).fill(0);
  const overdue: SrsCard[] = [];

  for (const c of cards) {
    if (c.suspended || c.state === 0) continue;
    const offset = c.due <= end ? 0 : Math.ceil((c.due - end) / DAY);
    if (offset > MAX_DAYS) continue;
    // Cards in their learning steps keep their time: minutes matter there.
    if (offset === 0 && c.state === 2) overdue.push(c);
    else load[offset] += cost(c);
  }

  // The shakiest memories first: they lose the most from waiting.
  overdue.sort((a, b) => a.stability - b.stability || a.due - b.due);

  const moved: SrsCard[] = [];
  let today = 0;
  let days = 0;
  for (const c of overdue) {
    const ms = cost(c);
    let d = 0;
    // Always allow at least one card on a day, however small the budget.
    while (d < MAX_DAYS && load[d] > 0 && load[d] + ms > perDay) d++;
    load[d] += ms;
    if (d === 0) {
      today++;
      continue;
    }
    days = Math.max(days, d);
    // Due at the very start of that study day.
    moved.push({ ...c, due: end + (d - 1) * DAY + 1 });
  }
  return { moved, days, today };
}
