/**
 * Shapes shared between the tutor client and the screens. No SDK import here:
 * this file is part of the main bundle, the SDK is not.
 */

/** A Russian phrase turned into Georgian, with a word-by-word breakdown. */
export interface PhraseResult {
  ka: string;
  /** Word-for-word Russian gloss that shows how the sentence is built. */
  literal: string;
  words: Array<{ ka: string; ru: string; note: string }>;
  /** Usage note; empty when there is nothing to add. */
  note: string;
}

export interface Fix {
  from: string;
  to: string;
  why: string;
}

/** The learner's own Georgian text, corrected. */
export interface TextCheck {
  corrected: string;
  ru: string;
  fixes: Fix[];
  comment: string;
}

/** One reply of the tutor in a role-play dialogue. */
export interface ChatReply {
  ka: string;
  ru: string;
  /** Correction of the learner's last line, when it had a mistake. */
  fix: Fix | null;
  /** What the learner could say next, in Russian; may be empty. */
  hint: string;
}

/**
 * A turn of the dialogue as it is sent back to the model. For the tutor's own
 * turns `raw` is the content the API returned, passed back unchanged.
 */
export type ChatTurn = { role: 'user'; text: string } | { role: 'assistant'; raw: unknown };

export type Scenario = 'meet' | 'cafe' | 'market' | 'taxi' | 'free';

export const SCENARIOS: Record<Scenario, { titleRu: string; roleRu: string }> = {
  meet: { titleRu: 'Знакомство', roleRu: 'новый знакомый, который хочет узнать, кто ученик и откуда' },
  cafe: { titleRu: 'Кафе', roleRu: 'официант в кафе' },
  market: { titleRu: 'Рынок', roleRu: 'продавец на рынке' },
  taxi: { titleRu: 'Такси', roleRu: 'водитель такси' },
  free: { titleRu: 'Как дела', roleRu: 'знакомый, который расспрашивает, как прошёл день и какие планы' },
};

export interface TutorUsage {
  input: number;
  output: number;
  cacheRead: number;
  cacheWrite: number;
}

export type TutorErrorKind = 'no-key' | 'auth' | 'offline' | 'rate' | 'refused' | 'bad' | 'other';

/** An error with a message that can be shown to the learner as is. */
export class TutorError extends Error {
  constructor(
    readonly kind: TutorErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'TutorError';
  }
}

export interface Tutor {
  /** Cheap check that the key works: no tokens are spent. */
  testKey(): Promise<void>;
  translate(ru: string, unlocked: number): Promise<PhraseResult>;
  /** Streams a short explanation; `onText` gets each new piece. Resolves with the whole text. */
  explain(context: string, onText: (delta: string) => void): Promise<string>;
  checkText(ka: string, unlocked: number): Promise<TextCheck>;
  /** `history` is empty to open the dialogue. Returns the reply and the turn to append to the history. */
  chat(scenario: Scenario, history: ChatTurn[], unlocked: number): Promise<{ reply: ChatReply; turn: ChatTurn }>;
  /** Tokens of the last request, for the settings screen and the smoke script. */
  lastUsage(): TutorUsage | null;
}
