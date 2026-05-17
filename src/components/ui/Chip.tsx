import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styled from 'styled-components';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  count?: number;
  children: ReactNode;
}

const Btn = styled.button<{ $active: boolean }>`
  border: none;
  cursor: pointer;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-weight: 700;
  font-size: 13px;
  padding: 8px 14px;
  border-radius: 999px;
  background: ${({ $active, theme }) => ($active ? theme.colors.ink : theme.colors.card)};
  color: ${({ $active, theme }) => ($active ? '#fff' : theme.colors.ink)};
  box-shadow: ${({ $active, theme }) =>
    $active ? 'none' : `inset 0 0 0 1.5px ${theme.colors.line}`};
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
`;

const Count = styled.span<{ $active: boolean }>`
  background: ${({ $active }) => ($active ? 'rgba(255,255,255,.18)' : '#F3EBD8')};
  color: ${({ $active, theme }) => ($active ? '#fff' : theme.colors.inkSoft)};
  border-radius: 99px;
  padding: 1px 7px;
  font-size: 11px;
  font-weight: 800;
`;

export function Chip({ active = false, count, children, ...rest }: Props) {
  return (
    <Btn $active={active} {...rest}>
      {children}
      {count !== undefined && <Count $active={active}>{count}</Count>}
    </Btn>
  );
}
