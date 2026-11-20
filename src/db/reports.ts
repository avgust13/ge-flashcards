/**
 * "Сообщить об ошибке": notes the learner leaves on a card whose Georgian or
 * translation looks wrong. There is no server — the notes stay on the device
 * (and in the backup) until they are copied out and the content is fixed.
 */
import { allCards, getCard, getKv, putCard, setKv } from './progress';

const KEY = 'contentReports';

export interface ContentReport {
  /** When the note was written, epoch ms. */
  t: number;
  card: string;
  sentenceId: string | null;
  ka: string;
  ru: string;
  note: string;
}

export function getReports(): ContentReport[] {
  return getKv<ContentReport[]>(KEY) ?? [];
}

export function addReport(report: ContentReport): void {
  setKv(KEY, [...getReports(), report]);
}

export function clearReports(): void {
  setKv(KEY, []);
}

/** Stop showing a card until it is brought back from the settings. */
export function hideCard(cardId: string): void {
  const c = getCard(cardId);
  if (c && !c.suspended) putCard({ ...c, suspended: true });
}

export function hiddenCount(): number {
  let n = 0;
  for (const c of allCards()) if (c.suspended) n++;
  return n;
}

export function unhideAll(): number {
  const hidden = [...allCards()].filter((c) => c.suspended);
  for (const c of hidden) putCard({ ...c, suspended: false });
  return hidden.length;
}

/** The notes as plain text, ready to paste into a message. */
export function reportsAsText(reports: ContentReport[] = getReports()): string {
  return reports
    .map((r) => {
      const where = r.sentenceId ? `${r.card} · ${r.sentenceId}` : r.card;
      return [`[${new Date(r.t).toISOString().slice(0, 10)}] ${where}`, `  ${r.ka}`, `  ${r.ru}`, r.note ? `  → ${r.note}` : '']
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}
