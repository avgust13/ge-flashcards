import styled from 'styled-components';
import { LEVELS } from '../../data/levels';

interface Props {
  steps: number;
  mastered: number;
  total: number;
}

const Wrap = styled.div`
  position: relative;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
`;

const Centre = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-family: ${({ theme }) => theme.fonts.ui};
`;

const Pct = styled.div`
  font-size: 16px;
  font-weight: 900;
  line-height: 1;
`;

const PctLabel = styled.div`
  font-size: 9px;
  font-weight: 800;
  color: ${({ theme }) => theme.colors.inkMute};
  letter-spacing: 0.5px;
`;

function describeArc(cx: number, cy: number, r: number, startAng: number, endAng: number): string {
  const toXY = (a: number): [number, number] => {
    const rad = (a * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  const [x1, y1] = toXY(startAng);
  const [x2, y2] = toXY(endAng);
  const large = endAng - startAng > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

export function JourneyRing({ steps, mastered, total }: Props) {
  const size = 72;
  const r = 28;
  const cx = size / 2;
  const cy = size / 2;
  const segs = [];
  const arc = 360 / steps - 4;
  for (let i = 0; i < steps; i++) {
    const start = -90 + i * (360 / steps) + 2;
    const end = start + arc;
    const color = LEVELS[i].color;
    segs.push(
      <path
        key={i}
        d={describeArc(cx, cy, r, start, end)}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
      />,
    );
  }
  const pct = total === 0 ? 0 : Math.round((mastered / total) * 100);
  return (
    <Wrap>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segs}
      </svg>
      <Centre>
        <Pct>{pct}%</Pct>
        <PctLabel>fluency</PctLabel>
      </Centre>
    </Wrap>
  );
}
