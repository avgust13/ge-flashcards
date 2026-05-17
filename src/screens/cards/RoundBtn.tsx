import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styled from 'styled-components';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  color: string;
  children: ReactNode;
}

const Btn = styled.button<{ $color: string }>`
  width: 60px;
  height: 60px;
  border-radius: 30px;
  border: none;
  cursor: pointer;
  background: ${({ $color }) => $color};
  color: #fff;
  box-shadow:
    0 3px 0 ${({ theme }) => theme.colors.ink}22,
    0 6px 16px ${({ $color }) => $color + '55'};
  display: flex;
  align-items: center;
  justify-content: center;
`;

export function RoundBtn({ color, children, ...rest }: Props) {
  return (
    <Btn $color={color} {...rest}>
      {children}
    </Btn>
  );
}
