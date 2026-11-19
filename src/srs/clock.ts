/**
 * Single source of "now" for scheduling, so the debug screen (and tests) can travel in time.
 */
const KEY = 'ge-flashcards/debug-clock-offset';

let offsetMs = readOffset();

function readOffset(): number {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export function now(): number {
  return Date.now() + offsetMs;
}

export function getClockOffset(): number {
  return offsetMs;
}

export function setClockOffset(ms: number): void {
  offsetMs = ms;
  try {
    if (ms === 0) globalThis.localStorage?.removeItem(KEY);
    else globalThis.localStorage?.setItem(KEY, String(ms));
  } catch {
    // storage unavailable — the offset still applies for this page load
  }
}
