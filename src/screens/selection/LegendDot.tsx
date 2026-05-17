import type { ReactNode } from 'react';
import styled from 'styled-components';

const Wrap = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
`;

const Dot = styled.span<{ $color: string }>`
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background: ${({ $color }) => $color};
`;

export function LegendDot({ color, children }: { color: string; children: ReactNode }) {
  return (
    <Wrap>
      <Dot $color={color} />
      {children}
    </Wrap>
  );
}
