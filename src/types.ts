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
  tr: string;
  ru: string;
  audio: string; // base64-encoded MP3 (44.1kHz, 128kbps)
  image: string; // base64-encoded PNG flashcard (294x180)
  cat: CategoryId;
  correct: number;
  seen: number;
  isSeed: boolean;
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
