import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'ge-flashcards/install-dismissed/v1';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export type InstallPlatform = 'ios' | 'native' | 'other';

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !('MSStream' in window);
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function loadDismissTs(): number {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return 0;
    const parsed = JSON.parse(raw) as { ts?: unknown };
    return typeof parsed?.ts === 'number' && Number.isFinite(parsed.ts) ? parsed.ts : 0;
  } catch {
    return 0;
  }
}

export interface InstallPromptApi {
  canInstall: boolean;
  canShowSettings: boolean;
  platform: InstallPlatform;
  install: () => Promise<void>;
  dismiss: () => void;
  installed: boolean;
}

export function useInstallPrompt(): InstallPromptApi {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [dismissTs, setDismissTs] = useState<number>(() => loadDismissTs());

  useEffect(() => {
    const onBefore = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onBefore);
    window.addEventListener('appinstalled', onInstalled);

    if (isStandalone()) setInstalled(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBefore);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferred(null);
  }, [deferred]);

  const dismiss = useCallback(() => {
    const ts = Date.now();
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify({ ts }));
    } catch {
      // noop
    }
    setDismissTs(ts);
    setDeferred(null);
  }, []);

  const platform: InstallPlatform = isIOS() ? 'ios' : deferred ? 'native' : 'other';
  const dismissedRecently = Date.now() - dismissTs < DISMISS_TTL_MS;
  const canInstall =
    !installed && !dismissedRecently && (platform === 'native' || platform === 'ios');
  const canShowSettings = !installed;

  return {
    canInstall,
    canShowSettings,
    platform,
    install,
    dismiss,
    installed,
  };
}
