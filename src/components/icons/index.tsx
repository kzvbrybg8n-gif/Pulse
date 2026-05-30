import type { CSSProperties, ReactNode } from "react";

export type IconProps = {
  size?: number;
  sw?: number;
  className?: string;
  style?: CSSProperties;
};

export type FlagIconProps = IconProps & {
  filled?: boolean;
  color?: string;
};

type SvgProps = IconProps & { children: ReactNode; fill?: string };

function Svg({ children, size = 18, sw = 1.75, fill = "none", className, style }: SvgProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {children}
    </svg>
  );
}

export const IconSun = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
  </Svg>
);

export const IconCalendarDays = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M3 10h18M8 2v4M16 2v4M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
  </Svg>
);

export const IconInbox = (p: IconProps) => (
  <Svg {...p}>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.5 5.5L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.5-6.5A2 2 0 0017 4H7a2 2 0 00-1.5 1.5z" />
  </Svg>
);

export const IconRepeat = (p: IconProps) => (
  <Svg {...p}>
    <path d="M17 2l4 4-4 4" />
    <path d="M3 11V9a4 4 0 014-4h14" />
    <path d="M7 22l-4-4 4-4" />
    <path d="M21 13v2a4 4 0 01-4 4H3" />
  </Svg>
);

export const IconTimer = (p: IconProps) => (
  <Svg {...p}>
    <path d="M10 2h4" />
    <path d="M12 14l3-3" />
    <circle cx="12" cy="14" r="8" />
  </Svg>
);

export const IconFolder = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20a2 2 0 01-2-2V6a2 2 0 012-2h5l2 3h7a2 2 0 012 2v9a2 2 0 01-2 2z" />
  </Svg>
);

export const IconHash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9h16M4 15h16M10 3L8 21M16 3l-2 18" />
  </Svg>
);

export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const IconSparkles = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z" />
  </Svg>
);

export const IconCalendar = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M3 10h18M8 2v4M16 2v4" />
  </Svg>
);

export const IconTag = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20.6 13.4L13.4 20.6a2 2 0 01-2.8 0l-7.2-7.2A2 2 0 012.8 12V4a1 1 0 011-1h8a2 2 0 011.4.6l7.4 7.4a2 2 0 010 2.4z" />
    <circle cx="7.5" cy="7.5" r="1.2" />
  </Svg>
);

export const IconAlignLeft = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6h18M3 12h12M3 18h15" />
  </Svg>
);

export const IconCornerDownRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 4v8a3 3 0 003 3h13" />
    <path d="M16 11l4 4-4 4" />
  </Svg>
);

export const IconSettings = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-1.8-.3 1.6 1.6 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.6 1.6 0 00-1-1.5 1.6 1.6 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.6 1.6 0 00.3-1.8 1.6 1.6 0 00-1.5-1H3a2 2 0 010-4h.1a1.6 1.6 0 001.5-1 1.6 1.6 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.6 1.6 0 001.8.3H9a1.6 1.6 0 001-1.5V3a2 2 0 014 0v.1a1.6 1.6 0 001 1.5 1.6 1.6 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.6 1.6 0 00-.3 1.8V9a1.6 1.6 0 001.5 1H21a2 2 0 010 4h-.1a1.6 1.6 0 00-1.5 1z" />
  </Svg>
);

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </Svg>
);

export const IconMoon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
  </Svg>
);

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <polyline points="20 6 9 17 4 12" />
  </Svg>
);

export const IconChevronRight = (p: IconProps) => (
  <Svg {...p}>
    <polyline points="9 18 15 12 9 6" />
  </Svg>
);

export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <polyline points="6 9 12 15 18 9" />
  </Svg>
);

export const IconX = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 6L6 18M6 6l12 12" />
  </Svg>
);

export function IconFlag({
  size = 16,
  filled = false,
  color = "currentColor",
  sw = 1.75,
  className,
  style,
}: FlagIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? color : "none"}
      stroke={color}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}

export const IconBell = (p: IconProps) => (
  <Svg {...p}>
    <path d="M18 8a6 6 0 00-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 01-3.4 0" />
  </Svg>
);

export const IconPencil = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" />
  </Svg>
);

export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);

export const IconNote = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 4h16v12l-5 5H4z" />
    <path d="M20 16h-5v5" />
    <path d="M8 9h8M8 13h5" />
  </Svg>
);

export const IconMore = (p: IconProps) => (
  <Svg {...p} fill="currentColor">
    <circle cx="5" cy="12" r="1.4" stroke="none" />
    <circle cx="12" cy="12" r="1.4" stroke="none" />
    <circle cx="19" cy="12" r="1.4" stroke="none" />
  </Svg>
);

export const IconGrip = (p: IconProps) => (
  <Svg {...p} fill="currentColor">
    <circle cx="9" cy="6" r="1.1" stroke="none" />
    <circle cx="15" cy="6" r="1.1" stroke="none" />
    <circle cx="9" cy="12" r="1.1" stroke="none" />
    <circle cx="15" cy="12" r="1.1" stroke="none" />
    <circle cx="9" cy="18" r="1.1" stroke="none" />
    <circle cx="15" cy="18" r="1.1" stroke="none" />
  </Svg>
);

export const IconTrash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6M10 11v6M14 11v6" />
  </Svg>
);

export const IconCopy = (p: IconProps) => (
  <Svg {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </Svg>
);

export const IconPlay = (p: IconProps) => (
  <Svg {...p} fill="currentColor">
    <polygon points="5,3 19,12 5,21" stroke="none" />
  </Svg>
);

export const IconPause = (p: IconProps) => (
  <Svg {...p} fill="currentColor">
    <rect x="6" y="4" width="4" height="16" rx="1" stroke="none" />
    <rect x="14" y="4" width="4" height="16" rx="1" stroke="none" />
  </Svg>
);

export const IconSkip = (p: IconProps) => (
  <Svg {...p} fill="currentColor">
    <polygon points="4,3 16,12 4,21" stroke="none" />
    <rect x="18" y="3" width="3" height="18" rx="1" stroke="none" />
  </Svg>
);
