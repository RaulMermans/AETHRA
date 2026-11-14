const PATHS = {
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  tiltUp: "M4 17l8-8 8 8M4 12l8-8 8 8",
  tiltDown: "M4 7l8 8 8-8M4 12l8 8 8-8",
  rotateLeft: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5",
  rotateRight: "M21 12a9 9 0 1 1-3-6.7M21 4v5h-5",
  compass: "M12 3l4 9h-8l4-9zM12 21l-4-9h8l-4 9z",
  home: "M3 11l9-7 9 7M5 10v10h14V10",
  layers: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5",
  chevron: "M9 6l6 6-6 6",
  close: "M6 6l12 12M18 6L6 18",
  target: "M12 2v4M12 18v4M2 12h4M18 12h4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  chart: "M3 3v18h18M7 15l4-4 3 3 5-6",
  info: "M12 8h.01M11 12h1v5h1M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
  copy: "M8 8h11v11H8zM5 16V5h11",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "size-4" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
