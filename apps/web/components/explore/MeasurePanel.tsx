"use client";

import { useEffect, useState } from "react";
import { formatDegrees, formatMetres } from "@/lib/format";
import {
  circle,
  compassPoint,
  formatArea,
  formatDistance,
  geodesic,
  offset,
  pathLength,
  polygonArea,
} from "@/lib/globe/measure";
import type { GeoCoordinate, GlobeController, MeasureState, ProfileSample } from "@/lib/globe/types";
import { Icon } from "./Icon";
import { ProfileChart } from "./ProfileChart";
import { Result, smallButton, ToolPanel } from "./ToolPanel";
import { CLICK_TOOLS } from "./ToolsBar";

const signed = (v: number, digits = 4) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(digits)}°`;
const coord = (p: GeoCoordinate) => `${formatDegrees(p.latitude, 4)}  ${formatDegrees(p.longitude, 4)}`;

function Point({ name, p }: { name: string; p: GeoCoordinate | null | undefined }) {
  return (
    <div className="grid grid-cols-[3.25rem_1fr] items-baseline gap-x-2">
      <dt className="text-[10px] tracking-[0.12em] text-faint uppercase">{name}</dt>
      <dd className="font-mono text-xs text-ink tabular-nums">{p ? coord(p) : <span className="text-faint">—</span>}</dd>
    </div>
  );
}

const NOTES: Record<MeasureState["tool"], string> = {
  distance: "Geodesic distance on the WGS84 ellipsoid (Vincenty); relief is ignored.",
  offset: "Y along A’s meridian, X along B’s parallel (WGS84). Relief is ignored.",
  area: "Area on the WGS84 ellipsoid with geodesic edges, projected surface (relief ignored). Don’t cross edges.",
  radius: "Geodesic circle on the WGS84 authalic sphere; relief is ignored.",
  profile: "Terrain heights sampled along the geodesic; resolution depends on line length.",
};

/** Instructions and live results for the active click tool. */
export function MeasurePanel({
  measure,
  hover,
  controller,
  terrainLabel,
  onClear,
  onUndo,
  onFinish,
  onClose,
}: {
  measure: MeasureState;
  hover: GeoCoordinate | null;
  controller: GlobeController | null;
  /** e.g. "Esri World Elevation 3D · above sea level"; null without terrain. */
  terrainLabel: string | null;
  onClear: () => void;
  onUndo: () => void;
  onFinish: () => void;
  onClose: () => void;
}) {
  const tool = CLICK_TOOLS.find((t) => t.id === measure.tool)!;
  const { points } = measure;
  const n = points.length;
  const twoPoint = measure.tool !== "area";
  const [a, b0] = points;
  const b = b0 ?? (a && twoPoint ? hover : null);
  const preview = twoPoint && !b0 && !!b;

  // Elevation profile: fetched once both points are set.
  const [profile, setProfile] = useState<{ key: string; samples: ProfileSample[] | null } | null>(null);
  const profileKey = measure.tool === "profile" && n === 2 ? `${coord(points[0])}|${coord(points[1])}` : null;
  useEffect(() => {
    if (!profileKey || !controller) return;
    let alive = true;
    void controller.sampleProfile(points[0], points[1]).then((samples) => alive && setProfile({ key: profileKey, samples }));
    return () => {
      alive = false;
    };
    // points are captured by profileKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileKey, controller]);

  let step: string;
  if (measure.tool === "area") {
    step = measure.closed
      ? "Click to start a new polygon."
      : n < 3
        ? `Click the corners of the area (${n}/3 minimum).`
        : "Keep clicking corners, then press Finish (or Enter).";
  } else if (measure.tool === "radius") {
    step = n === 0 ? "Click the centre." : n === 1 ? "Click a point on the edge." : "Click again for a new circle.";
  } else {
    step = n === 0 ? "Click the first point (A)." : n === 1 ? "Click the second point (B)." : "Click again to start a new measurement.";
  }

  let results: React.ReactNode = null;
  let summary = "";
  if (measure.tool === "area") {
    const live = !measure.closed && hover && n >= 1 ? [...points, hover] : points;
    if (live.length >= 3) {
      const areaM2 = polygonArea(live);
      const perimeter = pathLength(live, true);
      results = (
        <>
          <Result label="Area" value={formatArea(areaM2)} />
          <Result label="Perimeter" value={formatDistance(perimeter)} sub={`${live.length} vertices`} />
        </>
      );
      summary = `Area ${formatArea(areaM2)}, perimeter ${formatDistance(perimeter)}\n${live.map(coord).join("\n")}`;
    }
  } else if (a && b) {
    if (measure.tool === "radius") {
      const r = geodesic(a, b).metres;
      const c = circle(r);
      results = (
        <>
          <Result label="Radius" value={formatDistance(r)} sub={`⌀ ${formatDistance(2 * r)}`} />
          <Result label="Area" value={formatArea(c.area)} />
          <Result label="Circumference" value={formatDistance(c.circumference)} />
        </>
      );
      summary = `Centre ${coord(a)}\nRadius ${formatDistance(r)}, area ${formatArea(c.area)}`;
    } else if (measure.tool === "offset") {
      const o = offset(a, b);
      results = (
        <>
          <Result label="Y · latitude (north–south)" value={`${formatDistance(o.northSouthMetres)} ${o.dLatDeg >= 0 ? "N" : "S"}`} sub={signed(o.dLatDeg)} color="#8be38f" />
          <Result label="X · longitude (east–west)" value={`${formatDistance(o.eastWestMetres)} ${o.dLonDeg >= 0 ? "E" : "W"}`} sub={signed(o.dLonDeg)} color="#f5c26b" />
          <Result label="Straight line" value={formatDistance(geodesic(a, b).metres)} />
        </>
      );
      summary = `A ${coord(a)}\nB ${coord(b)}\nY ${formatDistance(o.northSouthMetres)} (${signed(o.dLatDeg)}), X ${formatDistance(o.eastWestMetres)} (${signed(o.dLonDeg)})`;
    } else {
      const g = geodesic(a, b);
      results = (
        <>
          <Result label="Distance" value={formatDistance(g.metres)} />
          <Result label="Bearing from A" value={`${g.bearingDeg.toFixed(1)}°`} sub={compassPoint(g.bearingDeg)} />
        </>
      );
      summary = `A ${coord(a)}\nB ${coord(b)}\nDistance ${formatDistance(g.metres)}, bearing ${g.bearingDeg.toFixed(1)}°`;
    }
  }

  // Profile stats (only for the fetched line, not the cursor preview).
  let profileView: React.ReactNode = null;
  if (measure.tool === "profile" && n === 2) {
    if (!terrainLabel) profileView = <p className="text-xs text-muted">No terrain loaded: a profile needs real relief.</p>;
    else if (profile?.key !== profileKey) profileView = <p className="animate-pulse text-xs text-muted">Sampling terrain…</p>;
    else if (!profile.samples) profileView = <p className="text-xs text-muted">Terrain heights unavailable for this line.</p>;
    else {
      const hs = profile.samples.map((s) => s.height).filter(Number.isFinite);
      let up = 0, down = 0;
      for (let i = 1; i < hs.length; i++) {
        const d = hs[i] - hs[i - 1];
        if (d > 0) up += d;
        else down -= d;
      }
      profileView = (
        <div className="space-y-2">
          <ProfileChart samples={profile.samples} />
          <dl className="grid grid-cols-2 gap-2">
            <Result label="Highest" value={formatMetres(Math.max(...hs))} />
            <Result label="Lowest" value={formatMetres(Math.min(...hs))} />
            <Result label="Ascent" value={`+${formatMetres(up)}`} />
            <Result label="Descent" value={`−${formatMetres(down)}`} />
          </dl>
          <p className="text-[11px] text-faint">{terrainLabel}</p>
        </div>
      );
      summary += `\nHighest ${formatMetres(Math.max(...hs))}, lowest ${formatMetres(Math.min(...hs))}, ascent +${formatMetres(up)}, descent −${formatMetres(down)} (${terrainLabel})`;
    }
  }

  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${tool.label}\n${summary}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <ToolPanel icon={tool.icon} title={tool.label} onClose={onClose}>
      <p className="mt-1 text-xs text-muted" aria-live="polite">{step}</p>

      {twoPoint && (
        <dl className="mt-3 space-y-1">
          <Point name={measure.tool === "radius" ? "Centre" : "A"} p={a} />
          <Point name={measure.tool === "radius" ? "Edge" : "B"} p={b} />
        </dl>
      )}

      {results && (
        <dl className={`mt-3 space-y-2 border-t border-line pt-3 ${preview ? "opacity-60" : ""}`}>
          {results}
          {preview && <p className="text-[11px] text-faint">Preview at cursor</p>}
        </dl>
      )}

      {profileView && <div className="mt-3 border-t border-line pt-3">{profileView}</div>}

      <p className="mt-3 text-[11px] leading-relaxed text-faint">{NOTES[measure.tool]}</p>

      {n > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {measure.tool === "area" && !measure.closed && (
            <>
              <button type="button" onClick={onFinish} disabled={n < 3} className={smallButton}>
                <Icon name="check" className="size-3.5" /> Finish
              </button>
              <button type="button" onClick={onUndo} className={smallButton} title="Undo last point (Backspace)">
                <Icon name="undo" className="size-3.5" /> Undo
              </button>
            </>
          )}
          {summary && (
            <button type="button" onClick={copy} className={smallButton}>
              <Icon name="copy" className="size-3.5" /> {copied ? "Copied" : "Copy"}
            </button>
          )}
          <button type="button" onClick={onClear} className={smallButton}>
            Clear
          </button>
        </div>
      )}
    </ToolPanel>
  );
}
