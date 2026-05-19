# Georgian Flashcards

Georgian Flashcards is an open-source web app for learning Georgian through fast practice sessions.

It includes:
- Flashcard drills (Georgian -> Russian)
- Alphabet trainer for Mkhedruli letters
- Session summaries and progress feedback
- Installable PWA support for mobile/desktop use

## Tech Stack

- React 18
- TypeScript
- Vite
- styled-components
- React Router
- vite-plugin-pwa

## Getting Started

### Prerequisites

- Node.js 18+ (recommended)
- npm

### Install

```bash
npm install
```

### Run in Development

```bash
npm run dev
```

Then open the local URL shown in your terminal (typically `http://localhost:5173`).

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Data Sources

Static learning content is loaded from:
- `public/categories.json`
- `public/words.json`

## Project Structure

```text
src/
  components/    Reusable UI and install prompt
  data/          Data loading and helpers
  hooks/         Custom React hooks
  screens/       App screens and mode-specific UI
  state/         Context providers for session and words
  theme/         Design tokens and global styles
  utils/         Shared utilities
```

## Open Source

This project is open source and welcomes community contributions.

It is licensed under the MIT License.

If you want to contribute, you can:
- Open an issue for bugs or feature requests
- Submit a pull request with improvements
- Share ideas for new learning modes or datasets

## Notes

- The app is configured as a Progressive Web App (PWA) via `vite-plugin-pwa`.
- Install prompts are shown when the browser supports app installation.

## License

This project is licensed under the MIT License. See `LICENSE` for details.
