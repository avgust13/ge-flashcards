/**
 * Thin wrapper over the browser's speech recognition (Chrome on Android does
 * Georgian, online). Everything here degrades to "not supported": the "say it
 * aloud" exercise never depends on it.
 */

interface RecognitionAlternative {
  transcript: string;
}
interface RecognitionEvent {
  results: ArrayLike<ArrayLike<RecognitionAlternative>>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}
type RecognitionCtor = new () => Recognition;

function ctor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const speechSupported = (): boolean => ctor() !== null;

export type ListenError = 'unsupported' | 'denied' | 'silence' | 'network' | 'failed';

export interface Listening {
  /** Candidate transcripts, best first; rejects with a `ListenError`. */
  result: Promise<string[]>;
  /** Stop listening now and settle with whatever was heard. */
  stop(): void;
}

/** Listen for one Georgian phrase. */
export function listenOnce(lang = 'ka-GE'): Listening {
  const Ctor = ctor();
  if (!Ctor) return { result: Promise.reject<string[]>('unsupported' satisfies ListenError), stop: () => {} };
  const rec = new Ctor();
  rec.lang = lang;
  rec.interimResults = false;
  rec.maxAlternatives = 5;
  let heard: string[] | null = null;
  let failure: ListenError | null = null;
  const result = new Promise<string[]>((resolve, reject) => {
    rec.onresult = (e) => {
      const first = e.results[0];
      heard = first ? Array.from({ length: first.length }, (_, i) => first[i].transcript) : [];
    };
    rec.onerror = (e) => {
      failure =
        e.error === 'not-allowed' || e.error === 'service-not-allowed'
          ? 'denied'
          : e.error === 'no-speech'
            ? 'silence'
            : e.error === 'network'
              ? 'network'
              : 'failed';
    };
    rec.onend = () => {
      if (heard && heard.length) resolve(heard);
      else reject(failure ?? ('silence' satisfies ListenError));
    };
    try {
      rec.start();
    } catch {
      reject('failed' satisfies ListenError);
    }
  });
  return {
    result,
    stop: () => {
      try {
        rec.stop();
      } catch {
        // already stopped
      }
    },
  };
}

export const LISTEN_ERROR_RU: Record<ListenError, string> = {
  unsupported: 'В этом браузере нет распознавания речи.',
  denied: 'Нет доступа к микрофону. Разреши его для этого сайта.',
  silence: 'Ничего не услышано. Попробуй ещё раз, поближе к микрофону.',
  network: 'Распознаванию нужен интернет.',
  failed: 'Распознавание не сработало. Попробуй ещё раз.',
};
