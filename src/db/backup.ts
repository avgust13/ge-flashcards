import type { DayStat, Exposure, ReviewLogEntry, SrsCard } from '../srs/types';
import { getDb, type KvRow, type WordStatRow } from './db';
import { flush, hydrate, setSettings } from './progress';

export interface BackupFile {
  app: 'ge-flashcards';
  format: 1;
  exportedAt: number;
  cards: SrsCard[];
  revlog: ReviewLogEntry[];
  days: DayStat[];
  wordStats: WordStatRow[];
  exposure: Exposure[];
  userItems: unknown[];
  kv: KvRow[];
}

/** Keys that describe a running session or this device only — never exported. */
const KV_SKIP = new Set(['session']);

export async function buildBackup(): Promise<BackupFile> {
  await flush();
  const db = await getDb();
  const [cards, revlog, days, wordStats, exposure, userItems, kv] = await Promise.all([
    db.getAll('cards'),
    db.getAll('revlog'),
    db.getAll('days'),
    db.getAll('wordStats'),
    db.getAll('exposure'),
    db.getAll('userItems'),
    db.getAll('kv'),
  ]);
  return {
    app: 'ge-flashcards',
    format: 1,
    exportedAt: Date.now(),
    cards,
    revlog,
    days,
    wordStats,
    exposure,
    userItems,
    kv: kv.filter((r) => !KV_SKIP.has(r.k)),
  };
}

const ARRAYS = ['cards', 'revlog', 'days', 'wordStats', 'exposure', 'userItems', 'kv'] as const;

/** Throws an Error with a learner-facing (Russian) message when the file is not a usable backup. */
export function parseBackup(text: string): BackupFile {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Файл не читается: это не JSON.');
  }
  const b = data as Partial<BackupFile> | null;
  if (!b || typeof b !== 'object' || b.app !== 'ge-flashcards') {
    throw new Error('Это не резервная копия Uchikartuli.');
  }
  if (b.format !== 1) throw new Error('Неизвестная версия резервной копии.');
  for (const key of ARRAYS) {
    if (!Array.isArray(b[key])) throw new Error(`В копии нет раздела «${key}».`);
  }
  for (const c of b.cards as SrsCard[]) {
    if (!c || typeof c.id !== 'string' || typeof c.due !== 'number') {
      throw new Error('В копии повреждены карточки.');
    }
  }
  return b as BackupFile;
}

/** Replace everything with the backup in one transaction, then refresh the in-memory mirror. */
export async function restoreBackup(b: BackupFile): Promise<void> {
  await flush();
  const db = await getDb();
  const tx = db.transaction([...ARRAYS], 'readwrite');
  for (const name of ARRAYS) void tx.objectStore(name).clear();
  for (const c of b.cards) void tx.objectStore('cards').put(c);
  for (const r of b.revlog) {
    const { id: _id, ...rest } = r;
    void tx.objectStore('revlog').add(rest as ReviewLogEntry);
  }
  for (const d of b.days) void tx.objectStore('days').put(d);
  for (const w of b.wordStats) void tx.objectStore('wordStats').put(w);
  for (const e of b.exposure) void tx.objectStore('exposure').put(e);
  for (const u of b.userItems) {
    void tx.objectStore('userItems').put(u as { id: string } & Record<string, unknown>);
  }
  for (const k of b.kv) if (!KV_SKIP.has(k.k)) void tx.objectStore('kv').put(k);
  // A restored copy must never re-import the old localStorage progress on top of itself.
  void tx.objectStore('kv').put({ k: 'migratedV1', v: { at: Date.now(), words: 0 } });
  await tx.done;
  await hydrate(db);
}

export function backupFileName(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `uchikartuli-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}.json`;
}

/** Hand the backup to the system share sheet when possible, otherwise download it. */
export async function exportBackupToUser(): Promise<void> {
  const backup = await buildBackup();
  const name = backupFileName(backup.exportedAt);
  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  let shared = false;
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Uchikartuli — резервная копия' });
      shared = true;
    } catch (err) {
      // The learner closed the share sheet: fall through to a plain download.
      if ((err as Error).name === 'AbortError') return;
    }
  }
  if (!shared) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }
  setSettings({ lastBackupAt: backup.exportedAt });
}
