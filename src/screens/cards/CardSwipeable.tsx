import type { PointerEventHandler } from 'react';
import styled from 'styled-components';
import type { Word } from '../../types';
import { FlashCard } from './FlashCard';

export type SwipeStyle = 'tilt' | 'slide' | 'stack' | 'fly';
export type ExitDir = 'left' | 'right' | null;

export interface DragState {
  x: number;
  y: number;
  active: boolean;
  startX?: number;
  startY?: number;
}

interface Props {
  word: Word;
  flipped: boolean;
  drag: DragState;
  exiting: ExitDir;
  swipeStyle?: SwipeStyle;
  onPointerDown: PointerEventHandler<HTMLDivElement>;
  onPointerMove: PointerEventHandler<HTMLDivElement>;
  onPointerUp: PointerEventHandler<HTMLDivElement>;
  onTap: () => void;
}

function transformFor(drag: DragState, exiting: ExitDir, style: SwipeStyle): string {
  if (exiting === 'right') return 'translateX(380px) rotate(20deg)';
  if (exiting === 'left') return 'translateX(-380px) rotate(-20deg)';
  if (!drag.active && drag.x === 0 && drag.y === 0) return '';
  const dx = drag.x;
  const dy = drag.y;
  switch (style) {
    case 'slide':
      return `translate(${dx}px, 0)`;
    case 'stack':
      return `translate(${dx}px, ${-Math.abs(dx) * 0.05}px) rotate(${dx / 30}deg) scale(${1 - Math.abs(dx) / 800})`;
    case 'fly':
      return `translate(${dx * 1.1}px, ${dy + Math.abs(dx) * 0.2}px) rotate(${dx / 12}deg)`;
    case 'tilt':
    default:
      return `translate(${dx}px, ${dy * 0.2}px) rotate(${dx / 18}deg)`;
  }
}

const Wrap = styled.div<{ $exit: ExitDir; $active: boolean; $transform: string }>`
  width: 100%;
  max-width: 340px;
  height: 460px;
  touch-action: none;
  cursor: grab;
  transform: ${({ $transform }) => $transform || 'none'};
  opacity: ${({ $exit }) => ($exit ? 0 : 1)};
  transition: ${({ $active }) =>
    $active ? 'none' : 'transform 0.25s ease, opacity 0.25s ease'};
`;

export function CardSwipeable({
  word,
  flipped,
  drag,
  exiting,
  swipeStyle = 'tilt',
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onTap,
}: Props) {
  const transform = transformFor(drag, exiting, swipeStyle);
  return (
    <Wrap
      $exit={exiting}
      $active={drag.active}
      $transform={transform}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClick={onTap}
    >
      <FlashCard word={word} flipped={flipped} />
    </Wrap>
  );
}
