import type { AssembleExercise } from './types';

const NEG = 'არ';
const QMARK = '?';

export interface AssembleCheck {
  ok: boolean;
  /** The answer lacks the word this card trains (e.g. a wrong verb form was used). */
  focusWrong: boolean;
}

function sameMultiset(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const count = new Map<string, number>();
  for (const x of a) count.set(x, (count.get(x) ?? 0) + 1);
  for (const x of b) {
    const n = count.get(x);
    if (!n) return false;
    count.set(x, n - 1);
  }
  return true;
}

/**
 * Georgian word order is flexible before the verb, so the check is by rule
 * rather than by one fixed sequence:
 *   • exactly the right words, no decoys;
 *   • the verb is the last word;
 *   • "არ" stands directly before the verb;
 *   • a question word stands directly before the verb (or before "არ");
 *   • "?" comes last — it is the only thing that marks a question.
 */
export function checkAssemble(answer: string[], ex: AssembleExercise): AssembleCheck {
  const focusWrong = ex.focus != null && !answer.includes(ex.focus);
  if (!sameMultiset(answer, ex.solution)) return { ok: false, focusWrong };

  const words = answer.filter((t) => t !== QMARK);
  if (answer.includes(QMARK) && answer[answer.length - 1] !== QMARK) return { ok: false, focusWrong };

  if (ex.verb) {
    const vi = words.lastIndexOf(ex.verb);
    if (vi !== words.length - 1) return { ok: false, focusWrong };
    let slot = vi - 1;
    const ni = words.indexOf(NEG);
    if (ni >= 0) {
      if (ni !== vi - 1) return { ok: false, focusWrong };
      slot = ni - 1;
    }
    for (const q of ex.beforeVerb) {
      if (words.indexOf(q) !== slot) return { ok: false, focusWrong };
    }
    return { ok: true, focusWrong: false };
  }

  // Set phrases have one fixed order.
  const ok = answer.every((t, i) => t === ex.solution[i]);
  return { ok, focusWrong: ok ? false : focusWrong };
}
