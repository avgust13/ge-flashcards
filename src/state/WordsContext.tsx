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
}

const WordsContext = createContext<WordsState | null>(null);

export function WordsProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        await loadCategories(controller.signal);
        await loadWords(
          ({ loaded, total }) => {
            setLoaded(loaded);
            setTotal(total);
          },
          controller.signal,
        );
        setReady(true);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setError((e as Error).message ?? 'Failed to load data');
      }
    })();
    return () => controller.abort();
  }, []);

  const value = useMemo<WordsState>(
    () => ({ ready, error, loaded, total }),
    [ready, error, loaded, total],
  );

  return <WordsContext.Provider value={value}>{children}</WordsContext.Provider>;
}

export function useWordsLoad(): WordsState {
  const ctx = useContext(WordsContext);
  if (!ctx) throw new Error('useWordsLoad must be used inside <WordsProvider>');
  return ctx;
}
