import { describe, expect, it } from 'vitest';
import { checkAssemble } from './grade';
import type { AssembleExercise } from './types';

function ex(patch: Partial<AssembleExercise>): AssembleExercise {
  return {
    uid: 't',
    card: 'c:work.prs.1sg',
    sentenceId: null,
    tokens: 3,
    reveal: { ka: '', ru: '', audio: null, note: null },
    kind: 'assemble',
    promptRu: '',
    tiles: [],
    solution: [],
    verb: null,
    beforeVerb: [],
    focus: null,
    ...patch,
  };
}

describe('checkAssemble', () => {
  const neg = ex({ solution: ['დღეს', 'არ', 'ვმუშაობ'], verb: 'ვმუშაობ', focus: 'ვმუშაობ' });

  it('accepts the canonical order', () => {
    expect(checkAssemble(['დღეს', 'არ', 'ვმუშაობ'], neg).ok).toBe(true);
  });

  it('rejects "არ" that is not directly before the verb', () => {
    expect(checkAssemble(['არ', 'დღეს', 'ვმუშაობ'], neg).ok).toBe(false);
  });

  it('rejects a verb that is not last', () => {
    expect(checkAssemble(['არ', 'ვმუშაობ', 'დღეს'], neg).ok).toBe(false);
  });

  it('flags a wrong verb form as a miss on the focus', () => {
    const res = checkAssemble(['დღეს', 'არ', 'მუშაობ'], neg);
    expect(res.ok).toBe(false);
    expect(res.focusWrong).toBe(true);
  });

  it('lets the subject and the adverb swap places', () => {
    const e = ex({ solution: ['მე', 'დღეს', 'ვმუშაობ'], verb: 'ვმუშაობ', focus: 'ვმუშაობ' });
    expect(checkAssemble(['დღეს', 'მე', 'ვმუშაობ'], e).ok).toBe(true);
  });

  it('requires the question mark, and only at the end', () => {
    const q = ex({ solution: ['შენ', 'მუშაობ', '?'], verb: 'მუშაობ', focus: 'მუშაობ' });
    expect(checkAssemble(['შენ', 'მუშაობ', '?'], q).ok).toBe(true);
    expect(checkAssemble(['შენ', 'მუშაობ'], q).ok).toBe(false);
    expect(checkAssemble(['შენ', '?', 'მუშაობ'], q).ok).toBe(false);
  });

  it('keeps a question word directly before the verb', () => {
    const q = ex({
      solution: ['ტელეფონი', 'სად', 'არის', '?'],
      verb: 'არის',
      beforeVerb: ['სად'],
      focus: 'არის',
    });
    expect(checkAssemble(['ტელეფონი', 'სად', 'არის', '?'], q).ok).toBe(true);
    expect(checkAssemble(['სად', 'ტელეფონი', 'არის', '?'], q).ok).toBe(false);
  });

  it('rejects decoy tiles and missing words', () => {
    expect(checkAssemble(['დღეს', 'არ', 'ვმუშაობ', 'მე'], neg).ok).toBe(false);
    expect(checkAssemble(['არ', 'ვმუშაობ'], neg).ok).toBe(false);
  });

  it('holds a set phrase to its one order', () => {
    const phrase = ex({ solution: ['არ', 'ვიცი'] });
    expect(checkAssemble(['არ', 'ვიცი'], phrase).ok).toBe(true);
    expect(checkAssemble(['ვიცი', 'არ'], phrase).ok).toBe(false);
  });
});
