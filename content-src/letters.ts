/**
 * The 33 letters of Mkhedruli, in the order they are taught.
 *
 * `ru` is a short label for the sound and must be unique per letter — the old
 * trainer mapped თ and ტ both to "т", which made the pairs impossible to tell
 * apart. Aspirated consonants carry ʰ, ejectives an apostrophe, matching the
 * Latin transliteration (t / t').
 *
 * `say` is the text of the letter's audio clip: the vowel itself, or the
 * consonant in the syllable "…ა".
 */
import type { Letter, LetterGroup, LetterPair } from '../src/content/types';

export const LETTER_GROUPS: LetterGroup[] = [
  { id: 1, titleRu: 'Гласные', noteRu: 'Их всего пять, и каждая всегда читается одинаково.' },
  { id: 2, titleRu: 'Простые согласные', noteRu: 'Звучат почти как русские.' },
  { id: 3, titleRu: 'Ещё согласные', noteRu: 'Тоже без сюрпризов: звуки знакомые, непривычны только очертания.' },
  {
    id: 4,
    titleRu: 'Пары: с выдохом и резкие',
    noteRu:
      'У «т», «к» и «п» в грузинском по два варианта. Один — мягкий, с лёгким выдохом, как в английском. Другой — резкий, без воздуха, будто со щелчком в горле. Это разные буквы и разные слова.',
  },
  {
    id: 5,
    titleRu: 'Ещё пары и горловое ყ',
    noteRu: 'То же различие у «ц» и «ч». А ყ — глубокое «к» из самого горла, которого в русском нет.',
  },
  { id: 6, titleRu: 'Редкие звуки', noteRu: 'Последние пять букв. Встречаются реже, но без них не прочитать «вино» и «очень».' },
];

interface Src {
  ch: string;
  tr: string;
  ru: string;
  hintRu: string;
  group: number;
  look?: string;
  sound?: string;
  word: [string, string];
}

const VOWELS = new Set(['ა', 'ე', 'ი', 'ო', 'უ']);

const SRC: Src[] = [
  // ── 1. Гласные ───────────────────────────────────────────────────────────
  { ch: 'ა', tr: 'a', ru: 'а', hintRu: 'как русское «а»', group: 1, look: 'ი', sound: 'ო', word: ['ახლა', 'сейчас'] },
  { ch: 'ე', tr: 'e', ru: 'э', hintRu: 'как «э» в слове «это»', group: 1, look: 'ვ', sound: 'ი', word: ['ეს', 'это'] },
  { ch: 'ი', tr: 'i', ru: 'и', hintRu: 'как русское «и»', group: 1, look: 'ა', sound: 'ე', word: ['ის', 'он, она'] },
  { ch: 'ო', tr: 'o', ru: 'о', hintRu: 'всегда чёткое «о», даже без ударения', group: 1, look: 'ნ', sound: 'უა', word: ['ორი', 'два'] },
  { ch: 'უ', tr: 'u', ru: 'у', hintRu: 'как русское «у»', group: 1, look: 'შ', sound: 'ო', word: ['უნდა', 'хочет; нужно'] },

  // ── 2. Простые согласные ─────────────────────────────────────────────────
  { ch: 'მ', tr: 'm', ru: 'м', hintRu: 'как русское «м»', group: 2, look: 'შ', sound: 'ნ', word: ['მე', 'я'] },
  { ch: 'ნ', tr: 'n', ru: 'н', hintRu: 'как русское «н»', group: 2, look: 'ო', sound: 'მ', word: ['ნახვამდის', 'до свидания'] },
  { ch: 'ს', tr: 's', ru: 'с', hintRu: 'как русское «с»', group: 2, look: 'ხ', sound: 'ზშ', word: ['სახლი', 'дом'] },
  { ch: 'რ', tr: 'r', ru: 'р', hintRu: 'короткое раскатистое «р»', group: 2, look: 'ღ', sound: 'ლ', word: ['რუსულად', 'по-русски'] },
  { ch: 'ლ', tr: 'l', ru: 'л', hintRu: 'среднее между «л» и «ль»', group: 2, look: 'ღ', sound: 'რ', word: ['ლარი', 'лари'] },
  { ch: 'ვ', tr: 'v', ru: 'в', hintRu: 'как русское «в»; перед «м» и «ц» почти не слышно', group: 2, look: 'კპ', sound: 'ბ', word: ['ვარ', 'я есть'] },

  // ── 3. Ещё согласные ─────────────────────────────────────────────────────
  { ch: 'ბ', tr: 'b', ru: 'б', hintRu: 'как русское «б»', group: 3, look: 'გ', sound: 'პ', word: ['ბათუმი', 'Батуми'] },
  { ch: 'გ', tr: 'g', ru: 'г', hintRu: 'как русское «г»', group: 3, look: 'ბ', sound: 'კ', word: ['გუშინ', 'вчера'] },
  { ch: 'დ', tr: 'd', ru: 'д', hintRu: 'как русское «д»', group: 3, look: 'ფ', sound: 'ტ', word: ['დრო', 'время'] },
  { ch: 'ზ', tr: 'z', ru: 'з', hintRu: 'как русское «з»', group: 3, look: 'ხ', sound: 'ს', word: ['ზამთარი', 'зима'] },
  { ch: 'შ', tr: 'sh', ru: 'ш', hintRu: 'как русское «ш», чуть мягче', group: 3, look: 'მწ', sound: 'სჟ', word: ['შენ', 'ты'] },
  { ch: 'ხ', tr: 'kh', ru: 'х', hintRu: 'как русское «х», но глубже и с хрипотцой', group: 3, look: 'სზ', sound: 'ღ', word: ['ხვალ', 'завтра'] },

  // ── 4. Пары: с выдохом и резкие ──────────────────────────────────────────
  { ch: 'თ', tr: 't', ru: 'тʰ', hintRu: '«т» с лёгким выдохом, как английское t в слове top', group: 4, look: 'ო', sound: 'ტ', word: ['თბილისი', 'Тбилиси'] },
  { ch: 'ტ', tr: "t'", ru: 'т’', hintRu: 'резкое «т» без выдоха, со щелчком в горле', group: 4, look: 'ც', sound: 'თ', word: ['ტელეფონი', 'телефон'] },
  { ch: 'ქ', tr: 'k', ru: 'кʰ', hintRu: '«к» с лёгким выдохом, как английское k в слове key', group: 4, look: 'ყ', sound: 'კყ', word: ['ქალაქი', 'город'] },
  { ch: 'კ', tr: "k'", ru: 'к’', hintRu: 'резкое «к» без выдоха, со щелчком в горле', group: 4, look: 'ვპ', sound: 'ქყ', word: ['კარგი', 'хорошо'] },
  { ch: 'ფ', tr: 'p', ru: 'пʰ', hintRu: '«п» с лёгким выдохом. Это не «ф»: звука «ф» в грузинском нет', group: 4, look: 'დ', sound: 'პ', word: ['ფული', 'деньги'] },
  { ch: 'პ', tr: "p'", ru: 'п’', hintRu: 'резкое «п» без выдоха, со щелчком', group: 4, look: 'ვკ', sound: 'ფ', word: ['პური', 'хлеб'] },

  // ── 5. Ещё пары и горловое ყ ─────────────────────────────────────────────
  { ch: 'ც', tr: 'ts', ru: 'цʰ', hintRu: '«ц» с лёгким выдохом', group: 5, look: 'ტ', sound: 'წ', word: ['ცოტა', 'немного'] },
  { ch: 'წ', tr: "ts'", ru: 'ц’', hintRu: 'резкое «ц» без выдоха, со щелчком', group: 5, look: 'შჭ', sound: 'ც', word: ['წყალი', 'вода'] },
  { ch: 'ჩ', tr: 'ch', ru: 'чʰ', hintRu: '«ч» с лёгким выдохом, близко к русскому «ч»', group: 5, look: 'ჰ', sound: 'ჭ', word: ['ჩაი', 'чай'] },
  { ch: 'ჭ', tr: "ch'", ru: 'ч’', hintRu: 'резкое твёрдое «ч» без выдоха, со щелчком', group: 5, look: 'წ', sound: 'ჩ', word: ['ჭიქა', 'стакан'] },
  { ch: 'ყ', tr: "q'", ru: 'къ', hintRu: 'глубокое «к» из самого горла, со щелчком. В русском такого звука нет', group: 5, look: 'ქ', sound: 'კქ', word: ['ყავა', 'кофе'] },

  // ── 6. Редкие звуки ──────────────────────────────────────────────────────
  { ch: 'ღ', tr: 'gh', ru: 'гх', hintRu: 'звонкое «х»: как украинское «г» или французское r', group: 6, look: 'ლრ', sound: 'ხგ', word: ['ღვინო', 'вино'] },
  { ch: 'ძ', tr: 'dz', ru: 'дз', hintRu: 'слитное «дз»', group: 6, look: 'ხმ', sound: 'ზც', word: ['ძალიან', 'очень'] },
  { ch: 'ჯ', tr: 'j', ru: 'дж', hintRu: 'слитное «дж», как английское j в слове job', group: 6, look: 'ჭ', sound: 'ჩჟ', word: ['ჯერ', 'пока, ещё'] },
  { ch: 'ჟ', tr: 'zh', ru: 'ж', hintRu: 'как русское «ж»; буква редкая', group: 6, look: 'ჯ', sound: 'შჯ', word: ['ჟურნალი', 'журнал'] },
  { ch: 'ჰ', tr: 'h', ru: 'һ', hintRu: 'лёгкий выдох, как английское h в слове hello', group: 6, look: 'ჩ', sound: 'ხ', word: ['ჰაერი', 'воздух'] },
];

export const LETTERS: Letter[] = SRC.map((s) => ({
  ch: s.ch,
  tr: s.tr,
  ru: s.ru,
  hintRu: s.hintRu,
  group: s.group,
  lookAlike: [...(s.look ?? '')],
  soundAlike: [...(s.sound ?? '')],
  say: VOWELS.has(s.ch) ? s.ch : `${s.ch}ა`,
  word: { ka: s.word[0], ru: s.word[1] },
}));

/**
 * Minimal pairs: two real words that differ only in the aspirated / ejective
 * consonant. Hearing which one was said is the real test of the contrast.
 */
export const LETTER_PAIRS: LetterPair[] = [
  { a: { ch: 'ქ', ka: 'ქარი', ru: 'ветер' }, b: { ch: 'კ', ka: 'კარი', ru: 'дверь' } },
  { a: { ch: 'ფ', ka: 'ფური', ru: 'корова' }, b: { ch: 'პ', ka: 'პური', ru: 'хлеб' } },
  { a: { ch: 'თ', ka: 'თარი', ru: 'тар (инструмент)' }, b: { ch: 'ტ', ka: 'ტარი', ru: 'рукоятка' } },
  { a: { ch: 'ც', ka: 'ცელი', ru: 'коса (инструмент)' }, b: { ch: 'წ', ka: 'წელი', ru: 'год' } },
  { a: { ch: 'ჩ', ka: 'ჩირი', ru: 'сухофрукты' }, b: { ch: 'ჭ', ka: 'ჭირი', ru: 'беда' } },
];
