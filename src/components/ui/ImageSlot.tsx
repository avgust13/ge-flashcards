import { useState } from 'react';
import styled from 'styled-components';

interface Props {
  /** URL of the picture; without one (or when it cannot be loaded) a labelled placeholder is shown. */
  src?: string | null;
  label?: string;
  height?: number;
  radius?: number;
  accent?: string;
}

const Slot = styled.div<{ $height: number; $radius: number; $accent: string }>`
  height: ${({ $height }) => $height}px;
  border-radius: ${({ $radius }) => $radius}px;
  background:
    repeating-linear-gradient(45deg, ${({ $accent }) => $accent} 0 12px, transparent 12px 24px),
    #FFEEDF;
  border: 1px dashed ${({ theme }) => theme.colors.line};
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: ui-monospace, "SF Mono", monospace;
  font-size: 11px;
  letter-spacing: 0.4px;
  color: #A0866A;
  text-transform: uppercase;
`;

const Img = styled.img<{ $height: number; $radius: number }>`
  display: block;
  width: 100%;
  min-width: 0;
  height: ${({ $height }) => $height}px;
  border-radius: ${({ $radius }) => $radius}px;
  object-fit: cover;
  flex-shrink: 0;
`;

export function ImageSlot({ src, label = 'image', height = 160, radius = 18, accent = '#FFD6B8' }: Props) {
  // Remembered per URL, so the next word's picture gets its own chance.
  const [failed, setFailed] = useState<string | null>(null);
  if (src && failed !== src) {
    return (
      <Img
        src={src}
        alt={label}
        decoding="async"
        // Offline and never shown before: fall back to the placeholder.
        onError={() => setFailed(src)}
        $height={height}
        $radius={radius}
      />
    );
  }
  return (
    <Slot $height={height} $radius={radius} $accent={accent}>
      {label}
    </Slot>
  );
}
