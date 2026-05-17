import type { CSSProperties } from 'react';
import styled from 'styled-components';
import type { Word } from '../../types';
import { CardFace } from './CardFace';

interface Props {
  word: Word;
  flipped: boolean;
  style?: CSSProperties;
}

const Outer = styled.div`
  width: 100%;
  max-width: 340px;
  height: 460px;
  border-radius: 28px;
  perspective: 1200px;
`;

const Inner = styled.div<{ $flipped: boolean }>`
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transform: ${({ $flipped }) => ($flipped ? 'rotateY(180deg)' : 'none')};
  transition: transform 0.5s cubic-bezier(0.2, 0.7, 0.2, 1);
`;

export function FlashCard({ word, flipped, style }: Props) {
  return (
    <Outer style={style}>
      <Inner $flipped={flipped}>
        <CardFace side="front" word={word} />
        <CardFace side="back" word={word} />
      </Inner>
    </Outer>
  );
}
