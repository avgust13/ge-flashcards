/**
 * Builds a study session. Pure: everything it needs is passed in, so the same
 * inputs (and the same seeded RNG) always give the same plan.
 */
import type { Unit } from '../content/types';
import { dayEnd } from './day';
import { EXERCISE_COST_MS, newCardCostMs, pickExercise, type LadderInfo } from './ladder';
import { isPassed, skeletonCards, unitCards, unitProgress } from './mastery';
import type { ExerciseKind, Settings, SrsCard } from './types';

export type PlanItem =
  | { type: 'explain'; unit: number; stepId: string }
  | { type: 'intro'; unit: number; title: string; cards: string[] }
  | { type: 'card'; card: string; isNew: boolean; counted: boolean; forced?: ExerciseKind };

export interface SessionPlan {
  items: PlanItem[];
  /** Cards due today, whether or not they fit into this session. */
  dueCount: number;
  reviewCount: number;
  /** New cards in this session, letters included. */
  newCount: number;
  /** How many of the new cards are letters. */
  newLetters: number;
  /** More was due than the time budget allows; no new material is given. */
  backlog: boolean;
  estMs: number;
  budgetMs: number;
}

export interface CardInfo extends LadderInfo {
  /** `verb.tense` for verb cells — used to keep look-alike cards apart. */
  group: string | null;
}

export interface ComposerInput {
  cards: Iterable<SrsCard>;
  getCard: (id: string) => SrsCard | undefined;
  units: Unit[];
  /** Letter cards in teaching order. The alphabet runs alongside the units, a few letters a day. */
  letterIds: readonly string[];
  unlocked: number;
  seenExplain: ReadonlySet<string>;
  settings: Settings;
  now: number;
  /** Study time already logged today, ms. */
  studiedMs: number;
  info: (cardId: string) => CardInfo;
  rng: () => number;
}

const MIN_BUDGET_MS = 3 * 60_000;
const REVIEW_SHARE = 0.7;
const AUTO_NEW_SKELETON = 8;
const AUTO_NEW_WORDS = 5;
/** At four letters a day the whole alphabet takes nine days. */
const AUTO_NEW_LETTERS = 4;
const WARMUP = 6;

function reviewCost(card: SrsCard, info: CardInfo): number {
  return EXERCISE_COST_MS[pickExercise(card, info)];
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Greedy reorder so that two cards of the same verb and tense are not adjacent. */
export function interleave(ids: string[], group: (id: string) => string | null): string[] {
  const rest = [...ids];
  const out: string[] = [];
  let prev: string | null = null;
  while (rest.length) {
    let i = rest.findIndex((id) => {
      const g = group(id);
      return g == null || g !== prev;
    });
    if (i < 0) i = 0;
    const [id] = rest.splice(i, 1);
    out.push(id);
    prev = group(id);
  }
  return out;
}

interface NewGroup {
  unit: number;
  title: string;
  explain: string[];
  cards: string[];
}

/** New material still to be introduced in the current unit, in course order. */
export function pendingNew(input: Pick<ComposerInput, 'units' | 'unlocked' | 'getCard' | 'seenExplain'>): NewGroup[] {
  for (const unit of input.units) {
    if (!unit.ready || unit.id > input.unlocked) continue;
    const groups: NewGroup[] = [];
    let explain: string[] = [];
    for (const step of unit.steps) {
      if (step.kind === 'explain') {
        if (!input.seenExplain.has(step.id)) explain.push(step.id);
        continue;
      }
      const fresh = step.cards.filter((id) => !input.getCard(id));
      if (fresh.length) {
        groups.push({ unit: unit.id, title: step.titleRu, explain, cards: fresh });
        explain = [];
      } else {
        // The step is already learned: its explanation needs no replay.
        explain = [];
      }
    }
    if (groups.length) return groups;
  }
  return [];
}

function limits(settings: Settings): { skeleton: number; words: number; letters: number } {
  if (settings.newPerDay === 'auto') {
    return { skeleton: AUTO_NEW_SKELETON, words: AUTO_NEW_WORDS, letters: AUTO_NEW_LETTERS };
  }
  const n = Math.max(0, Math.floor(settings.newPerDay));
  return { skeleton: n, words: Math.ceil(n / 2), letters: Math.min(6, Math.ceil(n / 2)) };
}

export function composeDaily(input: ComposerInput): SessionPlan {
  const { settings, now, info } = input;
  const dailyMs = settings.dailyMinutes * 60_000;
  const budgetMs = Math.max(MIN_BUDGET_MS, dailyMs - input.studiedMs);
  const end = dayEnd(now, settings.dayStartHour);

  // `cards` may be a one-shot iterator: read it once.
  const all = [...input.cards];
  const due = all.filter((c) => !c.suspended && c.state !== 0 && c.due <= end);
  // Cards still in their learning steps first, then the most overdue.
  due.sort((a, b) => {
    const la = a.state === 1 || a.state === 3 ? 0 : 1;
    const lb = b.state === 1 || b.state === 3 ? 0 : 1;
    return la - lb || a.due - b.due;
  });

  const groups = pendingNew(input);
  const pendingLetters = input.letterIds.filter((id) => !input.getCard(id));
  const reviewBudget = groups.length || pendingLetters.length ? budgetMs * REVIEW_SHARE : budgetMs;

  const reviews: SrsCard[] = [];
  let reviewMs = 0;
  for (const c of due) {
    const cost = reviewCost(c, info(c.id));
    const learning = c.state === 1 || c.state === 3;
    if (!learning && reviewMs + cost > reviewBudget && reviews.length > 0) continue;
    reviews.push(c);
    reviewMs += cost;
  }
  const backlog = reviews.length < due.length;

  // ── new material ─────────────────────────────────────────────────────────
  const items: PlanItem[] = [];
  const newItems: PlanItem[] = [];
  let newMs = 0;
  let newCount = 0;
  let newLetters = 0;
  if (!backlog) {
    let { skeleton, words, letters } = limits(settings);
    // Ease off when tomorrow already looks full.
    let tomorrowMs = 0;
    for (const c of all) {
      if (!c.suspended && c.state !== 0 && c.due > end && c.due <= end + 86_400_000) {
        tomorrowMs += reviewCost(c, info(c.id));
      }
    }
    if (tomorrowMs > dailyMs * 0.8) {
      skeleton = Math.ceil(skeleton / 2);
      words = Math.ceil(words / 2);
      letters = Math.ceil(letters / 2);
    }
    // The allowance is per study day, not per session: a second sitting today
    // only gets what the first one left.
    const dayStart = end - 86_400_000;
    for (const c of all) {
      if (c.introducedAt < dayStart) continue;
      if (c.kind === 'l') letters--;
      else if (c.kind === 'w') words--;
      else skeleton--;
    }
    skeleton = Math.max(0, skeleton);
    words = Math.max(0, words);
    letters = Math.max(0, letters);
    const newBudget = budgetMs - reviewMs;

    // Letters first: they are quick, and reading is what everything else leans on.
    const freshLetters: string[] = [];
    for (const id of pendingLetters) {
      const cost = newCardCostMs('letter');
      if (freshLetters.length >= letters || (newCount > 0 && newMs + cost > newBudget)) break;
      freshLetters.push(id);
      newMs += cost;
      newCount++;
    }
    if (freshLetters.length) {
      newLetters = freshLetters.length;
      newItems.push({ type: 'intro', unit: 0, title: 'Буквы', cards: freshLetters });
      newMs += EXERCISE_COST_MS.intro;
      for (const id of freshLetters) newItems.push({ type: 'card', card: id, isNew: true, counted: true });
    }

    let stop = false;
    for (const g of groups) {
      const take: string[] = [];
      for (const id of g.cards) {
        const kind = info(id).cardKind;
        const isWord = kind === 'word';
        const cost = newCardCostMs(kind);
        const room = isWord ? words > 0 : skeleton > 0;
        // Within the daily allowance, always allow one new card of the course
        // itself, so a short time budget never blocks progress entirely.
        if (!room || (newCount > newLetters && newMs + cost > newBudget)) {
          stop = true;
          break;
        }
        take.push(id);
        newMs += cost;
        newCount++;
        if (isWord) words--;
        else skeleton--;
      }
      if (take.length) {
        for (const stepId of g.explain) {
          newItems.push({ type: 'explain', unit: g.unit, stepId });
          newMs += EXERCISE_COST_MS.intro * 2;
        }
        newItems.push({ type: 'intro', unit: g.unit, title: g.title, cards: take });
        newMs += EXERCISE_COST_MS.intro;
        for (const id of take) newItems.push({ type: 'card', card: id, isNew: true, counted: true });
      }
      if (stop) break;
    }
  }

  // ── order: warm-up reviews, new material, the remaining reviews mixed ────
  // Warm up on what is already known before anything new: cards still in their
  // learning steps come first (they are sorted to the front), then the most overdue.
  const reviewIds = reviews.map((c) => c.id);
  const warm = newItems.length ? reviewIds.slice(0, WARMUP) : [];
  const warmSet = new Set(warm);
  const rest = interleave(
    reviewIds.filter((id) => !warmSet.has(id)),
    (id) => info(id).group,
  );
  const asReview = (id: string): PlanItem => ({ type: 'card', card: id, isNew: false, counted: true });
  items.push(...warm.map(asReview), ...newItems, ...rest.map(asReview));

  // ── stalled unit: everything is introduced but not yet automatic ─────────
  let extraMs = 0;
  if (!groups.length && !backlog) {
    const unit = input.units.find((u) => u.id === input.unlocked);
    if (unit?.ready && !unitProgress(unit, input.getCard).gateMet) {
      const inPlan = new Set(reviewIds);
      const weak = skeletonCards(unit)
        .filter((id) => !inPlan.has(id) && input.getCard(id) && !isPassed(input.getCard(id)))
        .sort((a, b) => (input.getCard(a)!.stability ?? 0) - (input.getCard(b)!.stability ?? 0));
      const room = Math.max(0, budgetMs - reviewMs);
      for (const id of weak) {
        if (extraMs + EXERCISE_COST_MS.speak > room) break;
        items.push({ type: 'card', card: id, isNew: false, counted: false, forced: 'speak' });
        extraMs += EXERCISE_COST_MS.speak;
      }
    }
  }

  return {
    items,
    dueCount: due.length,
    reviewCount: reviews.length,
    newCount,
    newLetters,
    backlog,
    estMs: reviewMs + newMs + extraMs,
    budgetMs,
  };
}

/**
 * Extra alphabet practice: optionally the next group of new letters, then the
 * letters learned so far, weakest first.
 */
export function composeAlphabet(input: ComposerInput, nextGroup: readonly string[], max = 24): SessionPlan {
  const fresh = nextGroup.filter((id) => !input.getCard(id));
  const known = input.letterIds
    .filter((id) => input.getCard(id))
    .sort((a, b) => {
      const ca = input.getCard(a)!;
      const cb = input.getCard(b)!;
      const la = ca.state === 2 ? 1 : 0;
      const lb = cb.state === 2 ? 1 : 0;
      return la - lb || ca.stability - cb.stability;
    })
    .slice(0, max);
  const items: PlanItem[] = [];
  if (fresh.length) {
    items.push({ type: 'intro', unit: 0, title: 'Буквы', cards: fresh });
    for (const id of fresh) items.push({ type: 'card', card: id, isNew: true, counted: true });
  }
  for (const id of shuffle(known, input.rng)) {
    const c = input.getCard(id)!;
    items.push({ type: 'card', card: id, isNew: false, counted: c.due <= input.now });
  }
  const estMs =
    fresh.length * newCardCostMs('letter') +
    known.reduce((sum, id) => sum + EXERCISE_COST_MS[pickExercise(input.getCard(id), input.info(id))], 0);
  return {
    items,
    dueCount: 0,
    reviewCount: known.length,
    newCount: fresh.length,
    newLetters: fresh.length,
    backlog: false,
    estMs,
    budgetMs: estMs,
  };
}

function practicePlan(ids: string[], input: ComposerInput, forced?: ExerciseKind): SessionPlan {
  const items: PlanItem[] = ids.map((id) => {
    const c = input.getCard(id)!;
    // Extra practice moves the schedule only when the card is actually due.
    return { type: 'card', card: id, isNew: false, counted: c.due <= input.now, forced };
  });
  const estMs = ids.reduce((sum, id) => {
    const kind = forced ?? pickExercise(input.getCard(id), input.info(id));
    return sum + EXERCISE_COST_MS[kind];
  }, 0);
  return {
    items,
    dueCount: 0,
    reviewCount: ids.length,
    newCount: 0,
    newLetters: 0,
    backlog: false,
    estMs,
    budgetMs: estMs,
  };
}

/** Extra practice of one unit: its introduced cards, weakest first. */
export function composeUnitPractice(input: ComposerInput, unit: Unit, max = 20): SessionPlan {
  const ids = unitCards(unit)
    .filter((id) => input.getCard(id))
    .sort((a, b) => {
      const ca = input.getCard(a)!;
      const cb = input.getCard(b)!;
      return Number(isPassed(ca)) - Number(isPassed(cb)) || ca.stability - cb.stability;
    })
    .slice(0, max);
  return practicePlan(interleave(ids, (id) => input.info(id).group), input);
}

/** "Прокрутка": spin one verb through every cell learned so far, saying each aloud. */
export function composeMatrixDrill(input: ComposerInput, verbId: string, cellIds: string[]): SessionPlan {
  const ids = shuffle(
    cellIds.filter((id) => id.startsWith(`c:${verbId}.`) && input.getCard(id)),
    input.rng,
  );
  return practicePlan(ids, input, 'speak');
}
