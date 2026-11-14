const PATHS = {
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  lock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 8 0v4",
  unlock: "M6 11h12v10H6zM8 11V7a4 4 0 0 1 7.5-2",
  tiltUp: "M4 17l8-8 8 8M4 12l8-8 8 8",
  tiltDown: "M4 7l8 8 8-8M4 12l8 8 8-8",
  rotateLeft: "M3 12a9 9 0 1 0 3-6.7M3 4v5h5",
  rotateRight: "M21 12a9 9 0 1 1-3-6.7M21 4v5h-5",
  compass: "M12 3l4 9h-8l4-9zM12 21l-4-9h8l-4 9z",
  home: "M3 11l9-7 9 7M5 10v10h14V10",
  layers: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5",
  chevron: "M9 6l6 6-6 6",
  close: "M6 6l12 12M18 6L6 18",
  station: "M12 21v-7M8 21h8M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 7h.01M5 4a9 9 0 0 0 0 10M19 4a9 9 0 0 1 0 10",
  target: "M12 2v4M12 18v4M2 12h4M18 12h4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z",
  chart: "M3 3v18h18M7 15l4-4 3 3 5-6",
  info: "M12 8h.01M11 12h1v5h1M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z",
  copy: "M8 8h11v11H8zM5 16V5h11",
  ruler: "M3 17L17 3l4 4L7 21l-4-4zM7 13l2 2M10 10l2 2M13 7l2 2",
  axes: "M5 3v16h16M5 3L3 6M5 3l2 3M21 19l-3-2M21 19l-3 2M9 15l6-6",
  polygon: "M4 8l7-5 9 5-3 12H7zM4 8h0",
  radius: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 12h9M12 12h.01",
  profile: "M3 20h18M3 16l5-7 4 4 4-6 5 9",
  search: "M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4",
  mountain: "M3 20l6-11 4 6 3-4 5 9zM9 9l1.5 2.5",
  camera: "M4 8h3l2-3h6l2 3h3v11H4zM12 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  undo: "M9 14L4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3",
  check: "M5 12l5 5L20 7",
  globe: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18",
  thermo: "M10 14.5V6a2 2 0 1 1 4 0v8.5a3.5 3.5 0 1 1-4 0zM10 9h4",
  rain: "M12 3v2M8 5l1.2 1.6M16 5l-1.2 1.6M7 14a5 5 0 1 1 10 0c0 3-2.5 5-5 7-2.5-2-5-4-5-7z",
  drought: "M4 20h16M6 16l3-5 2 3 3-6 4 8",
  leaf: "M5 19c8-1 13-8 14-14-6 1-13 6-14 14zM5 19c3-3 7-5 11-6",
  snowflake: "M12 3v18M5 7l14 10M19 7L5 17M4 12h16",
  droplet: "M12 3c4 6 7 9 7 12a7 7 0 1 1-14 0c0-3 3-6 7-12z",
  flame: "M12 21c4 0 6-3 6-6 0-4-3-6-3-9 0 2-2 3-3 5-1-1-2-3-2-5 0 4-4 6-4 10 0 3 2 5 6 5z",
  storm: "M13 3L6 13h5l-2 8 9-12h-5l5-6z",
  pylon: "M12 3L7 21M12 3l5 18M8.5 9h7M7.3 14h9.4M9 21h6M10 9l4 5M14 9l-4 5",
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
