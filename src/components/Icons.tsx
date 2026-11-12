import type { SVGProps } from 'react';

export type IconName =
  | 'play'
  | 'step'
  | 'pause'
  | 'reset'
  | 'map'
  | 'shop'
  | 'box'
  | 'volume'
  | 'mute'
  | 'save'
  | 'download'
  | 'upload'
  | 'close'
  | 'star'
  | 'check'
  | 'lock'
  | 'flame'
  | 'coin'
  | 'bolt'
  | 'code'
  | 'terminal'
  | 'eye'
  | 'hint'
  | 'snow'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'bug'
  | 'sparkles'
  | 'crown'
  | 'trophy'
  | 'settings'
  | 'menu'
  | 'copy'
  | 'info'
  | 'wand'
  | 'target'
  | 'skull'
  | 'arrow-right'
  | 'arrow-left'
  | 'grid'
  | 'layers'
  | 'cpu'
  | 'zap'
  | 'orbit'
  | 'refresh';

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  filled?: boolean;
}

export function Icon({ name, size = 20, filled = false, ...props }: IconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: filled ? 'currentColor' : 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...props,
  };

  switch (name) {
    case 'play':
      return (
        <svg {...common}>
          <path d="M7.5 4.8v14.4a1 1 0 0 0 1.54.84l11-7.2a1 1 0 0 0 0-1.68l-11-7.2A1 1 0 0 0 7.5 4.8Z" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'pause':
      return (
        <svg {...common}>
          <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
          <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'step':
      return (
        <svg {...common}>
          <path d="M5 5v14l9-7-9-7Z" fill="currentColor" stroke="none" />
          <path d="M17.5 5v14" />
        </svg>
      );
    case 'reset':
      return (
        <svg {...common}>
          <path d="M3 11a9 9 0 1 0 3-6.7L3 7" />
          <path d="M3 3v4h4" />
        </svg>
      );
    case 'map':
      return (
        <svg {...common}>
          <path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z" />
          <path d="M9 3v15M15 6v15" />
        </svg>
      );
    case 'shop':
      return (
        <svg {...common}>
          <path d="M4 9h16l-1.2 10.2a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 9Z" />
          <path d="M8 9V7a4 4 0 0 1 8 0v2M9 13h.01M15 13h.01" />
        </svg>
      );
    case 'box':
      return (
        <svg {...common}>
          <path d="m21 16-9 5-9-5V8l9-5 9 5v8Z" />
          <path d="m3.27 6.96 8.73 5.08 8.73-5.08M12 22.08V12" />
        </svg>
      );
    case 'volume':
      return (
        <svg {...common}>
          <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" stroke="none" />
          <path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8 8 0 0 1 0 12" />
        </svg>
      );
    case 'mute':
      return (
        <svg {...common}>
          <path d="M4 9v6h4l5 4V5L8 9H4Z" fill="currentColor" stroke="none" />
          <path d="m17 9 5 5M22 9l-5 5" />
        </svg>
      );
    case 'save':
      return (
        <svg {...common}>
          <path d="M5 3h11l3 3v15H5V3Z" />
          <path d="M8 3v6h8V3M8 21v-7h8v7" />
        </svg>
      );
    case 'download':
      return (
        <svg {...common}>
          <path d="M12 3v12M7 11l5 5 5-5M4 19h16" />
        </svg>
      );
    case 'upload':
      return (
        <svg {...common}>
          <path d="M12 16V4M7 8l5-5 5 5M4 20h16" />
        </svg>
      );
    case 'close':
      return (
        <svg {...common}>
          <path d="m5 5 14 14M19 5 5 19" />
        </svg>
      );
    case 'star':
      return (
        <svg {...common}>
          <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z" />
        </svg>
      );
    case 'check':
      return (
        <svg {...common}>
          <path d="m4.5 12.5 5 5L20 6.5" strokeWidth="2.6" />
        </svg>
      );
    case 'lock':
      return (
        <svg {...common}>
          <rect x="4" y="10" width="16" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3M12 15v2" />
        </svg>
      );
    case 'flame':
      return (
        <svg {...common}>
          <path d="M12 22c4 0 7-2.8 7-6.7 0-3.4-2.2-5.4-3.8-7.7C13.9 5.6 13.5 3.8 13.6 2c-3 1.6-5.6 4.6-5.6 8.2 0 1.6.6 2.8 1.3 3.9-.9-.2-1.8-1-2.3-2.1-.7 1.2-1 2.5-1 3.8C6 19.3 8.6 22 12 22Z" />
        </svg>
      );
    case 'coin':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 6.5v11M14.8 8.8c-.7-.7-1.7-1-2.8-1-1.5 0-2.6.7-2.6 1.9 0 1.4 1.2 1.9 2.8 2.2 1.8.4 2.9.9 2.9 2.4 0 1.3-1.2 2.1-2.8 2.1-1.2 0-2.3-.4-3.1-1.2" />
        </svg>
      );
    case 'bolt':
    case 'zap':
      return (
        <svg {...common}>
          <path d="M13 2 4.5 13.5H11l-1 8.5L19.5 10H13V2Z" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'code':
      return (
        <svg {...common}>
          <path d="m8 6-6 6 6 6M16 6l6 6-6 6M14 3l-4 18" />
        </svg>
      );
    case 'terminal':
      return (
        <svg {...common}>
          <rect x="2.5" y="4" width="19" height="16" rx="2" />
          <path d="m6.5 9 3 3-3 3M12 15h5" />
        </svg>
      );
    case 'eye':
      return (
        <svg {...common}>
          <path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case 'hint':
      return (
        <svg {...common}>
          <path d="M9 18h6M10 21h4M8.4 14.5A6.5 6.5 0 1 1 15.6 14.5c-.9.7-1.6 1.5-1.6 2.5h-4c0-1-.6-1.8-1.6-2.5Z" />
          <path d="M12 2V1M4.9 4.9 4.2 4.2M19.1 4.9l.7-.7" />
        </svg>
      );
    case 'snow':
      return (
        <svg {...common}>
          <path d="M12 2v20M4.2 7l15.6 10M19.8 7 4.2 17M9 4l3 2 3-2M9 20l3-2 3 2M4.5 12l2-3-3-1M19.5 12l-2-3 3-1M4.5 12l2 3-3 1M19.5 12l-2 3 3 1" />
        </svg>
      );
    case 'chevron-left':
      return (
        <svg {...common}>
          <path d="m15 5-7 7 7 7" />
        </svg>
      );
    case 'chevron-right':
      return (
        <svg {...common}>
          <path d="m9 5 7 7-7 7" />
        </svg>
      );
    case 'chevron-down':
      return (
        <svg {...common}>
          <path d="m5 9 7 7 7-7" />
        </svg>
      );
    case 'bug':
      return (
        <svg {...common}>
          <path d="M8 6a4 4 0 0 1 8 0M6 13H3M21 13h-3M6.5 8.5 4 6M17.5 8.5 20 6M6.5 17.5 4 20M17.5 17.5 20 20" />
          <rect x="6" y="8" width="12" height="11" rx="5" />
          <path d="M12 8v11M6 13h12" />
        </svg>
      );
    case 'sparkles':
      return (
        <svg {...common}>
          <path d="m12 2 1.4 4.6L18 8l-4.6 1.4L12 14l-1.4-4.6L6 8l4.6-1.4L12 2ZM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15ZM5 14l.7 1.8L7.5 16.5l-1.8.7L5 19l-.7-1.8L2.5 16.5l1.8-.7L5 14Z" />
        </svg>
      );
    case 'crown':
      return (
        <svg {...common}>
          <path d="m3 7 4.5 4L12 4l4.5 7L21 7l-2 12H5L3 7Z" />
          <path d="M5 19h14" />
        </svg>
      );
    case 'trophy':
      return (
        <svg {...common}>
          <path d="M8 3h8v5a4 4 0 0 1-8 0V3Z" />
          <path d="M8 5H4v2a4 4 0 0 0 4 4M16 5h4v2a4 4 0 0 1-4 4M12 12v5M8 21h8M9 17h6" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
        </svg>
      );
    case 'menu':
      return (
        <svg {...common}>
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      );
    case 'copy':
      return (
        <svg {...common}>
          <rect x="8" y="8" width="12" height="12" rx="2" />
          <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
        </svg>
      );
    case 'info':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 11v5M12 7.5h.01" />
        </svg>
      );
    case 'wand':
      return (
        <svg {...common}>
          <path d="m4 20 11-11M13 3l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3ZM19 13l.7 2.1 2.1.7-2.1.7L19 19l-.7-2.5-2.1-.7 2.1-.7L19 13Z" />
        </svg>
      );
    case 'target':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="12" cy="12" r="1" fill="currentColor" />
        </svg>
      );
    case 'skull':
      return (
        <svg {...common}>
          <path d="M5 10a7 7 0 1 1 14 0c0 2.3-1.1 3.8-2.5 5-1 .9-1.5 1.8-1.5 3H9c0-1.2-.5-2.1-1.5-3C6.1 13.8 5 12.3 5 10Z" />
          <circle cx="9" cy="10" r="1.5" fill="currentColor" />
          <circle cx="15" cy="10" r="1.5" fill="currentColor" />
          <path d="M10 18v2M14 18v2" />
        </svg>
      );
    case 'arrow-right':
      return (
        <svg {...common}>
          <path d="M4 12h16M14 6l6 6-6 6" />
        </svg>
      );
    case 'arrow-left':
      return (
        <svg {...common}>
          <path d="M20 12H4M10 6l-6 6 6 6" />
        </svg>
      );
    case 'grid':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      );
    case 'layers':
      return (
        <svg {...common}>
          <path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5" />
        </svg>
      );
    case 'cpu':
      return (
        <svg {...common}>
          <rect x="6" y="6" width="12" height="12" rx="2" />
          <path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" />
          <rect x="9" y="9" width="6" height="6" rx="1" />
        </svg>
      );
    case 'orbit':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <ellipse cx="12" cy="12" rx="10" ry="5" transform="rotate(-30 12 12)" />
          <circle cx="20" cy="7" r="1.5" fill="currentColor" />
        </svg>
      );
    case 'refresh':
      return (
        <svg {...common}>
          <path d="M20 7v5h-5M4 17v-5h5" />
          <path d="M18.5 9A8 8 0 0 0 5 6.5L4 8M5.5 15A8 8 0 0 0 19 17.5l1-1.5" />
        </svg>
      );
    default:
      return null;
  }
}
