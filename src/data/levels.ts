import type { Word } from '../types';

export interface Level {
  id: number;
  key: string;
  name: string;
  ru: string;
  range: [number, number];
  color: string;
  tint: string;
  blurb: string;
  blurbRu: string;
  themes: string[];
  goal: string;
}

export const LEVELS: Level[] = [
  {
    id: 0,
    key: 'survival',
    name: 'Survival Core',
    ru: 'Основа выживания',
    range: [0, 100],
    color: '#FF6B47',
    tint: '#FFEFE6',
    blurb: 'The critical words for getting by from day one.',
    blurbRu: 'Самые критичные слова для выживания.',
    themes: ['да/нет', 'я/ты', 'быть/идти', 'числа', 'еда/вода', 'помощь', 'направления'],
    goal: 'Understand 20–30% of everyday situations.',
  },
  {
    id: 1,
    key: 'daily',
    name: 'Daily Life',
    ru: 'Повседневная жизнь',
    range: [100, 250],
    color: '#3B82F6',
    tint: '#E7F0FE',
    blurb: 'The most important layer — daily-life vocabulary.',
    blurbRu: 'Самая повседневная лексика — самый важный уровень.',
    themes: ['дом', 'семья', 'тело', 'одежда', 'еда', 'покупки', 'транспорт', 'погода'],
    goal: 'Read simple texts, speak in short phrases.',
  },
  {
    id: 2,
    key: 'interaction',
    name: 'Interaction Layer',
    ru: 'Слой общения',
    range: [250, 450],
    color: '#8B5CF6',
    tint: '#EFE9FE',
    blurb: 'Words to talk about feelings, opinions, and the world.',
    blurbRu: 'Слова, чтобы общаться и описывать мир.',
    themes: ['эмоции', 'мнения', 'работа', 'путешествия', 'ресторан', 'действия', 'прилагательные'],
    goal: 'The language starts to feel alive.',
  },
  {
    id: 3,
    key: 'functional',
    name: 'Functional Fluency',
    ru: 'Функциональная беглость',
    range: [450, 650],
    color: '#36B37E',
    tint: '#E8F7EF',
    blurb: 'Context, abstract ideas, real-world content.',
    blurbRu: 'Слова для понимания контекста и разговоров.',
    themes: ['здоровье', 'технологии', 'обучение', 'город', 'природа', 'деньги', 'абстракция'],
    goal: 'Watch content; understand most everyday dialogue.',
  },
  {
    id: 4,
    key: 'expansion',
    name: 'Expansion',
    ru: 'Расширение',
    range: [650, 800],
    color: '#D4A017',
    tint: '#FBF1D7',
    blurb: 'Rare-but-useful words. Synonyms, idioms, color.',
    blurbRu: 'Редкие, но полезные слова — синонимы, идиомы.',
    themes: ['синонимы', 'точные глаголы', 'разговорные', 'культурная лексика', 'идиомы'],
    goal: 'Natural speech — closer to a native ear.',
  },
];

export interface LevelStats {
  total: number;
  mastered: number;
  learning: number;
  weak: number;
  progress: number;
}

export function levelStats(levelId: number, words: Word[]): LevelStats {
  const slice = words.filter((w) => w.level === levelId);
  const mastered = slice.filter((w) => w.correct > 0.7).length;
  const learning = slice.filter((w) => w.correct > 0.3 && w.correct <= 0.7).length;
  const weak = slice.length - mastered - learning;
  const progress = slice.length === 0 ? 0 : mastered / slice.length;
  return { total: slice.length, mastered, learning, weak, progress };
}

export interface GlobalStats {
  explored: number;
  learning: number;
  mastered: number;
}

export function globalStats(words: Word[]): GlobalStats {
  let explored = 0;
  let learning = 0;
  let mastered = 0;
  for (const w of words) {
    if (w.seen > 0) explored++;
    if (w.correct > 0.7) mastered++;
    else if (w.correct > 0.3) learning++;
  }
  return { explored, learning, mastered };
}

export const CURRENT_LEVEL_ID = 1;
