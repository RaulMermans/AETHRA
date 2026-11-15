"use client";

/**
 * Explains how the active map encodes its data (D73): native grid cells with FDR stippling, flat
 * basin boxes with hatching, or station symbols (filled / ring / grey). Every symbol has a text
 * label, so meaning never depends on colour alone. Renders only labels the pipeline provides.
 */

import { gridHasFdrLabels, mapEncodingFor, type ActiveClimateConfig, type ClimateBundle } from "@/lib/globe/climate";
import { useLocale } from "@/lib/i18n/locale";

function Swatch({ kind }: { kind: "dotted" | "plain" | "hatched" | "grey-box" | "filled" | "ring" | "insufficient" }) {
  switch (kind) {
    case "plain":
      return <span aria-hidden className="mt-0.5 size-3 shrink-0 rounded-[2px] bg-sky-300/80 ring-1 ring-black/40" />;
    case "dotted":
      return (
        <span aria-hidden className="mt-0.5 grid size-3 shrink-0 place-items-center rounded-[2px] bg-sky-300/80 ring-1 ring-black/40">
          <span className="size-1 rounded-full bg-[#0b1424]" />
        </span>
      );
    case "hatched":
      return (
        <span
          aria-hidden
          className="mt-0.5 size-3 shrink-0 rounded-[2px] ring-1 ring-white/70"
          style={{ background: "repeating-linear-gradient(135deg, #0b1424 0 1.5px, rgb(125 211 252 / 0.8) 1.5px 4px)" }}
        />
      );
    case "grey-box":
      return <span aria-hidden className="mt-0.5 size-3 shrink-0 rounded-[2px] bg-[rgb(120,128,140)] ring-1 ring-white/70" />;
    case "filled":
      return <span aria-hidden className="mt-0.5 size-3 shrink-0 rounded-full bg-sky-300 ring-[1.5px] ring-white" />;
    case "ring":
      return <span aria-hidden className="mt-0.5 size-3 shrink-0 rounded-full border-[3px] border-sky-300 bg-[#0b1424]" />;
    case "insufficient":
      return <span aria-hidden className="mt-1 ml-0.5 size-2 shrink-0 rounded-full bg-[rgb(120,128,140)] ring-1 ring-white" />;
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

function Item({ swatch, text }: { swatch: Parameters<typeof Swatch>[0]["kind"]; text: string }) {
  return (
    <li className="flex items-start gap-2">
      <Swatch kind={swatch} />
      <span>{text}</span>
    </li>
  );
}

export function MapEncodingKey({
  bundle,
  config,
  mapVisible,
  stationsVisible,
}: {
  bundle: ClimateBundle | null;
  config: ActiveClimateConfig;
  mapVisible: boolean;
  stationsVisible: boolean;
}) {
  const { m } = useLocale();
  if (!bundle) return null;
  const k = m.mapKey;
  const encoding = mapEncodingFor(config.dimension);
  const trend = config.mode === "trend";

  const rows: { swatch: Parameters<typeof Swatch>[0]["kind"]; text: string }[] = [];
  const notes: string[] = [];

  switch (encoding) {
    case "grid-cells": {
      if (mapVisible) {
        const resolution = config.dimension === "temperature" ? bundle.merra2.resolution : bundle.gpm.resolution;
        notes.push(k.cells(resolution));
        if (trend) {
          if (gridHasFdrLabels(bundle, config.dimension)) {
            rows.push({ swatch: "plain", text: k.cellsRobust }, { swatch: "dotted", text: k.cellsDotted });
          } else {
            notes.push(k.cellsNoFdr);
          }
        }
      }
      break;
    }
    case "basin-boxes": {
      if (mapVisible) {
        notes.push(k.basinsValue);
        if (trend) {
          rows.push(
            { swatch: "plain", text: k.basinsRobust },
            { swatch: "hatched", text: k.basinsHatched },
            { swatch: "grey-box", text: k.basinsNone },
          );
        }
      }
      break;
    }
    case "station-symbols": {
      if (stationsVisible) {
        if (!trend) notes.push(k.stationsValue(config.year));
        notes.push(k.stationsNoField);
      }
      break;
    }
    default: {
      const exhaustive: never = encoding;
      return exhaustive;
    }
  }

  // Station symbols carry the network FDR label in every trend map where stations are drawn.
  if (trend && stationsVisible && encoding !== "basin-boxes") {
    rows.push(
      { swatch: "filled", text: k.stationRobust },
      { swatch: "ring", text: k.stationRing },
      { swatch: "insufficient", text: k.stationInsufficient },
    );
  }

  if (rows.length === 0 && notes.length === 0) return null;

  return (
    <aside className="panel pointer-events-auto max-w-[17rem] px-2.5 py-2" aria-label={k.aria}>
      <p className="text-[9px] tracking-[0.16em] text-faint uppercase">{k.title}</p>
      {notes.map((n) => (
        <p key={n} className="mt-1 text-[10px] leading-snug text-muted">
          {n}
        </p>
      ))}
      {rows.length > 0 && (
        <ul className="mt-1.5 space-y-1 text-[10.5px] leading-snug text-ink">
          {rows.map((r) => (
            <Item key={r.text} swatch={r.swatch} text={r.text} />
          ))}
        </ul>
      )}
    </aside>
  );
}
