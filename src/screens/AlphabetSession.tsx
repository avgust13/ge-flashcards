import { useEffect, useMemo, useState } from 'react';
import styled, { useTheme, keyframes, css } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/ui/Icon';
import { ImageSlot } from '../components/ui/ImageSlot';
import { Pill } from '../components/ui/Pill';
import { ProgressBar } from '../components/ui/ProgressBar';
import { LETTER_MAP } from '../data/words';
import { useSession } from '../state/SessionContext';
import type { AlphaResult } from '../types';
import { shuffle } from '../utils/shuffle';
import { LetterSlot } from './alphabet/LetterSlot';
import { TileKeyboard } from './alphabet/TileKeyboard';
import { TranslationCard } from './alphabet/TranslationCard';

const Screen = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.bg};
  font-family: ${({ theme }) => theme.fonts.ui};
  color: ${({ theme }) => theme.colors.ink};
  min-height: 100dvh;
`;

const HeaderRow = styled.div`
  padding: 14px 16px 4px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const IconBtn = styled.button`
  width: 36px;
  height: 36px;
  border-radius: 18px;
  border: none;
  background: transparent;
  cursor: pointer;
  color: ${({ theme }) => theme.colors.ink};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Counter = styled.div`
  background: ${({ theme }) => theme.colors.blueSoft};
  color: ${({ theme }) => theme.colors.blue};
  padding: 4px 10px;
  border-radius: 99px;
  font-weight: 900;
  font-size: 13px;
`;

const Body = styled.div`
  padding: 18px 20px 8px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 0;
`;

const shakeAnim = keyframes`
  10%, 90% { transform: translateX(-3px); }
  20%, 80% { transform: translateX(5px); }
  30%, 50%, 70% { transform: translateX(-8px); }
  40%, 60% { transform: translateX(8px); }
`;

const WordCard = styled.div<{ $shake: boolean }>`
  background: #fff;
  border-radius: 22px;
  padding: 14px;
  box-shadow: ${({ theme }) => theme.shadow};
  ${({ $shake }) =>
    $shake &&
    css`
      animation: ${shakeAnim} 0.35s;
    `}
`;

const LetterRow = styled.div`
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 14px;
  flex-wrap: wrap;
`;

const Footer = styled.div`
  padding: 8px 20px 14px;
`;

const FooterPlaceholder = styled.span`
  color: ${({ theme }) => theme.colors.inkMute};
`;

export function AlphabetSession() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { deck, finishSession, mode } = useSession();

  useEffect(() => {
    if (deck.length === 0 || mode !== 'alpha') {
      navigate('/', { replace: true });
    }
  }, [deck.length, mode, navigate]);

  const [i, setI] = useState(0);
  const [filled, setFilled] = useState<Array<{ ru: string; correct: boolean }>>([]);
  const [shake, setShake] = useState(false);
  const [solved, setSolved] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [results, setResults] = useState<AlphaResult[]>([]);

  const word = deck[i];

  const letters = useMemo(() => {
    if (!word) return [] as Array<{ ka: string; ru: string }>;
    return [...word.ka].map((ch) => ({ ka: ch, ru: LETTER_MAP[ch] || '?' }));
  }, [word]);

  const options = useMemo(() => {
    const correct = letters.map((l) => l.ru);
    const pool = [
      'а','е','и','о','у','м','н','р','с','т','к','л','б','в','г','д','з','п','ф','х','ч','ш','ц','э','ж',
    ];
    const set = new Set<string>(correct);
    while (set.size < Math.max(8, correct.length + 4)) {
      set.add(pool[Math.floor(Math.random() * pool.length)]);
    }
    return shuffle([...set]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [word]);

  useEffect(() => {
    setFilled([]);
    setSolved(false);
    setHintsUsed(0);
    setShake(false);
  }, [i]);

  const nextSlot = filled.length;

  const tap = (ru: string) => {
    if (!word || solved || nextSlot >= letters.length) return;
    const need = letters[nextSlot].ru;
    if (ru === need) {
      const updated = [...filled, { ru, correct: true }];
      setFilled(updated);
      if (updated.length === letters.length) {
        setSolved(true);
        setResults((r) => [
          ...r,
          {
            id: word.id,
            perfect: hintsUsed === 0,
            hints: hintsUsed,
            ka: word.ka,
            ru: word.ru,
            tr: word.tr,
          },
        ]);
      }
    } else {
      setShake(true);
      setFilled([...filled, { ru, correct: false }]);
      window.setTimeout(() => {
        setShake(false);
        setFilled((f) => f.slice(0, -1));
      }, 380);
    }
  };

  const hint = () => {
    if (!word || solved || nextSlot >= letters.length) return;
    setHintsUsed((h) => h + 1);
    tap(letters[nextSlot].ru);
  };

  const next = () => {
    if (i + 1 >= deck.length) {
      finishSession(results);
      navigate('/summary');
    } else {
      setI(i + 1);
    }
  };

  if (!word) return null;

  return (
    <Screen>
      <HeaderRow>
        <IconBtn onClick={() => navigate('/')} aria-label="Close session">
          <Icon name="close" size={20} />
        </IconBtn>
        <ProgressBar value={i / Math.max(1, deck.length)} color={theme.colors.blue} />
        <Counter>
          {i + 1}/{deck.length}
        </Counter>
      </HeaderRow>

      <Body>
        <WordCard $shake={shake}>
          <ImageSlot height={150} label={word.ru} accent="#D7E5FF" />

          <LetterRow>
            {letters.map((l, idx) => {
              const slot = filled[idx];
              const wasWrong = slot && !slot.correct;
              const isFilled = !!slot;
              const isNext = idx === nextSlot && !solved;
              const state = wasWrong
                ? 'wrong'
                : isFilled
                ? 'correct'
                : isNext
                ? 'next'
                : 'pending';
              return (
                <LetterSlot key={idx} ka={l.ka} filledRu={slot?.ru} state={state} />
              );
            })}
          </LetterRow>

          <TranslationCard ru={word.ru} solved={solved} />
        </WordCard>

        <TileKeyboard options={options} onTap={tap} onHint={hint} solved={solved} />
      </Body>

      <Footer>
        <Pill
          kind={solved ? 'success' : 'ghost'}
          size="lg"
          onClick={solved ? next : undefined}
          disabled={!solved}
          style={{ width: '100%' }}
        >
          {solved ? (
            <>
              <Icon name="check" size={18} />
              <span>Next word</span>
            </>
          ) : (
            <FooterPlaceholder>Fill all letters to continue</FooterPlaceholder>
          )}
        </Pill>
      </Footer>
    </Screen>
  );
}
