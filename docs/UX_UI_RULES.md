# UX/UI Rules

Two levels. **Scientific presentation rules** (next section) are requirements for anything on the
demo path. **Design guidelines** are recommendations. Local UX guide: `docs/Guía de apoyo · UX.pdf`.
The globe is CesiumJS (ADR-001). Don't change engines and don't add map tools while P0 is open.

## Scientific presentation rules (required)

1. **Render, don't compute.** The browser displays results from the Python pipeline (ADR-002, pending
   approval). It never computes or re-aggregates slopes, CIs, p-values or significance labels.
   Formatting, colour scaling and layout are fine.
2. **Every result carries:** variable + units · region + native resolution · period + temporal
   resolution · slope ± 95 % CI per decade · method and n · outcome state · source + version/DOI.
3. **Outcome states.** Each one has its own text label and icon, so meaning never depends on colour:

   | State | When | Wording |
   |---|---|---|
   | Supported increase / decrease | Test passes after the autocorrelation check, CI excludes 0, robust to window | "Supported increase of X (CI a–b) per decade, 2000–2025" |
   | No robustly supported trend | Test does not pass, or sign flips across windows | "No robust trend detected" (not "no change") |
   | Insufficient evidence | Too few complete years / too low power | "Insufficient evidence" |
   | Missing data | Years or region not covered | "No data for …" |
   | Invalid data | Failed QA | "Data failed quality checks" |
   | Exploratory | Not gate-checked | Visible "EXPLORATORY" tag |
4. **p < 0.05 is not a certificate.** Show the effect size and CI first, then the test.
5. **Observed vs derived vs extrapolated** look different: observed points solid, derived values
   labelled, extrapolations (if ever shown) dashed and tagged *extrapolation, not a forecast*. No
   synthetic value is ever shown as an observation.
6. **No false precision.** Hover values are the native grid cell, with no interpolation finer than
   native support. Station halos and basin boxes are labelled as what they are.
7. **Label the data type:** reanalysis, satellite–gauge estimate, land-surface model, station
   observation. GLDAS runoff is "modelled runoff", not river discharge.
8. **Each EvidenceCard has a "do not conclude" line,** e.g. "Not energy production, not a forecast,
   not causal."
9. **Comparisons:** two separate "significant" badges don't show a difference between regions.
   Show a difference test or say it hasn't been tested.
10. **Per-cell maps:** state the multiple-comparison rule (FDR) in the legend, or show slopes only.

## Design guidelines

Visual identity: [BRAND_ART_DIRECTION.md](BRAND_ART_DIRECTION.md) (D56). Tokens live in
`apps/web/app/globals.css`. **Brand colours are not data colours** — do not restyle quantitative
palettes, outcome semantics, missing/invalid states or zero-centred diverging scales to match AETHRA.

1. **Minimal, precise, premium scientific interface.** Data first; chrome second.
2. **Clear visual hierarchy and consistent spacing** (Tailwind defaults work well).
3. **Shared typography, colors and components** where practical. Geist Sans + Geist Mono; tabular
   numerals on comparisons. Header wordmark: AETHRA raster lockup (`public/brand/aethra`).
4. **Avoid clutter**; decorations and effects are fine when they add to the experience.
5. **Components should have a purpose** — ideally helping answer *what / where / when / how much*.
6. **Accessibility:** aim for good contrast, keyboard navigation, visible focus and labelled controls.
7. **Responsive** for desktop and mobile.
8. **Interactive components:** consider hover, active, loading, empty and error states.
9. **Maps:** a legend, units, date and source make layers easier to read.
10. **Charts:** readable axes, dates and units; show uncertainty and gaps when available.
11. **Missing data:** it's fine to show "no data" or "insufficient evidence" states.
12. **Color:** colorblind-friendly palettes and labels alongside color help readability.
13. **Provenance:** dataset and source info nearby is nice to have.
14. **Computation:** ~~can happen in the API or in the browser~~. Replaced by scientific rule 1
    (render, don't compute; ADR-002 proposed 14 Nov 2026).
15. **Primary flow:** open Spain → pick variable/question → pick region → see series → see trend and
   outcome state → read meaning and limits → open EvidenceCard → optionally compare a region. The user
   should grasp what is measured, whether the change is supported, and what *not* to conclude within
   seconds.

## Geographic navigation and 3D (proposed, D54 — not on the demo path)

Full spec: [SPATIAL_EXPERIENCE.md](SPATIAL_EXPERIENCE.md). Until D54 is approved and P0 is green,
do not add destination chrome or 3D models to `/explore`.

- **Reuse** `GlobeController.flyTo`. Do not add a second camera stack. Honour `prefers-reduced-motion`.
- Landmark fly-tos (Mulhacén, Picos de Europa) are **navigation**, including inside national parks.
  Never present them as energy development candidates.
- A research case opens the **existing EvidenceCard** for that CCAA. Regional NASA support (1° solar,
  0.5° × 0.625° wind, ~50 km MERRA-2) must stay visible beside any plant point.
- **Existing plants:** solid markers + register metadata (D49). **Illustrative 3D:** labelled
  "not an exact reconstruction". **Conceptual/ghost 3D:** translucent, "Conceptual / Not a real
  project", off in judge mode.
- Do not restore D45 GIS tools. The globe must not outrank the EvidenceCard.

## Measurement units (Spain) — required, see D20

- SI/metric throughout. Temperature in **°C**, accumulated precipitation in **mm**, distance in
  **km**, area in **km²**, vegetation indices (NDVI, EVI) **dimensionless**.
- Unit conversion happens in the processing stage (`scripts/`, `packages/science`), never in the
  frontend. The browser displays the `display_variables` named in each processed file
  (e.g. `T2M_celsius`, `precipitation_monthly_accumulation`).
- Original values, units, conversion formula and provenance stay available (provenance panel).
- Never label a precipitation **rate** (mm/hr) as accumulated precipitation (mm), or vice versa.
- Trends carry units per time, e.g. **°C/decade**, **mm/decade**, **NDVI/decade**.
- Dates: Spanish format (`dd/mm/aaaa`, `Intl.DateTimeFormat("es-ES")`) when the interface language
  is Spanish; the submitted UI is English (see below).

## Language

The submitted default is English (event requirement — see `PROJECT.md`). A control in the header
switches the interface to Spanish. Both languages use the same numbers, outcome states and limits;
only the wording changes. The choice is stored in `localStorage` (`aethra-locale`) and sets
`html lang`. Spanish dates follow D20. Copy lives in `apps/web/lib/i18n/messages.ts` (interface) and
`science-copy.ts` (Spanish restatements of pipeline text — words only, never values). The first render
is always English so server and client markup match; the stored choice applies right after mount.
TARO receives the interface language (`language` in the ask request) and answers in it.
