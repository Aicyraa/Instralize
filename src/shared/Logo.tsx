// Mirrors public/favicon.svg: sorted bars traced by a connected execution path.
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      className="logo-mark"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="32" height="32" rx="9" fill="#17181c" />
      <rect
        x="0.5"
        y="0.5"
        width="31"
        height="31"
        rx="8.5"
        stroke="#ffffff"
        strokeOpacity="0.1"
      />
      <rect x="7" y="18" width="4.2" height="7" rx="1.4" fill="#3b3e46" />
      <rect x="13.9" y="14" width="4.2" height="11" rx="1.4" fill="#5d626d" />
      <rect x="20.8" y="9.5" width="4.2" height="15.5" rx="1.4" fill="#9aa8ff" />
      <path
        d="M9.1 14.2C12 14.2 13.2 10.3 16 10.3S20 5.8 22.9 5.8"
        stroke="#9aa8ff"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="9.1" cy="14.2" r="1.7" fill="#17181c" stroke="#c9cdd6" strokeWidth="1.2" />
      <circle cx="16" cy="10.3" r="1.7" fill="#17181c" stroke="#c9cdd6" strokeWidth="1.2" />
      <circle cx="22.9" cy="5.8" r="1.9" fill="#9aa8ff" />
    </svg>
  );
}
