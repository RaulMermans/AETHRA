"use client";

import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

/** Shared frame for map-tool panels. */
export function ToolPanel({
  icon,
  title,
  onClose,
  children,
}: {
  icon: IconName;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <section aria-label={`${title} tool`} className="panel pointer-events-auto max-h-[calc(100dvh-12rem)] w-72 overflow-y-auto p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm text-ink">
          <Icon name={icon} className="size-4 text-accent" />
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close tool"
          title="Close (Esc)"
          className="focus-ring grid size-7 place-items-center rounded-md text-muted hover:bg-white/6 hover:text-ink"
        >
          <Icon name="close" className="size-3.5" />
        </button>
      </div>
      {children}
    </section>
  );
}

export function Result({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div>
      <dt className="text-[10px] tracking-[0.12em] text-faint uppercase">{label}</dt>
      <dd className="font-mono text-sm text-ink tabular-nums" style={color ? { color } : undefined}>
        {value}
        {sub && <span className="ml-2 text-xs text-muted">{sub}</span>}
      </dd>
    </div>
  );
}

export const smallButton =
  "focus-ring inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs text-ink hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-40";
