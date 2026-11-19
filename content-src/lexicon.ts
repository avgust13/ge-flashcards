/**
 * Core vocabulary of the units written so far.
 *
 * `legacy` is the id of the same word in public/words.json, so existing
 * progress and (later) pictures stay attached. Words that words.json lacks get
 * ids from 2001 upward; ids are never reused or renumbered.
 */
export type RuGender = 'm' | 'f' | 'n' | 'pl';

export interface LexSrc {
  key: string;
  id: number;
  ka: string;
  ru: string;
  unit: number;
  note?: string;
  /** Russian forms needed when the word is an object: accusative, genitive, gender. */
  acc?: string;
  gen?: string;
  g?: RuGender;
  /** Other attested surfaces of this word used in sentences (with a postposition glued on). */
  forms?: string[];
}

export const LEXICON: LexSrc[] = [
  // ── Урок 1 ────────────────────────────────────────────────────────────────
  { key: 'me', id: 19, ka: 'მე', ru: 'я', unit: 1 },
  { key: 'shen', id: 20, ka: 'შენ', ru: 'ты', unit: 1 },
  { key: 'ki', id: 3, ka: 'კი', ru: 'да', unit: 1 },
  { key: 'ara', id: 4, ka: 'არა', ru: 'нет', unit: 1, note: 'Отдельное слово-ответ. Перед глаголом «не» — это короткое არ.' },
  { key: 'dghes', id: 64, ka: 'დღეს', ru: 'сегодня', unit: 1 },
  { key: 'khval', id: 65, ka: 'ხვალ', ru: 'завтра', unit: 1 },
  { key: 'gushin', id: 66, ka: 'გუშინ', ru: 'вчера', unit: 1 },
  { key: 'akhla', id: 67, ka: 'ახლა', ru: 'сейчас', unit: 1 },
  { key: 'kartulad', id: 2002, ka: 'ქართულად', ru: 'по-грузински', unit: 1 },
  { key: 'rusulad', id: 2003, ka: 'რუსულად', ru: 'по-русски', unit: 1 },
  { key: 'inglisurad', id: 2004, ka: 'ინგლისურად', ru: 'по-английски', unit: 1 },
  { key: 'gamarjoba', id: 1, ka: 'გამარჯობა', ru: 'здравствуйте', unit: 1, note: 'Универсальное приветствие: и «привет», и «здравствуйте».' },
  { key: 'madloba', id: 2, ka: 'მადლობა', ru: 'спасибо', unit: 1 },
  { key: 'nakhvamdis', id: 10, ka: 'ნახვამდის', ru: 'до свидания', unit: 1 },
  { key: 'gtkhovt', id: 12, ka: 'გთხოვთ', ru: 'пожалуйста', unit: 1, note: 'Когда просят. В ответ на «спасибо» говорят არაფრის.' },
  { key: 'bodishi', id: 13, ka: 'ბოდიში', ru: 'извините', unit: 1 },
  { key: 'kargi', id: 77, ka: 'კარგი', ru: 'хорошо, ладно', unit: 1, note: 'И прилагательное «хороший», и согласие «ладно».' },

  // ── Урок 2 ────────────────────────────────────────────────────────────────
  { key: 'is', id: 22, ka: 'ის', ru: 'он, она', unit: 2, note: 'Рода нет: одно слово и для «он», и для «она».' },
  { key: 'chven', id: 23, ka: 'ჩვენ', ru: 'мы', unit: 2 },
  { key: 'tkven', id: 21, ka: 'თქვენ', ru: 'вы', unit: 2, note: 'И несколько человек, и вежливое «Вы» одному.' },
  { key: 'isini', id: 24, ka: 'ისინი', ru: 'они', unit: 2 },

  // ── Урок 3 ────────────────────────────────────────────────────────────────
  { key: 'ak', id: 71, ka: 'აქ', ru: 'здесь', unit: 3 },
  { key: 'ik', id: 72, ka: 'იქ', ru: 'там', unit: 3 },
  { key: 'sad', id: 40, ka: 'სად', ru: 'где', unit: 3, note: 'Вопросительное слово стоит прямо перед глаголом.' },
  { key: 'sakhli', id: 7, ka: 'სახლი', ru: 'дом', unit: 3, gen: 'дома', acc: 'дом', g: 'm', forms: ['სახლში'] },
  { key: 'samsakhuri', id: 2006, ka: 'სამსახური', ru: 'работа (место)', unit: 3, forms: ['სამსახურში'] },
  { key: 'tbilisi', id: 2007, ka: 'თბილისი', ru: 'Тбилиси', unit: 3, acc: 'Тбилиси', gen: 'Тбилиси', g: 'm', forms: ['თბილისში'] },
  { key: 'batumi', id: 2008, ka: 'ბათუმი', ru: 'Батуми', unit: 3, forms: ['ბათუმში'] },
  { key: 'sakartvelo', id: 2009, ka: 'საქართველო', ru: 'Грузия', unit: 3, acc: 'Грузию', gen: 'Грузии', g: 'f', forms: ['საქართველოში'] },
  { key: 'kalaki', id: 293, ka: 'ქალაქი', ru: 'город', unit: 3, forms: ['ქალაქში'] },
  { key: 'kargad', id: 2011, ka: 'კარგად', ru: 'хорошо (как?)', unit: 3 },
  { key: 'magida', id: 144, ka: 'მაგიდა', ru: 'стол', unit: 3, forms: ['მაგიდაზე'] },
  { key: 'telefoni', id: 802, ka: 'ტელეფონი', ru: 'телефон', unit: 3, acc: 'телефон', gen: 'телефона', g: 'm' },
  { key: 'gasaghebi', id: 162, ka: 'გასაღები', ru: 'ключ', unit: 3, acc: 'ключ', gen: 'ключа', g: 'm' },
  { key: 'tsigni', id: 2010, ka: 'წიგნი', ru: 'книга', unit: 3, acc: 'книгу', gen: 'книги', g: 'f' },

  // ── Урок 4 ────────────────────────────────────────────────────────────────
  { key: 'qava', id: 59, ka: 'ყავა', ru: 'кофе', unit: 4, acc: 'кофе', gen: 'кофе', g: 'm' },
  { key: 'chai', id: 58, ka: 'ჩაი', ru: 'чай', unit: 4, acc: 'чай', gen: 'чая', g: 'm' },
  { key: 'tsqali', id: 5, ka: 'წყალი', ru: 'вода', unit: 4, acc: 'воду', gen: 'воды', g: 'f' },
  { key: 'ghvino', id: 137, ka: 'ღვინო', ru: 'вино', unit: 4, acc: 'вино', gen: 'вина', g: 'n' },
  { key: 'puri', id: 6, ka: 'პური', ru: 'хлеб', unit: 4, acc: 'хлеб', gen: 'хлеба', g: 'm' },
  { key: 'es', id: 25, ka: 'ეს', ru: 'это', unit: 4, acc: 'это', gen: 'этого', g: 'n' },
  { key: 'dro', id: 70, ka: 'დრო', ru: 'время', unit: 4, acc: 'время', gen: 'времени', g: 'n' },
  { key: 'puli', id: 82, ka: 'ფული', ru: 'деньги', unit: 4, acc: 'деньги', gen: 'денег', g: 'pl' },
  { key: 'bileti', id: 260, ka: 'ბილეთი', ru: 'билет', unit: 4, acc: 'билет', gen: 'билета', g: 'm' },
  { key: 'kitkhva', id: 2012, ka: 'კითხვა', ru: 'вопрос', unit: 4, acc: 'вопрос', gen: 'вопроса', g: 'm' },
  { key: 'mas', id: 2013, ka: 'მას', ru: 'ему, ей', unit: 4, note: 'Дательный падеж от ის — нужен глаголам «мне…».' },
  { key: 'mat', id: 2014, ka: 'მათ', ru: 'им', unit: 4, note: 'Дательный падеж от ისინი.' },
];

export const LEX = new Map(LEXICON.map((l) => [l.key, l]));

export function lex(key: string): LexSrc {
  const l = LEX.get(key);
  if (!l) throw new Error(`Unknown lexeme key: ${key}`);
  return l;
}
