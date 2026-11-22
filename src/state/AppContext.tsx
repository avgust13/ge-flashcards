import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { loadCourse } from '../content/store';
import { initProgress } from '../db/progress';
import { initSecrets } from '../db/secrets';
import { watchUserSentences } from '../tutor/phrases';

type Boot = { status: 'loading' } | { status: 'ready' } | { status: 'error'; message: string };

const AppContext = createContext<Boot>({ status: 'loading' });

// Module-level singleton: React StrictMode runs effects twice in development,
// and the database migration must run exactly once.
let bootPromise: Promise<void> | null = null;

function boot(): Promise<void> {
  if (!bootPromise) {
    bootPromise = Promise.all([initProgress(), loadCourse()]).then(
      () => {
        // Phrases the learner saved become drillable; whether a tutor key exists is learned in the background.
        watchUserSentences();
        void initSecrets();
      },
      (e) => {
        bootPromise = null;
        throw e;
      },
    );
  }
  return bootPromise;
}

/**
 * First-stage boot: saved progress and the small course files.
 * The 67 MB legacy word library is NOT part of it — see `RequireWords`.
 */
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Boot>({ status: 'loading' });

  useEffect(() => {
    let alive = true;
    boot().then(
      () => alive && setState({ status: 'ready' }),
      (e: unknown) =>
        alive &&
        setState({
          status: 'error',
          message: e instanceof Error ? e.message : 'Не удалось запустить приложение',
        }),
    );
    return () => {
      alive = false;
    };
  }, []);

  return <AppContext.Provider value={state}>{children}</AppContext.Provider>;
}

export function useBoot(): Boot {
  return useContext(AppContext);
}
