/**
 * What the app already knows about an answer, written out for the tutor's
 * "почему так?" explanation: the sentence, each word with its form, the rule
 * of the card and the learner's wrong answer. The tutor explains from these
 * facts instead of guessing them.
 */
import { describeCard, getLexeme, getPattern, getSentence, getVerb, parseCardId } from '../content/store';
import { PERSON_RU, TENSE_RU, type KaForm, type Person, type Screeve, type Token } from '../content/types';
import type { Exercise } from '../engine/types';

const FORM_RU: Record<KaForm, string> = {
  dat: 'с -ს',
  erg: 'форма деятеля (-მა / -მ)',
  gen: 'форма «чей» (-ის)',
  ins: 'форма «чем, на чём» (-ით)',
  adv: 'как наречие',
  pl: 'множественное число',
  shi: 'с послелогом -ში «в»',
  ze: 'с послелогом -ზე «на»',
  dan: 'с послелогом -დან «из»',
  tan: 'с послелогом -თან «к, у»',
  tvis: 'с послелогом -თვის «для»',
  cop: 'с коротким «есть» (-ა)',
};

const ROLE_RU: Partial<Record<Token['role'], string>> = {
  subj: 'кто',
  obj: 'что (объект)',
  place: 'где / куда / откуда',
  adv: 'обстоятельство',
  qword: 'вопросительное слово',
  attr: 'определение',
  neg: 'отрицание',
};

const KIND_RU: Record<Exercise['kind'], string> = {
  recognise: 'выбор из вариантов',
  listen: 'на слух',
  assemble: 'сборка из плиток',
  speak: 'сказать вслух',
};

function cellRu(cell: string): string {
  const [verbId, screeve, person] = cell.split('.') as [string, Screeve, Person];
  const v = getVerb(verbId);
  return `глагол «${v?.ru ?? verbId}», ${TENSE_RU[screeve].toLowerCase()}, «${PERSON_RU[person]}»`;
}

function tokenRu(t: Token): string {
  const role = ROLE_RU[t.role];
  if (t.cell) return cellRu(t.cell);
  if (t.lex != null) {
    const l = getLexeme(t.lex);
    const form = t.form ? FORM_RU[t.form] : 'словарная форма';
    return `«${l?.ru ?? '?'}», ${form}${role ? `; роль: ${role}` : ''}`;
  }
  if (t.t === 'არ') return 'отрицание «не»';
  return role ?? 'слово';
}

function cardRu(cardId: string): string {
  const p = parseCardId(cardId);
  if (!p) return cardId;
  if (p.kind === 'cell') return `форма глагола: ${cellRu(`${p.verb}.${p.tense}.${p.person}`)}`;
  if (p.kind === 'pattern') {
    const pat = getPattern(p.pattern);
    return `правило «${pat?.titleRu ?? p.pattern}»`;
  }
  if (p.kind === 'word') return `слово «${describeCard(cardId)?.ru ?? ''}»`;
  if (p.kind === 'letter') return `буква ${p.ch}`;
  return 'готовая фраза';
}

/** The facts behind an exercise, as plain Russian lines. `given` is the learner's wrong answer, if there was one. */
export function describeExercise(ex: Exercise, given?: string | null): string {
  const lines = [
    `Упражнение: ${KIND_RU[ex.kind]}.`,
    `Карточка: ${cardRu(ex.card)}.`,
    `Правильный ответ: ${ex.reveal.ka}`,
    `По-русски: ${ex.reveal.ru}`,
  ];
  const s = ex.sentenceId ? getSentence(ex.sentenceId) : undefined;
  if (s) {
    lines.push('Разбор по словам:');
    for (const t of s.tokens) lines.push(`- ${t.t}: ${tokenRu(t)}`);
  }
  const p = parseCardId(ex.card);
  const rule = p?.kind === 'pattern' ? getPattern(p.pattern)?.noteRu : ex.reveal.note;
  if (rule) lines.push(`Правило карточки: ${rule}`);
  if (given && given.trim() && given.trim() !== ex.reveal.ka) lines.push(`Ответ ученика (неверный): ${given.trim()}`);
  return lines.join('\n');
}
