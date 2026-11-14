---
name: scientific-ux-ui
description: >-
  UX/UI rules for apps/web (/explore, CesiumJS globe, EvidenceCard, charts, legends, panels, copy).
  Use whenever you create or change any component, layout, chart, map layer, legend, label,
  tooltip, empty/loading/error state or UI text. Enforces the required scientific presentation
  rules (render-don't-compute, outcome states with text + icon, CI before p-value, data-type
  labels, units), the primary user flow, accessibility, and the design guidelines.
---

# Scientific UX/UI

**Sources of truth:** `docs/UX_UI_RULES.md`, `docs/adr/001-cesium-globe.md`, D26–D33 and D43 in
`docs/DECISIONS.md`. Apply this skill together with `typescript-strict`.

## Part 1: Required (anything on the demo path)

1. **Render, don't compute.** The browser displays values from the Python pipeline
   (`evidence-cards.json`, `data/results/*`). It never computes or re-aggregates slopes, CIs,
   p-values or significance labels, and never averages p-values or CIs across stations.
   Formatting, colour scaling and layout are fine.
2. **Every result shows:** variable + units · region + native resolution · period + temporal
   resolution · slope ± 95 % CI **per decade** · method and n · outcome state · source +
   version/DOI · a **"do not conclude"** line (e.g. "Not energy production, not a forecast, not
   causal").
3. **Outcome states have their own text label and icon. Meaning never depends on colour alone.**

   | State | Exact wording |
   |---|---|
   | Supported increase/decrease | "Supported increase of X (CI a–b) per decade, 2000–2025" |
   | No robust trend | "No robust trend detected" (**never** "no change") |
   | Insufficient evidence | "Insufficient evidence" |
   | Missing data | "No data for …" |
   | Invalid data | "Data failed quality checks" |
   | Exploratory | visible **EXPLORATORY** tag |

   Model these as a discriminated union and render them with an exhaustive switch
   (`typescript-strict`).
4. **Effect size and CI first, then the test.** p < 0.05 is not a certificate.
5. **Show observed, derived and extrapolated values differently.** Observed points are solid,
   derived values are labelled, and any extrapolation is dashed and tagged *"extrapolation, not a
   forecast"*. Synthetic values are never shown as observations.
   **2030 cones, "Trend to 2030" and the Decision Matrix stay off the default demo path** (D38,
   P0-F4).
6. **No false precision.** Hover shows the native grid cell, never interpolation finer than the
   native support. Station halos and basin boxes are labelled as what they are (D30).
7. **Label the data type:** reanalysis · satellite–gauge estimate · land-surface model · station
   observation. GLDAS runoff is "modelled runoff", not river discharge.
8. **Comparisons:** two "significant" badges do not show a difference. Show a difference test or
   write "difference not tested".
9. **Per-cell maps:** state the FDR rule in the legend, or show slopes only.
10. **Units (D20):** SI/metric. °C, mm (accumulated), km, km², dimensionless NDVI/EVI. Trends are
    in units per decade. **Conversion happens in Python, never in the frontend.** Never label a
    rate (mm/hr) as an accumulation (mm).
11. **UI copy in English.**

## Part 2: The primary flow (nothing should get in its way)

Open Spain → pick variable/question → pick region → see series → see trend + outcome state →
read meaning and limits → open EvidenceCard (**one click from the chart**) → optionally compare.

Within seconds the user must grasp **what is measured, whether the change is supported, and
what not to conclude**. Every component should help answer *what / where / when / how much*. If
it doesn't, it shouldn't be on the screen (D28, D33 removed Layers panel and GIS tools for this
reason).

## Part 3: Globe constraints (ADR-001, D32–D33)

- CesiumJS only. Don't change engines and don't add map tools, terrain tricks or visual
  effects while P0 is open.
- Cesium is client-only (`next/dynamic`, `ssr: false`). Destroy the viewer and handlers on
  unmount.
- Climate heatmaps and stations are Spain-only. The globe shows the whole Earth with the camera
  framed on Spain.
- Rendering-quality profiles change rendering only, never data values.

## Part 4: Design guidelines (recommended)

- Minimal, precise, premium scientific interface. **Data first, chrome second.**
- Consistent spacing and typography (Tailwind defaults). Reuse existing components in
  `components/explore/` before creating new ones.
- **Every interactive component** gets hover, active, focus, loading, empty and error states.
- **Accessibility:** sufficient contrast, keyboard navigation, visible focus, `aria-label` on
  icon-only buttons, and a colourblind-safe palette with text labels next to colour.
- **Maps:** legend + units + date + source. **Charts:** readable axes, dates and units; show
  uncertainty and gaps (missing years are gaps, not interpolated lines).
- Responsive for desktop and mobile. Provenance sits next to the value, not hidden away.

## Before you finish a UI change

- [ ] No statistic is computed in TS. Every displayed number traces to a bundle/JSON field.
- [ ] All six contract fields + "do not conclude" are visible for any result.
- [ ] Outcome states use the exact wording + icon. Colour isn't the only signal.
- [ ] Exploratory, synthetic and extrapolated content is tagged or off the demo path.
- [ ] Loading, empty and error states exist and are honest.
- [ ] Keyboard-reachable, focus visible, controls labelled.
- [ ] `npm run typecheck && npm run lint` pass, and you **opened it in a browser** (or said
      clearly that you didn't).
