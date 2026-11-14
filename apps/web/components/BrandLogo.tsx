import { useId } from "react";

interface BrandLogoMarkProps {
  className?: string;
  size?: number;
}

/**
 * Archival mark (not used on the judge-facing nav).
 * Contains a 2030 forecast-cone motif that overstates product capability.
 * Keep for history; primary chrome uses `BrandWordmark` (D55). Do not restore
 * this mark on the default demo path until a dedicated logo sprint replaces it.
 */
export function BrandLogoMark({ className = "", size = 36 }: BrandLogoMarkProps) {
  const uid = useId().replace(/:/g, "");
  const bgId = `td-bg-${uid}`;
  const ringId = `td-ring-${uid}`;
  const energyId = `td-energy-${uid}`;
  const coneId = `td-cone-${uid}`;
  const glowId = `td-glow-${uid}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      aria-hidden="true"
      className={`shrink-0 select-none ${className}`}
    >
      <defs>
        <linearGradient id={bgId} x1="8" y1="6" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0b1528" />
          <stop offset="100%" stopColor="#03050a" />
        </linearGradient>
        <linearGradient id={ringId} x1="10" y1="10" x2="54" y2="54" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7cc4ff" />
          <stop offset="55%" stopColor="#38bdf8" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#f5c26b" />
        </linearGradient>
        <linearGradient id={energyId} x1="16" y1="44" x2="48" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#7cc4ff" />
          <stop offset="55%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#ff8a80" />
        </linearGradient>
        <linearGradient id={coneId} x1="34" y1="28" x2="49" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f5c26b" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#f5c26b" stopOpacity="0.04" />
        </linearGradient>
        <radialGradient id={glowId} cx="72%" cy="26%" r="36%">
          <stop offset="0%" stopColor="#f5c26b" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#f5c26b" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect x="4" y="4" width="56" height="56" rx="16" fill={`url(#${bgId})`} />
      <rect
        x="4.75"
        y="4.75"
        width="54.5"
        height="54.5"
        rx="15.25"
        stroke={`url(#${ringId})`}
        strokeOpacity="0.45"
        strokeWidth="1.5"
      />

      <circle cx="32" cy="32" r="24" fill={`url(#${glowId})`} />

      {/* Globe meridian & parallel grid */}
      <circle cx="30" cy="31" r="18.5" stroke="#7cc4ff" strokeOpacity="0.22" strokeWidth="1.2" />
      <ellipse cx="30" cy="31" rx="10" ry="18.5" stroke="#7cc4ff" strokeOpacity="0.16" strokeWidth="1.1" />
      <path
        d="M12.5 25.5H47.5M12.5 36.5H47.5"
        stroke="#7cc4ff"
        strokeOpacity="0.14"
        strokeWidth="1.1"
        strokeLinecap="round"
      />

      {/* Hydro & Wind clean-energy wave */}
      <path
        d="M14.5 37.5C19 34.2 23.5 34.2 28 37.5C32.5 40.8 37 40.8 42.5 36.8"
        stroke="#7cc4ff"
        strokeOpacity="0.7"
        strokeWidth="1.75"
        strokeLinecap="round"
      />

      {/* 2030 Sen's Slope Confidence Cone */}
      <path d="M33.5 27.5L46.5 15.5L46.5 25.5Z" fill={`url(#${coneId})`} />

      {/* Energy & Climate Trend Trajectory */}
      <path
        d="M15.5 39.5L23.5 33.5L28.5 35.5L35.5 25.5L45.5 18.5"
        stroke={`url(#${energyId})`}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Subtle Energy Pulse Bolt at center-top */}
      <path
        d="M32.8 19.5L29.6 24.5H33.2L30.8 29.2"
        stroke="#f5c26b"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.88"
      />

      {/* Nodes */}
      <circle cx="23.5" cy="33.5" r="2" fill="#7cc4ff" />
      <circle cx="35.5" cy="25.5" r="2.2" fill="#e8edf3" />
      <circle cx="45.5" cy="18.5" r="3.2" fill="#f5c26b" />
      <circle cx="45.5" cy="18.5" r="5.5" stroke="#f5c26b" strokeOpacity="0.4" strokeWidth="1.2" />

      {/* Detective Lens Rim & Handle */}
      <circle cx="30" cy="31" r="18.5" stroke={`url(#${ringId})`} strokeWidth="2.2" />
      <path d="M43.8 44.8L52.5 53.5" stroke={`url(#${ringId})`} strokeWidth="3.6" strokeLinecap="round" />
    </svg>
  );
}
