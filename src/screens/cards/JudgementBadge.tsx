import styled from 'styled-components';

interface Props {
  dx: number;
}

const Badge = styled.div<{ $right: boolean; $opacity: number; $dx: number }>`
  position: absolute;
  top: 80px;
  left: ${({ $right }) => ($right ? 'auto' : '24px')};
  right: ${({ $right }) => ($right ? '24px' : 'auto')};
  transform: rotate(${({ $right }) => ($right ? -10 : 10)}deg);
  padding: 6px 14px;
  border-radius: 10px;
  background: ${({ $right, theme }) => ($right ? theme.colors.success : theme.colors.danger)};
  color: #fff;
  font-weight: 900;
  font-size: 22px;
  opacity: ${({ $opacity }) => $opacity};
  letter-spacing: 2px;
  pointer-events: none;
`;

export function JudgementBadge({ dx }: Props) {
  if (Math.abs(dx) <= 30) return null;
  const right = dx > 0;
  const opacity = Math.min(1, Math.abs(dx) / 120);
  return (
    <Badge $right={right} $opacity={opacity} $dx={dx}>
      {right ? 'ვიცი' : 'არ ვიცი'}
    </Badge>
  );
}
