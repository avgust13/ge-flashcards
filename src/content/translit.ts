/**
 * Deterministic Mkhedruli → Latin transliteration, matching the scheme already
 * used by the `tr` field of words.json: ejectives carry an apostrophe
 * (კ k', პ p', ტ t', წ ts', ჭ ch', ყ q'), aspirates do not (ქ k, ფ p, თ t, ც ts, ჩ ch).
 */
const MAP: Record<string, string> = {
  ა: 'a', ბ: 'b', გ: 'g', დ: 'd', ე: 'e', ვ: 'v', ზ: 'z', თ: 't', ი: 'i',
  კ: "k'", ლ: 'l', მ: 'm', ნ: 'n', ო: 'o', პ: "p'", ჟ: 'zh', რ: 'r', ს: 's',
  ტ: "t'", უ: 'u', ფ: 'p', ქ: 'k', ღ: 'gh', ყ: "q'", შ: 'sh', ჩ: 'ch', ც: 'ts',
  ძ: 'dz', წ: "ts'", ჭ: "ch'", ხ: 'kh', ჯ: 'j', ჰ: 'h',
};

export function translit(ka: string): string {
  let out = '';
  for (const ch of ka) out += MAP[ch] ?? ch;
  return out;
}

const GEORGIAN = /^[ა-ჿ]+$/;

/** True when the string consists only of Mkhedruli letters. */
export function isGeorgianWord(s: string): boolean {
  return GEORGIAN.test(s);
}

/** Comparison form: NFC, no zero-width characters, single spaces, trimmed. */
export function normalizeKa(s: string): string {
  return s
    .normalize('NFC')
    .replace(/[​-‍﻿]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
