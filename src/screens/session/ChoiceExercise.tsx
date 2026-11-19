import { useEffect, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { playClip } from '../../audio/player';
import { Icon } from '../../components/ui/Icon';
import { Pill } from '../../components/ui/Pill';
import { SpeakerButton } from '../../components/ui/SpeakerButton';
import { translit } from '../../content/translit';
import type { ExerciseResult, ListenExercise, RecogniseExercise } from '../../engine/types';
import { Body, Card, Eyebrow, Footer, Ka, Muted, PromptRu, RevealCard, Tr, shake } from './parts';

interface Props {
  ex: RecogniseExercise | ListenExercise;
  showTr: boolean;
  autoplay: boolean;
  onDone: (r: ExerciseResult) => void;
}

const PromptRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const ListenBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
`;

const Options = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

type OptState = 'idle' | 'right' | 'wrong';

const Option = styled.button<{ $state: OptState; $ka: boolean; $shake: boolean }>`
  width: 100%;
  text-align: left;
  border-radius: 16px;
  padding: 14px 16px;
  cursor: pointer;
  background: #fff;
  border: 2px solid ${({ theme }) => theme.colors.line};
  box-shadow: 0 2px 0 ${({ theme }) => theme.colors.line};
  font-family: ${({ $ka, theme }) => ($ka ? theme.fonts.ka : theme.fonts.ui)};
  font-weight: ${({ $ka }) => ($ka ? 700 : 800)};
  font-size: ${({ $ka }) => ($ka ? 20 : 16)}px;
  color: ${({ theme }) => theme.colors.ink};
  ${({ $state, theme }) =>
    $state === 'right' &&
    css`
      border-color: ${theme.colors.success};
      background: ${theme.colors.successSoft};
      box-shadow: none;
    `}
  ${({ $state, theme }) =>
    $state === 'wrong' &&
    css`
      border-color: ${theme.colors.danger};
      background: ${theme.colors.dangerSoft};
      box-shadow: none;
      opacity: 0.7;
    `}
  ${({ $shake }) => $shake && shake}

  &:disabled {
    cursor: default;
  }
`;

const OptTr = styled.span`
  display: block;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 12px;
  font-style: italic;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.inkSoft};
  margin-top: 2px;
`;

/** Multiple choice: "recognise" (read and pick) and "listen" (hear and pick). */
export function ChoiceExercise({ ex, showTr, autoplay, onDone }: Props) {
  const [picked, setPicked] = useState<number[]>([]);
  const [shaking, setShaking] = useState<number | null>(null);
  const startedAt = useRef(Date.now());
  const firstPickMs = useRef<number | null>(null);

  const solved = picked.includes(ex.correct);
  const errs = picked.filter((i) => i !== ex.correct).length;
  const promptAudio = ex.kind === 'listen' ? ex.audio : ex.promptAudio;

  useEffect(() => {
    if (ex.kind === 'listen' || (autoplay && promptAudio)) void playClip(promptAudio);
    // Play once when the exercise appears.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // The answer is Georgian only when the question was Russian: read it out once it is found.
    if (solved && autoplay && ex.kind === 'recognise' && ex.dir === 'ru-ka') void playClip(ex.reveal.audio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solved]);

  const pick = (i: number) => {
    if (solved || picked.includes(i)) return;
    if (firstPickMs.current == null) firstPickMs.current = Date.now() - startedAt.current;
    setPicked((p) => [...p, i]);
    if (i !== ex.correct) {
      setShaking(i);
      window.setTimeout(() => setShaking(null), 360);
    }
  };

  return (
    <>
      <Body>
        <Card>
          {ex.kind === 'listen' ? (
            <ListenBox>
              <Eyebrow>Что ты слышишь?</Eyebrow>
              <SpeakerButton audio={ex.audio} size={72} tone="solid" />
              <Muted>Нажми, чтобы послушать ещё раз</Muted>
            </ListenBox>
          ) : ex.dir === 'ka-ru' ? (
            <>
              <Eyebrow>Что это значит?</Eyebrow>
              <PromptRow style={{ marginTop: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Ka $size={32}>{ex.prompt}</Ka>
                  {showTr && <Tr>{translit(ex.prompt)}</Tr>}
                </div>
                <SpeakerButton audio={ex.promptAudio} size={44} />
              </PromptRow>
            </>
          ) : (
            <>
              <Eyebrow>Как это по-грузински?</Eyebrow>
              <PromptRu>{ex.prompt}</PromptRu>
            </>
          )}
        </Card>

        <Options>
          {ex.options.map((o, i) => {
            const state: OptState = !picked.includes(i) ? 'idle' : i === ex.correct ? 'right' : 'wrong';
            return (
              <Option
                key={i}
                type="button"
                $state={state}
                $ka={o.ka}
                $shake={shaking === i}
                disabled={solved || state === 'wrong'}
                onClick={() => pick(i)}
              >
                {o.text}
                {o.ka && showTr && <OptTr>{translit(o.text)}</OptTr>}
              </Option>
            );
          })}
        </Options>

        {solved && <RevealCard reveal={ex.reveal} showTr={showTr} ok={errs === 0} />}
      </Body>

      <Footer>
        <Pill
          kind={errs === 0 ? 'success' : 'primary'}
          size="lg"
          style={{ flex: 1 }}
          disabled={!solved}
          onClick={() => onDone({ type: 'choice', errs, ms: firstPickMs.current ?? Date.now() - startedAt.current })}
        >
          <Icon name="arrow" size={18} />
          Дальше
        </Pill>
      </Footer>
    </>
  );
}
