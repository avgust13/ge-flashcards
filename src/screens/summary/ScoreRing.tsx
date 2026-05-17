import { useTheme } from 'styled-components';

interface Props {
  value: number;
  color: string;
}

export function ScoreRing({ value, color }: Props) {
  const theme = useTheme();
  const R = 36;
  const C = 2 * Math.PI * R;
  const off = C * (1 - Math.max(0, Math.min(1, value)));
  return (
    <svg width="88" height="88" viewBox="0 0 88 88">
      <circle cx="44" cy="44" r={R} fill="none" stroke={theme.colors.line} strokeWidth="9" />
      <circle
        cx="44"
        cy="44"
        r={R}
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeDasharray={C}
        strokeDashoffset={off}
        strokeLinecap="round"
        transform="rotate(-90 44 44)"
        style={{ transition: 'stroke-dashoffset .8s ease' }}
      />
      <text
        x="44"
        y="50"
        textAnchor="middle"
        fontFamily={theme.fonts.ui}
        fontWeight="900"
        fontSize="22"
        fill={color}
      >
        {Math.round(value * 100)}%
      </text>
    </svg>
  );
}
