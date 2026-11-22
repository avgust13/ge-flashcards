import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { applyStatsToWords } from '../data/stats';
import { loadWords, WORDS } from '../data/words';

interface WordsState {
  ready: boolean;
  error: string | null;
  /** Load the dictionary if that has not happened yet. Safe to call repeatedly. */
  ensureWords: () => void;
}

const WordsContext = createContext<WordsState | null>(null);

/**
 * The picture dictionary is loaded when a free-practice screen is first
 * opened: a small text file. Pictures and audio are separate files that the
 * cards fetch one by one.
 */
export function WordsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const ensureWords = useCallback(() => {
    if (started.current) return;
    started.current = true;
    setError(null);
    loadWords().then(
      () => {
        applyStatsToWords(WORDS);
        setReady(true);
      },
      (e: unknown) => {
        started.current = false;
        setError(e instanceof Error ? e.message : 'Не удалось загрузить словарь');
      },
    );
  }, []);

  const value = useMemo<WordsState>(() => ({ ready, error, ensureWords }), [ready, error, ensureWords]);

  return <WordsContext.Provider value={value}>{children}</WordsContext.Provider>;
}

export function useWordsLoad(): WordsState {
  const ctx = useContext(WordsContext);
  if (!ctx) throw new Error('useWordsLoad must be used inside <WordsProvider>');
  return ctx;
}
