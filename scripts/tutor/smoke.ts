/**
 * Smoke test of the AI tutor against the real API, with the very prompts the
 * app uses. Spends a few cents of the key in .env.local.
 *
 *   npm run tutor:smoke                 every feature once
 *   npm run tutor:smoke -- translate "Где здесь аптека?"
 *   npm run tutor:smoke -- text "მე მინდა ყავა და წყალს."
 *   npm run tutor:smoke -- badkey      what the learner sees when the key is wrong (spends nothing)
 *
 * Prints each answer with the label the app would show («формы есть в
 * таблицах» / «не проверено» and the words that are not in the tables) and
 * the token usage, so a change to a prompt can be judged before it ships.
 */
import { checkGeorgian, knownFormsByUnit } from '../../src/content/known';
import { fillCourse } from '../../src/content/store';
import { AI_TAG_RU } from '../../src/content/types';
import { createTutor } from '../../src/tutor/client';
import { coursePrompt } from '../../src/tutor/prompts';
import type { ChatTurn, Tutor } from '../../src/tutor/types';
import { compile } from '../content/build';

const UNLOCKED = 8;

function label(ka: string): string {
  const c = checkGeorgian(ka);
  return c.ok ? AI_TAG_RU.checked : `${AI_TAG_RU.unchecked}${c.unknown.length ? ` (нет в таблицах: ${c.unknown.join(', ')})` : ''}`;
}

function usage(t: Tutor): string {
  const u = t.lastUsage();
  return u ? `  [tokens: in ${u.input}, out ${u.output}, cache read ${u.cacheRead}, cache write ${u.cacheWrite}]` : '';
}

async function translate(t: Tutor, ru: string): Promise<void> {
  const r = await t.translate(ru, UNLOCKED);
  console.log(`\n── перевод: ${ru}`);
  console.log(`   ${r.ka}   ← ${label(r.ka)}`);
  console.log(`   дословно: ${r.literal}`);
  for (const w of r.words) console.log(`   · ${w.ka} — ${w.ru}${w.note ? ` (${w.note})` : ''}`);
  if (r.note) console.log(`   заметка: ${r.note}`);
  console.log(usage(t));
}

async function text(t: Tutor, ka: string): Promise<void> {
  const r = await t.checkText(ka, UNLOCKED);
  console.log(`\n── проверка текста: ${ka}`);
  console.log(`   ${r.corrected}   ← ${label(r.corrected)}`);
  console.log(`   ${r.ru}`);
  for (const f of r.fixes) console.log(`   · ${f.from} → ${f.to}: ${f.why}`);
  console.log(`   ${r.comment}`);
  console.log(usage(t));
}

async function explain(t: Tutor): Promise<void> {
  const context = [
    'Упражнение: сборка из плиток.',
    'Карточка: правило «Кто сделал: -მა, -მ».',
    'Правильный ответ: მეგობარმა ბილეთი იყიდა.',
    'По-русски: Друг купил билет.',
    'Разбор по словам:',
    '- მეგობარმა: «друг», форма деятеля (-მა / -მ); роль: кто',
    '- ბილეთი: «билет», словарная форма; роль: что (объект)',
    '- იყიდა: глагол «покупать», прошедшее, «он»',
    'Правило карточки: В прошедшем времени тот, кто совершил действие, получает -მა (после согласной) или -მ (после гласной).',
    'Ответ ученика (неверный): მეგობარი ბილეთს იყიდა.',
  ].join('\n');
  console.log('\n── почему так?');
  process.stdout.write('   ');
  const full = await t.explain(context, (d) => process.stdout.write(d));
  console.log(`\n   ← ${label(full)}`);
  console.log(usage(t));
}

async function chat(t: Tutor): Promise<void> {
  console.log('\n── диалог: кафе');
  const history: ChatTurn[] = [];
  const first = await t.chat('cafe', history, UNLOCKED);
  console.log(`   репетитор: ${first.reply.ka}   ← ${label(first.reply.ka)}`);
  console.log(`              ${first.reply.ru}${first.reply.hint ? `   (подсказка: ${first.reply.hint})` : ''}`);
  console.log(usage(t));
  history.push(first.turn, { role: 'user', text: 'ერთი ყავა მინდა და წყალს.' });
  const second = await t.chat('cafe', history, UNLOCKED);
  console.log('   ученик:    ერთი ყავა მინდა და წყალს.');
  if (second.reply.fix) console.log(`   исправление: ${second.reply.fix.from} → ${second.reply.fix.to}: ${second.reply.fix.why}`);
  console.log(`   репетитор: ${second.reply.ka}   ← ${label(second.reply.ka)}`);
  console.log(`              ${second.reply.ru}`);
  console.log(usage(t));
}

async function main(): Promise<void> {
  if (process.argv[2] === 'badkey') {
    // A made-up key: the service must refuse it and the app must say so in plain words.
    try {
      await createTutor('sk-ant-this-is-not-a-key', 'x').testKey();
      console.log('unexpected: a made-up key was accepted');
    } catch (e) {
      console.log(e instanceof Error ? `${e.name} [${(e as { kind?: string }).kind}]: ${e.message}` : e);
    }
    return;
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.error('ANTHROPIC_API_KEY is not set (see .env.example).');
    process.exit(1);
  }
  const { course, sentences } = compile();
  fillCourse(course, sentences);
  const tutor = createTutor(key, coursePrompt(knownFormsByUnit()));

  const [mode, arg] = process.argv.slice(2);
  if (mode === 'translate' && arg) return translate(tutor, arg);
  if (mode === 'text' && arg) return text(tutor, arg);

  await tutor.testKey();
  console.log('ключ принят');
  await translate(tutor, 'Где здесь аптека?');
  await translate(tutor, 'Я бы хотел забронировать столик на двоих.');
  await explain(tutor);
  await text(tutor, 'მე მინდა ყავა და წყალს. გუშინ მე ბაზარში წავიდა.');
  await chat(tutor);
}

main().catch((e) => {
  console.error(e instanceof Error ? `${e.name}: ${e.message}` : e);
  process.exit(1);
});
