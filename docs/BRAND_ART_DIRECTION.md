# AETHRA — brand art direction

Single source of truth for the **visible product identity**. Scientific methods, datasets and
EvidenceCard values are **not** defined here. See `PROJECT.md`, `DATASETS.md`, `DECISIONS.md`.

| Item | Status |
|---|---|
| Visible product name **AETHRA** | APPROVED for UI (D56) · requested 14 Nov 2026 |
| Tagline *Earth's signals, revealed.* | APPROVED for UI chrome and metadata |
| Design tokens in `apps/web/app/globals.css` | APPROVED |
| Raster logo kit v1.0 in `apps/web/public/brand/aethra` | APPROVED for UI chrome (D58) |
| Temporary typographic wordmark | SUPERSEDED by raster lockup in the header |
| Vector master (SVG/AI), custom type | **DEFERRED** (kit is bitmap-only) |
| GRIDSHIFT (D34) | Internal energy-strategy working name; not the header |
| Challenge title *Be An Earth System Trend Detective!* | LOCKED (external). Keep on credits and submission |
| Trademark / domain clearance | **Not done.** Commercial use needs legal checks |
| NASA endorsement | None. The app is an independent Space Apps project |

## Positioning

AETHRA is an evidence-first Earth-intelligence platform. First mission: **MISSION 01 — SPAIN**.
Personality: scientific, exploratory, precise, cinematic, restrained. Archetype: Explorer × Scientist.

The interface should feel like an Earth-observation instrument, not a climate-forecast product, energy
startup site, or decorative GIS dashboard.

Brand statement: **Earth's signals, revealed.**
Supporting: **Understand Earth's past. Investigate its future.** (investigation, not validated prediction)

## Naming hierarchy

| Layer | Visible label | Notes |
|---|---|---|
| Platform | AETHRA · Earth Intelligence | Header wordmark |
| Mission | MISSION 01 / SPAIN | Product identity, not shown in header chrome; spatial extent still follows D4–D6 |
| Modules | Evidence cards, Station catalog, Climate trends | Keep existing panel names |
| Geography | Spain, CCAA, province names on cards | Do **not** rename Spain-wide results “Iberia” |

Iberia is a different geographic extent than mainland Spain + Balearics + Canarias. If a future
narrative chapter uses IBERIA, it must define the exact area.

## Colour — brand chrome vs science

Brand colours are **not** scientific data colours. Quantitative palettes stay in
`apps/web/lib/globe/climate.ts` (thermal, precip, drought, diverging trend scales, missing/invalid).

| Token | Hex | Tailwind | Use |
|---|---|---|---|
| Deep Space | `#03050A` | `space` | Page / Cesium depth |
| Atlantic Midnight | `#101C2B` | `atlantic` | Panels, nav surfaces |
| Mineral White | `#F5F1E9` | `ink` | Primary text |
| Scientific Blue | `#819DB5` | `nav` / `faint` | Coordinates, metadata, focus, Spain outline |
| Solar Gold | `#D6B47E` | `accent` | Active controls, wordmark-adjacent highlights |
| Iberian Terracotta | `#BD694E` | `terracotta` | Rare cultural accent — **never** a warning or trend colour |
| Secondary text | `#C4CFD8` | `muted` | Supporting copy on dark surfaces |

Outcome states still use **text + glyph**; increase/decrease badges keep amber/sky as today so brand
gold does not become “supported increase”.

## Typography

Geist Sans (interface + display) and Geist Mono (coordinates, IDs, timestamps, scientific metadata).
Tabular numerals on numeric comparisons. Moderate tracking on the AETHRA wordmark only.
Do not add decorative families until the logo sprint.

## Wordmark and logo files

Primary nav uses `BrandWordmark`: raster lockup `PNG/03_Full_Color_Transparent.png` (dark UI).
Clicking the lockup opens a short brand story (hackathon, mission, vision, honesty) in the active
locale. It is chrome, not science: no slopes, CIs or new claims. The
**MISSION 01 / SPAIN** line is not shown in chrome. Light surfaces use `PNG/04_Full_Color_Light.png`. Favicons live in
Favicon and `app/icon.png` use the transparent symbol (`PNG/25_Avatar_Transparent_1024.png`), not the navy-square kit favicons. `apple-icon.png` is the same mark on a transparent field.

Kit notes (from `public/brand/aethra/README.txt`): files are extracted from a flattened PNG; there is
no native SVG/AI/EPS master. Do not stretch the lockup. `BrandLogoMark` (2030-cone motif) stays
**off** the judge-facing header.

## Motion

Short fades and hover/focus transitions. Honour `prefers-reduced-motion` (already global in
`globals.css`). No logo loop or delayed cinematic intros. Sparse decorative orbital traffic
(D59) is allowed on the 3D globe only; it is not a data layer.

## Future 3D infrastructure (visual rule only)

| Category | Treatment |
|---|---|
| EXISTING — VERIFIED | Solid geometry + register metadata (D49) |
| CONCEPTUAL — NOT AN APPROVED PROJECT | Translucent/outline, explicit disclaimer, off in judge mode |

Do not add new 3D models in a branding pass.

## Inspiration (not affiliation)

Orbital / mission-control restraint · Iberian cartographic geometry (meridians, compass, contours)
used **subtly** · contemporary scientific UI. Avoid flags, cliché Spanish icons, NASA insignia,
neon sci-fi, heavy glassmorphism, fake holograms, fabricated charts.

## Credits that must remain visible

NASA data sources with version/DOI, NOAA GHCN-Daily, Cesium/imagery providers, Eurostat GISCO,
regional infrastructure registers. Challenge name on project information. No NASA logos.
