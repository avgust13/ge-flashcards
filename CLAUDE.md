# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Uchikartuli is an installable PWA that teaches Georgian to a Russian speaker, built around Dmitry Petrov's "skeleton" idea: a small set of sentence patterns (above all the verb matrix: 3 tenses × statement / negation / question) drilled to automatism, on top of spaced repetition. All learner-facing text and the whole UI are in **Russian**.

Stack: Vite + React 18 + TypeScript + styled-components + react-router-dom + vite-plugin-pwa, `idb` (IndexedDB), `ts-fsrs` (scheduler, pinned to 5.x), vitest. No linter.

The 16-unit course has content for units 1–4, plus an alphabet track (33 letters with sound) that runs alongside it. The older vocabulary trainer (836 words with pictures) remains as "free practice".

## Commands

```bash
npm run dev             # Vite dev server on http://localhost:5173 (binds on LAN too)
npm run build           # tsc (app) + tsc (scripts) + content validation + vite build
npm test                # vitest: pure logic only (scheduler, composer, grading, validator, storage)
npm run content         # compile content-src/ → public/content/ (deterministic, offline)
npm run content:verify  # check the verb table against Wiktionary / a blind pass / a corpus list
npm run content:tts     # generate audio with ElevenLabs (--quota, --dry-run, --unit N, --limit CHARS, --audit; --unit 0 = alphabet)
npm run content:stt     # recognise the clips back to text (--all) and re-record mismatches (--retake [--max N] [--offset N] [--letters])
```

`PWA_DEV=1 npm run dev` enables the service worker in dev (off by default: it serves stale content while authoring). If a running dev server ever picks up an older `vite.config.ts` (e.g. after switching branches), touch the file to restart it — otherwise a dev service worker can keep serving a stale `index.html`.

## Architecture

### Two-stage boot
`src/state/AppContext.tsx` gates the app on IndexedDB progress (`initProgress`) plus the small course JSON (`loadCourse`, a few hundred KB). The 67 MB `public/words.json` is **not** part of boot: `WordsProvider.ensureWords()` loads it lazily and only the legacy routes sit behind `<RequireWords>` in `src/App.tsx`.

Routes: `/` Home · `/session` the one session runner · `/done` summary · `/course`, `/course/:unitId` · `/verbs`, `/verbs/:verbId` (matrix) · `/alphabet` · `/settings` · legacy behind `RequireWords`: `/levels`, `/select/:mode`, `/session/flash`, `/session/alpha`, `/summary`.

### Content (`content-src/` → `public/content/`)
- `content-src/verbs.ts` — **the only source of Georgian verb forms**: 18 hand-entered forms per verb. Never derive a form by rule and never take one from a model.
- `content-src/lexicon.ts`, `units.ts`, `sentences.ts` — words, the unit outline (ordered steps), and deterministic sentence templates. No LLM is involved in building sentences.
- `content-src/letters.ts` — the alphabet: 33 letters in 6 groups (order of introduction), each with a **unique** Russian sound label (`ru`: თ is `тʰ`, ტ is `т’` — the validator rejects two letters with the same label), look-alikes, sound-alikes, the syllable that is voiced (`say`), an example word, and `LETTER_PAIRS` — minimal-pair words that differ in exactly one confusable letter.
- `scripts/content/verify-verbs.ts` writes `content-src/generated/verb-status.json`. A cell is shippable only as `verified` (in a Wiktionary conjugation table) or `auto-verified` (independent derivation agrees **and** the form is attested in a corpus list). Unverified cells and their sentences are dropped by the build.
- `scripts/content/validate.ts` is a closed-world check run by `npm run build` and the tests: every token must be a verified verb form or a lexicon surface; "არ" directly before the verb; question ⇔ "?"; subject pronoun case matches the verb and tense; nothing uses vocabulary from a later unit; every card has an example usable at the moment it is introduced.
- `src/content/types.ts` and `translit.ts` are shared with the scripts — keep them free of DOM / `import.meta`.
- `src/content/store.ts` holds the live arrays (`UNITS`, `VERBS`, `LEXICON`, `SENTENCES`, `LETTERS`, `LETTER_GROUPS`, `LETTER_PAIRS`), filled in place like `WORDS`.
- `src/content/reading.ts` decides whether a transliteration is shown. Screens call `trVisible(text)` / `trOnReveal()` instead of reading the setting: in the default `auto` mode it is shown only while the text contains a letter whose card is not yet in review.

### Cards
A card is the smallest thing forgotten independently: word `w:<lexId>`, verb cell `c:<verb>.<tense>.<person>`, pattern `c:<neg|q|shi|ze>`, set phrase `s:<id>`, letter `l:<letter>`. Template sentences are **rotating examples of a cell, not cards** — showing one is a review of its `focus` card.

### Scheduling (`src/srs/`)
- `fsrs.ts` is the only importer of `ts-fsrs` (adapter over our own serialisable `SrsCard`).
- `ladder.ts` — exercise by card state: recognise → assemble → speak, listening for mature cards. Letters have their own ladder: letter → sound, heard syllable → letter, sound → letter, and for mature letters a minimal-pair word by ear.
- `rating.ts` — outcome → grade. Objective exercises never yield Easy; a miss is Again, never Hard.
- `composer.ts` — pure session planner (time budget in minutes, reviews first, per-day new-card allowance, backlog mode). The daily session opens its new material with a few letters (`AUTO_NEW_LETTERS` per day) until the alphabet is done; `composeAlphabet` plans the sessions started from `/alphabet`.
- `mastery.ts` — "automatism" (last 3 production attempts passed, 2 of them fast) and the gate that unlocks the next unit.
- All time goes through `clock.ts` (`now()`), and the study day rolls over at 04:00 (`day.ts`).

### Engine (`src/engine/`)
`build.ts` picks an example that uses only introduced material and builds distractors where the card is tested; `grade.ts` checks tile answers by rule (verb last, "არ" before it, free order otherwise); `session.ts` is a serialisable session state machine; `run.ts` glues these to the stores.

### Persistence (`src/db/`)
IndexedDB is the store of record with a full in-memory mirror (`progress.ts`), so reads are synchronous. One answer = one transaction over `cards`, `revlog`, `days`, `exposure`. `migrate-v1.ts` copies the old localStorage word scores once. `backup.ts` exports/imports everything except `secrets`. `src/data/stats.ts` is a thin façade for the legacy word score (EMA).

### Audio
Course clips are separate files `public/audio/<2 hex>/<id>.mp3`, `id = sha1(voice|model|text)` with `|128` appended for hi-fi clips and `|takeN` for a re-recorded take; `content-src/audio-manifest.json` maps text → id and `public/content/audio.json` advertises only clips that exist. Clips are 64 kbps, except letter syllables and minimal-pair words (`hiFiTexts` in `scripts/content/build.ts`), which are 128 kbps so that თ/ტ, კ/ქ, ც/წ, ჩ/ჭ, პ/ფ stay distinguishable. Missing audio must degrade gracefully (disabled speaker, no listening exercise). `src/audio/player.ts` owns one shared `<audio>` element and plays through `src/audio/cache.ts`, which also implements "download all audio for offline" (Settings) into the same `audio-v1` cache the service worker uses. Legacy words still carry inline base64 audio/images in `words.json`.

`npm run content:stt` is the only automatic check of pronunciation: each clip is recognised back to text (ElevenLabs Scribe) and mismatches are re-recorded with another seed (`content-src/audio-takes.json`; report in `content-src/review/stt-report.md`). The recogniser has known biases on isolated syllables and very short words, so a mismatch there is a flag to listen, not proof of a bad clip.

ElevenLabs notes: `eleven_multilingual_v2` does **not** support Georgian (the original word clips were made with it); use `eleven_v4`/`eleven_v3`. Library voices cannot be used through the API on the free plan.

### Legacy data layer
`src/data/words.ts` and `categories.ts` export `WORDS` / `CATEGORIES` as arrays mutated in place via `splice`. This is intentional — do not replace the arrays. Do not edit `public/words.json` (each edit adds ~67 MB to git history); add or correct words in `content-src/lexicon.ts` (new ids start at 2001).

Word cards (`screens/cards/`, `CardSession.tsx`) must not leak the answer: the question side shows no picture and no translation, the grade buttons and swipes work only after the card has been flipped, and the direction (`freeDirection`: Georgian → Russian or Russian → Georgian) is chosen on the selection screen. The spell-the-word drill (`AlphabetSession.tsx`) takes its sound labels from the course alphabet.

### Theme and folders
Design tokens in `src/theme/tokens.ts`; use `theme.fonts.ka` (Noto Sans Georgian) for any ქართული text. Fonts are self-hosted through `@fontsource-variable/*` (imported in `src/main.tsx`) — no request leaves the origin, so the app renders correctly offline. Shared primitives in `src/components/ui/`; screens in `src/screens/<Name>.tsx` with their own sub-folder for screen-specific parts (`screens/session/`, `screens/cards/`, …).

## PWA notes
`registerType: 'prompt'`: a new build waits and is applied from the home screen (`src/pwa.ts`) so a session is never reloaded mid-way. The app shell, the fonts and `content/**/*.json` are precached; `/audio/*.mp3` and `words.json` are cached at runtime (CacheFirst). The server must return real 404s under `/audio/` and `/content/`, or an SPA fallback page could be cached as audio.

## Secrets
Script keys live in `.env.local` (gitignored; see `.env.example`). Never use a `VITE_` prefix for a secret. The repository is public.
