"use client";

export type CoreVisualState = "idle" | "investigating" | "ready" | "insufficient";

/** Compact orbital-sensor mark. Not the AETHRA logo. Motion is CSS-only. */
export function AethraCoreMark({ state }: { state: CoreVisualState }) {
  return (
    <span className={`aethra-core-mark aethra-core-mark--${state}`} aria-hidden>
      <svg viewBox="0 0 32 32" className="size-7">
        <rect x="10" y="10" width="12" height="12" transform="rotate(45 16 16)" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="16" cy="16" r="2.2" fill="currentColor" className="aethra-core-mark__nucleus" />
        <ellipse cx="16" cy="16" rx="13" ry="5" fill="none" stroke="currentColor" strokeWidth="1" className="aethra-core-mark__orbit" />
      </svg>
    </span>
  );
}
