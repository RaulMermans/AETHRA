"use client";

import { useEffect, useRef, useState } from "react";
import { formatDegrees } from "@/lib/format";
import { parseCoordinates } from "@/lib/globe/measure";
import { searchPlaces, type NamedPlace } from "@/lib/globe/places-es";
import type { GeoCoordinate } from "@/lib/globe/types";
import { ToolPanel } from "./ToolPanel";

/** Search a Spanish place (provincial capitals, Ceuta, Melilla, main peaks) or type coordinates. */
export function GoToPanel({
  onGo,
  onClose,
}: {
  onGo: (target: GeoCoordinate & { name?: string; kind?: NamedPlace["kind"] }) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  const coords = parseCoordinates(query);
  const places = coords ? [] : searchPlaces(query);
  const submit = () => {
    if (coords) onGo(coords);
    else if (places[0]) onGo(places[0]);
  };

  return (
    <ToolPanel icon="search" title="Go to" onClose={onClose}>
      <form
        className="mt-3"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <label htmlFor="goto-input" className="text-[10px] tracking-[0.12em] text-faint uppercase">
          Place or coordinates
        </label>
        <input
          id="goto-input"
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Granada · 37.18, -3.60"
          autoComplete="off"
          className="focus-ring mt-1 w-full rounded-md border border-line bg-white/5 px-2.5 py-1.5 text-sm text-ink placeholder:text-faint"
        />
      </form>
      <ul className="mt-2 space-y-0.5" role="listbox" aria-label="Results">
        {coords && (
          <li>
            <button type="button" onClick={() => onGo(coords)} className="focus-ring w-full rounded-md px-2 py-1.5 text-left text-xs text-ink hover:bg-white/8">
              Go to <span className="font-mono">{formatDegrees(coords.latitude, 4)} {formatDegrees(coords.longitude, 4)}</span>
            </button>
          </li>
        )}
        {places.map((p) => (
          <li key={p.name}>
            <button
              type="button"
              onClick={() => onGo(p)}
              className="focus-ring flex w-full items-baseline justify-between rounded-md px-2 py-1.5 text-left text-[13px] text-ink hover:bg-white/8"
            >
              {p.name}
              <span className="text-[11px] text-faint">{p.kind === "peak" ? "peak" : "city"}</span>
            </button>
          </li>
        ))}
        {query.trim() && !coords && places.length === 0 && <li className="px-2 py-1.5 text-xs text-muted">No match. Try a provincial capital or “lat, lon”.</li>}
      </ul>
      <p className="mt-3 text-[11px] leading-relaxed text-faint">
        Decimal degrees (latitude first) or DMS, e.g. 28°16′N 16°38′W. Place list: provincial capitals, Ceuta, Melilla and main peaks (approximate centres).
      </p>
    </ToolPanel>
  );
}
