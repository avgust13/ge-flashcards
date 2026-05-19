import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { loadWords } from '../data/words';
import { loadCategories } from '../data/categories';

interface WordsState {
  ready: boolean;
  error: string | null;
  loaded: number;
  total: number;
  wordCount: number;
  reloading: boolean;
  reloadWords: () => Promise<void>;
}

const WordsContext = createContext<WordsState | null>(null);

export function WordsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(0);
  const [total, setTotal] = useState(0);
  const [wordCount, setWordCount] = useState(0);
  const [reloading, setReloading] = useState(false);

  const loadInitial = async (signal: AbortSignal) => {
    await loadCategories(signal);
    const words = await loadWords(
      ({ loaded, total }) => {
        setLoaded(loaded);
        setTotal(total);
      },
      signal,
    );
    setWordCount(words.length);
  };

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        await loadInitial(controller.signal);
        setReady(true);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setError((e as Error).message ?? 'Failed to load data');
      }
    })();
    return () => controller.abort();
  }, []);

  const reloadWords = async () => {
    setReloading(true);
    setError(null);
    try {
      const words = await loadWords(
        ({ loaded, total }) => {
          setLoaded(loaded);
          setTotal(total);
        },
        undefined,
        true,
      );
      setWordCount(words.length);
    } catch (e) {
      setError((e as Error).message ?? 'Failed to re-download words.json');
      throw e;
    } finally {
      setReloading(false);
    }
  };

  const value = useMemo<WordsState>(
    () => ({ ready, error, loaded, total, wordCount, reloading, reloadWords }),
    [ready, error, loaded, total, wordCount, reloading],
  );

  return <WordsContext.Provider value={value}>{children}</WordsContext.Provider>;
}

export function useWordsLoad(): WordsState {
  const ctx = useContext(WordsContext);
  if (!ctx) throw new Error('useWordsLoad must be used inside <WordsProvider>');
  return ctx;
}
