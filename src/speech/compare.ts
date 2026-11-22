/**
 * Compare what the speech recogniser heard with the phrase that was meant.
 * Pure. The recogniser is not a judge — it mishears short words and learners'
 * accents — so the result is a hint for the learner's own grade, never a
 * grade by itself.
 */

/** Georgian letters only: punctuation, spaces and case carry no information here. */
export function normalizeKa(text: string): string {
  return (text.match(/[ა-ჿ]+/g) ?? []).join('');
}

/** Edit distance (insert / delete / replace), by characters. */
export function distance(a: string, b: string): number {
  const x = [...a];
  const y = [...b];
  if (!x.length) return y.length;
  if (!y.length) return x.length;
  let prev = Array.from({ length: y.length + 1 }, (_, j) => j);
  for (let i = 1; i <= x.length; i++) {
    const row = [i];
    for (let j = 1; j <= y.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1));
    }
    prev = row;
  }
  return prev[y.length];
}

export type SpokenVerdict = 'match' | 'close' | 'different' | 'nothing';

export interface SpokenResult {
  verdict: SpokenVerdict;
  /** The alternative that came closest, as the recogniser wrote it. */
  heard: string;
  /** 0..1 — share of the expected letters that came through. */
  score: number;
}

/**
 * `alternatives` are the recogniser's candidate transcripts, best first. The
 * closest one counts: a learner should not lose a correct answer to the
 * recogniser's first guess.
 */
export function compareSpoken(expected: string, alternatives: readonly string[]): SpokenResult {
  const want = normalizeKa(expected);
  let best: SpokenResult = { verdict: 'nothing', heard: '', score: 0 };
  if (!want) return best;
  for (const alt of alternatives) {
    const got = normalizeKa(alt);
    if (!got) continue;
    const d = distance(want, got);
    const score = Math.max(0, 1 - d / [...want].length);
    if (best.verdict === 'nothing' || score > best.score) {
      // One slip per ~8 letters is within what the recogniser itself gets wrong.
      const tolerance = Math.max(1, Math.floor([...want].length / 8));
      best = { verdict: d === 0 ? 'match' : d <= tolerance ? 'close' : 'different', heard: alt.trim(), score };
    }
  }
  return best;
}
