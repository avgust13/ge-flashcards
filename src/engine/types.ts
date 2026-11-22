import type { AiTag } from '../content/types';
import type { CardId, ExerciseKind, Rating } from '../srs/types';

/** What is shown once the learner has answered. */
export interface Reveal {
  ka: string;
  ru: string;
  /** Audio clip id, if one exists for this text. */
  audio: string | null;
  note: string | null;
  /** The text came from the AI tutor: how far its words are confirmed. */
  ai?: AiTag;
}

export interface ChoiceOption {
  text: string;
  /** true: Georgian text (use the Georgian font, show transliteration). */
  ka: boolean;
  /** Second line under the option, e.g. the meaning of a minimal-pair word. */
  sub?: string;
}

export interface Tile {
  /** Stable index within this exercise (tile texts may repeat). */
  i: number;
  t: string;
  decoy: boolean;
}

interface Base {
  /** Unique within the session: lets React reset the exercise component. */
  uid: string;
  card: CardId;
  /** Example sentence used, for exposure rotation and the log. */
  sentenceId: string | null;
  /** Words in the answer, for the "automatic" time threshold. */
  tokens: number;
  reveal: Reveal;
  /** Overrides the default question line ("Что это значит?"). */
  title?: string;
  /** Never show transliteration in this exercise: it would be the answer (letter drills). */
  noTranslit?: boolean;
}

export interface RecogniseExercise extends Base {
  kind: 'recognise';
  dir: 'ru-ka' | 'ka-ru';
  prompt: string;
  promptAudio: string | null;
  options: ChoiceOption[];
  correct: number;
}

export interface ListenExercise extends Base {
  kind: 'listen';
  audio: string;
  options: ChoiceOption[];
  correct: number;
}

export interface AssembleExercise extends Base {
  kind: 'assemble';
  promptRu: string;
  tiles: Tile[];
  /** The canonical answer as tile texts, including a final "?" for questions. */
  solution: string[];
  /** Tile text of the verb (must be the last word), if the sentence has one. */
  verb: string | null;
  /** Tile texts that must stand directly before the verb (or before "არ"): question words. */
  beforeVerb: string[];
  /** The word this card trains; a failed check without it counts as a miss on the focus. */
  focus: string | null;
}

export interface SpeakExercise extends Base {
  kind: 'speak';
  promptRu: string;
}

export type Exercise = RecogniseExercise | ListenExercise | AssembleExercise | SpeakExercise;

/** What an exercise component reports when the learner is done with it. */
export type ExerciseResult =
  | { type: 'choice'; errs: number; ms: number }
  | { type: 'construct'; errs: number; errOnFocus: boolean; gaveUp: boolean; ms: number }
  | { type: 'self'; rating: Rating; ms: number };

export interface SessionResultRow {
  card: CardId;
  ex: ExerciseKind;
  rating: Rating;
  ka: string;
  ru: string;
}

/** Longest phrase that is still drilled with tiles; longer ones go straight to "say it". */
export const MAX_ASSEMBLE_TOKENS = 8;
