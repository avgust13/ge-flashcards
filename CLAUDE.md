# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Uchikartuli is an installable PWA that teaches Georgian to a Russian speaker, built around Dmitry Petrov's "skeleton" idea: a small set of sentence patterns (above all the verb matrix: 3 tenses × statement / negation / question) drilled to automatism, on top of spaced repetition. All learner-facing text and the whole UI are in **Russian**.

Stack: Vite + React 18 + TypeScript + styled-components + react-router-dom + vite-plugin-pwa, `idb` (IndexedDB), `ts-fsrs` (scheduler, pinned to 5.x), `@anthropic-ai/sdk` + `zod` (the optional AI tutor, a lazy chunk), vitest. No linter.

All 16 units of the course have content (28 verbs, about 260 words, about 900 cards), plus an alphabet track (33 letters with sound) that runs alongside it. The older vocabulary trainer (836 words with pictures) remains as "free practice".

## Commands

```bash
npm run dev             # Vite dev server on http://localhost:5173 (binds on LAN too)
npm run build           # tsc (app) + tsc (scripts) + content validation + vite build
npm test                # vitest: pure logic only (scheduler, composer, grading, validator, storage)
npm run content         # compile content-src/ → public/content/ (deterministic, offline)
npm run content:verify  # check the verb table against Wiktionary / a blind pass / a corpus list
npm run content:verify-lexicon  # check every surface of the lexicon against Wiktionary declension tables / the corpus list
npm run content:tts     # generate audio with ElevenLabs (--quota, --dry-run, --unit N, --limit CHARS, --audit; --unit 0 = alphabet)
npm run content:stt     # recognise the clips back to text (--all) and re-record mismatches (--retake [--max N] [--offset N] [--letters])
npm run tutor:smoke     # run the tutor's real prompts against the API with the key in .env.local (a few cents; `-- badkey` spends nothing)
```

`PWA_DEV=1 npm run dev` enables the service worker in dev (off by default: it serves stale content while authoring). If a running dev server ever picks up an older `vite.config.ts` (e.g. after switching branches), touch the file to restart it — otherwise a dev service worker can keep serving a stale `index.html`.

## Architecture

### Two-stage boot
`src/state/AppContext.tsx` gates the app on IndexedDB progress (`initProgress`) plus the small course JSON (`loadCourse`, a few hundred KB). The 67 MB `public/words.json` is **not** part of boot: `WordsProvider.ensureWords()` loads it lazily and only the legacy routes sit behind `<RequireWords>` in `src/App.tsx`.

Routes: `/` Home · `/session` the one session runner · `/done` summary · `/course`, `/course/:unitId` · `/verbs`, `/verbs/:verbId` (matrix) · `/alphabet` · `/stats` · `/tutor` · `/phrases` · `/settings` · legacy behind `RequireWords`: `/levels`, `/select/:mode`, `/session/flash`, `/session/alpha`, `/summary`.

### Content (`content-src/` → `public/content/`)
- `content-src/verbs.ts` — **the only source of Georgian verb paradigms**: 18 hand-entered forms per verb, plus an optional `opt` row (the optative, «чтобы я сделал») for verbs used after უნდა / მინდა / შემიძლია. Never derive a form by rule and never take one from a model. `cellUnit` schedules each cell; `null` = reference only (shown in the matrix, never a card). `objCase` and `subjectCase` say which case the object and the subject take per tense — the sentence builders and the validator both lean on them. `wikt` lists extra Wiktionary pages for verbs that borrow their future / past from another root.
- `content-src/lexicon.ts` — words. Every surface a sentence may use is declared: the dictionary form and the named forms in `k` (cases `dat` / `erg` / `gen` / `ins` / `adv`, `pl`, postpositions `shi` / `ze` / `dan` / `tan`, `cop` = with the short «есть»). A few frozen verb forms that are taught as vocabulary (მოდი, მომეცით, მქვია) live here too.
- `content-src/patterns.ts` — pattern cards (`c:neg`, `c:dat`, `c:erg`, …): rules that are learned on their own.
- `content-src/units.ts` — the outline: ordered steps (explanations and card groups). An explanation's examples may be literal text, a sentence of the bank (`ref`) or a word (`w`); with `who` they are the lines of a dialogue.
- Sentences are never typed as free Georgian text. `content-src/dsl.ts` builds them from references — a lexicon surface or a verb cell per token — so every word is known by construction. `sentences.ts` holds the templates of units 1–4, `cells.ts` generates three examples per later verb cell from each verb's list of complements, `lines.ts` holds the hand-written lines (question words, possessives, adjectives, set phrases, dialogues, stories). No LLM is involved in building sentences.
- `content-src/letters.ts` — the alphabet: 33 letters in 6 groups (order of introduction), each with a **unique** Russian sound label (`ru`: თ is `тʰ`, ტ is `т’` — the validator rejects two letters with the same label), look-alikes, sound-alikes, the syllable that is voiced (`say`), an example word, and `LETTER_PAIRS` — minimal-pair words that differ in exactly one confusable letter.
- `scripts/content/verify-verbs.ts` writes `content-src/generated/verb-status.json`. A cell is shippable only as `verified` (in a Wiktionary conjugation table) or `auto-verified` (independent derivation agrees **and** the form is attested in a corpus list). Unverified cells and every sentence that uses them are dropped by the build. The independent derivations are kept in `content-src/review/blind-verbs.json`; a new verb needs a new blind pass made **without** showing the table.
- `scripts/content/verify-lexicon.ts` writes `content-src/generated/lexicon-status.json`: each surface is `verified` (in a Wiktionary declension table), `attested` (in the corpus list) or `needs-review`, and the build refuses a word with an unconfirmed surface. Run it after touching `lexicon.ts`. Both checks share `scripts/content/evidence.ts`; pages and the corpus list are cached under `node_modules/.cache`.
- `scripts/content/validate.ts` is a closed-world check run by `npm run build` and the tests: every token (set phrases and explanation examples included) must be a verified verb form or a lexicon surface; a negation word directly before the verb; question ⇔ "?"; the subject and the object are in the case the verb takes in that tense; an attribute agrees with its noun (ცხელ ყავას, ჩემს ძმას); nothing uses vocabulary from a later unit; every word, cell, pattern and phrase is introduced by its unit; every card has an example usable at the moment it is introduced.
- Before recording audio for new sentences, have them proof-read independently (a fresh agent that sees only the sentences): the validator catches forms and cases, not meaning or naturalness.
- `src/content/types.ts` and `translit.ts` are shared with the scripts — keep them free of DOM / `import.meta`.
- `src/content/store.ts` holds the live arrays (`UNITS`, `VERBS`, `LEXICON`, `SENTENCES`, `LETTERS`, `LETTER_GROUPS`, `LETTER_PAIRS`), filled in place like `WORDS`.
- `src/content/reading.ts` decides whether a transliteration is shown. Screens call `trVisible(text)` / `trOnReveal()` instead of reading the setting: in the default `auto` mode it is shown only while the text contains a letter whose card is not yet in review.

### Cards
A card is the smallest thing forgotten independently: word `w:<lexId>`, verb cell `c:<verb>.<prs|aor|fut|opt>.<person>`, pattern `c:<id>` (see `patterns.ts`), set phrase `s:<id>`, letter `l:<letter>`. Template sentences are **rotating examples of a cell or a pattern, not cards** — showing one is a review of its `focus` card. A word that is already in review is also practised inside a sentence that contains it.

A sentence marked `strict` has one word order (two verbs, a clause after a comma, an attribute before its noun, a line of a dialogue) and is graded by exact order; the others are graded by rule.

### Scheduling (`src/srs/`)
- `fsrs.ts` is the only importer of `ts-fsrs` (adapter over our own serialisable `SrsCard`).
- `ladder.ts` — exercise by card state: recognise → assemble → speak, listening for mature cards. Letters have their own ladder: letter → sound, heard syllable → letter, sound → letter, and for mature letters a minimal-pair word by ear.
- `rating.ts` — outcome → grade. Objective exercises never yield Easy; a miss is Again, never Hard.
- `composer.ts` — pure session planner (time budget in minutes, reviews first, per-day new-card allowance, backlog mode). The daily session opens its new material with a few letters (`AUTO_NEW_LETTERS` per day) until the alphabet is done; `composeAlphabet` plans the sessions started from `/alphabet`.
- `backlog.ts` — "распределить долг": when more is due than fits a day, moves the overdue reviews over the next days (only the due date changes). `stats.ts` — the numbers of the statistics screen.
- `mastery.ts` — "automatism" (last 3 production attempts passed, 2 of them fast) and the gate that unlocks the next unit.
- All time goes through `clock.ts` (`now()`), and the study day rolls over at 04:00 (`day.ts`).

### AI tutor (`src/tutor/`, optional)
The learner may add their own Claude API key in Settings; without it (or offline) every tutor control is disabled and nothing in a lesson waits for the tutor.
- `client.ts` is the **only** file that imports `@anthropic-ai/sdk` and `zod`; `index.ts` loads it with a dynamic `import()`, so the SDK is a separate chunk. Requests go straight from the browser to Anthropic (`dangerouslyAllowBrowser` — it is the learner's own key on the learner's own device; there is no backend). Model `claude-opus-5-5`, structured outputs through `client.beta.messages.parse` + `betaZodOutputFormat`, server-side refusal fallbacks on, the explanation streamed.
- `prompts.ts` — pure prompt builders. The first system block (role, house rules, every course form grouped by unit) must stay byte-stable: it is the cached prefix. Per-request text goes into the second block and the user turn. `scripts/tutor/smoke.ts` runs the same prompts from Node — use it to judge a prompt change before shipping.
- The key lives in the IndexedDB store `secrets` (`src/db/secrets.ts`): never in `kv`, never in a backup, never logged.
- **Everything Georgian the tutor writes is checked against the course tables** (`src/content/known.ts`: lexicon surfaces + verified verb forms) and shown under a label — «ИИ · формы есть в таблицах» or «ИИ · не проверено» (`AiBadge`). The label says the words exist, not that the sentence is right. Never show tutor output without it, and never feed tutor output into `content-src/`: the tutor is not a source of forms.
- Features: «Почему так?» under an answer (`context.ts` writes out what the app knows about the sentence; the tutor explains from those facts), «Мои фразы» (`/phrases`), a role-play dialogue and a check of the learner's own text (`/tutor`).
- A saved phrase (`phrases.ts`) is a user item plus a card `s:u:<id>` in the learning queue. Its sentence is registered in the store apart from `SENTENCES`, so unverified text is never offered as a wrong option next to course material.

### Speech (`src/speech/`)
Both helpers are optional and leave the grade to the learner. `recognise.ts` wraps the browser's speech recognition (Chrome on Android, `ka-GE`, online); with the setting `speechCheck` on, "say it aloud" offers a microphone and `compare.ts` says whether the recogniser heard the same letters — a hint that outlines the suggested grade, never a grade. `recorder.ts` records a take in memory so it can be played next to the reference clip; nothing is stored.

### Engine (`src/engine/`)
`build.ts` picks an example that uses only introduced material and builds distractors where the card is tested; `grade.ts` checks tile answers by rule (verb last, "არ" before it, free order otherwise); `session.ts` is a serialisable session state machine; `run.ts` glues these to the stores.

### Persistence (`src/db/`)
IndexedDB is the store of record with a full in-memory mirror (`progress.ts`), so reads are synchronous. One answer = one transaction over `cards`, `revlog`, `days`, `exposure`. `migrate-v1.ts` copies the old localStorage word scores once. `backup.ts` exports/imports everything except `secrets` (the tutor key). User items (`userItems`: saved phrases) are mirrored in `progress.ts` like cards. `reports.ts` keeps the learner's "здесь ошибка?" notes on cards (and hides a flagged card) — there is no server, the notes are copied out from Settings. `src/data/stats.ts` is a thin façade for the legacy word score (EMA).

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
`registerType: 'prompt'`: a new build waits and is applied from the home screen (`src/pwa.ts`) so a session is never reloaded mid-way. The one exception is `public/sw-legacy-migrate.js` (imported into `sw.js`): it takes over at once from the pre-course flashcard app's "autoUpdate" worker, whose pages cannot apply an update, and reloads them. It recognises that worker by `/registerSW.js` in its precache, so the build must never ship a `registerSW.js`. The app shell, the fonts and `content/**/*.json` are precached; `/audio/*.mp3` and `words.json` are cached at runtime (CacheFirst). The server must return real 404s under `/audio/` and `/content/`, or an SPA fallback page could be cached as audio.

## Deployment
A push to `main` runs `.github/workflows/deploy.yml`: test, build, then rsync `dist/` to `deploy@$SSH_HOST:site/`, which is `/opt/uchikartuli/site` on the VPS (uchikartuli.xyz). The VPS is shared: the Caddy in `/opt/edge` owns ports 80/443 and TLS for every site on it (floor.pavloff.dev too) and proxies uchikartuli.xyz to this site's own static Caddy (`deploy/caddy/Caddyfile`: SPA fallback, real 404s, cache headers), reached as `uchikartuli-web` on the docker network `edge`. The `deploy` user's key is locked to `rrsync /opt/uchikartuli`, so it can only upload files. After a server reinstall, run `deploy/setup-server.sh` (its header says how; it is idempotent). Repository secrets: `SSH_HOST`, `SSH_USER` (= `deploy`), `SSH_PRIVATE_KEY` (the private half of `~/.ssh/uchikartuli_deploy`).

## Secrets
Script keys live in `.env.local` (gitignored; see `.env.example`). Never use a `VITE_` prefix for a secret. The repository is public. The tutor key inside the app is a different thing: the learner types it into Settings and it stays in that browser's `secrets` store.
