import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { loadWords, WORDS } from '../data/words';
import { loadCategories } from '../data/categories';
import { applyStatsToWords } from '../data/stats';

interface WordsState {
  ready: boolean;
  error: string | null;
  loaded: number;
  total: number;
  wordCount: number;
  reloading: boolean;
  /** Start downloading the word library if that has not happened yet. Safe to call repeatedly. */
  ensureWords: () => void;
  reloadWords: () => Promise<void>;
}

const WordsContext = createContext<WordsState | null>(null);

/**
 * The legacy vocabulary (public/words.json, ~67 MB with inline media) is
 * loaded lazily: only the free-practice screens need it, so the course itself
 * starts without waiting for the download.
 */
export function WordsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(0);
  const [total, setTotal] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [reloading, setReloading] = useState(false);
  const started = useRef(false);

  const ensureWords = useCallback(() => {
    if (started.current) return;
    started.current = true;
    setError(null);
    (async () => {
      try {
        await loadCategories();
        const words = await loadWords(({ loaded, total }) => {
          setLoaded(loaded);
          setTotal(total);
        });
        applyStatsToWords(WORDS);
        setWordCount(words.length);
        setReady(true);
      } catch (e) {
        started.current = false;
        setError((e as Error).message ?? 'Не удалось загрузить слова');
      }
    })();
  }, []);

  const reloadWords = useCallback(async () => {
    setReloading(true);
    setError(null);
    try {
      await loadCategories();
      const words = await loadWords(
        ({ loaded, total }) => {
          setLoaded(loaded);
          setTotal(total);
        },
        undefined,
        true,
      );
      applyStatsToWords(WORDS);
      setWordCount(words.length);
      started.current = true;
      setReady(true);
    } catch (e) {
      setError((e as Error).message ?? 'Не удалось обновить words.json');
      throw e;
    } finally {
      setReloading(false);
    }
  }, []);

  const value = useMemo<WordsState>(
    () => ({ ready, error, loaded, total, wordCount, reloading, ensureWords, reloadWords }),
    [ready, error, loaded, total, wordCount, reloading, ensureWords, reloadWords],
  );

  return <WordsContext.Provider value={value}>{children}</WordsContext.Provider>;
}

export function useWordsLoad(): WordsState {
  const ctx = useContext(WordsContext);
  if (!ctx) throw new Error('useWordsLoad must be used inside <WordsProvider>');
  return ctx;
}
