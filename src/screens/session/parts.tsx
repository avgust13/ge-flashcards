import styled, { css, keyframes } from 'styled-components';
import { SpeakerButton } from '../../components/ui/SpeakerButton';
import { translit } from '../../content/translit';
import type { Reveal } from '../../engine/types';

export const Body = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px 20px 8px;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
`;

export const Footer = styled.div`
  padding: 10px 20px 16px;
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  gap: 10px;
`;

export const Eyebrow = styled.div`
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 1.3px;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.inkMute};
`;

export const Card = styled.div`
  background: #fff;
  border-radius: 22px;
  padding: 18px;
  box-shadow: ${({ theme }) => theme.shadow};
`;

export const PromptRu = styled.div`
  font-size: 24px;
  font-weight: 900;
  line-height: 1.25;
  margin-top: 6px;
`;

export const Ka = styled.div<{ $size?: number }>`
  font-family: ${({ theme }) => theme.fonts.ka};
  font-weight: 700;
  font-size: ${({ $size }) => $size ?? 28}px;
  line-height: 1.25;
  color: ${({ theme }) => theme.colors.ink};
`;

export const Tr = styled.div`
  font-size: 14px;
  font-style: italic;
  color: ${({ theme }) => theme.colors.inkSoft};
  margin-top: 2px;
`;

export const Muted = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.inkSoft};
  line-height: 1.4;
`;

const shakeAnim = keyframes`
  10%, 90% { transform: translateX(-3px); }
  20%, 80% { transform: translateX(5px); }
  30%, 50%, 70% { transform: translateX(-8px); }
  40%, 60% { transform: translateX(8px); }
`;

export const shake = css`
  animation: ${shakeAnim} 0.35s;
`;

const RevealBox = styled.div<{ $ok: boolean }>`
  border-radius: 20px;
  padding: 16px;
  background: ${({ $ok, theme }) => ($ok ? theme.colors.successSoft : theme.colors.warnSoft)};
  display: flex;
  gap: 12px;
  align-items: flex-start;
`;

const RevealText = styled.div`
  flex: 1;
  min-width: 0;
`;

const RevealRu = styled.div`
  font-size: 15px;
  font-weight: 700;
  margin-top: 6px;
  color: ${({ theme }) => theme.colors.ink};
`;

const Note = styled.div`
  font-size: 13px;
  line-height: 1.4;
  margin-top: 8px;
  color: ${({ theme }) => theme.colors.inkSoft};
`;

interface RevealProps {
  reveal: Reveal;
  showTr: boolean;
  /** false: the answer is being shown after a miss. */
  ok?: boolean;
}

/** The correct answer: Georgian, transliteration, Russian, a replay button and an optional rule. */
export function RevealCard({ reveal, showTr, ok = true }: RevealProps) {
  return (
    <RevealBox $ok={ok}>
      <RevealText>
        <Ka>{reveal.ka}</Ka>
        {showTr && <Tr>{translit(reveal.ka)}</Tr>}
        <RevealRu>{reveal.ru}</RevealRu>
        {reveal.note && <Note>{reveal.note}</Note>}
      </RevealText>
      <SpeakerButton audio={reveal.audio} size={42} tone="solid" />
    </RevealBox>
  );
}

/** Milliseconds → "1 мин", "3 ч", "5 дн", for the interval under each grade button. */
export function shortInterval(ms: number): string {
  const min = ms / 60_000;
  if (min < 1) return '<1 мин';
  if (min < 60) return `${Math.round(min)} мин`;
  const h = min / 60;
  if (h < 24) return `${Math.round(h)} ч`;
  const d = h / 24;
  if (d < 30) return `${Math.round(d)} дн`;
  return `${Math.round(d / 30)} мес`;
}
