/**
 * Round-trip check of generated audio: transcribe a clip with ElevenLabs
 * Scribe and compare it with the text it was made from. A clip that does not
 * come back as (nearly) the same words is suspect.
 *
 *   tsx --env-file=.env.local scripts/content/stt-check.ts <file.mp3> "<expected text>" [...more pairs]
 *
 * Needs the API key permission "Speech to Text".
 */
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';

const KEY = process.env.ELEVENLABS_API_KEY ?? '';
const MODEL = process.env.ELEVENLABS_STT_MODEL || 'scribe_v2';

function norm(s: string): string {
  return s.replace(/[^ა-ჿ ]/g, '').replace(/\s+/g, ' ').trim();
}

export async function transcribe(file: string): Promise<string> {
  const form = new FormData();
  form.append('model_id', MODEL);
  form.append('language_code', 'ka');
  form.append('file', new Blob([readFileSync(file)], { type: 'audio/mpeg' }), basename(file));
  const res = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': KEY },
    body: form,
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${body.slice(0, 220)}`);
  return (JSON.parse(body) as { text?: string }).text ?? '';
}

async function main(): Promise<void> {
  if (!KEY) throw new Error('ELEVENLABS_API_KEY не задан');
  const args = process.argv.slice(2);
  for (let i = 0; i + 1 < args.length; i += 2) {
    const [file, expected] = [args[i], args[i + 1]];
    const heard = await transcribe(file);
    const ok = norm(heard) === norm(expected);
    console.log(`${ok ? '✓' : '✗'} ${basename(file)}: ожидалось «${expected}», распознано «${heard.trim()}»`);
  }
}

main().catch((e) => {
  console.error(`Ошибка: ${(e as Error).message}`);
  process.exit(1);
});
