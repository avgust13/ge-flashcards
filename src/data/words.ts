import type { Category, Word, CategoryId } from '../types';

export const CATEGORIES: Category[] = [
  { id: 'all', ka: 'ყველა', ru: 'Все', emoji: '✦' },
  { id: 'family', ka: 'ოჯახი', ru: 'Семья', emoji: '👪' },
  { id: 'food', ka: 'საჭმელი', ru: 'Еда', emoji: '🍞' },
  { id: 'nature', ka: 'ბუნება', ru: 'Природа', emoji: '🌿' },
  { id: 'body', ka: 'სხეული', ru: 'Тело', emoji: '✋' },
  { id: 'colors', ka: 'ფერები', ru: 'Цвета', emoji: '🎨' },
  { id: 'animals', ka: 'ცხოველები', ru: 'Животные', emoji: '🐾' },
  { id: 'places', ka: 'ადგილები', ru: 'Места', emoji: '🏛' },
  { id: 'time', ka: 'დრო', ru: 'Время', emoji: '⏳' },
  { id: 'verbs', ka: 'ზმნები', ru: 'Глаголы', emoji: '➤' },
];

type Seed = readonly [string, string, string, CategoryId];

const SEED: readonly Seed[] = [
  ['წყალი', "ts'q'ali", 'вода', 'nature'],
  ['პური', "p'uri", 'хлеб', 'food'],
  ['სახლი', 'sakhli', 'дом', 'places'],
  ['ძაღლი', 'dzaghli', 'собака', 'animals'],
  ['კატა', "k'at'a", 'кошка', 'animals'],
  ['წიგნი', "ts'igni", 'книга', 'places'],
  ['მზე', 'mze', 'солнце', 'nature'],
  ['მთვარე', 'mtvare', 'луна', 'nature'],
  ['ხე', 'khe', 'дерево', 'nature'],
  ['ყვავილი', 'qvavili', 'цветок', 'nature'],
  ['გული', 'guli', 'сердце', 'body'],
  ['თვალი', 'tvali', 'глаз', 'body'],
  ['ხელი', 'kheli', 'рука', 'body'],
  ['ფეხი', 'pekhi', 'нога', 'body'],
  ['თავი', 'tavi', 'голова', 'body'],
  ['დედა', 'deda', 'мама', 'family'],
  ['მამა', 'mama', 'папа', 'family'],
  ['ბავშვი', 'bavshvi', 'ребёнок', 'family'],
  ['და', 'da', 'сестра', 'family'],
  ['ძმა', 'dzma', 'брат', 'family'],
  ['მეგობარი', 'megobari', 'друг', 'family'],
  ['სკოლა', "sk'ola", 'школа', 'places'],
  ['ქალაქი', 'kalaki', 'город', 'places'],
  ['სოფელი', 'sopeli', 'деревня', 'places'],
  ['ცა', 'tsa', 'небо', 'nature'],
  ['ღამე', 'ghame', 'ночь', 'time'],
  ['დღე', 'dghe', 'день', 'time'],
  ['წელი', "ts'eli", 'год', 'time'],
  ['დრო', 'dro', 'время', 'time'],
  ['დილა', 'dila', 'утро', 'time'],
  ['საღამო', 'saghamo', 'вечер', 'time'],
  ['კვირა', "k'vira", 'неделя', 'time'],
  ['წითელი', "ts'iteli", 'красный', 'colors'],
  ['ლურჯი', 'lurji', 'синий', 'colors'],
  ['მწვანე', "mts'vane", 'зелёный', 'colors'],
  ['ყვითელი', 'qviteli', 'жёлтый', 'colors'],
  ['შავი', 'shavi', 'чёрный', 'colors'],
  ['თეთრი', 'tetri', 'белый', 'colors'],
  ['ცხენი', 'tskheni', 'лошадь', 'animals'],
  ['ფრინველი', 'prinveli', 'птица', 'animals'],
  ['თევზი', 'tevzi', 'рыба', 'animals'],
  ['ძროხა', 'dzrokha', 'корова', 'animals'],
  ['ვაშლი', 'vashli', 'яблоко', 'food'],
  ['ყველი', 'qveli', 'сыр', 'food'],
  ['ღვინო', 'ghvino', 'вино', 'food'],
  ['ჩაი', 'chai', 'чай', 'food'],
  ['ყავა', 'qava', 'кофе', 'food'],
  ['რძე', 'rdze', 'молоко', 'food'],
  ['კვერცხი', "k'vertskhi", 'яйцо', 'food'],
  ['ხორცი', 'khortsi', 'мясо', 'food'],
  ['მთა', 'mta', 'гора', 'nature'],
  ['ზღვა', 'zghva', 'море', 'nature'],
  ['მდინარე', 'mdinare', 'река', 'nature'],
  ['ტყე', "t'qe", 'лес', 'nature'],
  ['სიყვარული', "siq'varuli", 'любовь', 'verbs'],
  ['სიცილი', 'sitsili', 'смех', 'verbs'],
  ['ცეკვა', "tsek'va", 'танец', 'verbs'],
  ['სიმღერა', 'simghera', 'песня', 'verbs'],
  ['ძილი', 'dzili', 'сон', 'verbs'],
  ['კითხვა', "k'itkhva", 'чтение', 'verbs'],
  ['წერა', "ts'era", 'письмо', 'verbs'],
];

export const SEED_COUNT = SEED.length;

function buildWords(): Word[] {
  const total = 800;
  const out: Word[] = [];
  for (let i = 0; i < total; i++) {
    const seed = SEED[i % SEED.length];
    const t = (i + Math.sin(i * 0.37) * 8) / total;
    let correct = Math.max(0, Math.min(1, t + (Math.random() - 0.5) * 0.18));
    correct = Math.pow(correct, 1.4);
    out.push({
      id: i,
      ka: seed[0],
      tr: seed[1],
      ru: seed[2],
      cat: seed[3],
      correct,
      seen: 4 + Math.floor(Math.random() * 40),
      isSeed: i < SEED.length,
    });
  }
  out.sort((a, b) =>
    a.isSeed === b.isSeed ? a.correct - b.correct : a.isSeed ? -1 : 1,
  );
  return out;
}

export const WORDS: Word[] = buildWords();

export const LETTER_MAP: Record<string, string> = {
  ა: 'а', ბ: 'б', გ: 'г', დ: 'д', ე: 'э', ვ: 'в',
  ზ: 'з', თ: 'т', ი: 'и', კ: 'к', ლ: 'л', მ: 'м',
  ნ: 'н', ო: 'о', პ: 'п', ჟ: 'ж', რ: 'р', ს: 'с',
  ტ: 'т', უ: 'у', ფ: 'ф', ქ: 'к', ღ: 'г', ყ: 'к',
  შ: 'ш', ჩ: 'ч', ც: 'ц', ძ: 'дз', წ: 'ц', ჭ: 'ч',
  ხ: 'х', ჯ: 'дж', ჰ: 'х',
};
