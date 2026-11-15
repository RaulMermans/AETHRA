import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../../..");
const taroDir = join(repoRoot, "data/taro");
const bundlePath = join(repoRoot, "apps/web/public/data/climate-bundle.json");

export type RegionalScopeDigest = {
  scopeKey: string;
  name: string;
  temperature?: {
    slopePerDecade: number;
    ci95: [number, number];
    pValue: number;
    n: number;
    period: string;
    outcome: string;
    bhSupported: boolean;
  };
  precipitation?: {
    slopePerDecade: number;
    ci95: [number, number];
    pValue: number;
    n: number;
    period: string;
    outcome: string;
    exploratoryNote: string;
  };
  runoff?: {
    slopePerDecade: number;
    ci95: [number, number];
    pValue: number;
    n: number;
    period: string;
    outcome: string;
    exploratoryNote: string;
  };
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

export function readTaroMarkdown(file: "SOUL.md" | "KNOWLEDGE.md" | "RESEARCH_NOTES.md"): string {
  const target = join(taroDir, file);
  if (!existsSync(target)) return "";
  try {
    return readFileSync(target, "utf8");
  } catch {
    return "";
  }
}

export function readRecentResearchNotes(maxLines = 18): string {
  const raw = readTaroMarkdown("RESEARCH_NOTES.md");
  if (!raw) return "";
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("- **["));
  return lines.slice(-maxLines).join("\n");
}

export function appendResearchNote(entry: {
  scope: string;
  question: string;
  summary: string;
}): boolean {
  const target = join(taroDir, "RESEARCH_NOTES.md");
  if (!existsSync(target)) return false;
  const cleanQ = entry.question.replace(/\s+/g, " ").trim().slice(0, 140);
  const cleanS = entry.summary.replace(/\s+/g, " ").trim().slice(0, 240);
  if (!cleanQ || !cleanS) return false;
  try {
    const existing = readFileSync(target, "utf8");
    if (existing.includes(cleanQ) && existing.includes(cleanS.slice(0, 60))) {
      return false;
    }
    const stamp = new Date().toISOString();
    const line = `\n- **[${stamp}] [${entry.scope}]** *Q:* "${cleanQ}" → *Note:* ${cleanS}`;
    appendFileSync(target, line, "utf8");
    return true;
  } catch {
    return false;
  }
}

let cachedScopes: ReadonlyMap<string, RegionalScopeDigest> | null = null;

function parseStats(raw: unknown): {
  slope: number;
  ciLow: number;
  ciHigh: number;
  p: number;
  n: number;
  firstYear: number;
  lastYear: number;
  outcome: string;
} | null {
  if (!isRecord(raw) || !isRecord(raw.stats)) return null;
  const s = raw.stats;
  if (
    typeof s.slope_decade !== "number" ||
    typeof s.ci_low_decade !== "number" ||
    typeof s.ci_high_decade !== "number" ||
    typeof s.p_value !== "number" ||
    typeof s.n !== "number"
  ) {
    return null;
  }
  return {
    slope: s.slope_decade,
    ciLow: s.ci_low_decade,
    ciHigh: s.ci_high_decade,
    p: s.p_value,
    n: s.n,
    firstYear: typeof s.first_year === "number" ? s.first_year : 2000,
    lastYear: typeof s.last_year === "number" ? s.last_year : 2025,
    outcome: typeof s.outcome === "string" ? s.outcome : "not_significant",
  };
}

function loadScopesMap(): ReadonlyMap<string, RegionalScopeDigest> {
  if (cachedScopes) return cachedScopes;
  const map = new Map<string, RegionalScopeDigest>();
  if (!existsSync(bundlePath)) {
    cachedScopes = map;
    return map;
  }
  try {
    const raw: unknown = JSON.parse(readFileSync(bundlePath, "utf8"));
    if (!isRecord(raw) || !isRecord(raw.scopes)) {
      cachedScopes = map;
      return map;
    }
    for (const [key, val] of Object.entries(raw.scopes)) {
      if (!isRecord(val) || typeof val.name !== "string") continue;
      const t = parseStats(val.temperature);
      const p = parseStats(val.precipitation);
      const r = parseStats(val.water_rivers);
      map.set(key, {
        scopeKey: key,
        name: val.name,
        temperature: t
          ? {
              slopePerDecade: t.slope,
              ci95: [t.ciLow, t.ciHigh],
              pValue: t.p,
              n: t.n,
              period: `${t.firstYear}–${t.lastYear}`,
              outcome: t.outcome,
              bhSupported: true,
            }
          : undefined,
        precipitation: p
          ? {
              slopePerDecade: p.slope,
              ci95: [p.ciLow, p.ciHigh],
              pValue: p.p,
              n: p.n,
              period: `${p.firstYear}–${p.lastYear}`,
              outcome: p.outcome,
              exploratoryNote: "EXPLORATORY — multiplicity unadjusted (D53/D60); not an EvidenceCard.",
            }
          : undefined,
        runoff: r
          ? {
              slopePerDecade: r.slope,
              ci95: [r.ciLow, r.ciHigh],
              pValue: r.p,
              n: r.n,
              period: `${r.firstYear}–${r.lastYear}`,
              outcome: r.outcome,
              exploratoryNote: "EXPLORATORY — GLDAS modelled runoff (not river discharge), multiplicity unadjusted (D53/D60).",
            }
          : undefined,
      });
    }
  } catch {
    // Fallback to empty map on parse failure
  }
  cachedScopes = map;
  return map;
}

export function findRegionalScope(queryOrScope: string): RegionalScopeDigest | undefined {
  const scopes = loadScopesMap();
  if (scopes.has(queryOrScope)) return scopes.get(queryOrScope);
  const f = fold(queryOrScope);
  let best: RegionalScopeDigest | undefined;
  let bestLen = 0;
  for (const item of scopes.values()) {
    const parts = item.name.split("/").map((p) => fold(p.trim())).filter(Boolean);
    for (const part of parts) {
      if (part.length >= 4 && f.includes(part) && part.length > bestLen) {
        best = item;
        bestLen = part.length;
      }
    }
  }
  return best;
}
