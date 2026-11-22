/**
 * Secrets the learner types into the app — the key of the AI tutor. They live
 * in their own IndexedDB store, which the backup never reads, and are sent
 * nowhere except straight to the service they belong to.
 *
 * Only "is a key set?" is mirrored in memory, so screens can render without
 * awaiting; the value itself is read at the moment of a request.
 */
import { getDb } from './db';

export const TUTOR_KEY = 'anthropicApiKey';

const present = new Set<string>();
const listeners = new Set<() => void>();
let loaded: Promise<void> | null = null;

function emit(): void {
  for (const fn of listeners) fn();
}

/** For `useSyncExternalStore`. */
export function subscribeSecrets(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Idempotent: learn which secrets exist. Never throws — without storage there is simply no key. */
export function initSecrets(): Promise<void> {
  if (!loaded) {
    loaded = (async () => {
      try {
        const keys = await (await getDb()).getAllKeys('secrets');
        present.clear();
        for (const k of keys) present.add(k);
      } catch {
        present.clear();
      }
      emit();
    })();
  }
  return loaded;
}

export function hasSecret(key: string): boolean {
  return present.has(key);
}

export async function getSecret(key: string): Promise<string | null> {
  try {
    return (await (await getDb()).get('secrets', key))?.v ?? null;
  } catch {
    return null;
  }
}

export async function setSecret(key: string, value: string): Promise<void> {
  await (await getDb()).put('secrets', { k: key, v: value });
  present.add(key);
  emit();
}

export async function deleteSecret(key: string): Promise<void> {
  await (await getDb()).delete('secrets', key);
  present.delete(key);
  emit();
}

/** Tests only. */
export function resetSecretsForTests(): void {
  present.clear();
  loaded = null;
}
