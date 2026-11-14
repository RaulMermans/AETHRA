# UX/UI Guidelines

Recommendations for a consistent, good-looking interface — not merge blockers.
See also the local UX guide: `docs/Guía de apoyo · UX.pdf`.

## Guidelines

1. **Minimal, precise, premium scientific interface.** Data first; chrome second.
2. **Clear visual hierarchy and consistent spacing** (Tailwind defaults work well).
3. **Shared typography, colors and components** where practical.
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
14. **Computation:** can happen in the API or in the browser — whatever is fastest to build.

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

UI copy in English (event requirement — see `PROJECT.md`).
