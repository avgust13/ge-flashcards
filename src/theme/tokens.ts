export const theme = {
  colors: {
    bg: '#FFF8EE',
    bgWarm: '#FBEFD9',
    ink: '#1F1A14',
    inkSoft: '#6B6253',
    inkMute: '#A89E8C',
    line: '#ECE2CC',
    card: '#FFFFFF',
    primary: '#FF6B47',
    primaryDark: '#E04A28',
    success: '#36B37E',
    successSoft: '#E8F7EF',
    danger: '#E84C4C',
    dangerSoft: '#FCE8E8',
    warn: '#F2B441',
    warnSoft: '#FFF4D9',
    blue: '#3B82F6',
    blueSoft: '#E7F0FE',
  },
  fonts: {
    ui: '"Nunito", system-ui, -apple-system, "Segoe UI", sans-serif',
    ka: '"Noto Sans Georgian", "Nunito", system-ui, sans-serif',
  },
  shadow: '0 2px 0 #ECE2CC, 0 8px 24px rgba(31,26,20,.06)',
} as const;

export type Theme = typeof theme;
