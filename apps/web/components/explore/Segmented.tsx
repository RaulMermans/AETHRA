"use client";

import { Icon, type IconName } from "./Icon";

/** Small pill-shaped segmented switch (one option active). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: T;
  options: { value: T; label: string; icon?: IconName; hint: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div role="group" aria-label={label} className="panel pointer-events-auto flex gap-0.5 !rounded-full p-0.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            title={o.hint}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={`focus-ring inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
              active ? "bg-accent text-accent-ink" : "text-muted hover:bg-white/6 hover:text-ink"
            }`}
          >
            {o.icon && <Icon name={o.icon} className="size-3.5" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
