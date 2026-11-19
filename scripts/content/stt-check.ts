/**
 * Round-trip check of generated audio: transcribe clips with ElevenLabs Scribe
 * and compare with the text each was made from. A clip that does not come
 * back as (nearly) the same words is suspect and worth regenerating.
 *
 *   npm run content:stt -- --all                    every clip in the manifest
 *   npm run content:stt -- --retake [--max 3] [--offset N]
 *                                                   re-record clips that failed, keep a better take;
 *                                                   --offset skips seeds an earlier round tried
 *   npm run content:stt -- <file.mp3> "<text>" ...  ad-hoc pairs
 *
 * Results are cached by clip id in content-src/generated/stt-cache.json, so a
 * re-run only pays for new clips. Needs the key permission "Speech to Text".
 *
 * Note: recognition has errors of its own, above all on one- and two-letter
 * words heard without context. A mismatch is a reason to listen, not proof.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  clipId,
  clipPath as ttsClipPath,
  readManifest,
  readTakes,
  synthesize,
  ttsConfig,
  writeManifest,
  writeTakes,
} from './tts';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const MANIFEST = join(ROOT, 'content-src/audio-manifest.json');
const CACHE = join(ROOT, 'content-src/generated/stt-cache.json');
const REPORT = join(ROOT, 'content-src/review/stt-report.md');
const AUDIO_DIR = join(ROOT, 'public/audio');

const KEY = process.env.ELEVENLABS_API_KEY ?? '';
const MODEL = process.env.ELEVENLABS_STT_MODEL || 'scribe_v2';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Letters and single spaces only: punctuation is not what is being checked. */
export function norm(s: string): string {
  return s.replace(/[^ა-ჿ ]/g, '').replace(/\s+/g, ' ').trim();
}

export function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

export type Verdict = 'exact' | 'near' | 'mismatch';

/** `near` = the same words up to one letter, or a missing/extra space. */
export function verdict(expected: string, heard: string): Verdict {
  const e = norm(expected);
  const h = norm(heard);
  if (e === h) return 'exact';
  if (e.replace(/ /g, '') === h.replace(/ /g, '')) return 'near';
  return editDistance(e, h) <= 1 ? 'near' : 'mismatch';
}

export async function transcribe(file: string | Buffer): Promise<string> {
  const bytes = typeof file === 'string' ? readFileSync(file) : file;
  const name = typeof file === 'string' ? basename(file) : 'clip.mp3';
  for (let attempt = 0; ; attempt++) {
    const form = new FormData();
    form.append('model_id', MODEL);
    form.append('language_code', 'ka');
    form.append('file', new Blob([new Uint8Array(bytes)], { type: 'audio/mpeg' }), name);
    const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': KEY },
      body: form,
    });
    const body = await res.text();
    if (res.ok) return (JSON.parse(body) as { text?: string }).text ?? '';
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await sleep(2000 * 2 ** attempt);
      continue;
    }
    throw new Error(`${res.status} ${body.slice(0, 220)}`);
  }
}

const clipPath = ttsClipPath;

async function checkAll(): Promise<void> {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as Record<string, string>;
  const cache: Record<string, string> = existsSync(CACHE)
    ? (JSON.parse(readFileSync(CACHE, 'utf8')) as Record<string, string>)
    : {};
  const entries = Object.entries(manifest).filter(([, id]) => existsSync(clipPath(id)));
  const todo = entries.filter(([, id]) => cache[id] === undefined);
  console.log(`клипов: ${entries.length} · уже распознано: ${entries.length - todo.length} · осталось: ${todo.length}`);

  const saveCache = () => {
    mkdirSync(dirname(CACHE), { recursive: true });
    const sorted = Object.fromEntries(Object.entries(cache).sort(([a], [b]) => a.localeCompare(b)));
    writeFileSync(CACHE, JSON.stringify(sorted, null, 1) + '\n');
  };

  const errors: string[] = [];
  let next = 0;
  let done = 0;
  const worker = async (): Promise<void> => {
    while (next < todo.length && errors.length < 5) {
      const [text, id] = todo[next++];
      try {
        cache[id] = (await transcribe(clipPath(id))).trim();
        if (++done % 100 === 0) {
          saveCache();
          console.log(`  … ${done}`);
        }
      } catch (e) {
        errors.push(`«${text}»: ${(e as Error).message}`);
      }
    }
  };
  try {
    await Promise.all(Array.from({ length: 4 }, worker));
  } finally {
    saveCache();
  }
  if (errors.length) {
    console.log(`Ошибок запроса: ${errors.length}`);
    for (const e of errors) console.log('  ✗ ' + e.slice(0, 200));
  }

  // Keep only cache entries for clips that still exist in the manifest.
  const live = new Set(entries.map(([, id]) => id));
  for (const id of Object.keys(cache)) if (!live.has(id)) delete cache[id];
  saveCache();

  const rows = entries
    .filter(([, id]) => cache[id] !== undefined)
    .map(([text, id]) => ({ text, id, heard: cache[id], v: verdict(text, cache[id]), words: norm(text).split(' ').length }));
  const count = (v: Verdict, pred: (r: (typeof rows)[number]) => boolean = () => true) =>
    rows.filter((r) => r.v === v && pred(r)).length;
  const single = (r: (typeof rows)[number]) => r.words === 1;
  const multi = (r: (typeof rows)[number]) => r.words > 1;
  const nSingle = rows.filter(single).length;
  const nMulti = rows.filter(multi).length;

  const lines = [
    '# Обратная проверка озвучки',
    '',
    'Создаётся скриптом `scripts/content/stt-check.ts`: каждый клип распознан обратно в текст (ElevenLabs Scribe) и сравнён с исходной фразой. Знаки препинания не учитываются.',
    '',
    'Распознавание само ошибается — особенно на отдельных коротких словах без контекста. Расхождение — повод послушать клип, а не доказательство ошибки.',
    '',
    `| | Всего | Точно | Почти (1 буква / пробел) | Расхождение |`,
    '|---|---|---|---|---|',
    `| Фразы (2+ слова) | ${nMulti} | ${count('exact', multi)} | ${count('near', multi)} | ${count('mismatch', multi)} |`,
    `| Отдельные слова | ${nSingle} | ${count('exact', single)} | ${count('near', single)} | ${count('mismatch', single)} |`,
    `| **Итого** | ${rows.length} | ${count('exact')} | ${count('near')} | ${count('mismatch')} |`,
    '',
  ];
  for (const [title, v] of [['Расхождения', 'mismatch'], ['Почти совпало', 'near']] as const) {
    const list = rows.filter((r) => r.v === v);
    if (!list.length) continue;
    lines.push(`## ${title} (${list.length})`, '', '| Ожидалось | Распознано | Клип |', '|---|---|---|');
    for (const r of list) lines.push(`| ${r.text} | ${r.heard || '—'} | \`${r.id}\` |`);
    lines.push('');
  }
  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, lines.join('\n'));

  console.log(
    `фразы: ${count('exact', multi)}/${nMulti} точно, ${count('near', multi)} почти, ${count('mismatch', multi)} расхождений · ` +
      `слова: ${count('exact', single)}/${nSingle} точно, ${count('near', single)} почти, ${count('mismatch', single)} расхождений`,
  );
  for (const r of rows.filter((x) => x.v !== 'exact')) {
    console.log(`  ${r.v === 'mismatch' ? '✗' : '≈'} «${r.text}» → «${r.heard}»  [${r.id}]`);
  }
}

const letters = (s: string) => norm(s).replace(/ /g, '');

/**
 * Re-record clips that did not come back as their own text. Up to `max` new
 * takes per clip (different seeds); the take that is recognised best replaces
 * the current one — only if it is strictly better. Where the recogniser is at
 * fault, new takes do not help and the clip is left alone.
 */
async function retake(max: number, offset = 0): Promise<void> {
  const { voice, model } = ttsConfig();
  if (!voice) throw new Error('ELEVENLABS_VOICE_ID не задан');
  const manifest = readManifest();
  const takes = readTakes();
  const cache: Record<string, string> = existsSync(CACHE)
    ? (JSON.parse(readFileSync(CACHE, 'utf8')) as Record<string, string>)
    : {};
  const flagged = Object.entries(manifest).filter(
    ([text, id]) => cache[id] !== undefined && letters(text) !== letters(cache[id]),
  );
  console.log(`клипов с расхождением в буквах: ${flagged.length} · до ${max} дублей на каждый`);

  let chars = 0;
  let fixed = 0;
  let improved = 0;
  const lines: string[] = [];
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < flagged.length) {
      const [text, id] = flagged[next++];
      const want = letters(text);
      const base = takes[text] ?? 0;
      let best = { dist: editDistance(want, letters(cache[id])), take: base, heard: cache[id], audio: null as Buffer | null };
      const start = best.dist;
      try {
        for (let k = 1; k <= max && best.dist > 0; k++) {
          // `offset` skips seeds an earlier round already tried.
          const take = base + offset + k;
          const audio = await synthesize(text, voice, model, take);
          chars += text.length;
          const heard = (await transcribe(audio)).trim();
          const dist = editDistance(want, letters(heard));
          if (dist < best.dist) best = { dist, take, heard, audio };
        }
      } catch (e) {
        lines.push(`  ! «${text}»: ${(e as Error).message.slice(0, 120)}`);
        continue;
      }
      if (best.audio) {
        const newId = clipId(voice, model, text, best.take);
        const file = clipPath(newId);
        mkdirSync(dirname(file), { recursive: true });
        writeFileSync(file, best.audio);
        manifest[text] = newId;
        takes[text] = best.take;
        cache[newId] = best.heard;
        if (best.dist === 0) fixed++;
        else improved++;
        lines.push(`  ${best.dist === 0 ? '✓' : '↑'} «${text}»: было «${cache[id]}» → дубль ${best.take}: «${best.heard}»`);
      } else {
        lines.push(`  = «${text}»: дубли не лучше (слышится «${cache[id]}», расстояние ${start})`);
      }
    }
  };
  try {
    await Promise.all(Array.from({ length: 3 }, worker));
  } finally {
    writeManifest(manifest);
    writeTakes(takes);
    mkdirSync(dirname(CACHE), { recursive: true });
    const sorted = Object.fromEntries(Object.entries(cache).sort(([a], [b]) => a.localeCompare(b)));
    writeFileSync(CACHE, JSON.stringify(sorted, null, 1) + '\n');
  }
  for (const l of lines.sort()) console.log(l);
  console.log(
    `исправлено полностью: ${fixed} · стало лучше: ${improved} · без изменений: ${flagged.length - fixed - improved} · ` +
      `символов на новые дубли: ${chars}`,
  );
}

async function main(): Promise<void> {
  if (!KEY) throw new Error('ELEVENLABS_API_KEY не задан');
  const args = process.argv.slice(2);
  if (args.includes('--all')) return checkAll();
  if (args.includes('--retake')) {
    const i = args.indexOf('--max');
    const o = args.indexOf('--offset');
    return retake(i >= 0 ? Number(args[i + 1]) : 3, o >= 0 ? Number(args[o + 1]) : 0);
  }
  for (let i = 0; i + 1 < args.length; i += 2) {
    const [file, expected] = [args[i], args[i + 1]];
    const heard = await transcribe(file);
    const v = verdict(expected, heard);
    console.log(`${v === 'exact' ? '✓' : v === 'near' ? '≈' : '✗'} ${basename(file)}: ожидалось «${expected}», распознано «${heard.trim()}»`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(`Ошибка: ${(e as Error).message}`);
    process.exit(1);
  });
}
