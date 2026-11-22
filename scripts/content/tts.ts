/**
 * Generate audio clips with ElevenLabs.
 *
 *   npm run content:tts -- --quota              show remaining credits
 *   npm run content:tts -- --models             list models that can speak Georgian
 *   npm run content:tts -- --dry-run            what would be generated, and its size
 *   npm run content:tts -- --limit 3000         generate, spending at most ~3000 characters
 *   npm run content:tts -- --unit 1             only material of unit 1 (0 = the alphabet)
 *   npm run content:tts -- --dict               only the words of the picture dictionary
 *   npm run content:tts -- --sample <dir>       comparison clips (voices × models) into <dir>
 *   npm run content:tts -- --audit              flag clips whose length does not fit their text
 *   npm run content:tts -- --prune              delete clips of another voice / removed sentences
 *
 * Clips are content-addressed: id = sha1(voice | model | text). The same text
 * never costs twice, and a changed text gets a new file, so cached audio is
 * never stale. Reads ELEVENLABS_* from the environment (see .env.local).
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { audioTexts, compile, hiFiTexts, letterTexts } from './build';
import { dictionaryTexts } from './dictionary';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const AUDIO_DIR = join(ROOT, 'public/audio');
const MANIFEST = join(ROOT, 'content-src/audio-manifest.json');
const API = 'https://api.elevenlabs.io';
const FORMAT = 'mp3_44100_64';
/** Letter sounds and minimal pairs: the consonant burst is the lesson, so spend more bits on it. */
const FORMAT_HIFI = 'mp3_44100_128';

let hifi: Set<string> | null = null;
/** Is this text recorded at the higher bitrate? */
export function isHiFi(text: string): boolean {
  if (!hifi) hifi = new Set(hiFiTexts(compile().course));
  return hifi.has(text);
}

/** `--voice <id>` overrides ELEVENLABS_VOICE_ID for this run. */
function argEarly(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

const KEY = process.env.ELEVENLABS_API_KEY ?? '';
const VOICE = argEarly('--voice') ?? process.env.ELEVENLABS_VOICE_ID ?? '';
const VOICE_2 = process.env.ELEVENLABS_VOICE_ID_2 ?? '';
const MODEL = process.env.ELEVENLABS_MODEL || 'eleven_v4';

const has = (flag: string) => process.argv.includes(flag);
function arg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Clip id. `take` > 0 marks a re-recorded clip: it gets a new id (and so a new
 * URL), which keeps every published file immutable for the service-worker cache.
 */
export function clipId(voice: string, model: string, text: string, take = 0): string {
  let key = `${voice}|${model}|${text}`;
  if (isHiFi(text)) key += '|128';
  if (take > 0) key += `|take${take}`;
  return createHash('sha1').update(key).digest('hex').slice(0, 12);
}

export function clipPath(id: string): string {
  return join(AUDIO_DIR, id.slice(0, 2), `${id}.mp3`);
}

const TAKES = join(ROOT, 'content-src/audio-takes.json');

/** Which take of each text is in use (absent = the first one). Written by the retake check. */
export function readTakes(): Record<string, number> {
  return existsSync(TAKES) ? (JSON.parse(readFileSync(TAKES, 'utf8')) as Record<string, number>) : {};
}

export function writeTakes(takes: Record<string, number>): void {
  const sorted = Object.fromEntries(Object.entries(takes).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(TAKES, JSON.stringify(sorted, null, 2) + '\n');
}

export const ttsConfig = () => ({ voice: VOICE, model: MODEL });

async function api(path: string, init?: RequestInit): Promise<Response> {
  return fetch(API + path, { ...init, headers: { 'xi-api-key': KEY, ...(init?.headers ?? {}) } });
}

async function describeError(res: Response): Promise<string> {
  const body = await res.text();
  try {
    const j = JSON.parse(body) as { detail?: { status?: string; message?: string } | string };
    const d = j.detail;
    if (typeof d === 'string') return `${res.status} ${d}`;
    if (d) return `${res.status} ${d.status ?? ''} ${d.message ?? ''}`.trim();
  } catch {
    // not JSON
  }
  return `${res.status} ${body.slice(0, 200)}`;
}

/** `seed` asks for a different rendition of the same text (used for retakes). */
export async function synthesize(text: string, voice: string, model: string, seed?: number): Promise<Buffer> {
  for (let attempt = 0; ; attempt++) {
    const res = await api(`/v1/text-to-speech/${voice}?output_format=${isHiFi(text) ? FORMAT_HIFI : FORMAT}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: model, language_code: 'ka', ...(seed != null ? { seed } : {}) }),
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await sleep(2000 * 2 ** attempt);
      continue;
    }
    throw new Error(await describeError(res));
  }
}

interface Subscription {
  tier?: string;
  character_count?: number;
  character_limit?: number;
  next_character_count_reset_unix?: number;
}

async function quota(): Promise<Subscription | null> {
  const res = await api('/v1/user/subscription');
  if (!res.ok) {
    console.log(`Квоту узнать не удалось: ${await describeError(res)}`);
    return null;
  }
  return (await res.json()) as Subscription;
}

async function showQuota(): Promise<void> {
  const q = await quota();
  if (!q) return;
  const left = (q.character_limit ?? 0) - (q.character_count ?? 0);
  const reset = q.next_character_count_reset_unix
    ? new Date(q.next_character_count_reset_unix * 1000).toISOString().slice(0, 10)
    : '?';
  console.log(`тариф: ${q.tier} · использовано ${q.character_count} из ${q.character_limit} · осталось ${left} · сброс ${reset}`);
}

async function showModels(): Promise<void> {
  const res = await api('/v1/models');
  if (!res.ok) {
    console.log(`Список моделей недоступен: ${await describeError(res)}`);
    return;
  }
  const models = (await res.json()) as Array<{
    model_id: string;
    name: string;
    can_do_text_to_speech?: boolean;
    languages?: Array<{ language_id: string }>;
    model_rates?: { character_cost_multiplier?: number };
  }>;
  for (const m of models) {
    if (!m.can_do_text_to_speech) continue;
    const ka = m.languages?.some((l) => l.language_id === 'ka') ?? false;
    const rate = m.model_rates?.character_cost_multiplier;
    console.log(`${ka ? 'ka ✓' : 'ka —'}  ${m.model_id.padEnd(28)} ${m.name}${rate != null ? `  ×${rate}` : ''}`);
  }
}

const SAMPLE_TEXTS = [
  'გამარჯობა',
  'მე ვმუშაობ.',
  'შენ მუშაობ?',
  'დღეს არ ვმუშაობ.',
  'ქართულად ვლაპარაკობ.',
  'თბილისში ვცხოვრობ.',
  'ყავა მინდა.',
  'დრო არ მაქვს.',
  'წყალი მჭირდება.',
  'ტელეფონი სად არის?',
];

async function sample(dir: string): Promise<void> {
  mkdirSync(dir, { recursive: true });
  const voices = [VOICE, VOICE_2].filter(Boolean);
  const models = (arg('--models-list') ?? `${MODEL},eleven_v3`).split(',');
  const texts = SAMPLE_TEXTS.slice(0, Number(arg('--count') ?? SAMPLE_TEXTS.length));
  let chars = 0;
  for (const model of models) {
    for (const [vi, voice] of voices.entries()) {
      let failed = false;
      for (const [ti, text] of texts.entries()) {
        const file = join(dir, `${model}__voice${vi + 1}__${String(ti + 1).padStart(2, '0')}.mp3`);
        if (existsSync(file)) continue;
        try {
          writeFileSync(file, await synthesize(text, voice, model));
          chars += text.length;
        } catch (e) {
          console.log(`✗ ${model} voice${vi + 1}: ${(e as Error).message}`);
          failed = true;
          break;
        }
      }
      if (!failed) console.log(`✓ ${model} voice${vi + 1}`);
    }
  }
  console.log(`Готово: ${dir} (≈${chars} символов текста)`);
}

/** Voices this account can use, with what kind each is (premade / cloned / library). */
async function showVoices(): Promise<void> {
  const res = await api('/v1/voices');
  if (!res.ok) {
    console.log(`Список голосов недоступен: ${await describeError(res)}`);
    return;
  }
  const data = (await res.json()) as {
    voices: Array<{ voice_id: string; name: string; category?: string; labels?: Record<string, string> }>;
  };
  for (const v of data.voices) {
    const l = v.labels ?? {};
    console.log(`${v.voice_id}  ${(v.category ?? '?').padEnd(12)} ${v.name}  [${[l.gender, l.accent, l.language].filter(Boolean).join(', ')}]`);
  }
}

/** One-off clip, for trying a voice or a model: --say "<text>" --voice <id> --out <file> [--model <id>] */
async function say(text: string): Promise<void> {
  const voice = VOICE;
  const model = arg('--model') ?? MODEL;
  const out = resolve(arg('--out') ?? 'say.mp3');
  mkdirSync(dirname(out), { recursive: true });
  const audio = await synthesize(text, voice, model);
  writeFileSync(out, audio);
  console.log(`✓ ${model}: ${audio.length} байт → ${out}`);
}

async function main(): Promise<void> {
  if (!KEY) throw new Error('ELEVENLABS_API_KEY не задан (.env.local)');
  if (has('--quota')) return showQuota();
  if (has('--models')) return showModels();
  if (has('--voices')) return showVoices();
  const sayText = arg('--say');
  if (sayText) return say(sayText);
  if (!VOICE) throw new Error('ELEVENLABS_VOICE_ID не задан (.env.local)');
  if (has('--audit')) return audit();
  if (has('--prune')) return prune();
  const sampleDir = arg('--sample');
  if (sampleDir) return sample(resolve(sampleDir));

  const { course, sentences } = compile();
  const unit = arg('--unit') ? Number(arg('--unit')) : null;
  // "Unit 0" is the alphabet.
  const unitTexts = unit == null ? null : unit === 0 ? new Set(letterTexts(course)) : new Set([
    ...course.lexicon.filter((l) => l.unit === unit).map((l) => l.ka),
    ...sentences.filter((s) => s.unit === unit).map((s) => s.ka),
  ]);
  const dictOnly = has('--dict') ? new Set(dictionaryTexts()) : null;
  const wanted = audioTexts(course, sentences).filter(
    (t) => (!unitTexts || unitTexts.has(t)) && (!dictOnly || dictOnly.has(t)),
  );

  const manifest: Record<string, string> = existsSync(MANIFEST)
    ? (JSON.parse(readFileSync(MANIFEST, 'utf8')) as Record<string, string>)
    : {};
  const takes = readTakes();
  const todo = wanted.filter((t) => {
    const id = clipId(VOICE, MODEL, t, takes[t] ?? 0);
    return !(manifest[t] === id && existsSync(clipPath(id)));
  });
  const limit = arg('--limit') ? Number(arg('--limit')) : Infinity;
  const totalChars = todo.reduce((n, t) => n + t.length, 0);
  console.log(
    `модель ${MODEL} · нужно клипов: ${todo.length} из ${wanted.length} · символов: ${totalChars}` +
      (Number.isFinite(limit) ? ` · лимит запуска: ${limit}` : ''),
  );
  if (has('--dry-run') || todo.length === 0) return;

  // Respect the per-run character limit up front, so parallel workers cannot overshoot it.
  const batch: string[] = [];
  let planned = 0;
  for (const text of todo) {
    if (planned + text.length > limit) break;
    batch.push(text);
    planned += text.length;
  }

  let spent = 0;
  let made = 0;
  const failures: string[] = [];
  const save = () => writeManifest(manifest);
  const concurrency = Math.max(1, Number(arg('--concurrency') ?? 3));
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < batch.length && failures.length < 5) {
      const text = batch[next++];
      const take = takes[text] ?? 0;
      const id = clipId(VOICE, MODEL, text, take);
      const file = clipPath(id);
      try {
        if (!existsSync(file)) {
          const audio = await synthesize(text, VOICE, MODEL, take > 0 ? take : undefined);
          mkdirSync(dirname(file), { recursive: true });
          writeFileSync(file, audio);
          spent += text.length;
          made++;
          if (made % 50 === 0) {
            save();
            console.log(`  … ${made} клипов, ${spent} символов`);
          }
        }
        manifest[text] = id;
      } catch (e) {
        failures.push(`«${text}»: ${(e as Error).message}`);
      }
    }
  };
  try {
    await Promise.all(Array.from({ length: concurrency }, worker));
  } finally {
    save();
  }
  console.log(`Сделано клипов: ${made}, символов текста: ${spent}. Осталось: ${todo.length - made}.`);
  if (failures.length) {
    console.log(`Ошибок: ${failures.length}${failures.length >= 5 ? ' (остановлено)' : ''}`);
    for (const f of failures) console.log(`  ✗ ${f}`);
    process.exitCode = 1;
  }
}

export function writeManifest(manifest: Record<string, string>): void {
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(MANIFEST, JSON.stringify(sorted, null, 2) + '\n');
}

export function readManifest(): Record<string, string> {
  return existsSync(MANIFEST) ? (JSON.parse(readFileSync(MANIFEST, 'utf8')) as Record<string, string>) : {};
}

/** Every clip file under public/audio, as [id, path]. */
function clipFiles(): Array<[string, string]> {
  if (!existsSync(AUDIO_DIR)) return [];
  const out: Array<[string, string]> = [];
  for (const dir of readdirSync(AUDIO_DIR)) {
    const full = join(AUDIO_DIR, dir);
    if (!statSync(full).isDirectory()) continue;
    for (const f of readdirSync(full)) if (f.endsWith('.mp3')) out.push([f.slice(0, -4), join(full, f)]);
  }
  return out;
}

/**
 * Remove clips nothing refers to any more (another voice, a changed sentence),
 * and manifest entries for texts the course no longer uses.
 */
function prune(): void {
  const { course, sentences } = compile();
  const wanted = new Set(audioTexts(course, sentences));
  const manifest = readManifest();
  const takes = readTakes();
  let dropped = 0;
  for (const text of Object.keys(manifest)) {
    if (!wanted.has(text) || manifest[text] !== clipId(VOICE, MODEL, text, takes[text] ?? 0)) {
      delete manifest[text];
      dropped++;
    }
  }
  const keep = new Set(Object.values(manifest));
  let removed = 0;
  for (const [id, file] of clipFiles()) {
    if (!keep.has(id)) {
      rmSync(file);
      removed++;
    }
  }
  for (const dir of readdirSync(AUDIO_DIR)) {
    const full = join(AUDIO_DIR, dir);
    if (statSync(full).isDirectory() && readdirSync(full).length === 0) rmSync(full, { recursive: true });
  }
  writeManifest(manifest);
  console.log(`Удалено лишних клипов: ${removed}; записей манифеста: ${dropped}; осталось клипов: ${keep.size}.`);
}

/**
 * Cheap sanity check without listening: a clip whose length is far from what
 * its text predicts was probably cut short, padded with silence or misread.
 */
function audit(): void {
  const manifest = readManifest();
  const rows: { text: string; id: string; sec: number; n: number }[] = [];
  const missing: string[] = [];
  for (const [text, id] of Object.entries(manifest)) {
    const file = clipPath(id);
    if (!existsSync(file)) {
      missing.push(text);
      continue;
    }
    // Constant bitrate: duration follows from the size.
    const sec = (statSync(file).size * 8) / (isHiFi(text) ? 128_000 : 64_000);
    rows.push({ text, id, sec, n: text.replace(/[ .?]/g, '').length });
  }
  if (!rows.length) {
    console.log('Клипов нет.');
    return;
  }
  // Every clip has a fixed overhead (onset, tail), so fit  sec ≈ a + b·letters
  // and look at how far each clip is from that line — not at seconds per letter,
  // which would flag every two-letter word.
  const N = rows.length;
  const mx = rows.reduce((s, r) => s + r.n, 0) / N;
  const my = rows.reduce((s, r) => s + r.sec, 0) / N;
  const sxx = rows.reduce((s, r) => s + (r.n - mx) ** 2, 0);
  const b = sxx ? rows.reduce((s, r) => s + (r.n - mx) * (r.sec - my), 0) / sxx : 0;
  const a = my - b * mx;
  const resid = (r: { sec: number; n: number }) => r.sec - (a + b * r.n);
  const sd = Math.sqrt(rows.reduce((s, r) => s + resid(r) ** 2, 0) / N) || 1;
  const total = rows.reduce((n, r) => n + r.sec, 0);
  const odd = rows.filter((r) => r.sec < 0.45 || r.sec > 8 || Math.abs(resid(r)) > 3 * sd);
  console.log(
    `клипов: ${N} · всего ${Math.round(total)} с · длительность ≈ ${a.toFixed(2)} + ${b.toFixed(3)}·букв (разброс ±${sd.toFixed(2)} с) · ` +
      `от ${Math.min(...rows.map((r) => r.sec)).toFixed(2)} до ${Math.max(...rows.map((r) => r.sec)).toFixed(2)} с`,
  );
  if (missing.length) console.log(`нет файла для ${missing.length} текстов, например: ${missing.slice(0, 3).join(' | ')}`);
  if (!odd.length) {
    console.log('Подозрительных по длительности клипов нет.');
    return;
  }
  console.log(`Подозрительные по длительности (${odd.length}):`);
  for (const r of odd.sort((x, y) => Math.abs(resid(y)) - Math.abs(resid(x)))) {
    const d = resid(r);
    console.log(`  ${r.sec.toFixed(2)} с (ожидалось ${(a + b * r.n).toFixed(2)}, ${d > 0 ? '+' : ''}${d.toFixed(2)})  «${r.text}»  [${r.id}]`);
  }
}

// Run only as a script: the retake check imports helpers from this module.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error(`Ошибка: ${(e as Error).message}`);
    process.exit(1);
  });
}
