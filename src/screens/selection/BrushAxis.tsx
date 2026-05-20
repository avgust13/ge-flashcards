import styled from 'styled-components';
import type { Word } from '../../types';

interface Props {
  range: [number, number];
  pool: Word[];
}

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
  font-family: ${({ theme }) => theme.fonts.ui};
  font-weight: 800;
`;

const Low = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.danger};
`;

const Mid = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.inkSoft};
`;

const High = styled.span`
  font-size: 13px;
  color: ${({ theme }) => theme.colors.success};
`;

function safePct(v: number | undefined): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
  return Math.round(Math.max(0, Math.min(1, v)) * 100);
}

export function BrushAxis({ range, pool }: Props) {
  const lo = Math.floor(range[0] * pool.length);
  const hi = Math.ceil(range[1] * pool.length);
  const loW = safePct(pool[lo]?.correct);
  const hiW = safePct(pool[Math.max(0, hi - 1)]?.correct);
  return (
    <Row>
      <Low>{loW}%</Low>
      <Mid>← correct rate →</Mid>
      <High>{hiW}%</High>
    </Row>
  );
}
