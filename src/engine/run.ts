/**
 * Glue between the pure engine and the live stores: builds plans from saved
 * progress, turns an answer into a rescheduled card, and persists the session.
 */
import {
  UNITS,
  allCardIds,
  audioIdFor,
  describeCard,
  examplesFor,
  getUnit,
  parseCardId,
  ruText,
  unitOfCard,
} from '../content/store';
import { updateStat } from '../data/stats';
import {
  allCards,
  bumpDay,
  getCard,
  getCourse,
  getDay,
  getExposure,
  getKv,
  getSettings,
  getWordStat,
  hasCard,
  putWordStat,
  recordReview,
  setCourse,
  setKv,
  today,
} from '../db/progress';
import { now } from '../srs/clock';
import {
  composeDaily,
  composeMatrixDrill,
  composeUnitPractice,
  type ComposerInput,
  type PlanItem,
  type SessionPlan,
} from '../srs/composer';
import { newSrsCard, review, seedReviewCard } from '../srs/fsrs';
import { pickExercise } from '../srs/ladder';
import { nextUnlocked, noteAttempt } from '../srs/mastery';
import { fastMsFor, rateChoice, rateConstruct } from '../srs/rating';
import type { CardKind, Rating, ReviewLogEntry, SrsCard } from '../srs/types';
import { buildExercise, cardInfo, type BuildCtx } from './build';
import { afterAnswer, type SessionState } from './session';
import type { Exercise, ExerciseResult } from './types';

/** Idle time on one item is not counted beyond this. */
export const MAX_ITEM_MS = 60_000;
const SESSION_KEY = 'session';

function composerInput(): ComposerInput {
  const course = getCourse();
  return {
    cards: allCards(),
    getCard,
    units: UNITS,
    unlocked: course.unlocked,
    seenExplain: new Set(course.seenExplain),
    settings: getSettings(),
    now: now(),
    studiedMs: getDay(today()).ms,
    info: cardInfo,
    rng: Math.random,
  };
}

export function planDaily(): SessionPlan {
  return composeDaily(composerInput());
}

export function planUnit(unitId: number): SessionPlan | null {
  const unit = getUnit(unitId);
  return unit ? composeUnitPractice(composerInput(), unit) : null;
}

export function planMatrix(verbId: string): SessionPlan {
  return composeMatrixDrill(composerInput(), verbId, [...allCardIds()]);
}

export function buildCtx(): BuildCtx {
  return {
    introduced: hasCard,
    exposure: getExposure,
    getCard,
    gender: getSettings().ruGender,
    rng: Math.random,
  };
}

/** The exercise for a queued card: the ladder decides the kind unless the plan forces one. */
export function exerciseFor(item: Extract<PlanItem, { type: 'card' }>): Exercise | null {
  const kind = item.forced ?? pickExercise(getCard(item.card), cardInfo(item.card));
  return buildExercise(item.card, kind, buildCtx());
}

export function markExplainSeen(stepId: string): void {
  const course = getCourse();
  if (!course.seenExplain.includes(stepId)) setCourse({ seenExplain: [...course.seenExplain, stepId] });
}

/** Time spent reading an explanation or a "new material" screen counts toward the day. */
export function logReadingTime(ms: number): void {
  bumpDay({ ms: Math.min(ms, MAX_ITEM_MS) });
}

function kindOf(cardId: string): CardKind {
  return cardId.startsWith('w:') ? 'w' : cardId.startsWith('s:') ? 's' : 'c';
}

export function ratingOf(ex: Exercise, r: ExerciseResult): Rating {
  if (r.type === 'self') return r.rating;
  if (r.type === 'choice') return rateChoice({ errs: r.errs, ms: r.ms, tokens: ex.tokens });
  return rateConstruct({ errs: r.errs, errOnFocus: r.errOnFocus, gaveUp: r.gaveUp, ms: r.ms, tokens: ex.tokens });
}

/**
 * Apply one finished exercise: grade it, reschedule the card, write the log,
 * keep the legacy word score in step, open the next unit if the gate is met,
 * and return the advanced session.
 */
export function applyAnswer(
  state: SessionState,
  item: Extract<PlanItem, { type: 'card' }>,
  ex: Exercise,
  result: ExerciseResult,
): SessionState {
  const t = now();
  const settings = getSettings();
  const rating = ratingOf(ex, result);
  const ms = Math.min(result.ms, MAX_ITEM_MS);
  const existing = getCard(ex.card);
  const isNew = !existing;
  const before = existing ?? newSrsCard(ex.card, kindOf(ex.card), unitOfCard(ex.card), t);

  let mode = state.mode;
  let next = item.counted ? review(before, rating, t, settings.desiredRetention) : before;

  // A word the learner already knew well in the old app skips the learning steps
  // after one clean, leak-free check.
  const parsed = parseCardId(ex.card);
  if (isNew && parsed?.kind === 'word' && rating >= 3) {
    const old = getWordStat(parsed.lexId);
    if (old && old.seen >= 3 && old.correct >= 0.6) {
      const stability = Math.min(14, Math.max(2, 2 + 12 * ((old.correct - 0.6) / 0.4) * Math.min(1, old.seen / 8)));
      const difficulty = Math.min(10, Math.max(1, 8 - 4 * old.correct));
      next = seedReviewCard(before, stability, difficulty, t);
      mode = 'migrate';
    }
  }

  if (ex.kind === 'speak' || ex.kind === 'assemble') {
    const fast = ex.kind === 'speak' && ms <= fastMsFor(ex.tokens);
    next = noteAttempt(next, rating >= 3, fast, ms);
  }

  const outcome = result.type === 'self' ? 'self' : result.errs === 0 ? 'first' : 'err';
  const log: ReviewLogEntry = {
    t,
    day: today(),
    sess: state.id,
    mode,
    card: ex.card,
    ex: ex.kind,
    item: ex.sentenceId,
    outcome: result.type === 'construct' && result.gaveUp ? 'wrong' : outcome,
    rating,
    counted: item.counted,
    ms,
    errs: result.type === 'self' ? 0 : result.errs,
    prev: { state: before.state, due: before.due, s: before.stability, d: before.difficulty },
  };
  recordReview(next, log, { exposureId: ex.sentenceId, isNew });

  // Words shared with the old vocabulary keep their free-practice score in step.
  if (parsed?.kind === 'word' && parsed.lexId < 2000) {
    putWordStat(parsed.lexId, updateStat(getWordStat(parsed.lexId), rating >= 3));
  }

  const course = getCourse();
  const unlocked = nextUnlocked(UNITS, course.unlocked, getCard);
  if (unlocked !== course.unlocked) setCourse({ unlocked });

  const view = describeCard(ex.card);
  const advanced = afterAnswer(
    state,
    next,
    {
      card: ex.card,
      ex: ex.kind,
      rating,
      ka: ex.reveal.ka || view?.ka || '',
      ru: ex.reveal.ru || (view ? ruText(view.ru, settings.ruGender) : ''),
    },
    ms,
  );
  saveSession(advanced);
  return advanced;
}

/** Audio clips the session may play, so they can be fetched (and cached) up front. */
export function sessionAudioIds(state: SessionState): string[] {
  const ids = new Set<string>();
  const add = (text: string | undefined) => {
    const id = text ? audioIdFor(text) : null;
    if (id) ids.add(id);
  };
  for (const item of state.items) {
    const cards = item.type === 'card' ? [item.card] : item.type === 'intro' ? item.cards : [];
    for (const card of cards) {
      add(describeCard(card)?.ka);
      for (const s of examplesFor(card)) add(s.ka);
    }
  }
  return [...ids];
}

/** Only the daily session survives a closed tab; extra practice is cheap to restart. */
export function saveSession(state: SessionState | null): void {
  if (state && state.mode !== 'daily') return;
  setKv(SESSION_KEY, state ?? undefined);
}

/** A saved daily session that is still worth resuming: same study day, not finished. */
export function loadSavedSession(): SessionState | null {
  const s = getKv<SessionState>(SESSION_KEY);
  if (!s || s.day !== today() || s.pos >= s.items.length) return null;
  return s;
}
