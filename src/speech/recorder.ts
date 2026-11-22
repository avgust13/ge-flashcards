/**
 * Record the learner's own voice for a moment, to play it back next to the
 * reference clip. Nothing is stored or sent anywhere: the recording lives in
 * memory until the exercise is left.
 */

export const recorderSupported = (): boolean =>
  typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

export interface Recording {
  /** Stop and get the audio. */
  stop(): Promise<Blob>;
  /** Drop it and free the microphone. */
  cancel(): void;
}

/** Longest take: a phrase of the course takes two to four seconds. */
export const MAX_RECORD_MS = 8000;

export async function startRecording(): Promise<Recording> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const rec = new MediaRecorder(stream);
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };
  const release = () => {
    for (const track of stream.getTracks()) track.stop();
  };
  const done = new Promise<Blob>((resolve) => {
    rec.onstop = () => {
      release();
      resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }));
    };
  });
  rec.start();
  const timer = setTimeout(() => rec.state === 'recording' && rec.stop(), MAX_RECORD_MS);
  return {
    stop: () => {
      clearTimeout(timer);
      if (rec.state === 'recording') rec.stop();
      return done;
    },
    cancel: () => {
      clearTimeout(timer);
      if (rec.state === 'recording') rec.stop();
      else release();
    },
  };
}

/** Play a recording once; resolves when it has finished (or cannot play). */
export function playBlob(blob: Blob): Promise<void> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    const finish = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onended = finish;
    audio.onerror = finish;
    audio.play().catch(finish);
  });
}
