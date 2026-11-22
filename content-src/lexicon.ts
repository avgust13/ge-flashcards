/**
 * Core vocabulary of the course.
 *
 * Ids below 2000 are the ids of the same word in the picture dictionary
 * (content-src/dictionary.json), so existing progress and pictures stay
 * attached. Words the dictionary lacks get ids from 2001 upward; ids are never
 * reused or renumbered.
 *
 * Every Georgian surface here — the dictionary form and each named form in `k` —
 * is checked by `scripts/content/verify-lexicon.ts` against a Wiktionary
 * declension table or a corpus list before it may be used in a sentence.
 */
import type { KaForm } from '../src/content/types';

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
  /** Other surfaces of this word that sentences use: cases, the plural, with a postposition glued on. */
  k?: Partial<Record<KaForm, string>>;
  /** Wiktionary page with the declension table when it is not `ka`; false for words that have none (names, frozen forms). */
  wikt?: string | false;
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
  { key: 'kargi', id: 77, ka: 'კარგი', ru: 'хорошо, ладно', unit: 1, note: 'И прилагательное «хороший», и согласие «ладно».', k: { dat: 'კარგ', cop: 'კარგია' } },

  // ── Урок 2 ────────────────────────────────────────────────────────────────
  { key: 'is', id: 22, ka: 'ის', ru: 'он, она', unit: 2, note: 'Рода нет: одно слово и для «он», и для «она».' },
  { key: 'chven', id: 23, ka: 'ჩვენ', ru: 'мы', unit: 2 },
  { key: 'tkven', id: 21, ka: 'თქვენ', ru: 'вы', unit: 2, note: 'И несколько человек, и вежливое «Вы» одному.' },
  { key: 'isini', id: 24, ka: 'ისინი', ru: 'они', unit: 2 },

  // ── Урок 3 ────────────────────────────────────────────────────────────────
  { key: 'ak', id: 71, ka: 'აქ', ru: 'здесь', unit: 3 },
  { key: 'ik', id: 72, ka: 'იქ', ru: 'там', unit: 3 },
  { key: 'sad', id: 40, ka: 'სად', ru: 'где', unit: 3, note: 'Вопросительное слово стоит прямо перед глаголом.' },
  { key: 'sakhli', id: 7, ka: 'სახლი', ru: 'дом', unit: 3, gen: 'дома', acc: 'дом', g: 'm', k: { shi: 'სახლში', dan: 'სახლიდან', dat: 'სახლს', gen: 'სახლის' } },
  { key: 'samsakhuri', id: 2006, ka: 'სამსახური', ru: 'работа (место)', unit: 3, k: { shi: 'სამსახურში', dan: 'სამსახურიდან' } },
  { key: 'tbilisi', id: 2007, ka: 'თბილისი', ru: 'Тбилиси', unit: 3, acc: 'Тбилиси', gen: 'Тбилиси', g: 'm', k: { shi: 'თბილისში', dan: 'თბილისიდან', dat: 'თბილისს' } },
  { key: 'batumi', id: 2008, ka: 'ბათუმი', ru: 'Батуми', unit: 3, acc: 'Батуми', gen: 'Батуми', g: 'm', k: { shi: 'ბათუმში', dan: 'ბათუმიდან' } },
  { key: 'sakartvelo', id: 2009, ka: 'საქართველო', ru: 'Грузия', unit: 3, acc: 'Грузию', gen: 'Грузии', g: 'f', k: { shi: 'საქართველოში', dan: 'საქართველოდან' } },
  { key: 'kalaki', id: 293, ka: 'ქალაქი', ru: 'город', unit: 3, acc: 'город', gen: 'города', g: 'm', k: { shi: 'ქალაქში', dan: 'ქალაქიდან', dat: 'ქალაქს' } },
  { key: 'kargad', id: 2011, ka: 'კარგად', ru: 'хорошо (как?)', unit: 3 },
  { key: 'magida', id: 144, ka: 'მაგიდა', ru: 'стол', unit: 3, k: { ze: 'მაგიდაზე' } },
  { key: 'telefoni', id: 802, ka: 'ტელეფონი', ru: 'телефон', unit: 3, acc: 'телефон', gen: 'телефона', g: 'm', k: { dat: 'ტელეფონს' } },
  { key: 'gasaghebi', id: 162, ka: 'გასაღები', ru: 'ключ', unit: 3, acc: 'ключ', gen: 'ключа', g: 'm', k: { dat: 'გასაღებს' } },
  { key: 'tsigni', id: 2010, ka: 'წიგნი', ru: 'книга', unit: 3, acc: 'книгу', gen: 'книги', g: 'f', k: { dat: 'წიგნს' } },

  // ── Урок 4 ────────────────────────────────────────────────────────────────
  { key: 'qava', id: 59, ka: 'ყავა', ru: 'кофе', unit: 4, acc: 'кофе', gen: 'кофе', g: 'm', k: { dat: 'ყავას' } },
  { key: 'chai', id: 58, ka: 'ჩაი', ru: 'чай', unit: 4, acc: 'чай', gen: 'чая', g: 'm', k: { dat: 'ჩაის' } },
  { key: 'tsqali', id: 5, ka: 'წყალი', ru: 'вода', unit: 4, acc: 'воду', gen: 'воды', g: 'f', k: { dat: 'წყალს' } },
  { key: 'ghvino', id: 137, ka: 'ღვინო', ru: 'вино', unit: 4, acc: 'вино', gen: 'вина', g: 'n', k: { dat: 'ღვინოს' } },
  { key: 'puri', id: 6, ka: 'პური', ru: 'хлеб', unit: 4, acc: 'хлеб', gen: 'хлеба', g: 'm', k: { dat: 'პურს' } },
  { key: 'es', id: 25, ka: 'ეს', ru: 'это', unit: 4, acc: 'это', gen: 'этого', g: 'n', k: { dat: 'ამას', ze: 'ამაზე' } },
  { key: 'dro', id: 70, ka: 'დრო', ru: 'время', unit: 4, acc: 'время', gen: 'времени', g: 'n' },
  { key: 'puli', id: 82, ka: 'ფული', ru: 'деньги', unit: 4, acc: 'деньги', gen: 'денег', g: 'pl', k: { ins: 'ფულით' } },
  { key: 'bileti', id: 260, ka: 'ბილეთი', ru: 'билет', unit: 4, acc: 'билет', gen: 'билета', g: 'm', k: { dat: 'ბილეთს' } },
  { key: 'kitkhva', id: 2012, ka: 'კითხვა', ru: 'вопрос', unit: 4, acc: 'вопрос', gen: 'вопроса', g: 'm' },
  { key: 'mas', id: 2013, ka: 'მას', ru: 'ему, ей', unit: 4, note: 'Дательный падеж от ის — нужен глаголам «мне…».', wikt: 'ის' },
  { key: 'mat', id: 2014, ka: 'მათ', ru: 'им', unit: 4, note: 'Дательный падеж от ისინი.', wikt: 'ისინი' },

  // ── Урок 5 ────────────────────────────────────────────────────────────────
  { key: 'da', id: 2015, ka: 'და', ru: 'и', unit: 5 },
  { key: 'mkvia', id: 2016, ka: 'მქვია', ru: 'меня зовут', unit: 5, note: 'Дословно «мне зовётся». Имя ставят перед ним: მე ნინო მქვია.', wikt: false },
  { key: 'gkvia', id: 2017, ka: 'გქვია', ru: 'тебя зовут', unit: 5, wikt: false },
  { key: 'gkviat', id: 2018, ka: 'გქვიათ', ru: 'вас зовут', unit: 5, wikt: false },
  { key: 'nino', id: 2019, ka: 'ნინო', ru: 'Нино (имя)', unit: 5, k: { erg: 'ნინომ', dat: 'ნინოს' }, wikt: false },
  { key: 'giorgi', id: 2020, ka: 'გიორგი', ru: 'Георгий (имя)', unit: 5, k: { erg: 'გიორგიმ', dat: 'გიორგის' }, wikt: false },
  { key: 'sasiamovnoa', id: 2021, ka: 'სასიამოვნოა', ru: 'очень приятно', unit: 5, note: 'Говорят при знакомстве.', wikt: false },
  { key: 'kartuli', id: 2022, ka: 'ქართული', ru: 'грузинский (язык)', unit: 5, acc: 'грузинский', gen: 'грузинского', g: 'm', k: { dat: 'ქართულს' } },
  { key: 'rusuli', id: 2023, ka: 'რუსული', ru: 'русский (язык)', unit: 5, acc: 'русский', gen: 'русского', g: 'm', k: { dat: 'რუსულს' } },
  { key: 'inglisuri', id: 2024, ka: 'ინგლისური', ru: 'английский (язык)', unit: 5, acc: 'английский', gen: 'английского', g: 'm', k: { dat: 'ინგლისურს' } },
  { key: 'tsota', id: 651, ka: 'ცოტა', ru: 'немного', unit: 5 },
  { key: 'turisti', id: 2025, ka: 'ტურისტი', ru: 'турист', unit: 5 },
  { key: 'studenti', id: 385, ka: 'სტუდენტი', ru: 'студент', unit: 5 },
  { key: 'ekimi', id: 81, ka: 'ექიმი', ru: 'врач', unit: 5, acc: 'врача', gen: 'врача', g: 'm', k: { tan: 'ექიმთან', erg: 'ექიმმა', dat: 'ექიმს' } },
  { key: 'mastsavlebeli', id: 384, ka: 'მასწავლებელი', ru: 'учитель', unit: 5 },
  { key: 'programisti', id: 2026, ka: 'პროგრამისტი', ru: 'программист', unit: 5 },
  { key: 'rusi', id: 2027, ka: 'რუსი', ru: 'русский (человек)', unit: 5 },
  { key: 'kartveli', id: 2028, ka: 'ქართველი', ru: 'грузин', unit: 5 },
  { key: 'utskhoeli', id: 2029, ka: 'უცხოელი', ru: 'иностранец', unit: 5 },
  { key: 'ruseti', id: 2030, ka: 'რუსეთი', ru: 'Россия', unit: 5, k: { shi: 'რუსეთში', dan: 'რუსეთიდან' } },
  { key: 'moskovi', id: 2031, ka: 'მოსკოვი', ru: 'Москва', unit: 5, k: { shi: 'მოსკოვში', dan: 'მოსკოვიდან' } },
  { key: 'saidan', id: 2032, ka: 'საიდან', ru: 'откуда', unit: 5 },
  { key: 'erti', id: 28, ka: 'ერთი', ru: 'один', unit: 5, k: { dat: 'ერთ' } },
  { key: 'ori', id: 29, ka: 'ორი', ru: 'два', unit: 5, k: { dat: 'ორ' } },
  { key: 'sami', id: 30, ka: 'სამი', ru: 'три', unit: 5, k: { dat: 'სამ' } },
  { key: 'otkhi', id: 31, ka: 'ოთხი', ru: 'четыре', unit: 5, k: { dat: 'ოთხ' } },
  { key: 'khuti', id: 32, ka: 'ხუთი', ru: 'пять', unit: 5, k: { dat: 'ხუთ' } },
  { key: 'ekvsi', id: 33, ka: 'ექვსი', ru: 'шесть', unit: 5, k: { dat: 'ექვს' } },
  { key: 'shvidi', id: 34, ka: 'შვიდი', ru: 'семь', unit: 5, k: { dat: 'შვიდ' } },
  { key: 'rva', id: 35, ka: 'რვა', ru: 'восемь', unit: 5 },
  { key: 'tskhra', id: 36, ka: 'ცხრა', ru: 'девять', unit: 5 },
  { key: 'ati', id: 37, ka: 'ათი', ru: 'десять', unit: 5, k: { dat: 'ათ' } },

  // ── Урок 6 ────────────────────────────────────────────────────────────────
  { key: 'vin', id: 38, ka: 'ვინ', ru: 'кто', unit: 6 },
  { key: 'ra', id: 39, ka: 'რა', ru: 'что', unit: 6, k: { dat: 'რას' } },
  { key: 'rodis', id: 41, ka: 'როდის', ru: 'когда', unit: 6 },
  { key: 'ratom', id: 42, ka: 'რატომ', ru: 'почему', unit: 6 },
  { key: 'rogor', id: 43, ka: 'როგორ', ru: 'как', unit: 6 },
  { key: 'ramdeni', id: 44, ka: 'რამდენი', ru: 'сколько', unit: 6 },
  { key: 'romeli', id: 2033, ka: 'რომელი', ru: 'который, какой', unit: 6, k: { dat: 'რომელ' } },
  { key: 'ghirs', id: 2034, ka: 'ღირს', ru: 'стоит', unit: 6, note: 'О цене: რა ღირს? — «сколько стоит?»', wikt: false },
  { key: 'khachapuri', id: 420, ka: 'ხაჭაპური', ru: 'хачапури', unit: 6, acc: 'хачапури', gen: 'хачапури', g: 'n', k: { dat: 'ხაჭაპურს' } },
  { key: 'qveli', id: 134, ka: 'ყველი', ru: 'сыр', unit: 6, acc: 'сыр', gen: 'сыра', g: 'm', k: { dat: 'ყველს' } },
  { key: 'khili', id: 120, ka: 'ხილი', ru: 'фрукты', unit: 6, acc: 'фрукты', gen: 'фруктов', g: 'pl', k: { dat: 'ხილს' } },
  { key: 'rame', id: 2035, ka: 'რამე', ru: 'что-нибудь', unit: 6, acc: 'что-нибудь', gen: 'чего-нибудь', g: 'n' },
  { key: 'araperi', id: 657, ka: 'არაფერი', ru: 'ничего', unit: 6, note: 'Глагол всё равно получает своё არ: არაფერი არ მინდა — «ничего не хочу».' },
  { key: 'qvelaperi', id: 2036, ka: 'ყველაფერი', ru: 'всё', unit: 6, acc: 'всё', gen: 'всего', g: 'n', k: { dat: 'ყველაფერს' } },

  // ── Урок 7 ────────────────────────────────────────────────────────────────
  { key: 'maghazia', id: 289, ka: 'მაღაზია', ru: 'магазин', unit: 7, k: { shi: 'მაღაზიაში', dan: 'მაღაზიიდან' } },
  { key: 'bazari', id: 290, ka: 'ბაზარი', ru: 'рынок', unit: 7, k: { shi: 'ბაზარში', dan: 'ბაზრიდან' } },
  { key: 'skola', id: 298, ka: 'სკოლა', ru: 'школа', unit: 7, k: { shi: 'სკოლაში', dan: 'სკოლიდან' } },
  { key: 'restorani', id: 299, ka: 'რესტორანი', ru: 'ресторан', unit: 7, k: { shi: 'რესტორანში' } },
  { key: 'kafe', id: 300, ka: 'კაფე', ru: 'кафе', unit: 7, k: { shi: 'კაფეში' } },
  { key: 'aeroporti', id: 406, ka: 'აეროპორტი', ru: 'аэропорт', unit: 7, k: { shi: 'აეროპორტში', dan: 'აეროპორტიდან' } },
  { key: 'sastumro', id: 301, ka: 'სასტუმრო', ru: 'гостиница', unit: 7, k: { shi: 'სასტუმროში' } },
  { key: 'tsentri', id: 519, ka: 'ცენტრი', ru: 'центр', unit: 7, k: { shi: 'ცენტრში' } },
  { key: 'zghva', id: 204, ka: 'ზღვა', ru: 'море', unit: 7, acc: 'море', gen: 'моря', g: 'n', k: { ze: 'ზღვაზე', dat: 'ზღვას' } },
  { key: 'mta', id: 202, ka: 'მთა', ru: 'гора, горы', unit: 7, k: { shi: 'მთაში' } },
  { key: 'sopeli', id: 294, ka: 'სოფელი', ru: 'деревня', unit: 7, k: { shi: 'სოფელში' } },
  { key: 'parki', id: 302, ka: 'პარკი', ru: 'парк', unit: 7, k: { shi: 'პარკში' } },
  { key: 'kucha', id: 296, ka: 'ქუჩა', ru: 'улица', unit: 7, k: { shi: 'ქუჩაში' } },
  { key: 'metro', id: 256, ka: 'მეტრო', ru: 'метро', unit: 7, k: { ins: 'მეტროთი' } },
  { key: 'avtobusi', id: 254, ka: 'ავტობუსი', ru: 'автобус', unit: 7, acc: 'автобус', gen: 'автобуса', g: 'm', k: { ins: 'ავტობუსით', dat: 'ავტობუსს' } },
  { key: 'taksi', id: 257, ka: 'ტაქსი', ru: 'такси', unit: 7, acc: 'такси', gen: 'такси', g: 'n', k: { ins: 'ტაქსით', dat: 'ტაქსის' } },
  { key: 'mankana', id: 253, ka: 'მანქანა', ru: 'машина', unit: 7, acc: 'машину', gen: 'машины', g: 'f', k: { ins: 'მანქანით', dat: 'მანქანას', gen: 'მანქანის' } },
  { key: 'pekhit', id: 429, ka: 'ფეხით', ru: 'пешком', unit: 7, wikt: 'ფეხი' },
  { key: 'megobari', id: 8, ka: 'მეგობარი', ru: 'друг', unit: 7, acc: 'друга', gen: 'друга', g: 'm', k: { tan: 'მეგობართან', dat: 'მეგობარს', gen: 'მეგობრის', erg: 'მეგობარმა', pl: 'მეგობრები' } },
  { key: 'chemtan', id: 2037, ka: 'ჩემთან', ru: 'ко мне, у меня', unit: 7, wikt: false },
  { key: 'shentan', id: 2038, ka: 'შენთან', ru: 'к тебе, у тебя', unit: 7, wikt: false },
  { key: 'chventan', id: 2039, ka: 'ჩვენთან', ru: 'к нам, у нас', unit: 7, wikt: false },
  { key: 'ertad', id: 2040, ka: 'ერთად', ru: 'вместе', unit: 7 },
  { key: 'shors', id: 668, ka: 'შორს', ru: 'далеко', unit: 7 },
  { key: 'akhlos', id: 667, ka: 'ახლოს', ru: 'близко', unit: 7 },

  // ── Урок 8 ────────────────────────────────────────────────────────────────
  { key: 'chemi', id: 2041, ka: 'ჩემი', ru: 'мой', unit: 8, k: { dat: 'ჩემს', erg: 'ჩემმა' } },
  { key: 'sheni', id: 2042, ka: 'შენი', ru: 'твой', unit: 8, k: { dat: 'შენს', erg: 'შენმა' } },
  { key: 'misi', id: 2043, ka: 'მისი', ru: 'его, её', unit: 8, k: { dat: 'მის', erg: 'მისმა' } },
  { key: 'chveni', id: 2044, ka: 'ჩვენი', ru: 'наш', unit: 8, k: { dat: 'ჩვენს', erg: 'ჩვენმა' } },
  { key: 'tkveni', id: 2045, ka: 'თქვენი', ru: 'ваш', unit: 8, k: { dat: 'თქვენს', erg: 'თქვენმა' } },
  { key: 'mati', id: 2046, ka: 'მათი', ru: 'их', unit: 8, k: { erg: 'მათმა' } },
  { key: 'visi', id: 2047, ka: 'ვისი', ru: 'чей', unit: 8, wikt: 'ვინ' },
  { key: 'deda', id: 61, ka: 'დედა', ru: 'мама', unit: 8, acc: 'маму', gen: 'мамы', g: 'f', k: { dat: 'დედას', gen: 'დედის', erg: 'დედამ', tan: 'დედასთან' } },
  { key: 'mama', id: 62, ka: 'მამა', ru: 'папа', unit: 8, acc: 'папу', gen: 'папы', g: 'm', k: { dat: 'მამას', gen: 'მამის', erg: 'მამამ', tan: 'მამასთან' } },
  { key: 'dedachemi', id: 2106, ka: 'დედაჩემი', ru: 'моя мама', unit: 8, note: 'Про своих маму и папу говорят слитно: დედაჩემი, მამაჩემი. ჩემი დედა тоже верно, но так говорят реже.', k: { dat: 'დედაჩემს', erg: 'დედაჩემმა' }, wikt: false },
  { key: 'mamachemi', id: 2107, ka: 'მამაჩემი', ru: 'мой папа', unit: 8, k: { dat: 'მამაჩემს', erg: 'მამაჩემმა' }, wikt: false },
  { key: 'dzma', id: 84, ka: 'ძმა', ru: 'брат', unit: 8, acc: 'брата', gen: 'брата', g: 'm', k: { dat: 'ძმას', gen: 'ძმის', erg: 'ძმამ' } },
  { key: 'da2', id: 85, ka: 'და', ru: 'сестра', unit: 8, acc: 'сестру', gen: 'сестры', g: 'f', note: 'Пишется так же, как «и». Смысл виден по месту в предложении.', k: { dat: 'დას', gen: 'დის', erg: 'დამ' } },
  { key: 'shvili', id: 88, ka: 'შვილი', ru: 'ребёнок (сын, дочь)', unit: 8, acc: 'ребёнка', gen: 'ребёнка', g: 'm', k: { dat: 'შვილს', pl: 'შვილები' } },
  { key: 'bavshvi', id: 60, ka: 'ბავშვი', ru: 'ребёнок', unit: 8, acc: 'ребёнка', gen: 'ребёнка', g: 'm', k: { dat: 'ბავშვს', erg: 'ბავშვმა', pl: 'ბავშვები' } },
  { key: 'tsoli', id: 94, ka: 'ცოლი', ru: 'жена', unit: 8, acc: 'жену', gen: 'жены', g: 'f', k: { dat: 'ცოლს', gen: 'ცოლის', erg: 'ცოლმა' } },
  { key: 'kmari', id: 95, ka: 'ქმარი', ru: 'муж', unit: 8, acc: 'мужа', gen: 'мужа', g: 'm', k: { dat: 'ქმარს', gen: 'ქმრის', erg: 'ქმარმა' } },
  { key: 'ojakhi', id: 83, ka: 'ოჯახი', ru: 'семья', unit: 8, acc: 'семью', gen: 'семьи', g: 'f', k: { dat: 'ოჯახს' } },
  { key: 'dzaghli', id: 187, ka: 'ძაღლი', ru: 'собака', unit: 8, acc: 'собаку', gen: 'собаки', g: 'f', k: { dat: 'ძაღლს' } },
  { key: 'kata', id: 188, ka: 'კატა', ru: 'кошка', unit: 8, acc: 'кошку', gen: 'кошки', g: 'f', k: { dat: 'კატას' } },
  { key: 'bina', id: 2048, ka: 'ბინა', ru: 'квартира', unit: 8, acc: 'квартиру', gen: 'квартиры', g: 'f', k: { dat: 'ბინას', shi: 'ბინაში' } },
  { key: 'otakhi', id: 140, ka: 'ოთახი', ru: 'комната', unit: 8, k: { shi: 'ოთახში' } },
  { key: 'pilmi', id: 2049, ka: 'ფილმი', ru: 'фильм', unit: 8, acc: 'фильм', gen: 'фильма', g: 'm', k: { dat: 'ფილმს' } },

  // ── Урок 9 ────────────────────────────────────────────────────────────────
  { key: 'didi', id: 79, ka: 'დიდი', ru: 'большой', unit: 9, k: { dat: 'დიდ', erg: 'დიდმა', cop: 'დიდია' } },
  { key: 'patara', id: 80, ka: 'პატარა', ru: 'маленький', unit: 9, note: 'Кончается на -ა, поэтому перед любым словом остаётся как есть.', k: { cop: 'პატარაა' } },
  { key: 'tsudi', id: 78, ka: 'ცუდი', ru: 'плохой', unit: 9, k: { dat: 'ცუდ', cop: 'ცუდია' } },
  { key: 'akhali', id: 317, ka: 'ახალი', ru: 'новый', unit: 9, k: { dat: 'ახალ', cop: 'ახალია' } },
  { key: 'dzveli', id: 318, ka: 'ძველი', ru: 'старый', unit: 9, k: { dat: 'ძველ', cop: 'ძველია' } },
  { key: 'lamazi', id: 334, ka: 'ლამაზი', ru: 'красивый', unit: 9, k: { dat: 'ლამაზ', cop: 'ლამაზია' } },
  { key: 'dzviri', id: 2050, ka: 'ძვირი', ru: 'дорогой', unit: 9, k: { dat: 'ძვირ', cop: 'ძვირია' } },
  { key: 'iapi', id: 2051, ka: 'იაფი', ru: 'дешёвый', unit: 9, k: { dat: 'იაფ', cop: 'იაფია' } },
  { key: 'tskheli', id: 217, ka: 'ცხელი', ru: 'горячий', unit: 9, k: { dat: 'ცხელ', cop: 'ცხელია' } },
  { key: 'tsivi', id: 218, ka: 'ცივი', ru: 'холодный', unit: 9, k: { dat: 'ცივ', cop: 'ცივია' } },
  { key: 'gemrieli', id: 338, ka: 'გემრიელი', ru: 'вкусный', unit: 9, k: { dat: 'გემრიელ', cop: 'გემრიელია' } },
  { key: 'dzalian', id: 786, ka: 'ძალიან', ru: 'очень', unit: 9 },
  { key: 'upro', id: 2052, ka: 'უფრო', ru: 'более, -ее', unit: 9, note: 'Ставится перед словом: უფრო დიდი — «больше», უფრო იაფი — «дешевле».' },
  { key: 'qvelaze', id: 2053, ka: 'ყველაზე', ru: 'самый', unit: 9, note: 'ყველაზე კარგი — «самый хороший, лучший».' },
  { key: 'bevri', id: 652, ka: 'ბევრი', ru: 'много', unit: 9, k: { dat: 'ბევრ', adv: 'ბევრს' } },
  { key: 'magram', id: 489, ka: 'მაგრამ', ru: 'но', unit: 9 },
  { key: 'khortsi', id: 115, ka: 'ხორცი', ru: 'мясо', unit: 9, acc: 'мясо', gen: 'мяса', g: 'n', k: { dat: 'ხორცს' } },
  { key: 'tevzi', id: 116, ka: 'თევზი', ru: 'рыба', unit: 9, acc: 'рыбу', gen: 'рыбы', g: 'f', k: { dat: 'თევზს' } },
  { key: 'ludi', id: 138, ka: 'ლუდი', ru: 'пиво', unit: 9, acc: 'пиво', gen: 'пива', g: 'n', k: { dat: 'ლუდს' } },
  { key: 'tsveni', id: 139, ka: 'წვენი', ru: 'сок', unit: 9, acc: 'сок', gen: 'сока', g: 'm', k: { dat: 'წვენს' } },
  { key: 'rdze', id: 114, ka: 'რძე', ru: 'молоко', unit: 9, acc: 'молоко', gen: 'молока', g: 'n', k: { dat: 'რძეს' } },
  { key: 'khinkali', id: 419, ka: 'ხინკალი', ru: 'хинкали', unit: 9, acc: 'хинкали', gen: 'хинкали', g: 'pl', k: { dat: 'ხინკალს' } },
  { key: 'salati', id: 2054, ka: 'სალათი', ru: 'салат', unit: 9, acc: 'салат', gen: 'салата', g: 'm', k: { dat: 'სალათს' } },
  { key: 'supi', id: 119, ka: 'სუპი', ru: 'суп', unit: 9, acc: 'суп', gen: 'супа', g: 'm', k: { dat: 'სუპს' } },

  // ── Урок 10 ───────────────────────────────────────────────────────────────
  { key: 'man', id: 2055, ka: 'მან', ru: 'он, она (сделал)', unit: 10, note: 'Особая форма от ის — для того, кто совершил действие в прошлом.', wikt: 'ის' },
  { key: 'ukve', id: 2056, ka: 'უკვე', ru: 'уже', unit: 10 },
  { key: 'jer', id: 2057, ka: 'ჯერ', ru: 'пока, ещё', unit: 10, note: 'ჯერ არ — «ещё не»: ჯერ არ ვიცი — «пока не знаю».' },
  { key: 'adre', id: 466, ka: 'ადრე', ru: 'раньше, рано', unit: 10 },
  { key: 'didkhans', id: 2105, ka: 'დიდხანს', ru: 'долго', unit: 10 },

  // ── Урок 11 ───────────────────────────────────────────────────────────────
  { key: 'tertmeti', id: 238, ka: 'თერთმეტი', ru: 'одиннадцать', unit: 11 },
  { key: 'tormeti', id: 239, ka: 'თორმეტი', ru: 'двенадцать', unit: 11 },
  { key: 'tsameti', id: 240, ka: 'ცამეტი', ru: 'тринадцать', unit: 11 },
  { key: 'totkhmeti', id: 241, ka: 'თოთხმეტი', ru: 'четырнадцать', unit: 11 },
  { key: 'tkhutmeti', id: 242, ka: 'თხუთმეტი', ru: 'пятнадцать', unit: 11 },
  { key: 'tekvsmeti', id: 243, ka: 'თექვსმეტი', ru: 'шестнадцать', unit: 11 },
  { key: 'chvidmeti', id: 244, ka: 'ჩვიდმეტი', ru: 'семнадцать', unit: 11 },
  { key: 'tvrameti', id: 245, ka: 'თვრამეტი', ru: 'восемнадцать', unit: 11 },
  { key: 'tskhrameti', id: 246, ka: 'ცხრამეტი', ru: 'девятнадцать', unit: 11 },
  { key: 'otsi', id: 247, ka: 'ოცი', ru: 'двадцать', unit: 11, k: { dat: 'ოც' } },
  { key: 'otsdaerti', id: 2062, ka: 'ოცდაერთი', ru: 'двадцать один', unit: 11, note: 'Двадцать-и-один: ოც + და + ერთი.' },
  { key: 'otsdakhuti', id: 2063, ka: 'ოცდახუთი', ru: 'двадцать пять', unit: 11 },
  { key: 'otsdaati', id: 248, ka: 'ოცდაათი', ru: 'тридцать', unit: 11, note: 'Счёт двадцатками: тридцать — это «двадцать и десять».' },
  { key: 'ormotsi', id: 249, ka: 'ორმოცი', ru: 'сорок', unit: 11, note: '«Два раза по двадцать».' },
  { key: 'ormotsdaati', id: 250, ka: 'ორმოცდაათი', ru: 'пятьдесят', unit: 11, note: '«Сорок и десять».' },
  { key: 'samotsi', id: 2058, ka: 'სამოცი', ru: 'шестьдесят', unit: 11 },
  { key: 'samotsdaati', id: 2059, ka: 'სამოცდაათი', ru: 'семьдесят', unit: 11 },
  { key: 'otkhmotsi', id: 2060, ka: 'ოთხმოცი', ru: 'восемьдесят', unit: 11 },
  { key: 'otkhmotsdaati', id: 2061, ka: 'ოთხმოცდაათი', ru: 'девяносто', unit: 11 },
  { key: 'asi', id: 251, ka: 'ასი', ru: 'сто', unit: 11 },
  { key: 'lari', id: 549, ka: 'ლარი', ru: 'лари', unit: 11, k: { dat: 'ლარს', cop: 'ლარია' } },
  { key: 'saati', id: 221, ka: 'საათი', ru: 'час; часы', unit: 11, k: { cop: 'საათია', ze: 'საათზე' } },
  { key: 'tsuti', id: 220, ka: 'წუთი', ru: 'минута', unit: 11 },
  { key: 'dghe', id: 68, ka: 'დღე', ru: 'день', unit: 11 },
  { key: 'kvira', id: 222, ka: 'კვირა', ru: 'неделя', unit: 11 },
  { key: 'tve', id: 223, ka: 'თვე', ru: 'месяц', unit: 11 },
  { key: 'tseli', id: 224, ka: 'წელი', ru: 'год', unit: 11, k: { gen: 'წლის' } },
  { key: 'pasi', id: 291, ka: 'ფასი', ru: 'цена', unit: 11 },
  { key: 'barati', id: 495, ka: 'ბარათი', ru: 'карта', unit: 11, k: { ins: 'ბარათით' } },
  { key: 'naghdi', id: 496, ka: 'ნაღდი', ru: 'наличные', unit: 11, note: 'Говорят ნაღდი ფულით — «наличными деньгами».' },
  { key: 'angarishi', id: 413, ka: 'ანგარიში', ru: 'счёт', unit: 11, acc: 'счёт', gen: 'счёта', g: 'm', k: { dat: 'ანგარიშს' } },
  { key: 'khurda', id: 292, ka: 'ხურდა', ru: 'сдача, мелочь', unit: 11 },
  { key: 'mometsit', id: 2064, ka: 'მომეცით', ru: 'дайте мне', unit: 11, wikt: false },
  { key: 'mometsi', id: 2065, ka: 'მომეცი', ru: 'дай мне', unit: 11, wikt: false },

  // ── Урок 12 ───────────────────────────────────────────────────────────────
  { key: 'unda', id: 2066, ka: 'უნდა', ru: 'должен, надо', unit: 12, note: 'Не меняется по лицам. Кто должен — видно по глаголу после него.', wikt: false },
  { key: 'sheidzleba', id: 2067, ka: 'შეიძლება', ru: 'можно', unit: 12, wikt: false },
  { key: 'ver', id: 2068, ka: 'ვერ', ru: 'не (могу)', unit: 12, note: 'არ — «не делаю», ვერ — «не могу, не получается».' },

  // ── Урок 13 ───────────────────────────────────────────────────────────────
  { key: 'modi', id: 2069, ka: 'მოდი', ru: 'иди сюда', unit: 13, wikt: false },
  { key: 'modit', id: 2070, ka: 'მოდით', ru: 'идите сюда', unit: 13, wikt: false },
  { key: 'tsadi', id: 2071, ka: 'წადი', ru: 'иди, уходи', unit: 13, wikt: false },
  { key: 'tsadit', id: 2072, ka: 'წადით', ru: 'идите, уходите', unit: 13, wikt: false },
  { key: 'mitkhari', id: 2073, ka: 'მითხარი', ru: 'скажи мне', unit: 13, wikt: false },
  { key: 'mitkharit', id: 2074, ka: 'მითხარით', ru: 'скажите мне', unit: 13, wikt: false },
  { key: 'damekhmare', id: 2076, ka: 'დამეხმარე', ru: 'помоги мне', unit: 13, wikt: false },
  { key: 'damekhmaret', id: 2075, ka: 'დამეხმარეთ', ru: 'помогите мне', unit: 13, wikt: false },
  { key: 'machvenet', id: 2077, ka: 'მაჩვენეთ', ru: 'покажите мне', unit: 13, wikt: false },
  { key: 'moitsade', id: 2079, ka: 'მოიცადე', ru: 'подожди', unit: 13, wikt: false },
  { key: 'moitsadet', id: 2078, ka: 'მოიცადეთ', ru: 'подождите', unit: 13, wikt: false },
  { key: 'gaacheret', id: 2080, ka: 'გააჩერეთ', ru: 'остановите', unit: 13, wikt: false },
  { key: 'nu', id: 2081, ka: 'ნუ', ru: 'не (запрет)', unit: 13 },
  { key: 'nela', id: 2082, ka: 'ნელა', ru: 'медленно', unit: 13 },
  { key: 'chkara', id: 2085, ka: 'ჩქარა', ru: 'быстро', unit: 13 },
  { key: 'kidev', id: 2083, ka: 'კიდევ', ru: 'ещё', unit: 13 },
  { key: 'ertkhel', id: 2084, ka: 'ერთხელ', ru: 'один раз', unit: 13 },

  // ── Урок 14 ───────────────────────────────────────────────────────────────
  { key: 'rom', id: 492, ka: 'რომ', ru: 'что (союз)', unit: 14 },
  { key: 'imitom', id: 2086, ka: 'იმიტომ', ru: 'потому', unit: 14, note: 'იმიტომ რომ — «потому что».' },
  { key: 'amitom', id: 2088, ka: 'ამიტომ', ru: 'поэтому', unit: 14 },
  { key: 'tu', id: 2087, ka: 'თუ', ru: 'если; или', unit: 14, note: '«Если»; а в вопросе с выбором — «или»: ყავა თუ ჩაი?' },
  { key: 'rotsa', id: 491, ka: 'როცა', ru: 'когда (союз)', unit: 14 },
  { key: 'an', id: 490, ka: 'ან', ru: 'или', unit: 14 },
  { key: 'mets', id: 2108, ka: 'მეც', ru: 'я тоже', unit: 14, note: 'Хвостик -ც значит «тоже»: მე → მეც.', wikt: false },
  { key: 'mere', id: 2089, ka: 'მერე', ru: 'потом', unit: 14 },
  { key: 'albat', id: 486, ka: 'ალბათ', ru: 'наверное', unit: 14 },
  { key: 'ase', id: 2104, ka: 'ასე', ru: 'так', unit: 14 },
  { key: 'mgoni', id: 2090, ka: 'მგონი', ru: 'по-моему', unit: 14, wikt: false },
  { key: 'rasakvirvelia', id: 2091, ka: 'რასაკვირველია', ru: 'конечно', unit: 14, wikt: false },

  // ── Урок 15 ───────────────────────────────────────────────────────────────
  { key: 'aptiaki', id: 405, ka: 'აფთიაქი', ru: 'аптека', unit: 15, k: { shi: 'აფთიაქში' } },
  { key: 'tsamali', id: 507, ka: 'წამალი', ru: 'лекарство', unit: 15, acc: 'лекарство', gen: 'лекарства', g: 'n', k: { dat: 'წამალს' } },
  { key: 'tavi', id: 97, ka: 'თავი', ru: 'голова', unit: 15 },
  { key: 'mtkiva', id: 2094, ka: 'მტკივა', ru: 'у меня болит', unit: 15, wikt: false },
  { key: 'misamarti', id: 530, ka: 'მისამართი', ru: 'адрес', unit: 15, acc: 'адрес', gen: 'адреса', g: 'm', k: { dat: 'მისამართს' } },
  { key: 'kilo', id: 2095, ka: 'კილო', ru: 'кило', unit: 15 },
  { key: 'pomidori', id: 128, ka: 'პომიდორი', ru: 'помидор', unit: 15 },
  { key: 'menu', id: 412, ka: 'მენიუ', ru: 'меню', unit: 15 },
  { key: 'martskhniv', id: 74, ka: 'მარცხნივ', ru: 'налево', unit: 15 },
  { key: 'marjvniv', id: 73, ka: 'მარჯვნივ', ru: 'направо', unit: 15 },
  { key: 'pirdapir', id: 2096, ka: 'პირდაპირ', ru: 'прямо', unit: 15 },
  { key: 'sul', id: 2097, ka: 'სულ', ru: 'всего; совсем', unit: 15 },
  { key: 'tserili', id: 2098, ka: 'წერილი', ru: 'письмо', unit: 15, acc: 'письмо', gen: 'письма', g: 'n', k: { dat: 'წერილს' } },
  { key: 'mezobeli', id: 96, ka: 'მეზობელი', ru: 'сосед', unit: 15, k: { pl: 'მეზობლები' } },
  { key: 'arapris', id: 2099, ka: 'არაფრის', ru: 'не за что', unit: 15, wikt: 'არაფერი' },
  { key: 'gagimarjos', id: 2100, ka: 'გაგიმარჯოს', ru: 'здравствуй (в ответ)', unit: 15, note: 'Так отвечают на გამარჯობა.', wikt: false },

  // ── Урок 16 ───────────────────────────────────────────────────────────────
  { key: 'dila', id: 225, ka: 'დილა', ru: 'утро', unit: 16, k: { ins: 'დილით' } },
  { key: 'saghamo', id: 226, ka: 'საღამო', ru: 'вечер', unit: 16, k: { dat: 'საღამოს' } },
  { key: 'ghame', id: 69, ka: 'ღამე', ru: 'ночь', unit: 16, k: { ins: 'ღამით' } },
  { key: 'qoveldghe', id: 2101, ka: 'ყოველდღე', ru: 'каждый день', unit: 16 },
  { key: 'khshirad', id: 469, ka: 'ხშირად', ru: 'часто', unit: 16 },
  { key: 'zogjer', id: 472, ka: 'ზოგჯერ', ru: 'иногда', unit: 16 },
  { key: 'qoveltvis', id: 470, ka: 'ყოველთვის', ru: 'всегда', unit: 16 },
  { key: 'arasdros', id: 2102, ka: 'არასდროს', ru: 'никогда', unit: 16 },
  { key: 'gvian', id: 467, ka: 'გვიან', ru: 'поздно', unit: 16 },
  { key: 'mushaoba', id: 265, ka: 'მუშაობა', ru: 'работа (занятие)', unit: 16, acc: 'работу', gen: 'работы', g: 'f', k: { dat: 'მუშაობას' } },
  { key: 'shemdeg', id: 2103, ka: 'შემდეგ', ru: 'после, затем', unit: 16 },
];

export const LEX = new Map(LEXICON.map((l) => [l.key, l]));

export function lex(key: string): LexSrc {
  const l = LEX.get(key);
  if (!l) throw new Error(`Unknown lexeme key: ${key}`);
  return l;
}

/** A named surface of a word; the dictionary form when no form is asked for. */
export function surface(key: string, form?: KaForm): string {
  const l = lex(key);
  if (!form) return l.ka;
  const s = l.k?.[form];
  if (!s) throw new Error(`Lexeme ${key} has no "${form}" form`);
  return s;
}
