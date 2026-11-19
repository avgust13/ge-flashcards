import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { DayStat, Exposure, ReviewLogEntry, SrsCard, WordStat } from '../srs/types';

export interface WordStatRow extends WordStat {
  id: number;
}

export interface KvRow {
  k: string;
  v: unknown;
}

export interface AppSchema extends DBSchema {
  cards: { key: string; value: SrsCard; indexes: { 'by-unit': number } };
  revlog: {
    key: number;
    value: ReviewLogEntry;
    indexes: { 'by-card': string; 'by-day': string };
  };
  days: { key: string; value: DayStat };
  wordStats: { key: number; value: WordStatRow };
  exposure: { key: string; value: Exposure };
  userItems: { key: string; value: { id: string } & Record<string, unknown> };
  kv: { key: string; value: KvRow };
  secrets: { key: string; value: { k: string; v: string } };
}

export type AppDb = IDBPDatabase<AppSchema>;

export const DB_NAME = 'ge-flashcards';
export const DB_VERSION = 1;

let dbPromise: Promise<AppDb> | null = null;

/** All stores are created up front so later phases need no version bump. */
export function getDb(): Promise<AppDb> {
  if (!dbPromise) {
    dbPromise = openDB<AppSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const cards = db.createObjectStore('cards', { keyPath: 'id' });
        cards.createIndex('by-unit', 'unit');
        const revlog = db.createObjectStore('revlog', { keyPath: 'id', autoIncrement: true });
        revlog.createIndex('by-card', 'card');
        revlog.createIndex('by-day', 'day');
        db.createObjectStore('days', { keyPath: 'day' });
        db.createObjectStore('wordStats', { keyPath: 'id' });
        db.createObjectStore('exposure', { keyPath: 'id' });
        db.createObjectStore('userItems', { keyPath: 'id' });
        db.createObjectStore('kv', { keyPath: 'k' });
        db.createObjectStore('secrets', { keyPath: 'k' });
      },
    });
  }
  return dbPromise;
}

/** Tests only: drop the cached connection so a fresh fake database is opened. */
export async function closeDbForTests(): Promise<void> {
  if (dbPromise) (await dbPromise).close();
  dbPromise = null;
}
