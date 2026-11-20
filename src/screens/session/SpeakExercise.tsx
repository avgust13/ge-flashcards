import { useRef, useState } from 'react';
import styled from 'styled-components';
import { playClip } from '../../audio/player';
import { Icon } from '../../components/ui/Icon';
import { Pill } from '../../components/ui/Pill';
import type { ExerciseResult, SpeakExercise as Ex } from '../../engine/types';
import { RATING_RU } from '../../srs/rating';
import type { Rating } from '../../srs/types';
import { Body, Card, Eyebrow, Footer, Muted, PromptRu, RevealCard, shortInterval } from './parts';

interface Props {
  ex: Ex;
  autoplay: boolean;
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

const GradeBtn = styled.button<{ $r: Rating }>`
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

/**
 * The core exercise: see the Russian prompt, say it aloud in Georgian, then
 * reveal the answer and grade yourself. The time until "Показать ответ" is
 * the measure of automatism.
 */
export function SpeakExercise({ ex, autoplay, intervals, onDone }: Props) {
  const [revealed, setRevealed] = useState(false);
  const startedAt = useRef(Date.now());
  const thinkMs = useRef(0);

  const reveal = () => {
    thinkMs.current = Date.now() - startedAt.current;
    setRevealed(true);
    if (autoplay) void playClip(ex.reveal.audio);
  };

  return (
    <>
      <Body>
        <Card>
          <Eyebrow>Скажи вслух по-грузински</Eyebrow>
          <PromptRu>{ex.promptRu}</PromptRu>
          {!revealed && (
            <Hint>
              <Icon name="speaker" size={18} />
              Сначала произнеси, потом проверь себя
            </Hint>
          )}
        </Card>

        {revealed && (
          <>
            <RevealCard reveal={ex.reveal} source={ex} />
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
                onClick={() => onDone({ type: 'self', rating: r, ms: thinkMs.current })}
              >
                {RATING_RU[r]}
                {intervals && <span>{shortInterval(intervals[r])}</span>}
              </GradeBtn>
            ))}
          </Grades>
        ) : (
          <Pill kind="primary" size="lg" style={{ flex: 1 }} onClick={reveal}>
            Показать ответ
          </Pill>
        )}
      </Footer>
    </>
  );
}
