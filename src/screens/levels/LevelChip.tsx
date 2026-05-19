import type { ButtonHTMLAttributes } from 'react';
import styled from 'styled-components';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  color: string;
  tint?: string;
  active: boolean;
}

const Btn = styled.button<{ $active: boolean; $color: string; $tint?: string }>`
  border: none;
  cursor: pointer;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-weight: 800;
  font-size: 12px;
  padding: 7px 12px;
  border-radius: 999px;
  background: ${({ $active, $color, $tint }) =>
    $active ? $color : $tint || '#fff'};
  color: ${({ $active, $color }) => ($active ? '#fff' : $color)};
  box-shadow: ${({ $active, $color }) =>
    $active ? 'none' : `inset 0 0 0 1.5px ${$color}33`};
  white-space: nowrap;
  flex-shrink: 0;
`;

export function LevelChip({ label, color, tint, active, ...rest }: Props) {
  return (
    <Btn $active={active} $color={color} $tint={tint} {...rest}>
      {label}
    </Btn>
  );
}
