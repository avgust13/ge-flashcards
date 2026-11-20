/**
 * All learner progress. IndexedDB is the store of record; a full in-memory
 * mirror keeps every read synchronous so screens can render without awaiting.
 * Writes update the mirror at once and are queued to the database in order.
 */
import { now } from '../srs/clock';
import { dayKey } from '../srs/day';
import {
  DEFAULT_COURSE,
  DEFAULT_SETTINGS,
  type CardId,
  type CourseState,
  type DayStat,
  type Exposure,
  type ReviewLogEntry,
  type Settings,
  type SrsCard,
  type WordStat,
} from '../srs/types';
import { getDb, type AppDb } from './db';
import { V1_DAILY_KEY, V1_STATS_KEY, migrateV1IfNeeded } from './migrate-v1';

const cards = new Map<CardId, SrsCard>();
const days = new Map<string, DayStat>();
const wordStats = new Map<number, WordStat>();
const exposure = new Map<string, Exposure>();
const kv = new Map<string, unknown>();

let ready: Promise<void> | null = null;
let chain: Promise<void> = Promise.resolve();
let version = 0;
let writeFailed = false;
const listeners = new Set<() => void>();

function emit(): void {
  version++;
  for (const fn of listeners) fn();
}

/** For `useSyncExternalStore`: re-render when any progress changes. */
export function subscribe(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getVersion(): number {
  return version;
}

export function hasWriteError(): boolean {
  return writeFailed;
}

/** Idempotent: open the database, migrate v1 localStorage once, fill the mirror. */
export function initProgress(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      const db = await getDb();
      await migrateV1IfNeeded(db, dayKey(Date.now(), DEFAULT_SETTINGS.dayStartHour));
      await hydrate(db);
    })();
  }
  return ready;
}

export async function hydrate(dbArg?: AppDb): Promise<void> {
  const db = dbArg ?? (await getDb());
  const [c, d, w, e, k] = await Promise.all([
    db.getAll('cards'),
    db.getAll('days'),
    db.getAll('wordStats'),
    db.getAll('exposure'),
    db.getAll('kv'),
  ]);
  cards.clear();
  days.clear();
  wordStats.clear();
  exposure.clear();
  kv.clear();
  for (const x of c) cards.set(x.id, x);
  for (const x of d) days.set(x.day, x);
  for (const x of w) wordStats.set(x.id, { correct: x.correct, seen: x.seen, lastSeen: x.lastSeen });
  for (const x of e) exposure.set(x.id, x);
  for (const x of k) kv.set(x.k, x.v);
  emit();
}

function enqueue(job: (db: AppDb) => Promise<unknown>): void {
  chain = chain.then(async () => {
    const db = await getDb();
    try {
      await job(db);
    } catch {
      try {
        await job(db);
      } catch (err) {
        // Keep the queue alive; surface a banner so the learner knows to export a backup.
        console.error('progress write failed', err);
        if (!writeFailed) {
          writeFailed = true;
          emit();
        }
      }
    }
  });
}

/** Resolves once every queued write has reached the database. */
export function flush(): Promise<void> {
  return chain;
}

// ── reads ────────────────────────────────────────────────────────────────────

export function getCard(id: CardId): SrsCard | undefined {
  return cards.get(id);
}

export function hasCard(id: CardId): boolean {
  return cards.has(id);
}

export function allCards(): IterableIterator<SrsCard> {
  return cards.values();
}

export function cardCount(): number {
  return cards.size;
}

export function getSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...((kv.get('settings') as Partial<Settings> | undefined) ?? {}) };
}

export function getCourse(): CourseState {
  return { ...DEFAULT_COURSE, ...((kv.get('course') as Partial<CourseState> | undefined) ?? {}) };
}

export function getDay(day: string): DayStat {
  return days.get(day) ?? { day, reviews: 0, newCards: 0, ms: 0 };
}

export function allDays(): ReadonlyMap<string, DayStat> {
  return days;
}

export function today(): string {
  return dayKey(now(), getSettings().dayStartHour);
}

export function getWordStat(id: number): WordStat | undefined {
  return wordStats.get(id);
}

export function allWordStats(): ReadonlyMap<number, WordStat> {
  return wordStats;
}

export function getExposure(id: string): Exposure | undefined {
  return exposure.get(id);
}

export function getKv<T>(key: string): T | undefined {
  return kv.get(key) as T | undefined;
}

// ── writes ───────────────────────────────────────────────────────────────────

export function setKv(key: string, value: unknown): void {
  if (value === undefined) {
    kv.delete(key);
    enqueue((db) => db.delete('kv', key));
  } else {
    kv.set(key, value);
    enqueue((db) => db.put('kv', { k: key, v: value }));
  }
  emit();
}

export function setSettings(patch: Partial<Settings>): void {
  setKv('settings', { ...getSettings(), ...patch });
}

export function setCourse(patch: Partial<CourseState>): void {
  setKv('course', { ...getCourse(), ...patch });
}

export function putCard(card: SrsCard): void {
  cards.set(card.id, card);
  enqueue((db) => db.put('cards', card));
  emit();
}

function addToDay(day: string, patch: { reviews?: number; newCards?: number; ms?: number }): DayStat {
  const cur = getDay(day);
  const next: DayStat = {
    day,
    reviews: cur.reviews + (patch.reviews ?? 0),
    newCards: cur.newCards + (patch.newCards ?? 0),
    ms: cur.ms + (patch.ms ?? 0),
  };
  days.set(day, next);
  return next;
}

/** Count activity that has no card of its own (legacy flashcards, explanation time). */
export function bumpDay(patch: { reviews?: number; newCards?: number; ms?: number }): void {
  const next = addToDay(today(), patch);
  enqueue((db) => db.put('days', next));
  emit();
}

/**
 * One answered exercise: the updated card, its log entry, the day counters and
 * the exemplar exposure are written in a single transaction.
 */
export function recordReview(
  next: SrsCard,
  log: ReviewLogEntry,
  opts: { exposureId?: string | null; isNew?: boolean } = {},
): void {
  cards.set(next.id, next);
  const day = addToDay(log.day, { reviews: 1, ms: log.ms, newCards: opts.isNew ? 1 : 0 });
  let exp: Exposure | null = null;
  if (opts.exposureId) {
    const cur = exposure.get(opts.exposureId);
    exp = { id: opts.exposureId, n: (cur?.n ?? 0) + 1, last: log.t };
    exposure.set(exp.id, exp);
  }
  enqueue(async (db) => {
    const tx = db.transaction(['cards', 'revlog', 'days', 'exposure'], 'readwrite');
    void tx.objectStore('cards').put(next);
    void tx.objectStore('revlog').add(log);
    void tx.objectStore('days').put(day);
    if (exp) void tx.objectStore('exposure').put(exp);
    await tx.done;
  });
  emit();
}

export function putWordStat(id: number, stat: WordStat): void {
  wordStats.set(id, stat);
  enqueue((db) => db.put('wordStats', { id, ...stat }));
  emit();
}

export async function logsForCard(id: CardId): Promise<ReviewLogEntry[]> {
  await flush();
  return (await getDb()).getAllFromIndex('revlog', 'by-card', id);
}

/** Review log entries of the study days from `fromDay` (a day key) on. */
export async function logsSince(fromDay: string): Promise<ReviewLogEntry[]> {
  await flush();
  return (await getDb()).getAllFromIndex('revlog', 'by-day', IDBKeyRange.lowerBound(fromDay));
}

export async function logCount(): Promise<number> {
  await flush();
  return (await getDb()).count('revlog');
}

/** Wipe all learning progress. Settings and secrets are kept. */
export async function resetProgress(): Promise<void> {
  await flush();
  const db = await getDb();
  const settings = kv.get('settings');
  const migrated = kv.get('migratedV1');
  const tx = db.transaction(
    ['cards', 'revlog', 'days', 'wordStats', 'exposure', 'userItems', 'kv'],
    'readwrite',
  );
  for (const name of ['cards', 'revlog', 'days', 'wordStats', 'exposure', 'userItems', 'kv'] as const) {
    void tx.objectStore(name).clear();
  }
  if (settings) void tx.objectStore('kv').put({ k: 'settings', v: settings });
  // Keep the flag so the old localStorage progress is not imported again.
  void tx.objectStore('kv').put({ k: 'migratedV1', v: migrated ?? { at: Date.now(), words: 0 } });
  await tx.done;
  try {
    globalThis.localStorage?.removeItem(V1_STATS_KEY);
    globalThis.localStorage?.removeItem(V1_DAILY_KEY);
  } catch {
    // ignore
  }
  await hydrate(db);
}

/** Ask the browser not to evict our storage. Safe to call repeatedly. */
export async function requestPersistence(): Promise<boolean> {
  try {
    if (await navigator.storage?.persisted?.()) return true;
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

/** Tests only. */
export function resetMirrorForTests(): void {
  cards.clear();
  days.clear();
  wordStats.clear();
  exposure.clear();
  kv.clear();
  ready = null;
  chain = Promise.resolve();
  writeFailed = false;
}
