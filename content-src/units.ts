/**
 * The course outline: 16 units. Each unit is an ordered list of steps; the
 * daily session introduces new cards strictly in this order, so a step may
 * only lean on what the steps before it have taught.
 */
import type { CardsStep, ExplainStep, Person, Screeve, Unit } from '../src/content/types';
import { cellCardId, wordCardId } from '../src/content/types';
import { lex } from './lexicon';
import { PATTERNS } from './patterns';

export { PATTERNS };

/**
 * An example under an explanation: literal text, a sentence of the bank
 * (`ref`), or a word of the lexicon (`w`). `who` names the speaker in a dialogue.
 */
export type ExampleSrc =
  | { ka: string; ru: string; who?: string }
  | { ref: string; who?: string }
  | { w: string; who?: string };
export interface ExplainSrc extends Omit<ExplainStep, 'examples'> {
  examples: ExampleSrc[];
}
export type UnitStepSrc = ExplainSrc | CardsStep;
export interface UnitSrc extends Omit<Unit, 'steps'> {
  steps: UnitStepSrc[];
}

const w = (...keys: string[]): string[] => keys.map((k) => wordCardId(lex(k).id));
const c = (verb: string, tense: Screeve, ...persons: Person[]): string[] =>
  persons.map((p) => cellCardId(verb, tense, p));
const s = (...ids: string[]): string[] => ids.map((id) => `s:${id}`);

const cards = (titleRu: string, ...groups: string[][]): UnitStepSrc => ({
  kind: 'cards',
  titleRu,
  cards: groups.flat(),
});
const explain = (id: string, titleRu: string, bodyRu: string[], examples: ExampleSrc[]): UnitStepSrc => ({
  kind: 'explain',
  id,
  titleRu,
  bodyRu,
  examples,
});
const r = (ref: string, who?: string): ExampleSrc => ({ ref, who });
const wd = (key: string, who?: string): ExampleSrc => ({ w: key, who });

const REST: Person[] = ['3sg', '1pl', '2pl', '3pl'];
const ALL: Person[] = ['1sg', '2sg', '3sg', '1pl', '2pl', '3pl'];
/** Persons whose past needs no special subject form: taught before unit 10. */
const SPEAKERS: Person[] = ['1sg', '2sg', '1pl', '2pl'];
const THIRD: Person[] = ['3sg', '3pl'];

const UNIT_1: UnitSrc = {
  id: 1,
  titleRu: 'Матрица: я и ты',
  goalRu: 'Сказать о действии в трёх временах, отрицать и спрашивать.',
  ready: true,
  steps: [
    {
      kind: 'explain',
      id: 'u1-matrix',
      titleRu: 'Одна форма — три предложения',
      bodyRu: [
        'Каркас языка — это глагол в трёх временах. В грузинском лицо («я», «ты») зашито в сам глагол: ვ- в начале значит «я». Местоимение можно не говорить.',
        'Будущее и прошедшее получаются приставкой — в точности как в русском «делаю → сделаю → сделал». У глагола «делать» это приставка გა-.',
        'Сейчас только «я» и «ты», зато сразу все три времени.',
      ],
      examples: [
        { ka: 'ვაკეთებ', ru: 'я делаю' },
        { ka: 'გავაკეთებ', ru: 'я сделаю' },
        { ka: 'გავაკეთე', ru: 'я сделал' },
        { ka: 'აკეთებ', ru: 'ты делаешь' },
      ],
    },
    cards('Я и ты', w('me', 'shen')),
    cards('Делать', c('do', 'prs', '1sg', '2sg'), c('do', 'fut', '1sg', '2sg'), c('do', 'aor', '1sg', '2sg')),
    {
      kind: 'explain',
      id: 'u1-negq',
      titleRu: 'Отрицание и вопрос',
      bodyRu: [
        'Чтобы сказать «не», перед глаголом ставят короткое არ. Больше ничего не меняется.',
        'Чтобы спросить, не меняют вообще ничего — только интонацию, как в русском «Ты работаешь?».',
        'Поэтому девять клеток матрицы — это всего три формы глагола.',
      ],
      examples: [
        { ka: 'ვაკეთებ.', ru: 'Я делаю.' },
        { ka: 'არ ვაკეთებ.', ru: 'Я не делаю.' },
        { ka: 'აკეთებ?', ru: 'Ты делаешь?' },
      ],
    },
    cards('Нет и вопрос', ['c:neg', 'c:q'], w('ki', 'ara')),
    cards('Когда', w('dghes', 'khval', 'gushin', 'akhla')),
    {
      kind: 'explain',
      id: 'u1-frame',
      titleRu: 'Второй способ: рамка ი- … -ებ',
      bodyRu: [
        'У глаголов-занятий («работать», «говорить», «жить») будущее строится не приставкой, а рамкой: в начало встаёт ი-, в конец -ებ.',
        'Прошедшее — та же рамка, но с -ე на конце. Значок «я» ვ- всегда остаётся первым.',
      ],
      examples: [
        { ka: 'ვმუშაობ', ru: 'я работаю' },
        { ka: 'ვიმუშავებ', ru: 'я буду работать' },
        { ka: 'ვიმუშავე', ru: 'я работал' },
      ],
    },
    cards('Работать', c('work', 'prs', '1sg', '2sg'), c('work', 'fut', '1sg', '2sg'), c('work', 'aor', '1sg', '2sg')),
    cards('Говорить', c('speak', 'prs', '1sg', '2sg'), c('speak', 'fut', '1sg', '2sg'), c('speak', 'aor', '1sg', '2sg')),
    cards('На каком языке', w('kartulad', 'rusulad', 'inglisurad')),
    cards(
      'Вежливые слова',
      w('gamarjoba', 'madloba', 'nakhvamdis', 'gtkhovt', 'bodishi', 'kargi'),
      s('ar-vitsi', 'ar-mesmis'),
    ),
  ],
};

const UNIT_2: UnitSrc = {
  id: 2,
  titleRu: 'Он, мы, вы, они',
  goalRu: 'Говорить о других людях: три окончания на все глаголы.',
  ready: true,
  steps: [
    {
      kind: 'explain',
      id: 'u2-persons',
      titleRu: 'Три окончания',
      bodyRu: [
        '«Он/она» — окончание -ს. «Мы» и «вы» — та же форма, что «я» и «ты», плюс -თ. «Они» — окончание -ენ.',
        'Значок «я» ვ- остаётся и у «мы». Так что «мы» = «я» + -თ, «вы» = «ты» + -თ.',
        'Прошедшее время у «он» и «они» требует особой формы подлежащего — её разберём позже. Пока «он» и «они» только в настоящем и будущем.',
      ],
      examples: [
        { ka: 'მუშაობს', ru: 'он работает' },
        { ka: 'ვმუშაობთ', ru: 'мы работаем' },
        { ka: 'მუშაობთ', ru: 'вы работаете' },
        { ka: 'მუშაობენ', ru: 'они работают' },
      ],
    },
    cards('Он, мы, вы, они', w('is', 'chven', 'tkven', 'isini')),
    cards('Работать: сейчас', c('work', 'prs', ...REST)),
    cards('Работать: потом и раньше', c('work', 'fut', ...REST), c('work', 'aor', '1pl', '2pl')),
    cards('Делать: сейчас', c('do', 'prs', ...REST)),
    cards('Делать: потом и раньше', c('do', 'fut', ...REST), c('do', 'aor', '1pl', '2pl')),
    cards('Говорить: сейчас', c('speak', 'prs', ...REST)),
    cards('Говорить: потом и раньше', c('speak', 'fut', ...REST), c('speak', 'aor', '1pl', '2pl')),
    cards('Спросить о делах', s('ras-aketeb')),
  ],
};

const UNIT_3: UnitSrc = {
  id: 3,
  titleRu: '«Быть» и «где»',
  goalRu: 'Сказать, где ты находишься и где живёшь.',
  ready: true,
  steps: [
    {
      kind: 'explain',
      id: 'u3-be',
      titleRu: 'Глагол «быть» не пропускают',
      bodyRu: [
        'По-русски мы говорим «я дома» без глагола. По-грузински глагол обязателен: «я дома есть».',
        'Глагол неправильный, его формы надо просто запомнить. Он стоит в конце.',
      ],
      examples: [
        { ka: 'აქ ვარ', ru: 'я здесь' },
        { ka: 'აქ ხარ?', ru: 'ты здесь?' },
        { ka: 'ის აქ არის', ru: 'он здесь' },
      ],
    },
    cards('Здесь и там', w('ak', 'ik')),
    cards('Быть: сейчас', c('be', 'prs', ...ALL)),
    {
      kind: 'explain',
      id: 'u3-shi',
      titleRu: 'Предлог после слова',
      bodyRu: [
        'В грузинском предлоги стоят не перед словом, а приклеиваются к его концу. «В» — это -ში.',
        'Конечное -ი у слова отпадает: სახლი «дом» → სახლში «в доме, дома».',
        'Если слово кончается на другую гласную, она остаётся: საქართველო → საქართველოში.',
      ],
      examples: [
        { ka: 'სახლში', ru: 'дома' },
        { ka: 'თბილისში', ru: 'в Тбилиси' },
        { ka: 'საქართველოში', ru: 'в Грузии' },
      ],
    },
    // Words before the pattern card: its example sentences need them.
    cards(
      'Где: -ში',
      w('sakhli', 'samsakhuri', 'tbilisi'),
      ['c:shi'],
      w('sakartvelo', 'kalaki', 'batumi'),
    ),
    cards('Быть: раньше', c('be', 'aor', ...ALL)),
    cards('Быть: потом', c('be', 'fut', ...ALL)),
    cards('Где? Как дела?', w('sad', 'kargad'), s('rogor-khar', 'kargad-var')),
    cards('Жить: сейчас', c('live', 'prs', ...ALL)),
    cards('Жить: потом и раньше', c('live', 'fut', ...ALL), c('live', 'aor', '1sg', '2sg', '1pl', '2pl')),
    {
      kind: 'explain',
      id: 'u3-ze',
      titleRu: '«На» — тоже хвостик',
      bodyRu: [
        '«На» — это -ზე. Он приклеивается так же, как -ში.',
        'Вопросительное слово стоит прямо перед глаголом: «телефон где есть?».',
      ],
      examples: [
        { ka: 'მაგიდაზე', ru: 'на столе' },
        { ka: 'ტელეფონი სად არის?', ru: 'Где телефон?' },
      ],
    },
    cards('На столе', w('magida', 'telefoni', 'gasaghebi', 'tsigni'), ['c:ze']),
  ],
};

const UNIT_4: UnitSrc = {
  id: 4,
  titleRu: 'Глаголы «мне…»',
  goalRu: 'Сказать, что ты хочешь, что у тебя есть, что нужно и что нравится.',
  ready: true,
  steps: [
    {
      kind: 'explain',
      id: 'u4-dative',
      titleRu: 'Как русское «мне хочется»',
      bodyRu: [
        '«Хочу», «у меня есть», «нужно», «нравится», «люблю» по-грузински устроены как русское «мне хочется»: человек стоит не в роли «я», а в роли «мне».',
        'Поэтому вместо ვ- в начале глагола появляется მ- — «мне». «Тебе» — это გ-.',
        'То, чего хочется, стоит в обычной словарной форме и идёт перед глаголом.',
      ],
      examples: [
        { ka: 'ყავა მინდა', ru: 'я хочу кофе' },
        { ka: 'ყავა გინდა?', ru: 'ты хочешь кофе?' },
        { ka: 'დრო არ მაქვს', ru: 'у меня нет времени' },
      ],
    },
    // Objects before the verb cells: every example sentence needs one.
    cards('Хотеть', w('qava', 'chai', 'tsqali'), c('want', 'prs', '1sg', '2sg'), w('ghvino', 'puri', 'es')),
    cards('Иметь', w('dro', 'puli'), c('have', 'prs', '1sg', '2sg'), w('bileti', 'kitkhva')),
    cards('Нужно, нравится, люблю', c('need', 'prs', '1sg', '2sg'), c('like', 'prs', '1sg', '2sg'), c('love', 'prs', '1sg', '2sg')),
    {
      kind: 'explain',
      id: 'u4-persons',
      titleRu: 'Ему, нам, вам, им',
      bodyRu: [
        '«Нам» — приставка გვ-. «Вам» — как «тебе», но с -თ на конце. «Им» — как «ему», тоже с -თ.',
        'У «ему» приставка зависит от глагола: უ- (უნდა), ა- (აქვს) или ს- (სჭირდება, მოსწონს). Их запоминают по глаголам.',
        'Местоимения «он» и «они» здесь тоже стоят в роли «ему» и «им»: მას и მათ.',
      ],
      examples: [
        { ka: 'მას ყავა უნდა', ru: 'он хочет кофе' },
        { ka: 'ჩვენ დრო გვაქვს', ru: 'у нас есть время' },
        { ka: 'ყავა გინდათ?', ru: 'вы хотите кофе?' },
      ],
    },
    cards('Ему и им', w('mas', 'mat')),
    cards('Хотеть: все', c('want', 'prs', ...REST)),
    cards('Иметь: все', c('have', 'prs', ...REST)),
    cards('Нужно: все', c('need', 'prs', ...REST)),
    cards('Нравится и люблю: все', c('like', 'prs', ...REST), c('love', 'prs', ...REST)),
  ],
};

const UNIT_5: UnitSrc = {
  id: 5,
  titleRu: 'Рассказ о себе',
  goalRu: 'Связно рассказать, кто ты, откуда и что знаешь.',
  ready: true,
  steps: [
    explain(
      'u5-self',
      'Кто я и откуда',
      [
        'Новой грамматики в этом уроке нет: из того, что уже есть, собираем рассказ о себе.',
        '«Меня зовут» — это მქვია, дословно «мне зовётся». Имя ставят перед ним.',
        'Кто ты по профессии или откуда — снова глагол «быть» в конце: ტურისტი ვარ.',
      ],
      [r('me-mkvia'), r('u5.turisti'), r('rusetidan-var'), r('u5.moskovi')],
    ),
    cards('Знакомство', w('mkvia', 'gkvia', 'gkviat'), s('ra-gkvia', 'me-mkvia', 'ra-gkviat'), w('sasiamovnoa', 'giorgi', 'nino')),
    cards('Кто я', w('turisti', 'studenti', 'programisti', 'ekimi', 'mastsavlebeli')),
    cards('Откуда', w('ruseti', 'moskovi', 'saidan'), s('saidan-khar', 'rusetidan-var'), w('rusi', 'kartveli', 'utskhoeli', 'da')),
    explain(
      'u5-know',
      'Знаю и понимаю',
      [
        '«Знать» — неправильный глагол, но короткий: ვიცი, იცი, იცის.',
        '«Понимаю» устроено как «мне понятно»: მესმის, გესმის — та же приставка მ- / გ-, что у მინდა.',
        'Язык, который знаешь или понимаешь, стоит в словарной форме.',
      ],
      [
        { ka: 'ქართული ვიცი', ru: 'я знаю грузинский' },
        { ka: 'რუსული იცი?', ru: 'ты знаешь русский?' },
        { ka: 'ქართული მესმის', ru: 'я понимаю по-грузински' },
      ],
    ),
    cards('Языки', w('kartuli', 'rusuli', 'inglisuri', 'tsota')),
    cards('Знать', c('know', 'prs', ...ALL)),
    cards('Понимать', c('understand', 'prs', ...ALL)),
    cards('Числа 1–5', w('erti', 'ori', 'sami', 'otkhi', 'khuti')),
    cards('Числа 6–10', w('ekvsi', 'shvidi', 'rva', 'tskhra', 'ati')),
  ],
};

const UNIT_6: UnitSrc = {
  id: 6,
  titleRu: 'Вопросительные слова',
  goalRu: 'Спросить кто, что, когда, почему, как и сколько.',
  ready: true,
  steps: [
    explain(
      'u6-qwords',
      'Вопросительное слово — перед глаголом',
      [
        'Вопросительное слово стоит прямо перед глаголом, а не в начале, как по-русски: «это что есть?».',
        'Если есть «не», оно остаётся между вопросом и глаголом: რატომ არ მუშაობ?',
      ],
      [r('u6.ra-aris'), r('u6.vin-aris'), r('u6.ratom-ar-mushaob')],
    ),
    cards('Кто и что', w('vin', 'ra')),
    cards('Когда, почему, как', w('rodis', 'ratom', 'rogor')),
    cards('Сколько и который', w('ramdeni', 'romeli', 'ghirs'), s('ra-ghirs', 'es-ra-ghirs')),
    explain(
      'u6-dat',
      'Что делаю: -ს',
      [
        'До сих пор у действий не было «что». Теперь будет: «делаю чай», «покупаю хлеб».',
        'В настоящем и будущем это «что» получает -ს на конце: ჩაის ვაკეთებ. Поэтому и «что?» — не რა, а რას.',
        'В прошедшем -ს не нужно, слово стоит как в словаре: ჩაი გავაკეთე.',
      ],
      [r('u6.ras-aketeb'), r('u6.chais-vaketeb'), r('u6.chai-gavakete')],
    ),
    cards('Что делаю: -ს', ['c:dat']),
    cards('Учить: сейчас', c('learn', 'prs', ...ALL)),
    cards('Учить: потом и раньше', c('learn', 'fut', ...ALL), c('learn', 'aor', ...SPEAKERS)),
    cards('Покупать: сейчас', c('buy', 'prs', ...ALL)),
    cards('Еда', w('khachapuri', 'qveli', 'khili')),
    cards('Покупать: потом и раньше', c('buy', 'fut', ...ALL), c('buy', 'aor', ...SPEAKERS)),
    cards('Что-нибудь, ничего, всё', w('rame', 'araperi', 'qvelaperi')),
  ],
};

const UNIT_7: UnitSrc = {
  id: 7,
  titleRu: 'Движение',
  goalRu: 'Идти туда и сюда; откуда, куда, к кому и на чём.',
  ready: true,
  steps: [
    explain(
      'u7-go',
      'Туда и сюда',
      [
        'Направление зашито в приставку глагола. მი- и წა- — «туда, прочь от меня»; მო- — «сюда, ко мне».',
        '«Куда» отвечает то же -ში, что и «где»: სახლში — и «дома», и «домой». И вопрос один: სად?',
        'Глагол неправильный. В настоящем — მივდივარ, а «пойду» и «пошёл» — с приставкой წა-: წავალ, წავედი.',
        'Он годится для любого способа: и «иду», и «еду».',
      ],
      [
        { ka: 'სახლში მივდივარ', ru: 'я иду домой' },
        { ka: 'ხვალ წავალ', ru: 'завтра я пойду' },
        { ka: 'გუშინ წავედი', ru: 'вчера я пош{ёл|ла}' },
      ],
    ),
    cards('Идти: сейчас', c('go', 'prs', ...ALL)),
    cards('Куда', w('maghazia', 'bazari', 'kafe', 'restorani', 'tsentri')),
    cards('Идти: потом', c('go', 'fut', ...ALL)),
    cards('Идти: раньше', c('go', 'aor', ...ALL)),
    explain(
      'u7-come',
      'Сюда: მო-',
      [
        'Тот же глагол с приставкой მო- — «иду сюда, прихожу». Формы те же, меняется только начало.',
        'У «ты» и «вы» в середине появляется ხ: მოდიხარ, მოხვალ, მოხვედი.',
      ],
      [
        { ka: 'აქ მოვდივარ', ru: 'я иду сюда' },
        { ka: 'ხვალ მოვალ', ru: 'завтра я приду' },
        { ka: 'მოხვალ?', ru: 'ты придёшь?' },
      ],
    ),
    cards('Приходить: сейчас', c('come', 'prs', ...ALL)),
    explain(
      'u7-dan',
      'Откуда: -დან',
      [
        '«Из, от» — хвостик -დან. Конечное -ი слова остаётся: თბილისი → თბილისიდან.',
        'Конечное -ა сменяется на -ი: სკოლა → სკოლიდან.',
      ],
      [r('u7.tbilisidan-var'), r('u7.rusetidan-khar')],
    ),
    cards('Откуда: -დან', ['c:dan'], w('aeroporti', 'skola', 'sastumro')),
    cards('Приходить: потом', c('come', 'fut', ...ALL)),
    cards('Приходить: раньше', c('come', 'aor', ...ALL)),
    explain(
      'u7-tan',
      'К кому: -თან',
      [
        'К человеку идут не «в», а «к»: -თან. Он же значит «у кого-то»: მეგობართან ვარ — «я у друга».',
        '«Ко мне, у меня» — одно слово ჩემთან; «к тебе» — შენთან.',
      ],
      [r('u7.megobartan-var'), { ka: 'ჩემთან მოდიხარ?', ru: 'ты идёшь ко мне?' }],
    ),
    cards('К кому: -თან', w('megobari'), ['c:tan'], w('chemtan', 'shentan', 'chventan')),
    explain(
      'u7-it',
      'На чём: -ით',
      ['Транспорт получает -ით: ტაქსით — «на такси». «Пешком» — отдельное слово ფეხით, дословно «ногой».'],
      [r('u7.taksit-mivdivar'), r('u7.pekhit')],
    ),
    cards('На чём', w('taksi', 'avtobusi', 'metro', 'mankana'), ['c:it'], w('pekhit')),
    cards('Где ещё бывают', w('zghva', 'mta', 'sopeli', 'parki', 'kucha')),
    cards('Вместе, далеко, близко', w('ertad', 'shors', 'akhlos')),
  ],
};

const UNIT_8: UnitSrc = {
  id: 8,
  titleRu: 'Мой, твой; семья',
  goalRu: 'Сказать, чьё это, и рассказать о семье.',
  ready: true,
  steps: [
    explain(
      'u8-poss',
      'Мой, твой, наш',
      [
        '«Мой» — ჩემი, «твой» — შენი, «наш» — ჩვენი. Они стоят перед словом, как по-русски.',
        'Рода нет: ჩემი — и «мой», и «моя», и «моё».',
        'Только про своих маму и папу обычно говорят одним словом, где «мой» стоит в конце: დედაჩემი, მამაჩემი.',
      ],
      [r('u8.chemi-megobari'), r('u8.chveni-sakhli'), r('u8.sheni-dzma-q')],
    ),
    cards('Мой, твой, его', w('chemi', 'sheni', 'misi')),
    cards('Наш, ваш, их, чей', w('chveni', 'tkveni', 'mati', 'visi')),
    cards('Семья', w('deda', 'mama', 'dedachemi', 'mamachemi', 'dzma', 'da2')),
    explain(
      'u8-havea',
      'У меня есть брат: მყავს',
      [
        'Про вещи говорят მაქვს. Про людей, животных и машину — другим глаголом: მყავს.',
        'Он тоже из семьи «мне…»: მყავს, გყავს, ჰყავს, გვყავს.',
        'После числа слово остаётся в единственном числе: ორი შვილი — «двое детей».',
      ],
      [
        { ka: 'მეგობარი მყავს', ru: 'у меня есть друг' },
        { ka: 'მანქანა გყავს?', ru: 'у тебя есть машина?' },
      ],
    ),
    cards('У меня есть (кто-то)', c('havea', 'prs', ...ALL)),
    cards('Жена, муж, дети', w('tsoli', 'kmari', 'shvili', 'bavshvi', 'ojakhi')),
    explain(
      'u8-possdat',
      'Мой → ჩემს',
      [
        'Когда слово получает -ს или послелог (-ში, -ზე, -თან), «мой» перед ним тоже получает -ს: ჩემს სახლში — «в моём доме».',
        'То же с глаголами «мне…»: тот, кому хочется, стоит с -ს — ჩემს მეგობარს ყავა უნდა.',
      ],
      [r('u8.chems-sakhlshi'), r('u8.chems-megobars-unda')],
    ),
    cards('Мой → ჩემს', ['c:poss']),
    explain(
      'u8-gen',
      'Чей: -ის',
      [
        'Хозяин стоит первым и получает -ის: დედის სახლი — «мамин дом». Конечная гласная слова при этом отпадает: დედა → დედის.',
        'У нескольких слов выпадает гласная в середине: მეგობარი → მეგობრის, ქმარი → ქმრის.',
      ],
      [r('u8.dedis-sakhli'), r('u8.megobris-mankana')],
    ),
    cards('Чей: -ის', ['c:gen']),
    cards('Дом и питомцы', w('dzaghli', 'kata', 'bina', 'otakhi', 'pilmi')),
    explain(
      'u8-see',
      'Видеть: два корня',
      [
        '«Вижу» — ვხედავ. А «увижу» и «увидел» — от другого корня: ვნახავ, ვნახე. От него же ნახვამდის — «до встречи».',
        'ვნახავ значит и «увижу», и «посмотрю» (фильм, город).',
      ],
      [
        { ka: 'ზღვას ვხედავ', ru: 'я вижу море' },
        { ka: 'ზღვას ვნახავ', ru: 'я увижу море' },
        { ka: 'ზღვა ვნახე', ru: 'я увидел{а} море' },
      ],
    ),
    cards('Видеть: сейчас', c('see', 'prs', ...ALL)),
    cards('Видеть: потом и раньше', c('see', 'fut', ...ALL), c('see', 'aor', ...SPEAKERS)),
  ],
};

const UNIT_9: UnitSrc = {
  id: 9,
  titleRu: 'Какой?',
  goalRu: 'Описать вещь: какая она, насколько и по сравнению с чем.',
  ready: true,
  steps: [
    explain(
      'u9-a',
      'Короткое «есть»: -ა',
      [
        'Чтобы сказать «это хорошо», глагол არის обычно сжимают до -ა и приклеивают к слову: კარგი + ა = კარგია.',
        'Полная форма тоже верна: ეს კარგი არის. Но в речи почти всегда коротко.',
      ],
      [r('u9.es-kargia'), r('u9.es-dzviria'), r('u9.dzalian-gemrielia')],
    ),
    cards('Хороший, плохой', w('tsudi', 'didi', 'patara'), ['c:a']),
    cards('Новый, старый, красивый', w('akhali', 'dzveli', 'lamazi')),
    cards('Цена и вкус', w('dzviri', 'iapi', 'gemrieli', 'tskheli', 'tsivi')),
    explain(
      'u9-more',
      'Очень, больше, самый',
      [
        '«Очень» — ძალიან. «Более» — უფრო: უფრო დიდი — «больше». «Самый» — ყველაზე: ყველაზე კარგი — «лучший».',
        'Сами прилагательные при сравнении не меняются.',
      ],
      [r('u9.upro-iapia'), r('u9.qvelaze-kargia'), r('u9.magram')],
    ),
    cards('Очень, более, самый', w('dzalian', 'upro', 'qvelaze', 'bevri', 'magram')),
    cards('Есть: сейчас', c('eat', 'prs', ...ALL)),
    cards('Еда', w('khortsi', 'tevzi', 'khinkali', 'salati', 'supi')),
    cards('Есть: потом и раньше', c('eat', 'fut', ...ALL), c('eat', 'aor', ...SPEAKERS)),
    explain(
      'u9-drink',
      'Пить: снова два корня',
      ['«Пью» — ვსვამ, а «выпью» и «выпил» — დავლევ, დავლიე. Так же, как ვხედავ и ვნახავ.'],
      [
        { ka: 'ყავას ვსვამ', ru: 'я пью кофе' },
        { ka: 'ყავას დავლევ', ru: 'я выпью кофе' },
        { ka: 'ყავა დავლიე', ru: 'я выпил{а} кофе' },
      ],
    ),
    cards('Пить: сейчас', c('drink', 'prs', ...ALL)),
    cards('Напитки', w('ludi', 'tsveni', 'rdze')),
    cards('Пить: потом и раньше', c('drink', 'fut', ...ALL), c('drink', 'aor', ...SPEAKERS)),
    explain(
      'u9-adj',
      'Какой — перед словом',
      [
        'Прилагательное стоит перед словом и почти не меняется. Одно правило: если слово получило -ს или послелог, прилагательное теряет своё -ი.',
        'ცხელი ყავა — «горячий кофе», но ცხელ ყავას ვსვამ — «пью горячий кофе». Слова на -ა (პატარა) не меняются вовсе.',
      ],
      [r('u9.tskhel-qavas'), r('u9.did-sakhlshi'), r('u9.kargi-ghvino')],
    ),
    cards('Какой — перед словом', ['c:adj']),
  ],
};

const UNIT_10: UnitSrc = {
  id: 10,
  titleRu: 'Прошедшее у «он/она»',
  goalRu: 'Рассказать, что сделал кто-то другой, и что было раньше.',
  ready: true,
  steps: [
    explain(
      'u10-erg',
      'Кто сделал: особая форма',
      [
        'В прошедшем времени тот, кто совершил действие, стоит в особой форме. «Он» — не ის, а მან. «Они» — მათ.',
        'Существительные получают -მა после согласной и -მ после гласной: მეგობარი → მეგობარმა, დედა → დედამ.',
        'У «я, ты, мы, вы» эта форма совпадает с обычной, поэтому раньше её не было видно. И ещё: глагол «знать» требует её даже в настоящем — მან იცის.',
      ],
      [r('u10.man-itsis'), { ka: 'მან გააკეთა', ru: 'он сделал' }, { ka: 'დედამ ჩაი გააკეთა', ru: 'мама сделала чай' }],
    ),
    cards('Кто сделал', w('man'), ['c:erg']),
    cards('Он сделал, работал, говорил', c('do', 'aor', ...THIRD), c('work', 'aor', ...THIRD), c('speak', 'aor', ...THIRD)),
    cards('Уже, пока, раньше, долго', w('ukve', 'jer', 'adre', 'didkhans')),
    cards('Он жил, выучил, купил', c('live', 'aor', ...THIRD), c('learn', 'aor', ...THIRD), c('buy', 'aor', ...THIRD)),
    cards('Он увидел, ел, выпил', c('see', 'aor', ...THIRD), c('eat', 'aor', ...THIRD), c('drink', 'aor', ...THIRD)),
    explain(
      'u10-states',
      'Хотел, было, знал',
      [
        'У глаголов состояния прошедшее — это «длилось»: მინდა → მინდოდა, მაქვს → მქონდა, ვიცი → ვიცოდი.',
        'Устройство прежнее: кто хотел — в приставке (მ-, გ-, გვ-), на конце добавляется -და или -ოდა.',
      ],
      [
        { ka: 'ყავა მინდოდა', ru: 'я хотел{а} кофе' },
        { ka: 'დრო არ მქონდა', ru: 'у меня не было времени' },
        { ka: 'არ ვიცოდი', ru: 'я не знал{а}' },
      ],
    ),
    cards('Знал', c('know', 'aor', ...ALL)),
    cards('Хотел', c('want', 'aor', ...ALL)),
    cards('У меня было', c('have', 'aor', ...ALL)),
    cards('У меня был (кто-то)', c('havea', 'aor', ...ALL)),
    cards('Было нужно', c('need', 'aor', ...ALL)),
    cards('Понравилось', c('like', 'aor', ...ALL)),
  ],
};

const UNIT_11: UnitSrc = {
  id: 11,
  titleRu: 'Числа, деньги, время',
  goalRu: 'Считать до ста, платить и договариваться о времени.',
  ready: true,
  steps: [
    explain(
      'u11-numbers',
      'Счёт двадцатками',
      [
        'От 11 до 19 — одно слово, «десять и ещё столько-то»: თერთმეტი, თორმეტი.',
        'Дальше считают двадцатками. 30 — «двадцать и десять»: ოცდაათი. 40 — «два раза двадцать»: ორმოცი. 50 — «сорок и десять».',
        'После числа слово стоит в единственном числе: ათი ლარი.',
      ],
      [
        { ka: 'ოცდაერთი', ru: 'двадцать один' },
        { ka: 'ოცდაათი', ru: 'тридцать' },
        { ka: 'ათი ლარი', ru: 'десять лари' },
      ],
    ),
    cards('11–15', w('tertmeti', 'tormeti', 'tsameti', 'totkhmeti', 'tkhutmeti')),
    cards('Деньги', w('lari', 'pasi', 'khurda', 'barati', 'naghdi', 'angarishi')),
    cards('Платить: сейчас', c('pay', 'prs', ...ALL)),
    cards('16–20', w('tekvsmeti', 'chvidmeti', 'tvrameti', 'tskhrameti', 'otsi')),
    cards('Платить: потом', c('pay', 'fut', ...ALL)),
    cards('Десятки', w('otsdaerti', 'otsdakhuti', 'otsdaati', 'ormotsi', 'ormotsdaati')),
    cards('Платить: раньше', c('pay', 'aor', ...ALL)),
    cards('До ста', w('samotsi', 'samotsdaati', 'otkhmotsi', 'otkhmotsdaati', 'asi')),
    explain(
      'u11-please',
      'Дайте, пожалуйста',
      [
        'Вежливая просьба: მომეცით — «дайте мне», и в конце თუ შეიძლება — «если можно».',
        'Этих двух фраз хватает на магазин, кафе и кассу.',
      ],
      [r('erti-qava-mometsit'), r('angarishi-tu'), r('baratit-sheidzleba')],
    ),
    cards(
      'Дайте, пожалуйста',
      w('mometsit', 'mometsi'),
      s('tu-sheidzleba', 'erti-qava-mometsit', 'angarishi-tu', 'baratit-sheidzleba', 'ori-bileti-mometsit', 'tsqali-mometsi'),
    ),
    explain(
      'u11-time',
      'Который час и сколько лет',
      [
        '«Три часа» — სამი საათია: то же короткое «есть» на конце. «В три часа» — სამ საათზე.',
        'Возраст — «стольких-то лет есть»: ოცდაათი წლის ვარ.',
      ],
      [r('romeli-saatia'), r('u11.sami-saatia'), r('u11.khut-saatze'), r('u11.otsdaati-tslis')],
    ),
    cards('Время', w('saati', 'tsuti', 'dghe', 'kvira', 'tve', 'tseli'), s('romeli-saatia', 'ramdeni-tslis')),
    explain(
      'u11-fut',
      'Будет, понадобится, понравится',
      [
        'Будущее у глаголов «мне…» строится на -ება: მაქვს → მექნება, მყავს → მეყოლება.',
        'Приставки «мне, тебе, нам» остаются теми же.',
      ],
      [
        { ka: 'ხვალ დრო მექნება', ru: 'завтра у меня будет время' },
        { ka: 'ბილეთი დაგჭირდება', ru: 'тебе понадобится билет' },
      ],
    ),
    cards('У меня будет', c('have', 'fut', ...ALL)),
    cards('У меня будет (кто-то)', c('havea', 'fut', ...ALL)),
    cards('Понадобится', c('need', 'fut', ...ALL)),
    cards('Понравится', c('like', 'fut', ...ALL)),
  ],
};

const UNIT_12: UnitSrc = {
  id: 12,
  titleRu: 'Могу, должен, хочу + действие',
  goalRu: 'Связать два глагола: «хочу пойти», «должен купить», «не могу прийти».',
  ready: true,
  steps: [
    explain(
      'u12-can',
      'Могу: შემიძლია',
      [
        'Ещё один глагол «мне…»: შემიძლია — «мне возможно». Приставки знакомые: შემიძლია, შეგიძლია, შეუძლია, შეგვიძლია.',
      ],
      [
        { ka: 'ეს შემიძლია', ru: 'я это могу' },
        { ka: 'შეგიძლია?', ru: 'ты можешь?' },
      ],
    ),
    cards('Могу', c('can', 'prs', ...ALL)),
    explain(
      'u12-opt',
      'Форма «чтобы я…»',
      [
        'После «хочу», «могу» и «должен» второй глагол стоит в особой форме — как русское «чтобы я сделал».',
        'Она получается из прошедшего: на конце -ო вместо -ე. გავაკეთე → გავაკეთო. У «он» добавляется -ს: გააკეთოს.',
        'У глаголов движения и у «быть» конец другой — их запоминают отдельно: წავიდე, მოვიდე, ვიყო.',
        'მინდა გავაკეთო — «хочу сделать». შემიძლია გავაკეთო — «могу сделать».',
      ],
      [
        { ka: 'მინდა გავაკეთო', ru: 'я хочу сделать' },
        { ka: 'შემიძლია გავაკეთო', ru: 'я могу сделать' },
      ],
    ),
    cards('Чтобы сделать', c('do', 'opt', ...ALL)),
    explain(
      'u12-unda',
      'Должен: უნდა',
      [
        '«Должен, надо» — слово უნდა. Оно не меняется: кто должен — видно по глаголу после него.',
        'Это то же слово, что «он хочет». Отличить просто: после «должен» всегда идёт форма «чтобы».',
      ],
      [
        { ka: 'უნდა გავაკეთო', ru: 'я долж{ен|на} сделать' },
        { ka: 'არ უნდა გააკეთო', ru: 'ты не должен делать' },
      ],
    ),
    cards('Должен', w('unda'), ['c:unda'], w('sheidzleba')),
    cards('Чтобы пойти', c('go', 'opt', ...ALL)),
    cards('Чтобы купить', c('buy', 'opt', ...ALL)),
    cards('Чтобы увидеть', c('see', 'opt', ...ALL)),
    cards('Чтобы работать', c('work', 'opt', ...ALL)),
    cards('Мог', c('can', 'aor', ...ALL)),
    explain(
      'u12-ver',
      'Не могу: ვერ',
      [
        'არ — «не делаю». ვერ — «не могу, не получается». Оно встаёт на то же место перед глаголом.',
        'ვერ მოვალ — «не смогу прийти». ვერ გავიგე — «не понял, не расслышал».',
      ],
      [r('u12.ver-moval'), r('u12.ver-gavakete')],
    ),
    cards('Не могу: ვერ', w('ver'), ['c:ver']),
    cards('Понял', c('understand', 'aor', ...ALL)),
    cards('Пойму', c('understand', 'fut', ...ALL)),
  ],
};

const UNIT_13: UnitSrc = {
  id: 13,
  titleRu: 'Просьбы и запреты',
  goalRu: 'Попросить, позвать, остановить и запретить.',
  ready: true,
  steps: [
    explain(
      'u13-imp',
      'Просьба — это форма «ты сделал»',
      [
        'Отдельной формы для просьбы нет: берут прошедшее для «ты». გააკეთე — и «ты сделал», и «сделай!».',
        'Нескольким людям или вежливо — с -თ: გააკეთეთ.',
        'То, о чём просят, стоит в словарной форме, как в прошедшем: ჩაი გააკეთე!',
      ],
      [r('u13.es-gaakete'), r('u13.es-gaaketet'), r('u13.nela-ilaparaket')],
    ),
    cards('Просьба', ['c:imp']),
    cards('Иди сюда, иди', w('modi', 'modit', 'tsadi', 'tsadit'), s('ak-modi', 'chemtan-modi', 'sakhlshi-tsadi')),
    cards(
      'Скажите, помогите',
      w('mitkhari', 'mitkharit', 'damekhmare', 'damekhmaret', 'machvenet'),
      s('mitkharit-tu', 'damekhmaret-tu', 'es-machvenet'),
    ),
    cards('Ждать: сейчас', c('wait', 'prs', ...ALL)),
    cards(
      'Ещё раз, медленно',
      w('nela', 'chkara', 'kidev', 'ertkhel'),
      s('kidev-ertkhel', 'nela-tu', 'kidev-ertkhel-mitkharit', 'kidev-erti'),
    ),
    cards('Ждать: потом и раньше', c('wait', 'fut', ...ALL), c('wait', 'aor', ...ALL)),
    cards('Подождите, остановите', w('moitsade', 'moitsadet', 'gaacheret'), s('erti-tsuti-moitsadet', 'ak-gaacheret')),
    explain(
      'u13-nu',
      'Запрет: ნუ',
      ['«Не делай» — ნუ и форма настоящего: ნუ აკეთებ. Вежливо и нескольким — с -თ: ნუ აკეთებთ.'],
      [r('u13.nu-laparakob'), r('u13.nu-midikhar')],
    ),
    cards('Запрет', w('nu'), ['c:nu']),
    cards('Чтобы быть', c('be', 'opt', ...ALL)),
    cards('Чтобы прийти', c('come', 'opt', ...ALL)),
    cards('Чтобы поесть', c('eat', 'opt', ...ALL)),
    cards('Чтобы выпить', c('drink', 'opt', ...ALL)),
    cards('Чтобы говорить', c('speak', 'opt', ...ALL)),
  ],
};

const UNIT_14: UnitSrc = {
  id: 14,
  titleRu: 'Связки',
  goalRu: 'Соединять фразы: что, потому что, если, когда, или.',
  ready: true,
  steps: [
    explain(
      'u14-say',
      'Сказать: три корня',
      [
        'ვლაპარაკობ — «разговариваю». А «говорю что-то, сообщаю» — другой глагол, и все три времени у него от разных корней: ვამბობ, ვიტყვი, ვთქვი.',
      ],
      [
        { ka: 'ამას ვამბობ', ru: 'я говорю это' },
        { ka: 'ამას ვიტყვი', ru: 'я скажу это' },
        { ka: 'ეს ვთქვი', ru: 'я сказал{а} это' },
      ],
    ),
    cards('Сказать: сейчас', c('say', 'prs', ...ALL)),
    cards('Сказать: потом', c('say', 'fut', ...ALL)),
    cards('Сказать: раньше', c('say', 'aor', ...ALL)),
    explain(
      'u14-rom',
      'Что: რომ',
      [
        'Две фразы соединяет რომ — «что». Перед ним запятая, после него — обычное предложение.',
        'ვიცი, რომ აქ ხარ — «я знаю, что ты здесь».',
      ],
      [r('u14.vitsi-rom'), r('u14.tkva-rom')],
    ),
    cards('Что: რომ', w('rom'), ['c:rom']),
    cards('Думать: сейчас', c('think', 'prs', ...ALL)),
    cards('Потому что, поэтому', w('imitom', 'amitom'), s('imitom-rom')),
    cards('Думать: потом и раньше', c('think', 'fut', ...ALL), c('think', 'aor', ...ALL)),
    explain(
      'u14-if',
      'Если, когда, или',
      [
        '«Если» — თუ, «когда» — როცა: оба стоят в начале своей части, после неё запятая.',
        '«Или» в утверждении — ან. В вопросе с выбором — снова თუ: ყავა თუ ჩაი?',
      ],
      [r('u14.tu-ginda'), r('u14.rotsa-mokhval'), r('qava-tu-chai')],
    ),
    cards('Если, когда, или', w('tu', 'rotsa', 'an'), s('qava-tu-chai', 'dghes-an-khval')),
    cards('Слова-связки', w('mere', 'mets', 'albat', 'ase', 'mgoni', 'rasakvirvelia')),
  ],
};

const UNIT_15: UnitSrc = {
  id: 15,
  titleRu: 'Ситуации',
  goalRu: 'Кафе, рынок, такси, аптека, знакомство, соседи.',
  ready: true,
  steps: [
    explain(
      'u15-meet',
      'Диалог: знакомство',
      ['Все эти фразы уже знакомы. Прочитай диалог вслух за обоих.'],
      [
        wd('gamarjoba', 'А'),
        wd('gagimarjos', 'Б'),
        r('ra-gkvia', 'А'),
        r('me-mkvia', 'Б'),
        r('saidan-khar', 'А'),
        r('rusetidan-var', 'Б'),
        r('u9.kargad-laparakob', 'А'),
        r('u5.tsota-kartuli', 'Б'),
      ],
    ),
    cards('В ответ', w('gagimarjos', 'arapris')),
    explain(
      'u15-cafe',
      'Диалог: в кафе',
      ['Официант — А, ты — Б.'],
      [
        wd('gamarjoba', 'А'),
        r('d-cafe-2', 'Б'),
        r('d-cafe-3', 'Б'),
        r('d-cafe-4', 'А'),
        r('d-cafe-5', 'Б'),
        r('u9.dzalian-gemrielia', 'Б'),
        r('angarishi-tu', 'Б'),
        r('baratit-sheidzleba', 'Б'),
      ],
    ),
    cards('В кафе', w('menu', 'sul'), s('d-cafe-2', 'd-cafe-3', 'd-cafe-4', 'd-cafe-5')),
    cards('Писать: сейчас', c('write', 'prs', ...ALL)),
    explain(
      'u15-shop',
      'Диалог: на рынке',
      ['Продавец — А, ты — Б.'],
      [
        r('d-shop-1', 'Б'),
        r('d-shop-2', 'А'),
        r('u9.es-dzviria', 'Б'),
        r('d-shop-3', 'А'),
        r('d-shop-4', 'Б'),
        r('u11.khurda', 'Б'),
        wd('rasakvirvelia', 'А'),
        wd('madloba', 'Б'),
        wd('arapris', 'А'),
      ],
    ),
    cards('На рынке', w('kilo', 'pomidori'), s('d-shop-1', 'd-shop-2', 'd-shop-3', 'd-shop-4')),
    cards('Писать: потом и раньше', c('write', 'fut', ...ALL), c('write', 'aor', ...ALL)),
    explain(
      'u15-taxi',
      'Диалог: в такси',
      ['Водитель — А, ты — Б.'],
      [
        r('d-taxi-1', 'Б'),
        r('d-taxi-2', 'А'),
        r('d-taxi-3', 'Б'),
        r('u7.shors', 'Б'),
        r('d-taxi-4', 'А'),
        r('d-taxi-5', 'Б'),
        r('ra-ghirs', 'Б'),
        r('d-taxi-6', 'А'),
      ],
    ),
    cards(
      'В такси',
      w('misamarti', 'pirdapir', 'marjvniv', 'martskhniv'),
      s('d-taxi-1', 'd-taxi-2', 'd-taxi-3', 'd-taxi-3b', 'd-taxi-4', 'd-taxi-5', 'd-taxi-6'),
    ),
    cards('Читать: сейчас', w('tserili'), c('read', 'prs', ...ALL)),
    explain(
      'u15-apt',
      'Диалог: в аптеке',
      ['Аптекарь — А, ты — Б.'],
      [
        r('d-apt-1', 'Б'),
        r('d-apt-2', 'Б'),
        r('d-apt-3', 'А'),
        r('ra-ghirs', 'Б'),
        r('d-apt-4', 'А'),
        r('d-apt-5', 'Б'),
      ],
    ),
    cards('В аптеке', w('aptiaki', 'tsamali', 'tavi', 'mtkiva'), s('d-apt-1', 'd-apt-2', 'd-apt-3', 'd-apt-4', 'd-apt-5')),
    cards('Читать: потом и раньше', c('read', 'fut', ...ALL), c('read', 'aor', ...ALL)),
    explain(
      'u15-nb',
      'Диалог: новый сосед',
      ['Ты — А, сосед — Б.'],
      [
        r('d-nb-1', 'А'),
        wd('sasiamovnoa', 'Б'),
        r('ra-gkviat', 'Б'),
        r('me-mkvia', 'А'),
        r('d-nb-2', 'Б'),
        r('rusetidan-var', 'А'),
        r('d-nb-3', 'А'),
        r('d-nb-4', 'Б'),
        r('d-nb-5', 'А'),
      ],
    ),
    cards('Соседи', w('mezobeli'), s('d-nb-1', 'd-nb-2', 'd-nb-3', 'd-nb-4', 'd-nb-5')),
  ],
};

const UNIT_16: UnitSrc = {
  id: 16,
  titleRu: 'Истории',
  goalRu: 'Рассказать о своём дне, о вчерашнем и о планах — во всех временах.',
  ready: true,
  steps: [
    explain(
      'u16-day',
      'Рассказ: мой день',
      ['Настоящее время. Сначала послушай и прочитай целиком, потом каждая фраза придёт отдельной карточкой.'],
      [r('s-day-1'), r('s-day-2'), r('s-day-3'), r('s-day-4'), r('s-day-5'), r('s-day-6'), r('s-day-7'), r('s-day-8')],
    ),
    cards('Когда', w('dila', 'saghamo', 'ghame', 'qoveldghe')),
    cards('Мой день: утро', s('s-day-1', 's-day-2', 's-day-3', 's-day-4')),
    cards('Как часто', w('khshirad', 'zogjer', 'qoveltvis', 'arasdros')),
    cards('Мой день: вечер', s('s-day-5', 's-day-6', 's-day-7', 's-day-8')),
    cards('Начинать: сейчас', c('begin', 'prs', ...ALL)),
    cards('Поздно, затем, работа', w('gvian', 'shemdeg', 'mushaoba')),
    explain(
      'u16-yest',
      'Рассказ: вчера',
      ['Прошедшее время. Обрати внимание: то, что купил и увидел, стоит без -ს.'],
      [r('s-yest-1'), r('s-yest-2'), r('s-yest-3'), r('s-yest-4'), r('s-yest-5'), r('s-yest-6'), r('s-yest-7'), r('s-yest-8')],
    ),
    cards('Вчера: утро', s('s-yest-1', 's-yest-2', 's-yest-3', 's-yest-4')),
    cards('Начинать: потом', c('begin', 'fut', ...ALL)),
    cards('Вчера: вечер', s('s-yest-5', 's-yest-6', 's-yest-7', 's-yest-8')),
    cards('Начинать: раньше', c('begin', 'aor', ...ALL)),
    explain(
      'u16-plan',
      'Рассказ: планы',
      ['Будущее время и «должен». Здесь то, что увижу и напишу, снова с -ს.'],
      [r('s-plan-1'), r('s-plan-2'), r('s-plan-3'), r('s-plan-4'), r('s-plan-5'), r('s-plan-6'), r('s-plan-7'), r('s-plan-8')],
    ),
    cards('Планы: дорога', s('s-plan-1', 's-plan-2', 's-plan-3', 's-plan-4')),
    cards('Планы: в Батуми', s('s-plan-5', 's-plan-6', 's-plan-7', 's-plan-8')),
  ],
};

export const UNITS: UnitSrc[] = [
  UNIT_1,
  UNIT_2,
  UNIT_3,
  UNIT_4,
  UNIT_5,
  UNIT_6,
  UNIT_7,
  UNIT_8,
  UNIT_9,
  UNIT_10,
  UNIT_11,
  UNIT_12,
  UNIT_13,
  UNIT_14,
  UNIT_15,
  UNIT_16,
];
