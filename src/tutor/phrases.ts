/**
 * "Мои фразы": phrases the learner asked the tutor for and chose to keep.
 * Each becomes a card `s:u:<id>` that the normal session drills like any set
 * phrase — but always under a label saying where its Georgian came from.
 */
import { checkGeorgian, phraseSentence } from '../content/known';
import { setUserSentences } from '../content/store';
import { USER_PHRASE_PREFIX, type AiTag } from '../content/types';
import {
  allUserItems,
  deleteUserItem,
  getCard,
  getSettings,
  putCard,
  putUserItem,
  subscribe,
  type UserItem,
} from '../db/progress';
import { now } from '../srs/clock';
import { newSrsCard, review } from '../srs/fsrs';
import type { PhraseResult } from './types';

export interface UserPhrase {
  id: string;
  kind: 'phrase';
  ka: string;
  ru: string;
  literal: string;
  note: string;
  words: Array<{ ka: string; ru: string; note: string }>;
  createdAt: number;
}

const isPhrase = (x: UserItem): x is UserItem & UserPhrase => x.kind === 'phrase' && typeof x.ka === 'string';

export const phraseCardId = (id: string): string => `${USER_PHRASE_PREFIX}${id}`;
const sentenceId = (id: string): string => `u:${id}`;

/** Saved phrases, newest first. */
export function userPhrases(): UserPhrase[] {
  return [...allUserItems()].filter(isPhrase).sort((a, b) => b.createdAt - a.createdAt);
}

/** The label a piece of AI-written Georgian gets: checked only if every word is in the course tables. */
export function tagFor(ka: string): AiTag {
  return checkGeorgian(ka).ok ? 'checked' : 'unchecked';
}

let signature = '';

/** Make the saved phrases known to the exercise engine. Cheap to call again: it does nothing unless the set changed. */
export function syncUserSentences(): void {
  const phrases = userPhrases();
  const next = phrases.map((p) => `${p.id}:${p.ka}`).join('|');
  if (next === signature) return;
  signature = next;
  setUserSentences(phrases.map((p) => ({ sentence: phraseSentence(sentenceId(p.id), p.ka, p.ru), tag: tagFor(p.ka) })));
}

/** Keep the engine in step with saved progress (a restored backup, a reset). Call once at start. */
export function watchUserSentences(): () => void {
  syncUserSentences();
  return subscribe(syncUserSentences);
}

/** Put a phrase's card into the learning queue: it will come up in the next session. */
function schedule(id: string, ka: string): void {
  const t = now();
  const card = newSrsCard(phraseCardId(id), 's', null, t);
  // Reading the phrase with its breakdown is the first meeting; the exercises start from the next step.
  putCard({ ...review(card, 3, t, getSettings().desiredRetention), unverified: tagFor(ka) === 'unchecked' });
}

export function savePhrase(ru: string, result: PhraseResult): UserPhrase {
  const t = now();
  const phrase: UserPhrase = {
    id: `${t.toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    kind: 'phrase',
    ka: result.ka.trim(),
    ru: ru.trim(),
    literal: result.literal,
    note: result.note,
    words: result.words,
    createdAt: t,
  };
  putUserItem({ ...phrase });
  syncUserSentences();
  schedule(phrase.id, phrase.ka);
  return phrase;
}

export function removePhrase(id: string): void {
  deleteUserItem(id, phraseCardId(id));
  syncUserSentences();
}

/** Whether the phrase is in the review queue (it is not after "reset progress" restored from a backup without cards). */
export const isScheduled = (id: string): boolean => !!getCard(phraseCardId(id));

export function reschedule(phrase: UserPhrase): void {
  if (!isScheduled(phrase.id)) schedule(phrase.id, phrase.ka);
}
