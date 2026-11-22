import 'fake-indexeddb/auto';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { checkGeorgian, knownForms, knownFormsByUnit, phraseSentence, tokenizePhrase } from '../../src/content/known';
import { aiTagOf, describeCard, fillCourse, getSentence, SENTENCES } from '../../src/content/store';
import type { Course, Sentence } from '../../src/content/types';
import { buildBackup } from '../../src/db/backup';
import { closeDbForTests } from '../../src/db/db';
import { allUserItems, flush, getCard, initProgress, resetMirrorForTests } from '../../src/db/progress';
import { TUTOR_KEY, deleteSecret, getSecret, hasSecret, initSecrets, resetSecretsForTests, setSecret } from '../../src/db/secrets';
import { buildExercise, cardInfo, type BuildCtx } from '../../src/engine/build';
import { checkAssemble } from '../../src/engine/grade';
import { seededRng } from '../../src/engine/rng';
import { compareSpoken, distance, normalizeKa } from '../../src/speech/compare';
import { pickExercise } from '../../src/srs/ladder';
import { describeExercise } from '../../src/tutor/context';
import {
  isScheduled,
  phraseCardId,
  removePhrase,
  savePhrase,
  syncUserSentences,
  tagFor,
  userPhrases,
} from '../../src/tutor/phrases';
import { chatTask, coursePrompt, explainTask, textCheckTask, translateTask } from '../../src/tutor/prompts';
import { compile } from '../content/build';

let course: Course;
let sentences: Sentence[];

beforeAll(() => {
  ({ course, sentences } = compile());
  fillCourse(course, sentences);
});

async function freshDb(): Promise<void> {
  await flush();
  await closeDbForTests();
  resetMirrorForTests();
  resetSecretsForTests();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase('ge-flashcards');
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  await initProgress();
  syncUserSentences();
}

const ctx = (): BuildCtx => ({
  introduced: (id) => !!getCard(id) || !id.startsWith('s:u:'),
  exposure: () => undefined,
  getCard,
  gender: 'm',
  rng: seededRng(4),
});

describe('the closed world of known forms', () => {
  it('knows the lexicon and the verified verb forms, and nothing else', () => {
    const known = knownForms();
    for (const w of ['ყავა', 'ყავას', 'სახლში', 'ვაკეთებ', 'გავაკეთო', 'მეგობრის', 'არ']) expect(known.has(w), w).toBe(true);
    // A real word the course does not teach, and a cell the build holds back as unverified.
    expect(known.has('დაჯავშნა')).toBe(false);
    expect(known.has('დაელოდნენ')).toBe(false);
  });

  it('labels a text by its words', () => {
    expect(checkGeorgian('ბოდიში, სად არის აქ აფთიაქი?')).toMatchObject({ ok: true, unknown: [] });
    const c = checkGeorgian('მაგიდის დაჯავშნა მინდა.');
    expect(c.ok).toBe(false);
    expect(c.unknown).toEqual(['მაგიდის', 'დაჯავშნა']);
    // No Georgian at all is not "checked".
    expect(checkGeorgian('просто русский текст').ok).toBe(false);
    expect(tagFor('ყავა მინდა.')).toBe('checked');
    expect(tagFor('დაჯავშნა მინდა.')).toBe('unchecked');
  });

  it('does not take endings and prefixes for unknown words', () => {
    const c = checkGeorgian('Основа მეგობარ- получает -მა, а объект теряет -ს: მეგობარმა ბილეთი იყიდა.');
    expect(c.unknown).toEqual([]);
    expect(c.words).toEqual(['მეგობარმა', 'ბილეთი', 'იყიდა']);
  });

  it('groups the forms by unit in a stable order, each form once', () => {
    const a = knownFormsByUnit();
    const all = a.flatMap((u) => u.forms);
    expect(new Set(all).size).toBe(all.length);
    expect(a[0].unit).toBe(1);
    expect(a.map((u) => u.unit)).toEqual([...a.map((u) => u.unit)].sort((x, y) => x - y));
    expect(coursePrompt(a)).toBe(coursePrompt(knownFormsByUnit()));
  });
});

describe('phrases of the learner', () => {
  it('splits a phrase into tiles and keeps commas out of them', () => {
    const { tokens, end } = tokenizePhrase('  ბოდიში, სად არის «აფთიაქი»?  ');
    expect(end).toBe('?');
    expect(tokens.map((t) => t.t)).toEqual(['ბოდიში', 'სად', 'არის', 'აფთიაქი']);
    expect(tokens[0].after).toBe(',');
    expect(tokenizePhrase('ყავა მინდა').end).toBe('.');
    expect(tokenizePhrase('მოდი აქ!').end).toBe('!');
    // A dash between words is punctuation, not a word.
    expect(tokenizePhrase('ეს — ჩემი სახლი.').tokens.map((t) => t.t)).toEqual(['ეს', 'ჩემი', 'სახლი']);
  });

  it('builds a strict set phrase the engine can read', () => {
    const s = phraseSentence('u:1', 'ბოდიში, სად არის აფთიაქი?', 'Извините, где аптека?');
    expect(s).toMatchObject({ id: 'u:1', focus: 's:u:1', fixed: true, strict: true, polarity: 'q', req: [] });
    expect(s.ka).toBe('ბოდიში, სად არის აფთიაქი?');
  });

  describe('saved through the tutor', () => {
    beforeEach(freshDb);

    const result = (ka: string) => ({ ka, literal: 'дословно', words: [{ ka: 'ყავა', ru: 'кофе', note: '' }], note: '' });

    it('becomes a card in the learning queue, with its label everywhere', () => {
      const p = savePhrase('Я хочу кофе и воду.', result('ყავა და წყალი მინდა.'));
      const card = phraseCardId(p.id);
      expect(userPhrases().map((x) => x.id)).toEqual([p.id]);
      expect(isScheduled(p.id)).toBe(true);
      // Still in the learning steps, due within minutes: the next session picks it up.
      expect(getCard(card)).toMatchObject({ kind: 's', unit: null, state: 1, unverified: false });
      expect(getCard(card)!.due - Date.now()).toBeLessThan(15 * 60_000);

      expect(aiTagOf(card)).toBe('checked');
      expect(aiTagOf('s:ar-vitsi')).toBeNull();
      expect(describeCard(card)).toMatchObject({ kind: 'phrase', ka: 'ყავა და წყალი მინდა.', ai: 'checked' });
      // It is drillable, but never a wrong option next to course material.
      expect(getSentence(`u:${p.id}`)?.ka).toBe('ყავა და წყალი მინდა.');
      expect(SENTENCES.some((s) => s.id === `u:${p.id}`)).toBe(false);

      for (const kind of ['recognise', 'assemble', 'speak'] as const) {
        const ex = buildExercise(card, kind, ctx());
        expect(ex?.kind, kind).toBe(kind);
        expect(ex?.reveal.ai, kind).toBe('checked');
        if (ex?.kind === 'recognise') expect(ex.options.length).toBeGreaterThanOrEqual(3);
        if (ex?.kind === 'assemble') {
          expect(checkAssemble(ex.solution, ex).ok).toBe(true);
          expect(checkAssemble([...ex.solution].reverse(), ex).ok).toBe(false);
        }
      }
      // After the first meeting the ladder asks to build the phrase from tiles.
      expect(pickExercise(getCard(card), cardInfo(card))).toBe('assemble');
    });

    it('is marked as unchecked when a word is not in the tables', () => {
      const p = savePhrase('Я хочу забронировать столик.', result('მაგიდის დაჯავშნა მინდა.'));
      const card = phraseCardId(p.id);
      expect(aiTagOf(card)).toBe('unchecked');
      expect(getCard(card)?.unverified).toBe(true);
      expect(buildExercise(card, 'speak', ctx())?.reveal.ai).toBe('unchecked');
    });

    it('goes straight to "say it" when it is too long for tiles', () => {
      const long = 'მე დღეს ბაზარში ხილი და ყველი და პური და ღვინო ვიყიდე.';
      const p = savePhrase('длинная фраза', result(long));
      expect(buildExercise(phraseCardId(p.id), 'assemble', ctx())?.kind).toBe('speak');
    });

    it('takes its card with it when removed', async () => {
      const p = savePhrase('Я хочу кофе.', result('ყავა მინდა.'));
      removePhrase(p.id);
      expect(userPhrases()).toEqual([]);
      expect(getCard(phraseCardId(p.id))).toBeUndefined();
      expect(getSentence(`u:${p.id}`)).toBeUndefined();
      await flush();
      expect([...allUserItems()]).toEqual([]);
    });

    it('travels in the backup, unlike the key', async () => {
      savePhrase('Я хочу кофе.', result('ყავა მინდა.'));
      await initSecrets();
      await setSecret(TUTOR_KEY, 'sk-ant-test-not-a-real-key');
      expect(hasSecret(TUTOR_KEY)).toBe(true);
      expect(await getSecret(TUTOR_KEY)).toBe('sk-ant-test-not-a-real-key');

      const backup = await buildBackup();
      expect(backup.userItems).toHaveLength(1);
      expect(JSON.stringify(backup)).not.toContain('sk-ant-test');

      await deleteSecret(TUTOR_KEY);
      expect(hasSecret(TUTOR_KEY)).toBe(false);
      expect(await getSecret(TUTOR_KEY)).toBeNull();
    });
  });
});

describe('what the tutor is told', () => {
  it('describes an answer by the facts the app has', () => {
    const s = sentences.find((x) => x.id === 'u10.megobarma-iqida')!;
    const ex = buildExercise('c:erg', 'assemble', {
      introduced: () => true,
      exposure: (id) => (id === s.id ? undefined : { n: 9, last: 1 }),
      getCard: () => undefined,
      gender: 'm',
      rng: seededRng(1),
    })!;
    expect(ex.sentenceId).toBe(s.id);
    const text = describeExercise(ex, 'მეგობარი ბილეთს იყიდა');
    expect(text).toContain('Правильный ответ: მეგობარმა ბილეთი იყიდა.');
    expect(text).toContain('- მეგობარმა: «друг», форма деятеля');
    expect(text).toContain('- იყიდა: глагол «покупать», прошедшее, «он»');
    expect(text).toContain('Правило карточки: В прошедшем времени');
    expect(text).toContain('Ответ ученика (неверный): მეგობარი ბილეთს იყიდა');
    // The right answer given back is not a "wrong answer".
    expect(describeExercise(ex, ex.reveal.ka)).not.toContain('Ответ ученика');
  });

  it('keeps the cached part of the prompt free of anything that changes per request', () => {
    const base = coursePrompt(knownFormsByUnit());
    expect(base).toContain('Урок 1: ');
    expect(base).toContain('ვაკეთებ');
    expect(base).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    for (const task of [translateTask('Где аптека?', 3), textCheckTask('ყავა მინდა.', 3), chatTask('cafe', 3), explainTask('…')]) {
      expect(task.instructions).toContain('Задача:');
      expect(base).not.toContain(task.instructions);
    }
    expect(translateTask('Где аптека?', 3).instructions).toContain('на уроке 3 из 16');
    expect(translateTask('Где аптека?', 16).instructions).toContain('все 16 уроков');
    expect(chatTask('market', 5).instructions).toContain('продавец на рынке');
    expect(translateTask('Где аптека?', 3).user).toBe('Фраза ученика: Где аптека?');
  });
});

describe('what the microphone heard', () => {
  it('compares letters only', () => {
    expect(normalizeKa(' ყავა  მინდა! ')).toBe('ყავამინდა');
    expect(distance('ყავა', 'ყავა')).toBe(0);
    expect(distance('ყავა', 'კავა')).toBe(1);
    expect(distance('', 'აბ')).toBe(2);
  });

  it('takes the closest alternative and tolerates the recogniser, not the learner', () => {
    expect(compareSpoken('ყავა მინდა.', ['ყავა მინდა'])).toMatchObject({ verdict: 'match', score: 1 });
    // The first guess is off, a later one is exact.
    expect(compareSpoken('სად არის აფთიაქი?', ['სად არის აპთიაქი', 'სად არის აფთიაქი'])).toMatchObject({
      verdict: 'match',
      heard: 'სად არის აფთიაქი',
    });
    // One letter in a phrase of this length is within the recogniser's own noise…
    expect(compareSpoken('მეგობარმა ბილეთი იყიდა.', ['მეგობარმა ბილეთი იყიტა']).verdict).toBe('close');
    // …a different form of the word is not.
    expect(compareSpoken('მეგობარმა ბილეთი იყიდა.', ['მეგობარი ბილეთს იყიდა']).verdict).toBe('different');
    expect(compareSpoken('ყავა', ['hello', '']).verdict).toBe('nothing');
    expect(compareSpoken('ყავა', []).verdict).toBe('nothing');
  });
});
