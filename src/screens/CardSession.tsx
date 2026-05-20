import { useEffect, useState } from 'react';
import styled, { useTheme } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/ui/Icon';
import { ProgressBar } from '../components/ui/ProgressBar';
import { useSession } from '../state/SessionContext';
import { incrementDaily, loadStats, saveStats, updateStat } from '../data/stats';
import type { FlashResult } from '../types';
import { CardSwipeable, type DragState, type ExitDir } from './cards/CardSwipeable';
import { Confetti } from './cards/Confetti';
import { FlashCard } from './cards/FlashCard';
import { JudgementBadge } from './cards/JudgementBadge';
import { RoundBtn } from './cards/RoundBtn';

const SWIPE_STYLE = 'tilt' as const;

const Screen = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.colors.bg};
  font-family: ${({ theme }) => theme.fonts.ui};
  color: ${({ theme }) => theme.colors.ink};
  position: relative;
  overflow: hidden;
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

const Streak = styled.div<{ $on: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: ${({ $on }) => ($on ? '#FFEFE6' : '#F3EBD8')};
  padding: 4px 10px;
  border-radius: 99px;
  color: ${({ $on, theme }) => ($on ? theme.colors.primary : theme.colors.inkSoft)};
  font-weight: 900;
  font-size: 13px;
`;

const Counters = styled.div`
  display: flex;
  justify-content: space-between;
  padding: 6px 22px 4px;
  font-size: 12px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.inkSoft};
`;

const Stage = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 12px 18px;
`;

const BehindWrap = styled.div`
  position: absolute;
  width: 100%;
  max-width: 340px;
  height: 460px;
  transform: scale(0.94) translateY(10px);
  opacity: 0.7;
  pointer-events: none;
`;

const Actions = styled.div`
  padding: 12px 22px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const FlipBtn = styled.button`
  flex: 1;
  padding: 14px 18px;
  border-radius: 999px;
  border: 1.5px solid ${({ theme }) => theme.colors.line};
  background: #fff;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-weight: 800;
  font-size: 14px;
  color: ${({ theme }) => theme.colors.ink};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

export function CardSession() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { deck, finishSession, mode } = useSession();

  useEffect(() => {
    if (deck.length === 0 || mode !== 'flash') {
      navigate('/', { replace: true });
    }
  }, [deck.length, mode, navigate]);

  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<FlashResult[]>([]);
  const [streak, setStreak] = useState(0);
  const [confetti, setConfetti] = useState(0);
  const [drag, setDrag] = useState<DragState>({ x: 0, y: 0, active: false });
  const [exiting, setExiting] = useState<ExitDir>(null);

  const word = deck[i];

  const goNext = (next: FlashResult[]) => {
    setFlipped(false);
    setExiting(null);
    setDrag({ x: 0, y: 0, active: false });
    if (i + 1 >= deck.length) {
      finishSession(next);
      navigate('/summary');
    } else {
      setI(i + 1);
    }
  };

  const decide = (right: boolean) => {
    if (!word) return;
    setExiting(right ? 'right' : 'left');
    setDrag((d) => ({ ...d, active: false }));
    const newResults: FlashResult[] = [
      ...results,
      { id: word.id, right, ka: word.ka, ru: word.ru, tr: word.tr },
    ];
    setResults(newResults);

    const stats = loadStats();
    const next = updateStat(stats[word.id], right);
    stats[word.id] = next;
    saveStats(stats);
    word.correct = next.correct;
    word.seen = next.seen;
    incrementDaily();

    const newStreak = right ? streak + 1 : 0;
    setStreak(newStreak);
    if (newStreak > 0 && newStreak % 3 === 0) setConfetti((c) => c + 1);
    window.setTimeout(() => goNext(newResults), 280);
  };

  if (!word) return null;

  const progress = i / Math.max(1, deck.length);
  const rights = results.filter((r) => r.right).length;
  const wrongs = results.length - rights;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (exiting) return;
    setDrag({ x: 0, y: 0, active: true, startX: e.clientX, startY: e.clientY });
    (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.active || drag.startX === undefined || drag.startY === undefined) return;
    setDrag((d) => ({
      ...d,
      x: e.clientX - (d.startX ?? 0),
      y: e.clientY - (d.startY ?? 0),
    }));
  };
  const onPointerUp = () => {
    if (!drag.active) return;
    const t = 90;
    if (drag.x > t) decide(true);
    else if (drag.x < -t) decide(false);
    else setDrag({ x: 0, y: 0, active: false });
  };

  return (
    <Screen>
      <HeaderRow>
        <IconBtn onClick={() => navigate('/')} aria-label="Close session">
          <Icon name="close" size={20} />
        </IconBtn>
        <ProgressBar value={progress} color={theme.colors.success} />
        <Streak $on={streak > 0}>
          <Icon name="flame" size={14} stroke={2.4} />
          {streak}
        </Streak>
      </HeaderRow>

      <Counters>
        <span>
          {i + 1} / {deck.length}
        </span>
        <span>
          <span style={{ color: theme.colors.success }}>✓ {rights}</span>
          <span style={{ margin: '0 8px', color: theme.colors.inkMute }}>·</span>
          <span style={{ color: theme.colors.danger }}>✗ {wrongs}</span>
        </span>
      </Counters>

      <Stage>
        {deck[i + 1] && (
          <BehindWrap>
            <FlashCard word={deck[i + 1]} flipped={false} isPreview />
          </BehindWrap>
        )}

        <CardSwipeable
          key={word.id}
          word={word}
          flipped={flipped}
          drag={drag}
          exiting={exiting}
          swipeStyle={SWIPE_STYLE}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onTap={() => {
            if (!drag.active && Math.abs(drag.x) < 6) setFlipped((f) => !f);
          }}
        />

        <JudgementBadge dx={drag.x} />
      </Stage>

      <Actions>
        <RoundBtn color={theme.colors.danger} onClick={() => decide(false)} aria-label="I didn't know">
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M6 6l12 12M18 6L6 18" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        </RoundBtn>
        <FlipBtn onClick={() => setFlipped((f) => !f)}>
          <Icon name="refresh" size={16} />
          {flipped ? 'Hide translation' : 'Show translation'}
        </FlipBtn>
        <RoundBtn color={theme.colors.success} onClick={() => decide(true)} aria-label="I knew it">
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path
              d="M5 13l4 4 10-10"
              stroke="#fff"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </RoundBtn>
      </Actions>

      {confetti > 0 && <Confetti key={confetti} />}
    </Screen>
  );
}
