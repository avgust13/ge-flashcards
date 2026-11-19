/**
 * Service-worker registration in "prompt" mode: a new build waits until the
 * learner applies it from the home screen, so a session is never reloaded
 * from under them.
 */
import { registerSW } from 'virtual:pwa-register';

let applyFn: ((reload?: boolean) => Promise<void>) | null = null;
let waiting = false;
const listeners = new Set<() => void>();

export function initPwa(): void {
  applyFn = registerSW({
    onNeedRefresh() {
      waiting = true;
      for (const fn of listeners) fn();
    },
  });
}

export function subscribeUpdate(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isUpdateWaiting(): boolean {
  return waiting;
}

/** Activate the waiting version and reload. */
export function applyUpdate(): void {
  void applyFn?.(true);
}
