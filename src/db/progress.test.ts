import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { lettersKnown, trOnReveal, trVisible } from '../content/reading';
import { newSrsCard, review } from '../srs/fsrs';
import type { ReviewLogEntry } from '../srs/types';
import { buildBackup, parseBackup, restoreBackup } from './backup';
import { closeDbForTests } from './db';
import { V1_DAILY_KEY, V1_STATS_KEY, parseV1Daily, parseV1Stats } from './migrate-v1';
import {
  allWordStats,
  cardCount,
  flush,
  getCard,
  getDay,
  getSettings,
  initProgress,
  logCount,
  putCard,
  recordReview,
  resetMirrorForTests,
  resetProgress,
  setSettings,
} from './progress';

// Minimal localStorage for the migration to read from.
const store = new Map<string, string>();
(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

async function freshDb(): Promise<void> {
  await closeDbForTests();
  resetMirrorForTests();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('ge-flashcards');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

const log = (card: string, t: number): ReviewLogEntry => ({
  t,
  day: '2026-11-20',
  sess: 's1',
  mode: 'daily',
  card,
  ex: 'speak',
  item: null,
  outcome: 'self',
  rating: 3,
  counted: true,
  ms: 4000,
  errs: 0,
  prev: { state: 0, due: t, s: 0, d: 0 },
});

describe('v1 parsing', () => {
  it('keeps valid word scores and drops junk', () => {
    const raw = JSON.stringify({
      '5': { correct: 0.64, seen: 4, lastSeen: 123 },
      '6': { correct: 7, seen: -2 },
      abc: { correct: 1 },
      '7': null,
    });
    expect(parseV1Stats(raw)).toEqual([
      { id: 5, correct: 0.64, seen: 4, lastSeen: 123 },
      { id: 6, correct: 1, seen: 0, lastSeen: 0 },
    ]);
    expect(parseV1Stats('not json')).toEqual([]);
    expect(parseV1Stats(null)).toEqual([]);
  });

  it('carries the daily counter only for the same day', () => {
    const raw = JSON.stringify({ date: '2026-11-20', count: 12 });
    expect(parseV1Daily(raw, '2026-11-20')?.reviews).toBe(12);
    expect(parseV1Daily(raw, '2026-11-21')).toBeNull();
  });
});

describe('progress store', () => {
  beforeEach(async () => {
    store.clear();
    await freshDb();
  });

  it('migrates v1 localStorage once and leaves the old keys in place', async () => {
    store.set(V1_STATS_KEY, JSON.stringify({ '19': { correct: 0.8, seen: 6, lastSeen: 1 } }));
    await initProgress();
    expect(allWordStats().get(19)).toEqual({ correct: 0.8, seen: 6, lastSeen: 1 });
    expect(cardCount()).toBe(0);
    expect(store.has(V1_STATS_KEY)).toBe(true);

    // A second start must not re-import over newer data.
    store.set(V1_STATS_KEY, JSON.stringify({ '19': { correct: 0.1, seen: 1, lastSeen: 2 } }));
    await closeDbForTests();
    resetMirrorForTests();
    await initProgress();
    expect(allWordStats().get(19)?.correct).toBe(0.8);
  });

  it('writes a review as card + log + day in one go and survives a restart', async () => {
    await initProgress();
    const t = Date.now();
    const card = review(newSrsCard('c:work.prs.1sg', 'c', 1, t), 3, t, 0.9);
    recordReview(card, log(card.id, t), { isNew: true });
    expect(getCard(card.id)?.state).toBe(1);
    expect(getDay('2026-11-20')).toMatchObject({ reviews: 1, newCards: 1, ms: 4000 });

    await flush();
    await closeDbForTests();
    resetMirrorForTests();
    await initProgress();
    expect(getCard(card.id)?.reps).toBe(1);
    expect(getDay('2026-11-20').reviews).toBe(1);
    expect(await logCount()).toBe(1);
  });

  it('round-trips a backup', async () => {
    await initProgress();
    const t = Date.now();
    const card = review(newSrsCard('w:19', 'w', 1, t), 3, t, 0.9);
    recordReview(card, log(card.id, t), { isNew: true });
    setSettings({ dailyMinutes: 25 });

    const backup = parseBackup(JSON.stringify(await buildBackup()));
    await resetProgress();
    expect(cardCount()).toBe(0);
    expect(await logCount()).toBe(0);

    await restoreBackup(backup);
    expect(getCard('w:19')?.reps).toBe(1);
    expect(getSettings().dailyMinutes).toBe(25);
    expect(await logCount()).toBe(1);
  });

  it('rejects files that are not a backup', () => {
    expect(() => parseBackup('{}')).toThrow();
    expect(() => parseBackup('nope')).toThrow();
    expect(() => parseBackup(JSON.stringify({ app: 'ge-flashcards', format: 2 }))).toThrow();
  });

  it('drops the old localStorage keys on the start after the migration', async () => {
    store.set(V1_STATS_KEY, JSON.stringify({ '19': { correct: 0.8, seen: 6, lastSeen: 1 } }));
    await initProgress();
    expect(store.has(V1_STATS_KEY)).toBe(true);
    await flush();
    await closeDbForTests();
    resetMirrorForTests();
    await initProgress();
    expect(store.has(V1_STATS_KEY)).toBe(false);
    expect(allWordStats().get(19)?.correct).toBe(0.8);
  });

  it('hides the transliteration of a text once all its letters are learned', async () => {
    await initProgress();
    const learn = (ch: string) => putCard({ ...newSrsCard(`l:${ch}`, 'l', null, Date.now()), state: 2 });
    expect(trVisible('მე')).toBe(true);
    learn('მ');
    expect(trVisible('მე')).toBe(true);
    learn('ე');
    expect(lettersKnown('მე')).toBe(true);
    expect(trVisible('მე')).toBe(false);
    // Punctuation and spaces do not count; an unknown letter brings it back.
    expect(trVisible('მე მე?')).toBe(false);
    expect(trVisible('შენ')).toBe(true);
    // A letter still in its learning steps is not "learned" yet.
    putCard({ ...newSrsCard('l:შ', 'l', null, Date.now()), state: 1 });
    putCard({ ...newSrsCard('l:ნ', 'l', null, Date.now()), state: 2 });
    expect(trVisible('შენ')).toBe(true);

    setSettings({ translit: 'always' });
    expect(trVisible('მე')).toBe(true);
    setSettings({ translit: 'never' });
    expect(trVisible('შენ')).toBe(false);
    expect(trOnReveal()).toBe(false);
    setSettings({ translit: 'auto' });
    expect(trOnReveal()).toBe(true);
  });

  it('reset keeps settings but removes cards and the old localStorage progress', async () => {
    store.set(V1_STATS_KEY, JSON.stringify({ '19': { correct: 0.8, seen: 6, lastSeen: 1 } }));
    store.set(V1_DAILY_KEY, JSON.stringify({ date: 'x', count: 1 }));
    await initProgress();
    putCard(newSrsCard('w:19', 'w', 1, Date.now()));
    setSettings({ ruGender: 'f' });
    await resetProgress();
    expect(cardCount()).toBe(0);
    expect(allWordStats().size).toBe(0);
    expect(getSettings().ruGender).toBe('f');
    expect(store.has(V1_STATS_KEY)).toBe(false);
  });
});
