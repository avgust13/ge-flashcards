import styled from 'styled-components';

interface Props {
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

export function ImageSlot({ label = 'image', height = 160, radius = 18, accent = '#FFD6B8' }: Props) {
  return (
    <Slot $height={height} $radius={radius} $accent={accent}>
      {label}
    </Slot>
  );
}
