/**
 * Turns "this card, this kind of exercise" into a concrete exercise:
 * picks an example sentence the learner can already read, and builds
 * distractors that differ exactly where the card is being tested.
 */
import {
  LETTERS,
  LEXICON,
  SENTENCES,
  aiTagOf,
  audioIdFor,
  describeCard,
  examplesFor,
  getLetter,
  getLexeme,
  getPattern,
  getSentence,
  getVerb,
  pairFor,
  parseCardId,
  ruText,
  sentencesWithWord,
  unitOfCard,
} from '../content/store';
import {
  PERSONS,
  SCREEVES,
  endMark,
  joinTokens,
  verbForm,
  type Letter,
  type Person,
  type Screeve,
  type Sentence,
  type Verb,
} from '../content/types';
import type { CardInfo } from '../srs/composer';
import type { ExerciseKind, SrsCard } from '../srs/types';
import { shuffled } from './rng';
import { MAX_ASSEMBLE_TOKENS } from './types';
import type {
  AssembleExercise,
  ChoiceOption,
  Exercise,
  ListenExercise,
  RecogniseExercise,
  Reveal,
  SpeakExercise,
  Tile,
} from './types';

export interface BuildCtx {
  /** Has this card been introduced (does a card record exist)? */
  introduced: (cardId: string) => boolean;
  /** How often an example sentence has been shown, and when. */
  exposure: (sentenceId: string) => { n: number; last: number } | undefined;
  getCard: (cardId: string) => SrsCard | undefined;
  gender: 'm' | 'f';
  rng: () => number;
}

const NEG = 'არ';

function unmet(s: Sentence, cardId: string, ctx: BuildCtx): number {
  let n = 0;
  for (const r of [s.focus, ...s.req]) if (r !== cardId && !ctx.introduced(r)) n++;
  return n;
}

/**
 * The example to show for a card: one that uses only introduced material,
 * and among those the one seen least (then longest ago). If nothing fully
 * fits, the sentence with the fewest unknowns is used rather than blocking.
 */
export function pickExample(cardId: string, ctx: BuildCtx): Sentence | null {
  const all = examplesFor(cardId);
  if (!all.length) return null;
  let best = Infinity;
  for (const s of all) best = Math.min(best, unmet(s, cardId, ctx));
  const pool = all.filter((s) => unmet(s, cardId, ctx) === best);
  let chosen: Sentence[] = [];
  let key: [number, number] = [Infinity, Infinity];
  for (const s of pool) {
    const e = ctx.exposure(s.id);
    const k: [number, number] = [e?.n ?? 0, e?.last ?? 0];
    if (k[0] < key[0] || (k[0] === key[0] && k[1] < key[1])) {
      key = k;
      chosen = [s];
    } else if (k[0] === key[0] && k[1] === key[1]) {
      chosen.push(s);
    }
  }
  return chosen[Math.floor(ctx.rng() * chosen.length)] ?? null;
}

/** Ladder inputs for a card, without building an exercise. */
export function cardInfo(cardId: string): CardInfo {
  const p = parseCardId(cardId);
  if (!p) return { cardKind: 'word', tokens: 1, hasAudio: false, group: null };
  if (p.kind === 'letter') {
    const l = getLetter(p.ch);
    return { cardKind: 'letter', tokens: 1, hasAudio: !!(l && audioIdFor(l.say)), group: null };
  }
  if (p.kind === 'word') {
    const l = getLexeme(p.lexId);
    return { cardKind: 'word', tokens: 1, hasAudio: !!(l && audioIdFor(l.ka)), group: null };
  }
  if (p.kind === 'phrase') {
    const s = getSentence(p.sentenceId);
    return { cardKind: 'phrase', tokens: s?.tokens.length ?? 1, hasAudio: !!(s && audioIdFor(s.ka)), group: null };
  }
  const ex = examplesFor(cardId);
  const hasAudio = ex.some((s) => audioIdFor(s.ka));
  const tokens = ex.length ? Math.round(ex.reduce((n, s) => n + s.tokens.length, 0) / ex.length) : 2;
  return {
    cardKind: p.kind === 'cell' ? 'cell' : 'pattern',
    tokens,
    hasAudio,
    group: p.kind === 'cell' ? `${p.verb}.${p.tense}` : null,
  };
}

function uniqueBy<T>(items: T[], key: (x: T) => string): T[] {
  const seen = new Set<string>();
  return items.filter((x) => {
    const k = key(x);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/**
 * Other forms of the same verb that look like the right answer: the same
 * tense in another person, and the same person in another tense. Forms from
 * cells the learner has met are preferred.
 */
export function verbDistractors(
  verb: Verb,
  tense: Screeve,
  person: Person,
  n: number,
  ctx: BuildCtx,
): string[] {
  const target = verbForm(verb, tense, person);
  const cand: { form: string; score: number; sameTense: boolean }[] = [];
  for (const t of SCREEVES) {
    for (const p of PERSONS) {
      if (t === tense && p === person) continue;
      const form = verbForm(verb, t, p);
      if (!form || form === target) continue;
      const sameTense = t === tense;
      const samePerson = p === person;
      if (!sameTense && !samePerson) continue;
      const known = ctx.introduced(`c:${verb.id}.${t}.${p}`) ? 2 : 0;
      // singular/plural partners (я↔мы, ты↔вы, он↔они) are the classic confusion
      const partner = sameTense && p.slice(0, 1) === person.slice(0, 1) ? 1 : 0;
      cand.push({ form, score: known + partner + ctx.rng(), sameTense });
    }
  }
  cand.sort((a, b) => b.score - a.score);
  const wrongPerson = cand.filter((c) => c.sameTense);
  const wrongTense = cand.filter((c) => !c.sameTense);
  // Mix: at least one "wrong tense" when available, the rest "wrong person".
  const takeTense = Math.min(wrongTense.length, Math.max(1, Math.floor(n / 2)));
  const ordered = [...wrongTense.slice(0, takeTense), ...wrongPerson, ...wrongTense.slice(takeTense)];
  return uniqueBy(ordered, (c) => c.form)
    .slice(0, n)
    .map((c) => c.form);
}

function revealOf(s: Sentence, ctx: BuildCtx, note: string | null = null): Reveal {
  return { ka: s.ka, ru: ruText(s.ru, ctx.gender), audio: audioIdFor(s.ka), note };
}

function withToken(s: Sentence, index: number, replacement: string): string {
  return joinTokens(
    s.tokens.map((t, i) => (i === index ? { ...t, t: replacement } : t)),
    endMark(s.ka),
  );
}

/** Index of the token that is the sentence's tagged verb form. */
function mainVerbIndex(s: Sentence): number {
  const verb = s.verb ? getVerb(s.verb) : undefined;
  const form = verb && s.tense && s.person ? verbForm(verb, s.tense, s.person) : undefined;
  const exact = form ? s.tokens.findIndex((t) => t.role === 'verb' && t.t === form) : -1;
  return exact >= 0 ? exact : s.tokens.findIndex((t) => t.role === 'verb');
}

/** The token where a card is tested: the instance of the pattern, or the word itself. */
function focusIndex(cardId: string, s: Sentence): number {
  const p = parseCardId(cardId);
  if (p?.kind === 'pattern') {
    const own = s.tokens.findIndex((t) => t.pat === cardId);
    return own >= 0 ? own : s.tokens.findIndex((t) => t.alts?.length);
  }
  if (p?.kind === 'word') return s.tokens.findIndex((t) => t.lex === p.lexId);
  return -1;
}

/** Georgian answer options for a sentence, differing in the place the card tests. */
function kaVariants(cardId: string, s: Sentence, ctx: BuildCtx): string[] {
  const p = parseCardId(cardId);
  const verbIdx = mainVerbIndex(s);
  const verb = s.verb ? getVerb(s.verb) : undefined;

  if (p?.kind === 'pattern' && (p.pattern === 'neg' || p.pattern === 'q') && verbIdx >= 0 && !s.strict) {
    // Same words, different sentence type — plus the classic misplacement of "არ".
    const base = s.tokens.filter((t) => t.t !== NEG).map((t) => t.t);
    const vi = base.length - 1;
    const withNeg = [...base.slice(0, vi), NEG, base[vi]];
    const wrongNeg = [...base, NEG];
    return [`${base.join(' ')}.`, `${withNeg.join(' ')}.`, `${base.join(' ')}?`, `${wrongNeg.join(' ')}.`];
  }

  if (p?.kind === 'pattern') {
    const idx = focusIndex(cardId, s);
    const out: string[] = [];
    if (idx >= 0) out.push(...(s.tokens[idx].alts ?? []).map((a) => withToken(s, idx, a)));
    if (verb && s.tense && s.person && verbIdx >= 0 && verbIdx !== idx) {
      out.push(...verbDistractors(verb, s.tense, s.person, 1, ctx).map((f) => withToken(s, verbIdx, f)));
    }
    if (out.length < 3) {
      // Too few ways to get this one wrong: fill up with other sentences of the same pattern.
      const own = ruText(s.ru, ctx.gender);
      const siblings = shuffled(
        examplesFor(cardId).filter(
          (o) => o.id !== s.id && o.ka !== s.ka && ruText(o.ru, ctx.gender) !== own && unmet(o, cardId, ctx) === 0,
        ),
        ctx.rng,
      ).map((o) => o.ka);
      out.push(...siblings.slice(0, 3 - out.length));
    }
    if (out.length) return out;
  }

  if (verb && s.tense && s.person && verbIdx >= 0) {
    return verbDistractors(verb, s.tense, s.person, 3, ctx).map((f) => withToken(s, verbIdx, f));
  }
  return [];
}

function choice(correct: ChoiceOption, wrong: ChoiceOption[], ctx: BuildCtx): { options: ChoiceOption[]; correct: number } {
  const distinct = uniqueBy(wrong.filter((w) => w.text !== correct.text), (w) => w.text).slice(0, 3);
  const options = shuffled([correct, ...distinct], ctx.rng);
  return { options, correct: options.indexOf(correct) };
}

/** Russian prompts of sentences that sound close to `s`: same verb and frame, another person or tense. */
function ruSiblings(s: Sentence, ctx: BuildCtx): string[] {
  const own = ruText(s.ru, ctx.gender);
  const score = (o: Sentence): number => {
    let n = 0;
    if (o.verb === s.verb) n += 4;
    if (o.frame === s.frame) n += 2;
    if (o.tense === s.tense || o.person === s.person) n += 1;
    if (ctx.introduced(o.focus)) n += 1;
    return n + ctx.rng();
  };
  const out = uniqueBy(
    SENTENCES.filter((o) => o.id !== s.id && o.fixed === s.fixed && o.unit <= s.unit)
      .map((o) => ({ ru: ruText(o.ru, ctx.gender), score: score(o) }))
      .filter((o) => o.ru !== own)
      .sort((a, b) => b.score - a.score),
    (o) => o.ru,
  )
    .slice(0, 3)
    .map((o) => o.ru);
  if (out.length < 3) {
    // Few set phrases exist early on: pad with word meanings so there are still four options.
    const words = shuffled(LEXICON.filter((l) => l.unit <= s.unit), ctx.rng).map((l) => l.ru);
    for (const w of words) if (out.length < 3 && w !== own && !out.includes(w)) out.push(w);
  }
  return out;
}

function otherLexemes(lexId: number, ctx: BuildCtx): { ka: string; ru: string }[] {
  const me = getLexeme(lexId);
  const unit = me?.unit ?? 1;
  const score = (l: (typeof LEXICON)[number]): number =>
    (ctx.introduced(`w:${l.id}`) ? 3 : 0) + (l.unit === unit ? 2 : 0) - Math.abs(l.unit - unit) + ctx.rng();
  return LEXICON.filter((l) => l.id !== lexId && l.ru !== me?.ru && l.ka !== me?.ka && l.unit <= unit)
    .sort((a, b) => score(b) - score(a))
    .slice(0, 3);
}

let counter = 0;
const nextUid = (card: string) => `${card}#${++counter}`;

function buildWord(cardId: string, lexId: number, kind: ExerciseKind, ctx: BuildCtx): Exercise | null {
  const l = getLexeme(lexId);
  if (!l) return null;
  const audio = audioIdFor(l.ka);
  const reveal: Reveal = { ka: l.ka, ru: l.ru, audio, note: l.note };
  const base = { uid: nextUid(cardId), card: cardId, sentenceId: null, tokens: 1, reveal };
  const others = otherLexemes(lexId, ctx);

  if (kind === 'speak') {
    // A word that is already in review is said inside a sentence every other
    // time: that is where it will be needed.
    const card = ctx.getCard(cardId);
    if (card?.state === 2 && card.reps % 2 === 1) {
      const fits = sentencesWithWord(cardId).filter((s) => unmet(s, cardId, ctx) === 0);
      if (fits.length) {
        const s = fits[Math.floor(ctx.rng() * fits.length)];
        const sentenceReveal: Reveal = { ka: s.ka, ru: ruText(s.ru, ctx.gender), audio: audioIdFor(s.ka), note: `${l.ka} — ${l.ru}` };
        if (card.reps % 4 === 1 && s.tokens.length >= 2) return assemble(cardId, s, ctx, sentenceReveal);
        return {
          uid: nextUid(cardId),
          card: cardId,
          sentenceId: s.id,
          tokens: s.tokens.length,
          reveal: sentenceReveal,
          kind: 'speak',
          promptRu: sentenceReveal.ru,
        } satisfies SpeakExercise;
      }
    }
    return { ...base, kind: 'speak', promptRu: l.ru } satisfies SpeakExercise;
  }
  if (kind === 'listen' && audio) {
    const c = choice({ text: l.ru, ka: false }, others.map((o) => ({ text: o.ru, ka: false })), ctx);
    return { ...base, kind: 'listen', audio, ...c } satisfies ListenExercise;
  }
  // First meeting: read Georgian, pick the meaning. Afterwards: the other way round.
  const state = ctx.getCard(cardId)?.state ?? 0;
  if (state === 0) {
    const c = choice({ text: l.ru, ka: false }, others.map((o) => ({ text: o.ru, ka: false })), ctx);
    return { ...base, kind: 'recognise', dir: 'ka-ru', prompt: l.ka, promptAudio: audio, ...c } satisfies RecogniseExercise;
  }
  const c = choice({ text: l.ka, ka: true }, others.map((o) => ({ text: o.ka, ka: true })), ctx);
  return { ...base, kind: 'recognise', dir: 'ru-ka', prompt: l.ru, promptAudio: null, ...c } satisfies RecogniseExercise;
}

/**
 * Three other letters to offer next to the right one: first the ones the
 * learner is likely to confuse it with (by shape when reading, by sound when
 * listening), then letters already met, then the rest of the same group.
 */
export function letterDistractors(l: Letter, prefer: 'look' | 'sound', ctx: BuildCtx): Letter[] {
  const explicit = prefer === 'look' ? [...l.lookAlike, ...l.soundAlike] : [...l.soundAlike, ...l.lookAlike];
  const seen = new Set([l.ch]);
  const out: Letter[] = [];
  const push = (ch: string) => {
    const x = getLetter(ch);
    if (x && !seen.has(ch)) {
      seen.add(ch);
      out.push(x);
    }
  };
  // A similar letter from a later group only once it has been introduced.
  for (const ch of explicit) {
    const x = getLetter(ch);
    if (x && (x.group <= l.group || ctx.introduced(`l:${ch}`))) push(ch);
  }
  const rest = LETTERS.filter((x) => !seen.has(x.ch))
    .map((x) => ({
      ch: x.ch,
      score: (ctx.introduced(`l:${x.ch}`) ? 2 : 0) + (x.group === l.group ? 1.5 : 0) + (x.group < l.group ? 0.5 : 0) + ctx.rng(),
    }))
    .sort((a, b) => b.score - a.score);
  for (const r of rest) {
    if (out.length >= 3) break;
    push(r.ch);
  }
  return out.slice(0, 3);
}

function buildLetter(cardId: string, ch: string, kind: ExerciseKind, ctx: BuildCtx): Exercise | null {
  const l = getLetter(ch);
  if (!l) return null;
  const audio = audioIdFor(l.say);
  const reveal: Reveal = {
    ka: l.ch,
    ru: `${l.ru} — ${l.hintRu}`,
    audio,
    note: `Например: ${l.word.ka} — ${l.word.ru}`,
  };
  const base = { uid: nextUid(cardId), card: cardId, sentenceId: null, tokens: 1, reveal, noTranslit: true };
  const asLetter = (x: Letter): ChoiceOption => ({ text: x.ch, ka: true });
  const asSound = (x: Letter): ChoiceOption => ({ text: x.ru, ka: false, sub: x.hintRu });
  const card = ctx.getCard(cardId);

  if (kind === 'listen' && audio) {
    // For a mature letter of a confusable pair, half the time test the contrast
    // on real words: "дверь" or "ветер"?
    const pair = pairFor(ch);
    const pairAudio = pair ? audioIdFor(pair.mine.ka) : null;
    if (pair && pairAudio && card?.state === 2 && ctx.introduced(`l:${pair.other.ch}`) && ctx.rng() < 0.5) {
      const c = choice(
        { text: pair.mine.ka, ka: true, sub: pair.mine.ru },
        [{ text: pair.other.ka, ka: true, sub: pair.other.ru }],
        ctx,
      );
      return {
        ...base,
        kind: 'listen',
        audio: pairAudio,
        title: 'Какое слово ты слышишь?',
        reveal: { ka: pair.mine.ka, ru: pair.mine.ru, audio: pairAudio, note: `${l.ch} — ${l.ru}: ${l.hintRu}` },
        ...c,
      } satisfies ListenExercise;
    }
    const c = choice(asLetter(l), letterDistractors(l, 'sound', ctx).map(asLetter), ctx);
    return { ...base, kind: 'listen', audio, title: 'Какую букву ты слышишь?', ...c } satisfies ListenExercise;
  }

  // First meeting: see the letter, name the sound. Afterwards: from the sound back to the letter.
  if ((card?.state ?? 0) === 0) {
    const c = choice(asSound(l), letterDistractors(l, 'look', ctx).map(asSound), ctx);
    return {
      ...base,
      kind: 'recognise',
      dir: 'ka-ru',
      prompt: l.ch,
      promptAudio: null,
      title: 'Какой это звук?',
      ...c,
    } satisfies RecogniseExercise;
  }
  const c = choice(asLetter(l), letterDistractors(l, 'look', ctx).map(asLetter), ctx);
  return {
    ...base,
    kind: 'recognise',
    dir: 'ru-ka',
    prompt: `${l.ru} — ${l.hintRu}`,
    promptAudio: null,
    title: 'Какая это буква?',
    ...c,
  } satisfies RecogniseExercise;
}

function assemble(cardId: string, s: Sentence, ctx: BuildCtx, reveal: Reveal): AssembleExercise {
  const p = parseCardId(cardId);
  const verbTok = s.tokens[mainVerbIndex(s)] ?? null;
  // One fixed order: set phrases, two clauses, an attribute in front of its noun.
  const rigid = s.fixed || !!s.strict;
  const verb = s.verb ? getVerb(s.verb) : undefined;
  const solution = s.tokens.map((t) => t.t);
  if (s.polarity === 'q') solution.push('?');

  const decoys: string[] = [];
  if (verb && s.tense && s.person) decoys.push(...verbDistractors(verb, s.tense, s.person, 2, ctx));
  for (const t of s.tokens) if (t.alts?.length) decoys.push(t.alts[Math.floor(ctx.rng() * t.alts.length)]);
  if (!s.fixed && !solution.includes(NEG) && ctx.introduced('c:neg')) decoys.push(NEG);
  if (!s.fixed && s.polarity !== 'q' && ctx.introduced('c:q')) decoys.push('?');
  if (s.fixed) {
    // Borrow words from other set phrases as decoys.
    const pool = SENTENCES.filter((o) => o.fixed && o.id !== s.id).flatMap((o) => o.tokens.map((t) => t.t));
    decoys.push(...shuffled(pool, ctx.rng).slice(0, 2));
  }
  const extra = uniqueBy(decoys.filter((d) => !solution.includes(d)), (d) => d).slice(0, 3);
  const tiles: Tile[] = shuffled(
    [...solution.map((t) => ({ t, decoy: false })), ...extra.map((t) => ({ t, decoy: true }))],
    ctx.rng,
  ).map((x, i) => ({ i, ...x }));

  let focus: string | null = verbTok?.t ?? null;
  if (p?.kind === 'pattern') {
    if (p.pattern === 'neg') focus = NEG;
    else if (p.pattern === 'q') focus = '?';
    else focus = s.tokens[focusIndex(cardId, s)]?.t ?? focus;
  } else if (p?.kind === 'word') {
    focus = s.tokens[focusIndex(cardId, s)]?.t ?? focus;
  }

  return {
    uid: nextUid(cardId),
    card: cardId,
    sentenceId: s.id,
    tokens: s.tokens.length,
    reveal,
    kind: 'assemble',
    promptRu: ruText(s.ru, ctx.gender),
    tiles,
    solution,
    verb: rigid ? null : verbTok?.t ?? null,
    beforeVerb: s.tokens.filter((t) => t.role === 'qword').map((t) => t.t),
    focus: s.fixed ? null : focus,
  };
}

function buildSentenceCard(cardId: string, s: Sentence, kind: ExerciseKind, ctx: BuildCtx): Exercise {
  const p = parseCardId(cardId);
  const note = p?.kind === 'pattern' ? getPattern(p.pattern)?.noteRu ?? null : null;
  const ai = aiTagOf(cardId);
  const reveal: Reveal = ai ? { ...revealOf(s, ctx, note), ai } : revealOf(s, ctx, note);
  const base = { uid: nextUid(cardId), card: cardId, sentenceId: s.id, tokens: s.tokens.length, reveal };
  const promptRu = ruText(s.ru, ctx.gender);

  if (kind === 'assemble' && s.tokens.length >= 2 && s.tokens.length <= MAX_ASSEMBLE_TOKENS) {
    return assemble(cardId, s, ctx, reveal);
  }

  if (kind === 'listen' && reveal.audio) {
    const c = choice({ text: promptRu, ka: false }, ruSiblings(s, ctx).map((t) => ({ text: t, ka: false })), ctx);
    if (c.options.length >= 2) return { ...base, kind: 'listen', audio: reveal.audio, ...c } satisfies ListenExercise;
  }

  if (kind === 'recognise') {
    if (s.fixed) {
      // Set phrase, first meeting: read it and pick the meaning.
      const c = choice({ text: promptRu, ka: false }, ruSiblings(s, ctx).map((t) => ({ text: t, ka: false })), ctx);
      return { ...base, kind: 'recognise', dir: 'ka-ru', prompt: s.ka, promptAudio: reveal.audio, ...c } satisfies RecogniseExercise;
    }
    const variants = kaVariants(cardId, s, ctx);
    const c = choice({ text: s.ka, ka: true }, variants.map((t) => ({ text: t, ka: true })), ctx);
    if (c.options.length >= 2) {
      return { ...base, kind: 'recognise', dir: 'ru-ka', prompt: promptRu, promptAudio: null, ...c } satisfies RecogniseExercise;
    }
  }

  return { ...base, kind: 'speak', promptRu } satisfies SpeakExercise;
}

/** Build the exercise for a card. Falls back to a simpler kind when the wanted one is impossible. */
export function buildExercise(cardId: string, kind: ExerciseKind, ctx: BuildCtx): Exercise | null {
  const p = parseCardId(cardId);
  if (!p) return null;
  if (p.kind === 'letter') return buildLetter(cardId, p.ch, kind, ctx);
  if (p.kind === 'word') return buildWord(cardId, p.lexId, kind, ctx);
  const s = p.kind === 'phrase' ? getSentence(p.sentenceId) ?? null : pickExample(cardId, ctx);
  if (!s) return null;
  return buildSentenceCard(cardId, s, kind, ctx);
}

/** Rows for the "new material" screen: what the learner is about to practise. */
export function introRows(cardIds: string[], ctx: BuildCtx): { id: string; ka: string; ru: string; audio: string | null; note: string | null }[] {
  return cardIds.flatMap((id) => {
    const view = describeCard(id);
    if (!view) return [];
    if (view.kind === 'letter') {
      const l = getLetter(view.ka);
      return [{ id, ka: view.ka, ru: view.ru, audio: l ? audioIdFor(l.say) : null, note: view.note }];
    }
    if (view.kind === 'pattern') {
      const s = pickExample(id, ctx);
      return [{ id, ka: s?.ka ?? '', ru: s ? ruText(s.ru, ctx.gender) : view.ru, audio: s ? audioIdFor(s.ka) : null, note: view.note }];
    }
    if (view.kind === 'cell') {
      // Show the cell inside its plainest sentence ("я + глагол"), so text and audio match.
      const plain = examplesFor(id).find((x) => x.polarity === 'aff' && unmet(x, id, ctx) === 0);
      if (plain) return [{ id, ka: plain.ka, ru: ruText(plain.ru, ctx.gender), audio: audioIdFor(plain.ka), note: null }];
      return [{ id, ka: view.ka, ru: ruText(view.ru, ctx.gender), audio: audioIdFor(view.ka), note: null }];
    }
    return [{ id, ka: view.ka, ru: ruText(view.ru, ctx.gender), audio: audioIdFor(view.ka), note: view.note }];
  });
}

export { unitOfCard };
