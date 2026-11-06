import type { ReactNode } from 'react';

export type IconName =
  | 'algorithms'
  | 'input'
  | 'visualization'
  | 'map'
  | 'code'
  | 'run'
  | 'play'
  | 'pause'
  | 'replay'
  | 'previous'
  | 'next'
  | 'plus'
  | 'minus'
  | 'close'
  | 'fit'
  | 'layout'
  | 'focus'
  | 'settings'
  | 'pipeline'
  | 'stop'
  | 'check'
  | 'shuffle'
  | 'link'
  | 'sort';

const paths: Record<IconName, ReactNode> = {
  algorithms: <path d="M4 6h11M4 12h16M4 18h8" />,
  input: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  visualization: <path d="M5 20v-7M10 20V8M15 20v-4M20 20V4" />,
  map: (
    <>
      <circle cx="6" cy="6" r="2.4" />
      <circle cx="18" cy="12" r="2.4" />
      <circle cx="6" cy="18" r="2.4" />
      <path d="M8.4 6.4c4.6.4 3.8 5 7.2 5.4M8.4 17.6c4.6-.4 3.8-5 7.2-5.4" />
    </>
  ),
  code: <path d="m8 7-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16" />,
  run: <path d="M7 5.5v13l10.5-6.5L7 5.5Z" />,
  play: <path d="M7 5.5v13l10.5-6.5L7 5.5Z" fill="currentColor" />,
  pause: <path d="M8.5 5.5v13M15.5 5.5v13" strokeWidth="2.6" />,
  replay: <path d="M4.5 12a7.5 7.5 0 1 0 2.4-5.5L4.5 8.8M4.5 4.5v4.3h4.3" />,
  previous: <path d="m14.5 6-6 6 6 6" />,
  next: <path d="m9.5 6 6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  close: <path d="m7 7 10 10M17 7 7 17" />,
  fit: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  layout: (
    <>
      <rect x="3.5" y="4" width="7" height="7" rx="1.6" />
      <rect x="13.5" y="4" width="7" height="4.5" rx="1.6" />
      <rect x="13.5" y="11.5" width="7" height="8.5" rx="1.6" />
      <rect x="3.5" y="14" width="7" height="6" rx="1.6" />
    </>
  ),
  focus: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3.5M12 17.5V21M3 12h3.5M17.5 12H21" />
    </>
  ),
  settings: (
    <>
      <path d="M4 7h9M19 7h1M4 17h3M13 17h7" />
      <circle cx="16" cy="7" r="2.5" />
      <circle cx="10" cy="17" r="2.5" />
    </>
  ),
  pipeline: (
    <>
      <rect x="2.5" y="9" width="5" height="6" rx="1.5" />
      <rect x="16.5" y="9" width="5" height="6" rx="1.5" />
      <path d="M7.5 12h9" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </>
  ),
  stop: <rect x="6.5" y="6.5" width="11" height="11" rx="2" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  shuffle: (
    <path d="M4 7h2.5c4.5 0 6.5 10 11 10H20M4 17h2.5c1.4 0 2.6-1 3.6-2.4M13.9 9.4C14.9 8 16.1 7 17.5 7H20M17.5 4.5 20 7l-2.5 2.5M17.5 14.5 20 17l-2.5 2.5" />
  ),
  link: (
    <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" />
  ),
  sort: <path d="M7 5v14M4 16l3 3 3-3M14 7h6M14 12h4.5M14 17h3" />,
};

export function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}
