import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { playClip } from '../../audio/player';
import { Icon } from '../../components/ui/Icon';
import { Pill } from '../../components/ui/Pill';
import type { ExerciseResult, SpeakExercise as Ex } from '../../engine/types';
import { compareSpoken, type SpokenResult } from '../../speech/compare';
import { MAX_RECORD_MS, playBlob, recorderSupported, startRecording, type Recording } from '../../speech/recorder';
import { LISTEN_ERROR_RU, listenOnce, speechSupported, type ListenError, type Listening } from '../../speech/recognise';
import { RATING_RU } from '../../srs/rating';
import type { Rating } from '../../srs/types';
import { AiBadge, Body, Card, Eyebrow, Footer, Muted, PromptRu, RevealCard, shortInterval } from './parts';

interface Props {
  ex: Ex;
  autoplay: boolean;
  /** Offer the microphone before the answer is shown (a setting). */
  speechCheck: boolean;
  /** Time until the card comes back for each grade, ms. */
  intervals: Record<Rating, number> | null;
  onDone: (r: ExerciseResult) => void;
}

const Hint = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  color: ${({ theme }) => theme.colors.inkSoft};
  font-size: 14px;
  font-weight: 700;
`;

const Grades = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  flex: 1;
`;

const COLORS: Record<Rating, [string, string]> = {
  1: ['#E84C4C', '#B93636'],
  2: ['#F2B441', '#C48A1B'],
  3: ['#36B37E', '#228B61'],
  4: ['#3B82F6', '#2563C9'],
};

const GradeBtn = styled.button<{ $r: Rating; $suggested: boolean }>`
  border: none;
  border-radius: 16px;
  padding: 10px 4px 8px;
  cursor: pointer;
  color: #fff;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-weight: 900;
  font-size: 13px;
  background: ${({ $r }) => COLORS[$r][0]};
  box-shadow: 0 3px 0 ${({ $r }) => COLORS[$r][1]};
  outline: ${({ $suggested, theme }) => ($suggested ? `3px solid ${theme.colors.ink}` : 'none')};
  outline-offset: 2px;

  span {
    display: block;
    font-size: 11px;
    font-weight: 700;
    opacity: 0.9;
    margin-top: 2px;
  }

  &:active {
    transform: translateY(1px);
  }
`;

const Before = styled.div`
  display: flex;
  gap: 8px;
  flex: 1;
`;

const Heard = styled.div<{ $tone: 'good' | 'warn' | 'plain' }>`
  border-radius: 16px;
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.4;
  color: ${({ theme }) => theme.colors.ink};
  background: ${({ $tone, theme }) =>
    $tone === 'good' ? theme.colors.successSoft : $tone === 'warn' ? theme.colors.warnSoft : theme.colors.card};

  b {
    font-family: ${({ theme }) => theme.fonts.ka};
    font-weight: 700;
  }
`;

const Mine = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const VERDICT_RU: Record<SpokenResult['verdict'], string> = {
  match: 'совпало',
  close: 'почти совпало — сверь на слух',
  different: 'микрофон услышал другое',
  nothing: 'ничего не распознано',
};

type Mic = { status: 'idle' } | { status: 'listening' } | { status: 'error'; error: ListenError };
type Take = { status: 'idle' } | { status: 'recording' } | { status: 'ready'; blob: Blob } | { status: 'error' };

/**
 * The core exercise: see the Russian prompt, say it aloud in Georgian, then
 * reveal the answer and grade yourself. The time until the answer is asked
 * for is the measure of automatism.
 *
 * Two optional helpers, both leaving the grade to the learner: the microphone
 * can listen to the answer and say whether it heard the same words, and after
 * the reveal the learner can record a take and play it next to the reference.
 */
export function SpeakExercise({ ex, autoplay, speechCheck, intervals, onDone }: Props) {
  const [revealed, setRevealed] = useState(false);
  const [mic, setMic] = useState<Mic>({ status: 'idle' });
  const [spoken, setSpoken] = useState<SpokenResult | null>(null);
  const [take, setTake] = useState<Take>({ status: 'idle' });
  const startedAt = useRef(Date.now());
  const thinkMs = useRef(0);
  const listening = useRef<Listening | null>(null);
  const recording = useRef<Recording | null>(null);

  const canListen = speechCheck && speechSupported();
  const canRecord = recorderSupported();

  useEffect(
    () => () => {
      // Leaving the exercise frees the microphone.
      listening.current?.stop();
      recording.current?.cancel();
    },
    [],
  );

  const reveal = () => {
    if (!thinkMs.current) thinkMs.current = Date.now() - startedAt.current;
    setRevealed(true);
    if (autoplay) void playClip(ex.reveal.audio);
  };

  const listen = async () => {
    if (mic.status === 'listening') {
      listening.current?.stop();
      return;
    }
    // The thinking is over the moment the learner starts to speak.
    thinkMs.current = Date.now() - startedAt.current;
    setMic({ status: 'listening' });
    const l = listenOnce();
    listening.current = l;
    try {
      const alternatives = await l.result;
      setSpoken(compareSpoken(ex.reveal.ka, alternatives));
      setMic({ status: 'idle' });
      reveal();
    } catch (e) {
      setMic({ status: 'error', error: (typeof e === 'string' ? e : 'failed') as ListenError });
    } finally {
      listening.current = null;
    }
  };

  const record = async () => {
    if (take.status === 'recording') {
      const blob = await recording.current?.stop();
      recording.current = null;
      setTake(blob && blob.size ? { status: 'ready', blob } : { status: 'error' });
      return;
    }
    try {
      recording.current = await startRecording();
      setTake({ status: 'recording' });
      // The recorder stops itself after a few seconds; pick the result up then.
      window.setTimeout(() => {
        if (recording.current) void record();
      }, MAX_RECORD_MS + 100);
    } catch {
      setTake({ status: 'error' });
    }
  };

  const compare = async () => {
    if (take.status !== 'ready') return;
    await playBlob(take.blob);
    void playClip(ex.reveal.audio);
  };

  const suggested: Rating | null = spoken && (spoken.verdict === 'match' || spoken.verdict === 'close') ? 3 : null;

  return (
    <>
      <Body>
        <Card>
          {ex.reveal.ai && <AiBadge tag={ex.reveal.ai} />}
          <Eyebrow>Скажи вслух по-грузински</Eyebrow>
          <PromptRu>{ex.promptRu}</PromptRu>
          {!revealed && (
            <Hint>
              <Icon name="speaker" size={18} />
              {mic.status === 'listening' ? 'Слушаю… говори' : 'Сначала произнеси, потом проверь себя'}
            </Hint>
          )}
        </Card>

        {!revealed && mic.status === 'error' && <Muted style={{ textAlign: 'center' }}>{LISTEN_ERROR_RU[mic.error]}</Muted>}

        {revealed && (
          <>
            {spoken && (
              <Heard $tone={spoken.verdict === 'match' ? 'good' : spoken.verdict === 'nothing' ? 'plain' : 'warn'}>
                Микрофон: {VERDICT_RU[spoken.verdict]}
                {spoken.heard && (
                  <>
                    {' — '}
                    <b>{spoken.heard}</b>
                  </>
                )}
                . Оценку ставишь ты: распознавание ошибается само.
              </Heard>
            )}
            <RevealCard
              reveal={ex.reveal}
              source={ex}
              given={spoken && spoken.verdict === 'different' ? spoken.heard : null}
            />
            {canRecord && (
              <Mine>
                <Pill kind="ghost" size="sm" onClick={record}>
                  {take.status === 'recording' ? 'Стоп' : take.status === 'ready' ? 'Записать ещё раз' : 'Записать себя'}
                </Pill>
                {take.status === 'ready' && (
                  <Pill kind="ghost" size="sm" onClick={compare}>
                    Сравнить: я → образец
                  </Pill>
                )}
                {take.status === 'error' && <Muted>Микрофон недоступен.</Muted>}
              </Mine>
            )}
            <Muted style={{ textAlign: 'center' }}>Насколько легко это далось?</Muted>
          </>
        )}
      </Body>

      <Footer>
        {revealed ? (
          <Grades>
            {([1, 2, 3, 4] as Rating[]).map((r) => (
              <GradeBtn
                key={r}
                type="button"
                $r={r}
                $suggested={suggested === r}
                onClick={() => onDone({ type: 'self', rating: r, ms: thinkMs.current })}
              >
                {RATING_RU[r]}
                {intervals && <span>{shortInterval(intervals[r])}</span>}
              </GradeBtn>
            ))}
          </Grades>
        ) : (
          <Before>
            {canListen && (
              <Pill kind={mic.status === 'listening' ? 'dark' : 'ghost'} size="lg" onClick={listen}>
                {mic.status === 'listening' ? 'Готово' : 'Сказать в микрофон'}
              </Pill>
            )}
            <Pill kind="primary" size="lg" style={{ flex: 1 }} onClick={reveal}>
              Показать ответ
            </Pill>
          </Before>
        )}
      </Footer>
    </>
  );
}
