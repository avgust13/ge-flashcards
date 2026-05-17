import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styled, { css } from 'styled-components';

export type PillKind = 'primary' | 'ghost' | 'soft' | 'dark' | 'success';
export type PillSize = 'sm' | 'md' | 'lg';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: PillKind;
  size?: PillSize;
  children: ReactNode;
}

const sizeMap = {
  sm: css`padding: 8px 14px; font-size: 13px; height: 34px;`,
  md: css`padding: 12px 18px; font-size: 15px; height: 46px;`,
  lg: css`padding: 14px 22px; font-size: 17px; height: 56px;`,
};

const kindMap = {
  primary: css`
    background: ${({ theme }) => theme.colors.primary};
    color: #fff;
    box-shadow: 0 3px 0 ${({ theme }) => theme.colors.primaryDark};
  `,
  ghost: css`
    background: transparent;
    color: ${({ theme }) => theme.colors.ink};
    border: 1.5px solid ${({ theme }) => theme.colors.line};
  `,
  soft: css`
    background: #FFEFE6;
    color: ${({ theme }) => theme.colors.primary};
  `,
  dark: css`
    background: ${({ theme }) => theme.colors.ink};
    color: #fff;
    box-shadow: 0 3px 0 #000;
  `,
  success: css`
    background: ${({ theme }) => theme.colors.success};
    color: #fff;
    box-shadow: 0 3px 0 #228B61;
  `,
};

const Btn = styled.button<{ $kind: PillKind; $size: PillSize }>`
  border-radius: 999px;
  border: none;
  cursor: pointer;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-weight: 800;
  letter-spacing: 0.2px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: transform .08s ease;
  ${({ $size }) => sizeMap[$size]}
  ${({ $kind }) => kindMap[$kind]}

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }

  &:active:not(:disabled) {
    transform: translateY(1px);
  }
`;

export function Pill({ kind = 'primary', size = 'md', children, ...rest }: Props) {
  return (
    <Btn $kind={kind} $size={size} {...rest}>
      {children}
    </Btn>
  );
}
