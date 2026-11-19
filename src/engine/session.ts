/**
 * A running study session as plain serialisable data plus pure transitions,
 * so it can be saved after every answer and resumed after the tab is closed.
 */
import type { PlanItem, SessionPlan } from '../srs/composer';
import type { SessionMode, SrsCard } from '../srs/types';
import type { SessionResultRow } from './types';

export interface SessionState {
  id: string;
  mode: SessionMode;
  /** Study day the session belongs to; a saved session from another day is discarded. */
  day: string;
  items: PlanItem[];
  pos: number;
  startedAt: number;
  /** Active time so far, ms (idle time is capped per item). */
  activeMs: number;
  budgetMs: number;
  /** How often each card has been answered in this session. */
  seen: Record<string, number>;
  results: SessionResultRow[];
  /** The learner chose to continue past the time budget. */
  extendedMs: number;
  /** Where "back" and the summary should lead. */
  origin: string;
}

/** A card answered inside its learning steps comes back at least this many items later. */
const REQUEUE_GAP = 4;
/** …and at most this many times per session. */
const MAX_IN_SESSION = 3;

export function startSession(
  plan: SessionPlan,
  mode: SessionMode,
  day: string,
  now: number,
  origin: string,
): SessionState {
  return {
    id: `${mode}-${now.toString(36)}`,
    mode,
    day,
    items: plan.items,
    pos: 0,
    startedAt: now,
    activeMs: 0,
    budgetMs: plan.budgetMs,
    seen: {},
    results: [],
    extendedMs: 0,
    origin,
  };
}

export function currentItem(s: SessionState): PlanItem | null {
  return s.items[s.pos] ?? null;
}

export function isFinished(s: SessionState): boolean {
  return s.pos >= s.items.length;
}

/** Move past an explanation or intro screen. */
export function advance(s: SessionState, spentMs: number): SessionState {
  return { ...s, pos: s.pos + 1, activeMs: s.activeMs + spentMs };
}

/**
 * Record an answered card and move on. A card that is still in its learning
 * steps is put back into the queue so it climbs the ladder within the session.
 */
export function afterAnswer(
  s: SessionState,
  card: SrsCard,
  row: SessionResultRow,
  spentMs: number,
): SessionState {
  const item = s.items[s.pos];
  const seenCount = (s.seen[card.id] ?? 0) + 1;
  const items = [...s.items];
  const learning = card.state === 1 || card.state === 3;
  const counted = item?.type === 'card' ? item.counted : true;
  if (learning && counted && seenCount < MAX_IN_SESSION) {
    const at = Math.min(items.length, s.pos + 1 + REQUEUE_GAP);
    items.splice(at, 0, { type: 'card', card: card.id, isNew: false, counted: true });
  }
  return {
    ...s,
    items,
    pos: s.pos + 1,
    activeMs: s.activeMs + spentMs,
    seen: { ...s.seen, [card.id]: seenCount },
    results: [...s.results, row],
  };
}

/** Has the time budget run out (and is there still material left)? */
export function overBudget(s: SessionState): boolean {
  return !isFinished(s) && s.activeMs >= s.budgetMs + s.extendedMs;
}

export function extend(s: SessionState, ms: number): SessionState {
  return { ...s, extendedMs: s.extendedMs + ms };
}

/** Drop everything that has not been shown yet (the learner chose to stop). */
export function stopHere(s: SessionState): SessionState {
  return { ...s, items: s.items.slice(0, s.pos) };
}

export function progressFraction(s: SessionState): number {
  return s.items.length === 0 ? 1 : Math.min(1, s.pos / s.items.length);
}
