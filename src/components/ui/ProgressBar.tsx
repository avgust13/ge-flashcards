import styled from 'styled-components';

interface Props {
  value: number;
  color?: string;
}

const Track = styled.div`
  flex: 1;
  height: 10px;
  background: #F3EBD8;
  border-radius: 99px;
  overflow: hidden;
`;

const Fill = styled.div<{ $value: number; $color: string }>`
  width: ${({ $value }) => Math.round($value * 100)}%;
  height: 100%;
  background: ${({ $color }) => $color};
  border-radius: 99px;
  transition: width 0.3s ease;
`;

export function ProgressBar({ value, color }: Props) {
  return (
    <Track>
      <Fill $value={Math.max(0, Math.min(1, value))} $color={color ?? '#36B37E'} />
    </Track>
  );
}
