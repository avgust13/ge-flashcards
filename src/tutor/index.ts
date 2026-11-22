/**
 * Door to the AI tutor. Everything outside `src/tutor/` comes through here;
 * the SDK itself is fetched only when the tutor is first asked something, and
 * nothing in a lesson ever waits for it.
 */
import { knownFormsByUnit } from '../content/known';
import { courseVersion } from '../content/store';
import { TUTOR_KEY, getSecret, hasSecret } from '../db/secrets';
import { coursePrompt } from './prompts';
import { TutorError, type Tutor } from './types';

export { TutorError } from './types';
export type { ChatReply, ChatTurn, Fix, PhraseResult, Scenario, TextCheck, Tutor } from './types';
export { SCENARIOS } from './types';

let loading: Promise<typeof import('./client')> | null = null;
let cached: { key: string; version: string; tutor: Tutor } | null = null;

/** A key has been entered. Says nothing about whether it works. */
export const hasTutorKey = (): boolean => hasSecret(TUTOR_KEY);

export const isOnline = (): boolean => typeof navigator === 'undefined' || navigator.onLine !== false;

/** Why the tutor cannot be used right now, as a line for the learner — or null when it can. */
export function tutorBlocked(): string | null {
  if (!hasTutorKey()) return 'Нужен ключ Claude — его добавляют в настройках.';
  if (!isOnline()) return 'Репетитору нужен интернет.';
  return null;
}

export async function getTutor(): Promise<Tutor> {
  const key = await getSecret(TUTOR_KEY);
  if (!key) throw new TutorError('no-key', 'Сначала добавь ключ Claude в настройках.');
  if (!isOnline()) throw new TutorError('offline', 'Нет интернета: репетитору нужна сеть.');
  const version = courseVersion();
  if (cached && cached.key === key && cached.version === version) return cached.tutor;
  try {
    loading ??= import('./client');
    const { createTutor } = await loading;
    const tutor = createTutor(key, coursePrompt(knownFormsByUnit()));
    cached = { key, version, tutor };
    return tutor;
  } catch (e) {
    // The chunk with the SDK could not be fetched (first use while offline).
    loading = null;
    if (e instanceof TutorError) throw e;
    throw new TutorError('offline', 'Не удалось загрузить модуль репетитора. Проверь интернет.');
  }
}

/** Forget the client built for a key that has just been changed or removed. */
export function resetTutor(): void {
  cached = null;
}
