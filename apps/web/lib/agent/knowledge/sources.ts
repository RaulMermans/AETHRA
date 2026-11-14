import type { KnowledgeSource } from "./types.ts";

/**
 * Registry of authorities. Tier A is the only source for AETHRA numerical claims.
 * Locators point at repo files or official docs; this is not a second results store.
 */
export const KNOWLEDGE_SOURCES: readonly KnowledgeSource[] = [
  {
    id: "src-evidence-cards",
    tier: "A",
    title: "EvidenceCards export",
    locator: "apps/web/public/data/evidence-cards.json",
    dated: "2026-11-14",
    notes: "Python export. Sole user-facing numerical claims for Core/TARO.",
  },
  {
    id: "src-gate-a-bundle",
    tier: "A",
    title: "Gate A temperature AnalysisBundle",
    locator: "data/results (Gate A MERRA-2 T2M) + climate-bundle.json R0",
    notes: "Theil–Sen / MK live in Python. Browser renders only.",
  },
  {
    id: "src-energy-gap-bundle",
    tier: "A",
    title: "Gate B joint-low AnalysisBundle",
    locator: "data/results/energy_gap/analysis_bundle.json",
    notes: "E1 insufficient in 5/5 regions (D41). Second-person review PENDING.",
  },
  {
    id: "src-cyl-register",
    tier: "A",
    title: "Castilla y León renewable register overlay",
    locator: "apps/web/public/data/energy-infrastructure.json",
    dated: "info dates 2024-06-19 → 2025-11-18",
    notes: "INGESTED, NOT VALIDATED (D49). CyL only. MW ≠ MWh. Hidden in judge mode.",
  },
  {
    id: "src-datasets-md",
    tier: "A",
    title: "Project dataset register",
    locator: "docs/DATASETS.md",
    dated: "2026-11-14",
    notes: "Readiness classes. Do not upgrade silently.",
  },
  {
    id: "src-energy-research",
    tier: "A",
    title: "Gate B pre-registration",
    locator: "docs/ENERGY_RESEARCH.md",
    notes: "Frozen thresholds. No new variants (D41).",
  },
  {
    id: "src-scientific-review",
    tier: "A",
    title: "Scientific review record",
    locator: "docs/SCIENTIFIC_REVIEW.md",
    notes: "Technical checks passed; named human sign-off PENDING.",
  },
  {
    id: "src-power-docs",
    tier: "B",
    title: "NASA POWER methodology",
    locator: "https://power.larc.nasa.gov/docs/methodology/",
    dated: "read 2026-11-14",
    notes: "CERES SYN1deg solar; MERRA-2 meteorology. Not plant output.",
  },
  {
    id: "src-merra2",
    tier: "B",
    title: "MERRA-2 M2TMNXSLV 5.12.4",
    locator: "DOI 10.5067/AP1B0BA5PD2K",
    notes: "Reanalysis, ~0.5° × 0.625°. Not a station.",
  },
  {
    id: "src-pvgis",
    tier: "B",
    title: "JRC PVGIS photovoltaic methodology",
    locator: "https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis_en",
    notes: "Educational PV thermal/performance mechanisms. Not an AETHRA plant model.",
  },
  {
    id: "src-nex-gddp",
    tier: "B",
    title: "NASA NEX-GDDP-CMIP6 (candidate, unused)",
    locator: "docs/FUTURE_CLIMATE_PROJECTIONS.md",
    notes: "No validated projection artifact in this repo. P2.",
  },
  {
    id: "src-jcyl",
    tier: "C",
    title: "Junta de Castilla y León renewable perimeters",
    locator: "energia_cyl_renov_instal_polig / PRETOR RD 413/2014",
    dated: "retrieved 2026-11-14",
    notes: "Administrative register, not generation. ©Junta de Castilla y León.",
  },
  {
    id: "src-ree",
    tier: "C",
    title: "Red Eléctrica / ESIOS / REData",
    locator: "official operator publications",
    notes: "Not ingested. Do not quote capacity, prices or curtailment as AETHRA facts.",
  },
  {
    id: "src-foundational-25",
    tier: "D",
    title: "25 internal foundational knowledge documents",
    locator: "NOT PRESENT in this repository (audit 14 Nov 2026)",
    notes: "Requested curriculum exists only as this TARO brief. Do not invent their contents.",
  },
];

export function sourceById(id: string): KnowledgeSource | undefined {
  return KNOWLEDGE_SOURCES.find((s) => s.id === id);
}
