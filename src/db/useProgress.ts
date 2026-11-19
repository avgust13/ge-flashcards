import { useSyncExternalStore } from 'react';
import { getVersion, subscribe } from './progress';

/** Re-render the calling component whenever saved progress changes. Returns a change counter. */
export function useProgressVersion(): number {
  return useSyncExternalStore(subscribe, getVersion, getVersion);
}
