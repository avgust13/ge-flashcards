import { useMemo, useRef, useState } from 'react';
import { useTheme } from 'styled-components';
import type { Word } from '../../types';

interface Props {
  words: Word[];
  range: [number, number];
  onRange: (r: [number, number]) => void;
}

const W = 348;
const H = 140;
const PAD_L = 8;
const PAD_R = 8;
const PAD_T = 8;
const PAD_B = 18;

type DragKind = 'lo' | 'hi' | 'mid' | null;

export function RankGraph({ words, range, onRange }: Props) {
  const theme = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<DragKind>(null);

  const inner = { w: W - PAD_L - PAD_R, h: H - PAD_T - PAD_B };

  const { linePath, areaPath } = useMemo(() => {
    const samples = 50;
    const pts: Array<[number, number]> = [];
    if (words.length > 0) {
      for (let i = 0; i < samples; i++) {
        const t = i / (samples - 1);
        const idx = Math.min(words.length - 1, Math.floor(t * words.length));
        pts.push([t, words[idx].correct]);
      }
    } else {
      pts.push([0, 0], [1, 0]);
    }
    const toXY = (t: number, v: number): [number, number] => [
      PAD_L + t * inner.w,
      PAD_T + (1 - v) * inner.h,
    ];
    const xy = pts.map(([t, v]) => toXY(t, v));
    let d = `M ${xy[0][0]} ${xy[0][1]}`;
    for (let i = 1; i < xy.length; i++) {
      const [x0, y0] = xy[i - 1];
      const [x1, y1] = xy[i];
      const cx = (x0 + x1) / 2;
      d += ` C ${cx} ${y0}, ${cx} ${y1}, ${x1} ${y1}`;
    }
    const line = d;
    const area =
      d +
      ` L ${PAD_L + inner.w} ${PAD_T + inner.h}` +
      ` L ${PAD_L} ${PAD_T + inner.h} Z`;
    return { linePath: line, areaPath: area };
  }, [words, inner.w, inner.h]);

  const xAt = (t: number) => PAD_L + t * inner.w;
  const loX = xAt(range[0]);
  const hiX = xAt(range[1]);

  const onPointerDown = (
    e: React.PointerEvent<SVGElement>,
    which: Exclude<DragKind, null>,
  ) => {
    e.preventDefault();
    setDrag(which);
    const startRange: [number, number] = [range[0], range[1]];
    const rect = svgRef.current!.getBoundingClientRect();
    const startX = e.clientX - rect.left;
    const scaleX = W / rect.width;
    const move = (ev: PointerEvent) => {
      const x = (ev.clientX - rect.left) * scaleX;
      const t = Math.max(0, Math.min(1, (x - PAD_L) / inner.w));
      const dt = ((ev.clientX - rect.left) * scaleX - startX * scaleX) / inner.w;
      if (which === 'lo') {
        onRange([Math.min(t, startRange[1] - 0.04), startRange[1]]);
      } else if (which === 'hi') {
        onRange([startRange[0], Math.max(t, startRange[0] + 0.04)]);
      } else {
        const span = startRange[1] - startRange[0];
        const lo = Math.max(0, Math.min(1 - span, startRange[0] + dt));
        onRange([lo, lo + span]);
      }
    };
    const up = () => {
      setDrag(null);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      style={{ display: 'block', touchAction: 'none', userSelect: 'none' }}
    >
      <defs>
        <linearGradient id="curveFill" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={theme.colors.danger} stopOpacity="0.18" />
          <stop offset="50%" stopColor={theme.colors.warn} stopOpacity="0.18" />
          <stop offset="100%" stopColor={theme.colors.success} stopOpacity="0.22" />
        </linearGradient>
        <linearGradient id="curveStroke" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor={theme.colors.danger} />
          <stop offset="50%" stopColor={theme.colors.warn} />
          <stop offset="100%" stopColor={theme.colors.success} />
        </linearGradient>
        <clipPath id="selClip">
          <rect x={loX} y={PAD_T} width={Math.max(0, hiX - loX)} height={inner.h} />
        </clipPath>
      </defs>

      <path d={areaPath} fill="url(#curveFill)" opacity="0.45" />
      <path d={linePath} fill="none" stroke="url(#curveStroke)" strokeWidth={2} opacity="0.45" />

      <g clipPath="url(#selClip)">
        <path d={areaPath} fill="url(#curveFill)" />
        <path d={linePath} fill="none" stroke="url(#curveStroke)" strokeWidth={2.5} />
      </g>

      <line
        x1={PAD_L}
        x2={W - PAD_R}
        y1={PAD_T + inner.h}
        y2={PAD_T + inner.h}
        stroke={theme.colors.line}
        strokeWidth={1}
      />

      <rect
        x={loX}
        y={PAD_T - 2}
        width={Math.max(0, hiX - loX)}
        height={inner.h + 4}
        fill={theme.colors.ink}
        fillOpacity={0.04}
        stroke={theme.colors.ink}
        strokeOpacity={0.18}
        strokeDasharray="3 3"
        onPointerDown={(e) => onPointerDown(e, 'mid')}
        style={{ cursor: 'grab' }}
      />

      <BrushHandle
        x={loX}
        h={inner.h}
        pad={PAD_T}
        active={drag === 'lo'}
        onDown={(e) => onPointerDown(e, 'lo')}
      />
      <BrushHandle
        x={hiX}
        h={inner.h}
        pad={PAD_T}
        active={drag === 'hi'}
        onDown={(e) => onPointerDown(e, 'hi')}
      />

      <text x={PAD_L} y={H - 2} fontSize="9" fill={theme.colors.inkMute} fontWeight="700" textAnchor="start" fontFamily={theme.fonts.ui}>
        weakest
      </text>
      <text x={W / 2} y={H - 2} fontSize="9" fill={theme.colors.inkMute} fontWeight="700" textAnchor="middle" fontFamily={theme.fonts.ui}>
        avg.
      </text>
      <text x={W - PAD_R} y={H - 2} fontSize="9" fill={theme.colors.inkMute} fontWeight="700" textAnchor="end" fontFamily={theme.fonts.ui}>
        strongest
      </text>
    </svg>
  );
}

interface HandleProps {
  x: number;
  h: number;
  pad: number;
  active: boolean;
  onDown: (e: React.PointerEvent<SVGElement>) => void;
}

function BrushHandle({ x, h, pad, active, onDown }: HandleProps) {
  const theme = useTheme();
  return (
    <g onPointerDown={onDown} style={{ cursor: 'ew-resize' }}>
      <line x1={x} x2={x} y1={pad - 2} y2={pad + h + 2} stroke={theme.colors.ink} strokeWidth={1.5} />
      <rect
        x={x - 7}
        y={pad + h / 2 - 14}
        width="14"
        height="28"
        rx="4"
        fill="#fff"
        stroke={theme.colors.ink}
        strokeWidth={active ? 2 : 1.5}
      />
      <line x1={x - 2} x2={x - 2} y1={pad + h / 2 - 6} y2={pad + h / 2 + 6} stroke={theme.colors.inkSoft} strokeWidth={1} />
      <line x1={x + 2} x2={x + 2} y1={pad + h / 2 - 6} y2={pad + h / 2 + 6} stroke={theme.colors.inkSoft} strokeWidth={1} />
    </g>
  );
}
