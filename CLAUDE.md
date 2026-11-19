# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Uchikartuli is an installable PWA that teaches Georgian to a Russian speaker, built around Dmitry Petrov's "skeleton" idea: a small set of sentence patterns (above all the verb matrix: 3 tenses × statement / negation / question) drilled to automatism, on top of spaced repetition. All learner-facing text and the whole UI are in **Russian**.

Stack: Vite + React 18 + TypeScript + styled-components + react-router-dom + vite-plugin-pwa, `idb` (IndexedDB), `ts-fsrs` (scheduler, pinned to 5.x), vitest. No linter.

The 16-unit course has content for units 1–4. The older vocabulary trainer (836 words with pictures) remains as "free practice".

## Commands

```bash
npm run dev             # Vite dev server on http://localhost:5173 (binds on LAN too)
npm run build           # tsc (app) + tsc (scripts) + content validation + vite build
npm test                # vitest: pure logic only (scheduler, composer, grading, validator, storage)
npm run content         # compile content-src/ → public/content/ (deterministic, offline)
npm run content:verify  # check the verb table against Wiktionary / a blind pass / a corpus list
npm run content:tts     # generate audio with ElevenLabs (--quota, --dry-run, --unit N, --limit CHARS)
```

`PWA_DEV=1 npm run dev` enables the service worker in dev (off by default: it serves stale content while authoring).

## Architecture

### Two-stage boot
`src/state/AppContext.tsx` gates the app on IndexedDB progress (`initProgress`) plus the small course JSON (`loadCourse`, a few hundred KB). The 67 MB `public/words.json` is **not** part of boot: `WordsProvider.ensureWords()` loads it lazily and only the legacy routes sit behind `<RequireWords>` in `src/App.tsx`.

Routes: `/` Home · `/session` the one session runner · `/done` summary · `/course`, `/course/:unitId` · `/verbs`, `/verbs/:verbId` (matrix) · `/settings` · legacy behind `RequireWords`: `/levels`, `/select/:mode`, `/session/flash`, `/session/alpha`, `/summary`.

### Content (`content-src/` → `public/content/`)
- `content-src/verbs.ts` — **the only source of Georgian verb forms**: 18 hand-entered forms per verb. Never derive a form by rule and never take one from a model.
- `content-src/lexicon.ts`, `units.ts`, `sentences.ts` — words, the unit outline (ordered steps), and deterministic sentence templates. No LLM is involved in building sentences.
- `scripts/content/verify-verbs.ts` writes `content-src/generated/verb-status.json`. A cell is shippable only as `verified` (in a Wiktionary conjugation table) or `auto-verified` (independent derivation agrees **and** the form is attested in a corpus list). Unverified cells and their sentences are dropped by the build.
- `scripts/content/validate.ts` is a closed-world check run by `npm run build` and the tests: every token must be a verified verb form or a lexicon surface; "არ" directly before the verb; question ⇔ "?"; subject pronoun case matches the verb and tense; nothing uses vocabulary from a later unit; every card has an example usable at the moment it is introduced.
- `src/content/types.ts` and `translit.ts` are shared with the scripts — keep them free of DOM / `import.meta`.
- `src/content/store.ts` holds the live arrays (`UNITS`, `VERBS`, `LEXICON`, `SENTENCES`), filled in place like `WORDS`.

### Cards
A card is the smallest thing forgotten independently: word `w:<lexId>`, verb cell `c:<verb>.<tense>.<person>`, pattern `c:<neg|q|shi|ze>`, set phrase `s:<id>`. Template sentences are **rotating examples of a cell, not cards** — showing one is a review of its `focus` card.

### Scheduling (`src/srs/`)
- `fsrs.ts` is the only importer of `ts-fsrs` (adapter over our own serialisable `SrsCard`).
- `ladder.ts` — exercise by card state: recognise → assemble → speak, listening for mature cards.
- `rating.ts` — outcome → grade. Objective exercises never yield Easy; a miss is Again, never Hard.
- `composer.ts` — pure session planner (time budget in minutes, reviews first, per-day new-card allowance, backlog mode).
- `mastery.ts` — "automatism" (last 3 production attempts passed, 2 of them fast) and the gate that unlocks the next unit.
- All time goes through `clock.ts` (`now()`), and the study day rolls over at 04:00 (`day.ts`).

### Engine (`src/engine/`)
`build.ts` picks an example that uses only introduced material and builds distractors where the card is tested; `grade.ts` checks tile answers by rule (verb last, "არ" before it, free order otherwise); `session.ts` is a serialisable session state machine; `run.ts` glues these to the stores.

### Persistence (`src/db/`)
IndexedDB is the store of record with a full in-memory mirror (`progress.ts`), so reads are synchronous. One answer = one transaction over `cards`, `revlog`, `days`, `exposure`. `migrate-v1.ts` copies the old localStorage word scores once. `backup.ts` exports/imports everything except `secrets`. `src/data/stats.ts` is a thin façade for the legacy word score (EMA).

### Audio
Course clips are separate files `public/audio/<2 hex>/<id>.mp3`, `id = sha1(voice|model|text)`; `content-src/audio-manifest.json` maps text → id and `public/content/audio.json` advertises only clips that exist. Missing audio must degrade gracefully (disabled speaker, no listening exercise). `src/audio/player.ts` owns one shared `<audio>` element. Legacy words still carry inline base64 audio/images in `words.json`.

ElevenLabs notes: `eleven_multilingual_v2` does **not** support Georgian (the original word clips were made with it); use `eleven_v4`/`eleven_v3`. Library voices cannot be used through the API on the free plan.

### Legacy data layer
`src/data/words.ts` and `categories.ts` export `WORDS` / `CATEGORIES` as arrays mutated in place via `splice`. This is intentional — do not replace the arrays. Do not edit `public/words.json` (each edit adds ~67 MB to git history); add or correct words in `content-src/lexicon.ts` (new ids start at 2001).

### Theme and folders
Design tokens in `src/theme/tokens.ts`; use `theme.fonts.ka` (Noto Sans Georgian) for any ქართული text. Shared primitives in `src/components/ui/`; screens in `src/screens/<Name>.tsx` with their own sub-folder for screen-specific parts (`screens/session/`, `screens/cards/`, …).

## PWA notes
`registerType: 'prompt'`: a new build waits and is applied from the home screen (`src/pwa.ts`) so a session is never reloaded mid-way. The app shell and `content/**/*.json` are precached; `/audio/*.mp3` and `words.json` are cached at runtime (CacheFirst). The server must return real 404s under `/audio/` and `/content/`, or an SPA fallback page could be cached as audio.

## Secrets
Script keys live in `.env.local` (gitignored; see `.env.example`). Never use a `VITE_` prefix for a secret. The repository is public.
