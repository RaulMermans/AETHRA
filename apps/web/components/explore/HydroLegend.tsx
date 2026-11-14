"use client";

const ITEMS = [
  { id: "river", label: "Rivers", swatch: "bg-sky-200/80", shape: "line" },
  { id: "reservoir", label: "Reservoirs", swatch: "bg-cyan-300/70", shape: "dot" },
  { id: "lake", label: "Lakes", swatch: "bg-sky-400/70", shape: "dot" },
  { id: "lagoon", label: "Lagoons", swatch: "bg-teal-200/80", shape: "dot" },
] as const;

export function HydroLegend() {
  return (
    <div className="panel pointer-events-auto px-2.5 py-1.5" aria-label="Hydrography legend">
      <p className="text-[9px] uppercase tracking-[0.16em] text-faint">Water</p>
      <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
        {ITEMS.map((item) => (
          <li key={item.id} className="flex items-center gap-1.5 text-[10px] text-muted">
            <span
              className={
                item.shape === "line" ? `h-px w-3.5 ${item.swatch}` : `size-1.5 rounded-full ${item.swatch}`
              }
              aria-hidden
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
