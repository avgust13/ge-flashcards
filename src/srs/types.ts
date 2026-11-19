/** Spaced-repetition state, review log and settings. No DOM usage: shared with tests. */

export type CardKind = 'w' | 'c' | 's' | 'l';
export type CardId = string;
/** FSRS grades: Again | Hard | Good | Easy. */
export type Rating = 1 | 2 | 3 | 4;
/** FSRS states: New | Learning | Review | Relearning. */
export type CardState = 0 | 1 | 2 | 3;

export interface SrsCard {
  id: CardId;
  kind: CardKind;
  unit: number | null;
  // FSRS memory (mirrors ts-fsrs v5 Card, dates as epoch ms)
  due: number;
  stability: number;
  difficulty: number;
  scheduledDays: number;
  learningSteps: number;
  reps: number;
  lapses: number;
  state: CardState;
  lastReview: number | null;
  // app-level
  introducedAt: number;
  /** Latency of the last production attempt, ms. */
  lastMs: number | null;
  /** Bitfield: bit i set = i-th most recent production attempt passed (3 bits kept). */
  recent: number;
  /** Bitfield: bit i set = i-th most recent production attempt was under the "automatic" threshold. */
  fast: number;
  /** How many production attempts are recorded in `recent`/`fast` (max 3). */
  attempts: number;
  suspended: boolean;
  /** AI-created content that did not pass the verified tables. */
  unverified: boolean;
}

export type ExerciseKind = 'intro' | 'recognise' | 'assemble' | 'speak' | 'listen';
export type SessionMode = 'daily' | 'unit' | 'matrix' | 'free' | 'alphabet' | 'migrate';
export type Outcome = 'first' | 'err' | 'wrong' | 'self';

export interface ReviewLogEntry {
  id?: number;
  t: number;
  day: string;
  sess: string;
  mode: SessionMode;
  card: CardId;
  ex: ExerciseKind;
  /** Exemplar sentence id, if any. */
  item: string | null;
  outcome: Outcome;
  rating: Rating;
  /** false: logged, but the answer did not move the FSRS schedule. */
  counted: boolean;
  ms: number;
  errs: number;
  prev: { state: number; due: number; s: number; d: number };
}

export interface DayStat {
  day: string;
  reviews: number;
  newCards: number;
  /** Active study time, ms. */
  ms: number;
}

export interface WordStat {
  correct: number;
  seen: number;
  lastSeen: number;
}

export interface Exposure {
  id: string;
  n: number;
  last: number;
}

export interface Settings {
  v: 1;
  dailyMinutes: number;
  newPerDay: 'auto' | number;
  desiredRetention: number;
  dayStartHour: number;
  translit: 'always' | 'never';
  autoplay: boolean;
  /** Grammatical gender used for the learner in Russian prompts ("я сделал / сделала"). */
  ruGender: 'm' | 'f';
  lastBackupAt: number | null;
}

export const DEFAULT_SETTINGS: Settings = {
  v: 1,
  dailyMinutes: 18,
  newPerDay: 'auto',
  desiredRetention: 0.9,
  dayStartHour: 4,
  translit: 'always',
  autoplay: true,
  ruGender: 'm',
  lastBackupAt: null,
};

export interface CourseState {
  /** Highest unit the learner may take new material from. */
  unlocked: number;
  /** Explanation blocks already shown. */
  seenExplain: string[];
  /** Day on which each unit's gate was first met, for the "two different days" feel. */
  gateMetOn: Record<number, string>;
}

export const DEFAULT_COURSE: CourseState = { unlocked: 1, seenExplain: [], gateMetOn: {} };
