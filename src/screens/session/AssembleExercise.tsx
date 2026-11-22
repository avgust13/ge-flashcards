import { useEffect, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { playClip } from '../../audio/player';
import { Icon } from '../../components/ui/Icon';
import { Pill } from '../../components/ui/Pill';
import { trVisible } from '../../content/reading';
import { translit } from '../../content/translit';
import { checkAssemble } from '../../engine/grade';
import type { AssembleExercise as Ex, ExerciseResult, Tile } from '../../engine/types';
import { AiBadge, Body, Card, Eyebrow, Footer, Muted, PromptRu, RevealCard, shake } from './parts';

interface Props {
  ex: Ex;
  autoplay: boolean;
  onDone: (r: ExerciseResult) => void;
}

const Line = styled.div<{ $shake: boolean; $state: 'idle' | 'wrong' | 'right' }>`
  min-height: 64px;
  border-radius: 18px;
  padding: 10px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-content: flex-start;
  background: #fff;
  border: 2px dashed
    ${({ $state, theme }) =>
      $state === 'wrong' ? theme.colors.danger : $state === 'right' ? theme.colors.success : theme.colors.line};
  ${({ $shake }) => $shake && shake}
`;

const Bank = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
`;

const TileBtn = styled.button<{ $used?: boolean }>`
  border: none;
  border-radius: 14px;
  padding: 10px 14px 8px;
  cursor: pointer;
  background: #FAF5EA;
  color: ${({ theme }) => theme.colors.ink};
  font-family: ${({ theme }) => theme.fonts.ka};
  font-weight: 700;
  font-size: 19px;
  box-shadow: 0 2px 0 ${({ theme }) => theme.colors.line};
  text-align: center;
  ${({ $used }) =>
    $used &&
    css`
      visibility: hidden;
    `}

  &:disabled {
    cursor: default;
  }
`;

const TileTr = styled.span`
  display: block;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-size: 11px;
  font-style: italic;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.inkSoft};
`;

const LinkBtn = styled.button`
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-weight: 800;
  font-size: 13px;
  color: ${({ theme }) => theme.colors.inkSoft};
  padding: 6px;
  align-self: center;
`;

/** Build the Georgian sentence from word tiles. Word order before the verb is free. */
export function AssembleExercise({ ex, autoplay, onDone }: Props) {
  const [answer, setAnswer] = useState<Tile[]>([]);
  const [errs, setErrs] = useState(0);
  const [errOnFocus, setErrOnFocus] = useState(false);
  const [status, setStatus] = useState<'idle' | 'wrong' | 'right' | 'shown'>('idle');
  const [shaking, setShaking] = useState(false);
  /** The last order the learner tried and got wrong — what the tutor is asked about. */
  const [lastWrong, setLastWrong] = useState<string | null>(null);
  const startedAt = useRef(Date.now());
  const solvedMs = useRef(0);

  const done = status === 'right' || status === 'shown';
  const used = new Set(answer.map((t) => t.i));

  useEffect(() => {
    if (done && autoplay) void playClip(ex.reveal.audio);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const add = (t: Tile) => {
    if (done || used.has(t.i)) return;
    setAnswer((a) => [...a, t]);
    if (status === 'wrong') setStatus('idle');
  };

  const remove = (t: Tile) => {
    if (done) return;
    setAnswer((a) => a.filter((x) => x.i !== t.i));
    if (status === 'wrong') setStatus('idle');
  };

  const check = () => {
    const res = checkAssemble(answer.map((t) => t.t), ex);
    if (res.ok) {
      solvedMs.current = Date.now() - startedAt.current;
      setStatus('right');
      return;
    }
    setErrs((n) => n + 1);
    setLastWrong(answer.map((t) => t.t).join(' '));
    if (res.focusWrong) setErrOnFocus(true);
    setStatus('wrong');
    setShaking(true);
    window.setTimeout(() => setShaking(false), 360);
  };

  const giveUp = () => {
    solvedMs.current = Date.now() - startedAt.current;
    setStatus('shown');
  };

  const renderTile = (t: Tile, onClick: () => void, hidden = false) => (
    <TileBtn key={t.i} type="button" $used={hidden} disabled={done || hidden} onClick={onClick}>
      {t.t}
      {t.t !== '?' && trVisible(t.t) && <TileTr>{translit(t.t)}</TileTr>}
    </TileBtn>
  );

  return (
    <>
      <Body>
        <Card>
          {ex.reveal.ai && <AiBadge tag={ex.reveal.ai} />}
          <Eyebrow>Собери по-грузински</Eyebrow>
          <PromptRu>{ex.promptRu}</PromptRu>
        </Card>

        <Line $shake={shaking} $state={status === 'wrong' ? 'wrong' : status === 'right' ? 'right' : 'idle'}>
          {answer.map((t) => renderTile(t, () => remove(t)))}
        </Line>

        {!done && (
          <>
            <Bank>{ex.tiles.map((t) => renderTile(t, () => add(t), used.has(t.i)))}</Bank>
            {status === 'wrong' && <Muted style={{ textAlign: 'center' }}>Не так. Поправь и проверь ещё раз.</Muted>}
            <LinkBtn type="button" onClick={giveUp}>
              Показать ответ
            </LinkBtn>
          </>
        )}

        {done && <RevealCard reveal={ex.reveal} ok={status === 'right' && errs === 0} source={ex} given={lastWrong} />}
      </Body>

      <Footer>
        {done ? (
          <Pill
            kind={status === 'right' && errs === 0 ? 'success' : 'primary'}
            size="lg"
            style={{ flex: 1 }}
            onClick={() =>
              onDone({
                type: 'construct',
                errs,
                errOnFocus,
                gaveUp: status === 'shown',
                ms: solvedMs.current,
              })
            }
          >
            <Icon name="arrow" size={18} />
            Дальше
          </Pill>
        ) : (
          <Pill kind="primary" size="lg" style={{ flex: 1 }} disabled={answer.length === 0} onClick={check}>
            <Icon name="check" size={18} />
            Проверить
          </Pill>
        )}
      </Footer>
    </>
  );
}
