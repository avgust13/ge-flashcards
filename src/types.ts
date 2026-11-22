export type CategoryId =
  | 'all'
  | 'core'
  | 'pronouns'
  | 'numbers'
  | 'questions'
  | 'family'
  | 'body'
  | 'food'
  | 'home'
  | 'clothing'
  | 'colors'
  | 'animals'
  | 'nature'
  | 'weather'
  | 'places'
  | 'time'
  | 'transport'
  | 'verbs'
  | 'adjectives'
  | 'emotions'
  | 'work'
  | 'health'
  | 'shopping'
  | 'directions';

export interface Category {
  id: CategoryId;
  ka: string;
  ru: string;
  emoji: string;
}

export interface Word {
  id: number;
  ka: string;
  /** Latin transliteration, computed from `ka`. */
  tr: string;
  ru: string;
  /** URL of the word's picture (a separate file), or null when it has none. */
  image: string | null;
  cat: CategoryId;
  correct: number;
  seen: number;
  level: number; // 0..4
}

export type Mode = 'flash' | 'alpha';

export interface FlashResult {
  id: number;
  right: boolean;
  ka: string;
  ru: string;
  tr: string;
}

export interface AlphaResult {
  id: number;
  perfect: boolean;
  hints: number;
  ka: string;
  ru: string;
  tr: string;
}

export type SessionResult = FlashResult | AlphaResult;

export function isFlashResult(r: SessionResult): r is FlashResult {
  return 'right' in r;
}
