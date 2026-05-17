import { useMemo } from 'react';
import styled, { keyframes, useTheme } from 'styled-components';

const fly = keyframes`
  0%   { transform: translate(0, 0) rotate(0deg); opacity: 1; }
  100% { transform: var(--end-transform) ; opacity: 0; }
`;

const Wrap = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
`;

const Particle = styled.div<{ $color: string; $size: number; $round: boolean; $left: number; $dx: number; $dy: number; $duration: number; $delay: number }>`
  position: absolute;
  left: ${({ $left }) => $left}%;
  top: 55%;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  background: ${({ $color }) => $color};
  border-radius: ${({ $round }) => ($round ? '50%' : '2px')};
  --end-transform: translate(${({ $dx }) => $dx}px, ${({ $dy }) => $dy}px) rotate(720deg);
  animation: ${fly} ${({ $duration }) => $duration}s cubic-bezier(.2,.7,.4,1) ${({ $delay }) => $delay}ms forwards;
`;

export function Confetti() {
  const theme = useTheme();
  const colors = [
    theme.colors.primary,
    theme.colors.success,
    theme.colors.blue,
    theme.colors.warn,
    '#FF9A9A',
  ];
  const particles = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        id: i,
        left: 45 + (Math.random() - 0.5) * 20,
        dx: (Math.random() - 0.5) * 280,
        dy: -120 - Math.random() * 200,
        color: colors[i % colors.length],
        size: 6 + Math.random() * 8,
        delay: Math.random() * 80,
        round: Math.random() > 0.5,
        duration: 0.9 + Math.random() * 0.4,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  return (
    <Wrap>
      {particles.map((p) => (
        <Particle
          key={p.id}
          $color={p.color}
          $size={p.size}
          $round={p.round}
          $left={p.left}
          $dx={p.dx}
          $dy={p.dy}
          $duration={p.duration}
          $delay={p.delay}
        />
      ))}
    </Wrap>
  );
}
