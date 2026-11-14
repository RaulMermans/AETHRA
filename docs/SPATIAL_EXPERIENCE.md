# Spatial experience specification (P1/P2 — not in force)

**Status:** PROPOSED (D54, D55). **P1A–P1C prototype is in `/explore`** (destinations menu, five Gate B case sheets, one illustrative turbine at Buniel). Ghost style is a toggle on that registered point, not a new site. Science values are unchanged. **Do not overlay fruitfulness scores or extend Sen slopes past the last observed year.**
**Does not change:** CesiumJS (ADR-001), Python evidence chain (ADR-002 / D46–D47), D45 map-tools cut, D49/D51 infrastructure-in-judge-mode, D38/D51 extrapolation hiding.

This document is the contract for *geographic destinations, energy research cases, and 3D plant symbols*. It is **not** a site-selection product, a forecast, or a digital twin.

---

## 0. Readiness verdict (14 Nov 2026, ~22:00 CET)

| Gate | State | Consequence |
|---|---|---|
| Challenge tasks 1–5 (science chain) | Implemented in Python + EvidenceCards; **human review PENDING** | Demo may show Gate A wording only after §5 sign-off |
| D36 Gate A estimand | PROPOSED | Numbers exist; claim not team-locked |
| D53 regional multiplicity | **OPEN** | Rain/runoff "Supported" labels not presentable |
| Independent scientific review | **All boxes PENDING** | Cannot upgrade READY |
| P0-P1 / P0-P2 / P0-P3 | Unchecked | Submission not secure |
| Feature freeze | Sun 15 Nov 14:00 | After freeze: demo-path bug fixes only |
| Judge mode (D51) | Default build hides D44 + D49 | New 3D / ghost infra would also be exploratory |

**Verdict:** P0 is **not** approved and submission is **not** secure. This sprint therefore **does not change product behaviour**. Interfaces, acceptance criteria and an implementation plan are recorded here. Speculative 3D is not exposed to judges.

Git: this workspace path has **no `.git` directory**, so teammate uncommitted work cannot be inspected via `git status` here. Do not delete or overwrite files you did not create.

---

## 1. Current-state audit (what exists / reuse / missing)

### Already exists and must be reused

| Capability | Where | Notes |
|---|---|---|
| CesiumJS 1.140 viewer, terrain, quality profiles | ADR-001, `lib/globe/cesium/*` | LOCKED. Do not replace. |
| `GlobeController.flyTo(OrbitView)` | `types.ts`, `cesium/camera.ts` | Terrain-aware orbit; `cancelFlight`; `prefers-reduced-motion` → duration 0 |
| Home / Spain / world views | `catalog.ts` `HOME_VIEW`, `SPAIN_VIEW`, `WORLD_VIEW` | Reset-view already wired |
| Curated landmark views | `catalog.ts` `PLACES` | Sierra Nevada (Mulhacén), Picos de Europa, Pyrenees, Canarias already defined |
| Unused destination menu | `ExploreSpain.tsx` | Flies to `PLACES`; **not mounted** in `ExploreView` |
| Approximate city/peak list | `places-es.ts` | Navigation only (~0.01°). D45 removed the "Go to" panel that used it |
| Admin fly-to | `AdminScopeBar` + `admin-scope.ts` `orbitView` | CCAA/province framing — keep as the scientific region picker |
| Energy infrastructure (points) | D49: `energy-infrastructure.json` (652 plants), `EnergyInfrastructurePanel`, overlay builder | CyL only; judge-hidden (D51) |
| Spatial-support honesty | Infrastructure panel: plant perimeter vs MERRA-2 cell vs province | Preserve |
| EvidenceCards for CyL / Aragón | `energy-gap-ES41`, `energy-gap-ES24` | Render-only; EXPLORATORY until Gate 3 review |
| Judge / exploratory flag | `lib/demo-mode.ts` `EXPLORATORY_FEATURES_ENABLED` | Build-time |

### Intentionally removed (do not restore)

D45: Distance, offset, area, radius, elevation profile, relief exaggeration, **Go to**. Engine code kept unused. Restoring a generic GIS "Go to" would fight D45.

### Missing relative to the product vision

- Destination catalog with official IDs, types, attribution, optional case/installation links (today: `Place` = id, name, hint, view).
- Energy **research case** object (WHERE / WHY / NASA / TECHNOLOGY / HORIZON) as a first-class JSON contract.
- glTF/3D plant symbols (Cesium `ModelGraphics` unused in app code).
- Conceptual "ghost" infrastructure (P2).
- Per-series **temporal metadata contract** in one place (periods live in D46, bundles, and a stale `DATASETS.md` table — see §2).

---

## 2. Scientific timeline audit

Facts from on-disk products and D46. **Classes are not upgraded** (no recorded human Gate 2/3).

| Dataset | Native availability | Local coverage on disk | Last complete calendar year | Analysis window in force | QA / class | Scientific caveats |
|---|---|---|---|---|---|---|
| NASA MERRA-2 `T2M` (M2TMNXSLV 5.12.4) | 1980 → present (monthly) | 2000-01 → **2026-09** | **2025** (12/12 months). 2026 incomplete — excluded | Gate A: **2000–2025**, n = 26. D37 1980 extension OPEN-P1, not done | INGESTED; trend EXPLORATORY until review. D46 applied area weights + complete years | Reanalysis, ~50 km. Do not annualize 2026. Window magnitude 0.41–0.83 °C/decade (sign stable). Not energy evidence |
| NASA POWER solar `ALLSKY_SFC_SW_DWN` | Service from 1984; **CERES SYN1deg Ed4.2 from 2001**; FLASHFlux NRT after | Daily regional 2001–2025 in `data/raw/power` | **2025** (SYN1DEG only) | Gate B: **2001-01-01 → 2025-12-31**, n = 25 | Gate 1 PASSED; results EXPLORATORY pending 2nd review | **Do not** trend across SRB→CERES (2001). **Do not** include 2026 FLASHFlux. Horizontal-plane irradiance ≠ PV output. Native **1°** |
| NASA POWER wind `WS50M` | MERRA-2; GEOS-IT in NRT | Same as solar, 2001–2025 | **2025** | Same 2001–2025 | Same | Reanalysis 50 m above grid-mean elevation. Not hub-height, not generation. 2026 GEOS-IT excluded |
| GPM IMERG Final V07 monthly | ~2000 → collection metadata **2025-09-30** | 2000-01 → **2025-09** | **2024** | D46 annual trend **2000–2024**, n = 25 | INGESTED; EXPLORATORY. D53: after BH, 0/72 rain "Supported" | **Do not** present 2025 as a complete annual rainfall year. Satellite–gauge estimate |
| GLDAS Noah 0.25° v2.1 | 2000-01 → present | Grid through **2026-07**; Giovanni CSVs similar | **2025** for annual analyses | D46: **2000–2025** complete years from the **grid** (not Giovanni bbox) | INGESTED; EXPLORATORY. D53: 16/17 runoff labels fail BH | **Modelled** runoff, not discharge. Do not scale incomplete 2026 (12/7 removed) |
| NOAA GHCN-Daily Spain | Station-dependent; files into **2026-11** | ~175 stations, 2001 → 2026-11 | Station-year only if **≥ 330 valid days**; last complete year used in bundle **2025** | Validation D52: 2001–2025 paired years; bundle uses complete station-years only | Partner observations; not homogenized | Coverage changes over time. Not NASA. Independent check of MERRA-2, not ground truth for a 50 km cell |
| MODIS MOD13Q1 v061 | 2000-02 → present (16-day) | Pilot + years **2000, 2012, 2024** only | n/a (not a continuous annual series) | **No validated NDVI trend** | PARTIAL / PILOT; hidden (D29) | Three snapshots ≠ a trend. Do not interpolate |
| CyL energy register | Administrative, not a climate series | 652 installations; info dates 2024-06-19 → 2025-11-18 | n/a | Context only (D49) | INGESTED, NOT VALIDATED | CyL only. Capacity = registered MW, not MWh |

**Temporal concepts (do not conflate):** native product availability ≠ files downloaded ≠ complete calendar years ≠ scientifically comparable years ≠ years approved for a named analysis.

**Future horizon:** 2032–2040 may be used in *copy* as an infrastructure planning discussion window **after** P0, labelled hypothesis. Historical Sen slopes **must not** be extended to 2040. No climate-projection feature this sprint.

Required per-series metadata (when a pipeline is next touched — not a silent schema change): source product + version; requested range; first/last valid observation; cadence; calendar; time standard; complete vs partial years; gaps; source transitions; baseline; geographic support; n; estimand + method; provenance SHA. Existing AnalysisBundles already carry most of this for Gate A/B.

---

## 3. Spatial UX architecture (reuse, don't fork)

One camera, one globe, one evidence surface.

```
User intent                Existing API                         UI surface
─────────────              ────────────                         ──────────
Fly to landmark            GlobeController.flyTo(OrbitView)     Destinations (P1A; ExploreSpain pattern)
Fly to CCAA/province       resolveAdminScope().orbitView        AdminScopeBar (already)
Open research case         flyTo(case.view) + set scope         EvidenceCardPanel + case sheet (P1B)
Select registered plant    overlay pick + flyTo point           EnergyInfrastructurePanel (D49)
Conceptual 3D (P2)         Entity ModelGraphics, flag off       Separate legend + disclaimer
```

**Rules**

1. Never add a second camera controller. `createCameraController` already cancels in-flight cameras and ignores stale terrain samples (`flightId`).
2. `terrainAware: true` for mountain destinations so the orbit target is the sampled height × vertical exaggeration (usually 1.0). If terrain is missing, `sampleTerrainHeight` returns null → height 0 (ellipsoid) — UI already reports "smooth ellipsoid, no relief".
3. Reduced motion: duration 0. Escape: `ExploreSpain` already closes on Escape; fly cancel = any new `flyTo` / user zoom (`cancelFlight`).
4. Return-to-Spain: existing Reset (`HOME_VIEW`) plus `SPAIN_VIEW` for a tighter peninsula frame.
5. Evidence always one click away (`EvidenceCardPanel`). Spatial chrome must not bury it.
6. Plant-scale coordinates vs NASA cell vs CCAA mean stay visually distinct (D49 panel copy).
7. Judge mode: destinations that are **navigation only** (Mulhacén, Picos) may later sit on the default path *if* they do not imply energy siting. Cases, 3D models, and ghost infra stay behind `EXPLORATORY_FEATURES_ENABLED` until approved.

### Destination catalog (proposed TypeScript contract)

Extend `Place` rather than replacing it. New file only when implementing (e.g. `lib/globe/destinations.ts`).

```ts
export type DestinationType =
  | "natural_landmark"
  | "geographic_research_area"
  | "existing_energy_installation"
  | "scientific_case_study_region"
  | "conceptual_infrastructure"; // P2 only

export interface GeographicDestination {
  id: string;                     // stable kebab-case
  name: string;                   // official place name
  type: DestinationType;
  coordinate: { latitude: number; longitude: number; crs: "EPSG:4326" };
  extent?: GeoBounds;             // when the feature is an area
  view: OrbitView;                // heading, pitch, range, terrainAware, durationSeconds
  source: { name: string; url?: string; retrieved: string; note: string };
  caseStudyId?: string;
  installationId?: string;
  /** True for parks / protected landscapes: navigation only, never a development candidate. */
  protectedLandscape?: boolean;
}
```

### Pilot destinations (navigation demonstrations — not energy candidates)

| ID | Name | Type | Coordinate (decimal °, WGS84/ETRS89 geographic) | View (existing `PLACES`) | Source |
|---|---|---|---|---|---|
| `mulhacen` | Mulhacén, Sierra Nevada | natural_landmark | **37.053396, −3.311535** | already: 37.05, −3.31, heading 345, pitch −20, range 42 km, terrainAware | IGN vértice **Mulhacén I** (102763), ETRS89: 37°03′12.22427″ N, 3°18′41.52587″ W; orthometric 3478.692 m (BP). PDF: `datos-geodesia.ign.es` hoja 1027. Inside **Parque Nacional de Sierra Nevada** — `protectedLandscape: true` |
| `picos-de-europa` | Picos de Europa (Torre Cerredo) | natural_landmark | Catalog **43.19, −4.85** (places-es 43.198, −4.852) | heading 0, pitch −22, range 34 km, terrainAware | Navigation-grade until an IGN vertex reseña is attached. **Parque Nacional de Picos de Europa** — `protectedLandscape: true` |

Do **not** suggest infrastructure in these parks. Attribution: IGN / Parque Nacional as applicable; Cesium terrain credits already on-screen.

---

## 4. Minimal implementation plan (gated)

**This sprint: no code on the demo path.**

After P0 is green **and** D54 is approved, implement **only P1A**:

1. Mount a slim Destinations control using existing `PLACES` + `flyTo` (the unused `ExploreSpain` component is the prototype).
2. Replace approximate Mulhacén lat/lon with the IGN vertex; keep Picos flagged until IGN is cited.
3. Label landmarks "Geographic navigation — not an energy site".
4. Keep D45: do not revive GIS tools or the 50-city Go-to list.
5. Tests: destination id → expected `OrbitView`; reduced-motion duration 0 (unit); manual fly-to Mulhacén / Picos / Reset.
6. Still hide D49 3D and ghost infra.

Do **not** start P1B/P1C/P2 in the same diff.

---

## 5. Feature B — Castilla y León research case (specification only)

**ID:** `case-es41-joint-low`  
**Type:** scientific_case_study_region  
**Comparison:** `case-es24-joint-low` (Aragón) — descriptive, **difference not tested**.

### WHERE

- Official region: Castilla y León, GISCO NUTS-2 **ES41**.
- Extent: NUTS-2 polygon in `spain-admin.json` (same as Gate B).
- CRS: geographic ETRS89 / WGS84 as used by GISCO.
- NASA support: POWER solar **1°**, wind **0.5° × 0.625°**; card: ≈ **10.2** effective 1° solar cells, ≈ **32.65** wind cells. Not parcel scale.
- Elevation/terrain: Meseta; not a verified DEM statistic in this repo — omit numbers until sourced.
- Camera: reuse `AdminScopeBar` fly-to for `ccaa:ES41` (do not invent a plant coordinate as the region's location).

### WHY THIS REGION?

Pre-registered in `ENERGY_RESEARCH.md` §0 **before** regional data: continental high plateau, contrasting with Galicia, Aragón, Andalucía. **Not** chosen for installed capacity or for a result. Existing CyL register (D49) is *context after the fact*, not the selection reason.

### WHAT DID NASA SHOW?

Source: `data/results/energy_gap/analysis_bundle.json` + card `energy-gap-ES41`. Status: **EXPLORATORY until second-person review.**

| Field | Castilla y León (ES41) | Aragón (ES24), comparison only |
|---|---|---|
| Variable | Joint-low days: both daily `ALLSKY_SFC_SW_DWN` and `WS50M` below monthly P20 (ref 2001–2020) | Same definition |
| Period | 2001–2025, LST, 25 complete years | Same |
| Trend | **0.0** days/decade (CI −1.55 to +1.67); p = 0.794; BH p = 0.794 | +0.52 (CI −1.88 to +2.5); p = 0.638; BH p = 0.794 |
| Outcome | **Insufficient evidence** | **Insufficient evidence** |
| Median count | 7 days/year | 11 days/year |
| Descriptive complementarity | 160 observed vs ~368 year-shift expected, ratio **0.43** | 295 vs ~372, ratio **0.79** |
| E0 solar mean | +0.032 kWh m⁻² day⁻¹/decade (CI includes 0) | +0.028 (CI includes 0) |
| E0 wind mean | −0.024 m s⁻¹/decade (CI includes 0) | −0.119 (CI includes 0; still not confirmatory) |

**Do not claim** CyL is statistically superior, undervalued, or more suitable. The complementarity difference is **descriptive**. Two insufficient-evidence trends do not make a difference test (UX rule 9).

### WHAT DOES THE REGION REPRESENT?

Possible relevance to **onshore wind, solar PV, or hybrid solar–wind** as *research framing* — the technologies already in the CyL register and in Gate B. No new MVP technologies. Resource ≠ generation.

### CURRENT CONTEXT (register, not NASA)

D49: **652** registered in-operation installations in CyL (378 solar PV, 274 onshore wind); 1319 source polygons, 631 excluded for no registered capacity. Retrieved 2026-11-14. Licence ©Junta de Castilla y León. **Not a national inventory.**

### FUTURE RESEARCH HORIZON (hypothesis copy only)

- **HISTORICAL EVIDENCE:** 2001–2025 NASA POWER joint-low counts; no detectable trend.
- **CURRENT CONTEXT:** operating registered plants in CyL (points + metadata).
- **FUTURE HYPOTHESIS (2032–2040 planning talk):** whether jointly low resource days remaining infrequent (descriptive complementarity) *might* justify further generation-based study. **Not** a prediction of 2040 weather, output, or permits.

### Experience (when P1B is authorized)

1. Set admin scope to the case CCAA (or AGE for R0) and `flyTo` that orbit.
2. Case sheet shows verdict **Insufficient evidence**, observed series, complementarity bars, and a hatched 2026–2040 “no validated projection” zone.
3. Switcher: Peninsula, Galicia, CyL, Aragón, Andalucía — same family, difference not tested.
4. CyL plant points are **off by default** (optional overlay). 3D remains Buniel-only.
5. Open EvidenceCard for the active case. Return: Spain scope + `HOME_VIEW` / `SPAIN_VIEW`.

Reuse `EvidenceCardPanel` + `AdminScopeBar`. No second app inside `/explore`.

---

## 6. Feature C/D — 3D feasibility (no assets added)

Cesium **1.140** already supports:

| Approach | When to use | Verdict for GRIDSHIFT |
|---|---|---|
| Entity `billboard` / point | Distant zoom (current D49 overlay) | **Keep** as the default layer |
| Entity `ModelGraphics` glTF/glb | One close-range illustrative symbol | P1C prototype |
| `Model.fromGltfAsync` + instancing | Many identical turbines | Only after one model is approved |
| 3D Tiles | Surveyed site / city-scale mesh | **Not justified** (no asset geometry) |

**Representation default = B (illustrative 3D symbol)** at the registered point. Label: *"Illustrative 3D representation — not an exact reconstruction of the facility."* Height, turbine count, panel layout and footprint of the **model** are not verified. Registered perimeter area (km²) remains the only sourced footprint.

**Candidate plant for a later prototype (not placed in a park):** largest registered CyL wind in the catalog, **Buniel (RE-114777)**, 42.29663°, −3.80515°, 104 MW registered, Burgos municipalities — still only a **point inside an official perimeter**. Confirm the point is outside protected-area layers before any 3D work. No surveyed glTF exists in-repo.

**Asset policy:** original or clearly licensed glTF, small file, attribution in the panel. Do not scrape commercial libraries.

**Geographic accuracy:** `HeightReference.CLAMP_TO_GROUND` or sampled terrain height; ellipsoid vs orthometric already documented in ADR-001. Do not treat graphic exaggeration as elevation (exaggeration is 1.0 today).

**Performance:** one model at close range; hide when camera range > ~5–8 km; keep 652 point markers. Toggle off must restore D49-only view.

**Ghost infrastructure (P2):** translucent `ModelGraphics` / `Color.withAlpha`, persistent "Conceptual / Not a real project". **No coordinates** unless a defensible, non-protected placement exists — otherwise show in a **detached preview**, not on the landscape. Feature-flagged; off in judge mode. No invented MW or MWh.

**Visual differentiation**

| | Existing (D49) | Illustrative 3D (P1C) | Ghost (P2) |
|---|---|---|---|
| Opacity | Solid marker | Solid stylized model | Translucent / outline |
| Label | Register name + MW registered | + geometry disclaimer | "Conceptual / Not a real project" |
| Science | None (context) | None | None |

---

## 7. Tests and QA (this sprint)

| Command | Result |
|---|---|
| `git status` | **Not run as a repo:** `fatal: not a git repository` at the workspace root |
| Product behaviour / `npm run typecheck` / `lint` / `build` | **Not run** — no implementation |
| Browser | **Not run** — no UI change |
| Science tests | **Not run** — no Python change. Human still needs `SCIENTIFIC_REVIEW.md` §5 |

When P1A is implemented, required: `cd apps/web && npm run typecheck && npm run lint`; destination unit tests; judge build without exploratory flag; fly-to Mulhacén, Picos, Reset, Escape, reduced motion, mobile width; confirm EvidenceCard path untouched.

---

## 8. Decision report

### Changes made (this sprint)

- This specification.
- Cross-links and a **PROPOSED** D54 row in `DECISIONS.md`, plus notes in `PROJECT.md`, `ROADMAP.md`, `DATASETS.md` (temporal table), `UX_UI_RULES.md`, `SCIENTIFIC_REVIEW.md`.
- **No** app, data, or scientific-output edits.

### Features not implemented

P1A destinations UI · P1B case-study sheet · P1C 3D model · P2 ghost infrastructure · nationwide plants · digital twins · site ranking · generation forecast · 2032–2040 prediction.

### Scientific findings unchanged

Gate A temperature, Gate B joint-low (insufficient evidence, 5/5), independence ratios, NOAA check, D53 labels — **not recomputed**.

### New decisions requiring team approval

- **D54** — adopt this spec as OPEN-P1 after P0 (below).
- **D53** — still blocking presentable rain/runoff labels.
- D36 / ADR-002 / Gate 3 human sign-off — still pending.

### Risks to the existing demo if implemented early

- Extra HUD fighting D45/D28 (clutter).
- Landmarks misread as candidate sites (especially national parks).
- 3D models read as surveyed geometry or as NASA evidence at plant scale.
- Ghost turbines on terrain read as a planned project.
- Time spent here instead of P0-P1–P3 before Sunday 21:00.

### Next highest-priority action

**Not spatial.** A named second person completes `docs/SCIENTIFIC_REVIEW.md` §5 and **decides D53**. Then submission checklist, slide 5 from approved claims, rehearsal + fallback recording (`ROADMAP.md`).

After that, the smallest safe spatial change is **P1A**: wire the existing `PLACES` fly-to (Mulhacén / Picos) with park disclaimers — still not 3D.
