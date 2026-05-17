import type { CSSProperties } from 'react';

export type IconName =
  | 'cards' | 'abc' | 'play' | 'arrow' | 'back' | 'close'
  | 'settings' | 'speaker' | 'flame' | 'bulb' | 'star'
  | 'check' | 'refresh' | 'sparkle';

interface Props {
  name: IconName;
  size?: number;
  color?: string;
  stroke?: number;
  style?: CSSProperties;
}

export function Icon({ name, size = 22, color = 'currentColor', stroke = 1.8, style }: Props) {
  const p = {
    fill: 'none',
    stroke: color,
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden="true">
      {name === 'cards' && (
        <>
          <rect x="3.5" y="6" width="13" height="14" rx="2.5" {...p} />
          <path d="M7.5 3.5h11a2 2 0 0 1 2 2v11" {...p} />
        </>
      )}
      {name === 'abc' && (
        <path d="M3 19l4-12 4 12M4.5 15.5h5M14 9.5c.7-1 1.9-1.5 3-1.5 1.7 0 3 1 3 3 0 1.7-2 2.5-3 2.5h-1m1 0c1.5 0 3 1 3 3s-1.4 3-3 3c-1.4 0-2.5-.7-3.2-1.5" {...p} />
      )}
      {name === 'play' && <path d="M7 5l11 7-11 7V5z" {...p} />}
      {name === 'arrow' && <path d="M5 12h14M13 6l6 6-6 6" {...p} />}
      {name === 'back' && <path d="M19 12H5M11 18l-6-6 6-6" {...p} />}
      {name === 'close' && <path d="M6 6l12 12M18 6L6 18" {...p} />}
      {name === 'settings' && (
        <>
          <circle cx="12" cy="12" r="3" {...p} />
          <path d="M19.4 15a1.7 1.7 0 0 0 .4 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.4 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .4-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.4-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.4H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.4 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" {...p} />
        </>
      )}
      {name === 'speaker' && (
        <path d="M11 5L6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M18 6a8 8 0 0 1 0 12" {...p} />
      )}
      {name === 'flame' && (
        <path d="M12 3s4 4 4 8a4 4 0 0 1-8 0c0-1 .3-1.8.8-2.5C9 10 10 11 10 12c0-3 2-5 2-9z" {...p} />
      )}
      {name === 'bulb' && (
        <path d="M9 17h6M10 21h4M12 3a6 6 0 0 0-4 10c1 1 1.5 2 1.5 3h5c0-1 .5-2 1.5-3a6 6 0 0 0-4-10z" {...p} />
      )}
      {name === 'star' && (
        <path d="M12 3l2.7 5.5 6 .9-4.3 4.2 1 6L12 16.8 6.6 19.6l1-6L3.3 9.4l6-.9L12 3z" {...p} />
      )}
      {name === 'check' && <path d="M5 13l4 4 10-10" {...p} />}
      {name === 'refresh' && (
        <path d="M3 12a9 9 0 0 1 15.5-6.3M21 4v5h-5M21 12a9 9 0 0 1-15.5 6.3M3 20v-5h5" {...p} />
      )}
      {name === 'sparkle' && (
        <path d="M12 4v4M12 16v4M4 12h4M16 12h4M7 7l2.5 2.5M14.5 14.5L17 17M17 7l-2.5 2.5M9.5 14.5L7 17" {...p} />
      )}
    </svg>
  );
}
