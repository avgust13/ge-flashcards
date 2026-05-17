export type CategoryId =
  | 'all'
  | 'family'
  | 'food'
  | 'nature'
  | 'body'
  | 'colors'
  | 'animals'
  | 'places'
  | 'time'
  | 'verbs';

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
