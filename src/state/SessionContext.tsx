import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Mode, SessionResult, Word } from '../types';

interface SessionState {
  deck: Word[];
  results: SessionResult[];
  mode: Mode;
  startSession: (mode: Mode, deck: Word[]) => void;
  finishSession: (results: SessionResult[]) => void;
  reset: () => void;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [deck, setDeck] = useState<Word[]>([]);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [mode, setMode] = useState<Mode>('flash');

  const startSession = useCallback((m: Mode, d: Word[]) => {
    setMode(m);
    setDeck(d);
    setResults([]);
  }, []);

  const finishSession = useCallback((r: SessionResult[]) => {
    setResults(r);
  }, []);

  const reset = useCallback(() => {
    setDeck([]);
    setResults([]);
  }, []);

  const value = useMemo(
    () => ({ deck, results, mode, startSession, finishSession, reset }),
    [deck, results, mode, startSession, finishSession, reset],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}
