# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Georgian Flashcards is an installable PWA for learning Georgian → Russian. Two practice modes: flashcards (`flash`) and Mkhedruli alphabet drill (`alpha`). Built with Vite + React 18 + TypeScript + styled-components + react-router-dom + vite-plugin-pwa. No test runner or linter is configured.

## Commands

```bash
npm run dev       # Vite dev server on http://localhost:5173 (host:true, so it binds on LAN too)
npm run build     # `tsc --noEmit` then `vite build` — type errors fail the build
npm run preview   # Serve the production build (with --host)
```

There is no `lint` or `test` script. Type-checking happens via `tsc --noEmit` inside `npm run build`.

## Architecture

### Entry and routing
`src/main.tsx` mounts `BrowserRouter` → `App`. `App` (`src/App.tsx`) wraps everything in `ThemeProvider` + `GlobalStyle` + `WordsProvider`, then renders a `Gate` component that blocks all routes behind word loading. While `useWordsLoad()` reports `!ready`, the `LoadingScreen` is shown with byte progress; once ready, `SessionProvider` wraps the route tree.

Routes (`src/App.tsx`):
- `/` HomeScreen
- `/levels` LevelsScreen (level journey)
- `/select/:mode` SelectionScreen (`mode` is `flash` or `alpha`)
- `/session/flash` CardSession
- `/session/alpha` AlphabetSession
- `/settings` SettingsScreen
- `/summary` SummaryScreen

### State — two React contexts
- `WordsContext` (`src/state/WordsContext.tsx`): owns global data loading. Calls `loadCategories` then `loadWords` on mount; exposes `{ready, error, loaded, total, wordCount, reloading, reloadWords}`. `reloadWords()` re-fetches `words.json` bypassing browser cache (used by SettingsScreen).
- `SessionContext` (`src/state/SessionContext.tsx`): owns the current run — `{deck, results, mode, startSession, finishSession, reset}`. SelectionScreen calls `startSession`; the session screens populate `results` via `finishSession`; SummaryScreen reads them.

### Data layer — mutable module-scoped arrays
`src/data/words.ts` and `src/data/categories.ts` export `WORDS` and `CATEGORIES` as empty arrays that get **mutated in place** by `loadWords` / `loadCategories` (via `splice(0, len, ...data)`). Anything importing `WORDS` gets the live array reference. This pattern is intentional — do not replace the arrays or change to `let`-bindings without auditing every consumer.

### words.json is large (~67 MB)
`public/words.json` contains base64-encoded audio (MP3) and PNG images **inline per word**. Consequences that propagate through the code:
- `loadWords` does a **streaming fetch** with a `ReadableStream` reader and reports `{loaded, total}` progress via `Content-Length`.
- `vite.config.ts` sets `workbox.maximumFileSizeToCacheInBytes: 100 MiB` so the PWA service worker will actually precache the bundle.
- Treat `words.json` as a runtime asset, not a bundled module. Loaded via `fetch(\`${import.meta.env.BASE_URL}words.json\`)`.

### Levels and the index-range convention
`src/data/levels.ts` defines 5 levels (0..4) each with a `range: [start, end)` of **indices into the words array** (e.g. `[0,100]`, `[100,250]`, ...). `loadWords` calls `backfillLevels(data)` to assign `word.level` based on its position in `words.json` if the field is missing. So **word order in `words.json` is semantically meaningful** — reordering it silently re-labels levels for any word missing an explicit `level`. `levelStats(levelId, words)` computes mastered/learning/weak buckets using `word.correct` as a 0..1 mastery score.

### Theme
Design tokens live in `src/theme/tokens.ts` and are exposed through `ThemeProvider`. Components consume them via styled-components' `({ theme }) => theme.colors.x`. The `Theme` type is declared in `src/styled.d.ts` so `useTheme()` is fully typed. Two font families: `theme.fonts.ui` (Nunito) and `theme.fonts.ka` (Noto Sans Georgian) — use the Georgian font for any ქართული text.

### Folder conventions
- `src/components/ui/` — shared primitives (Pill, Chip, Icon, ProgressBar, …)
- `src/components/install/` — PWA install prompt
- `src/screens/<Name>.tsx` — top-level screen component
- `src/screens/<mode>/` — sub-components owned by that screen (e.g. `screens/cards/FlashCard.tsx`, `screens/alphabet/TileKeyboard.tsx`). Keep screen-specific UI in its sibling folder, not in `components/ui/`.

### Types
`src/types.ts` is the source of truth for `Word`, `Category`, `Mode`, `SessionResult` (discriminated union of `FlashResult | AlphaResult` — narrow with `isFlashResult`). `CategoryId` is a closed string union; adding a category means updating this union *and* `public/categories.json`.

## PWA notes
`vite-plugin-pwa` is configured with `registerType: 'autoUpdate'` and `devOptions.enabled: true`, so the service worker also runs in `npm run dev`. If you see stale assets during development, unregister the SW in DevTools → Application.
