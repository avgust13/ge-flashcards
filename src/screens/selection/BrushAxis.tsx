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

export function BrushAxis({ range, pool }: Props) {
  const lo = Math.floor(range[0] * pool.length);
  const hi = Math.ceil(range[1] * pool.length);
  const loW = pool[lo] ? Math.round(pool[lo].correct * 100) : 0;
  const hiW = pool[Math.max(0, hi - 1)]
    ? Math.round(pool[Math.max(0, hi - 1)].correct * 100)
    : 0;
  return (
    <Row>
      <Low>{loW}%</Low>
      <Mid>← correct rate →</Mid>
      <High>{hiW}%</High>
    </Row>
  );
}
