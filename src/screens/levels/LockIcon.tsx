import { useTheme } from 'styled-components';

export function LockIcon() {
  const theme = useTheme();
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" fill={theme.colors.inkSoft} />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke={theme.colors.inkSoft} strokeWidth="2" fill="none" />
    </svg>
  );
}
