# UX/UI Rules

**Mandatory for every UI change.** A PR that breaks one of these rules is not merged.
See also the local UX guide: `docs/Guía de apoyo · UX.pdf`.

## Rules

1. **Minimal, precise, premium scientific interface.** Data first; chrome second.
2. **Strong visual hierarchy and consistent spacing.** One spacing scale (Tailwind defaults); one
   primary action per view.
3. **Consistent typography, colors and components.** Use shared tokens/components; no one-off styles.
4. **No unnecessary gradients, decorations or visual clutter.**
5. **Every component has a clear purpose.** If it doesn't help answer *what / where / when / how
   much / significant?*, remove it.
6. **Legibility, contrast and accessibility.** WCAG 2.2 AA contrast; keyboard navigable; visible
   focus; semantic HTML; labelled controls.
7. **Responsive** for desktop and mobile (≥ 360 px wide).
8. **Every interactive/data component defines hover, active, loading, empty and error states.**
9. **Maps:** legend, units, color scale range, data date/period, and source on the map.
10. **Charts:** accurate axes (no truncated or misleading scales), explicit dates, scientific units,
    uncertainty where available, gaps shown as gaps (never interpolated silently).
11. **Never disguise missing data or unsupported conclusions.** "Insufficient evidence" and "no data"
    are first-class, visible states.
12. **Never use color as the only channel.** Pair with labels, patterns, icons or values. Use
    colorblind-safe palettes (sequential for magnitude, diverging only around a meaningful zero).
13. **Evidence and provenance one click away:** dataset, version, period, extent, method, p-value /
    confidence, and link to source.
14. **No scientific computation in the browser.** The frontend only renders results returned by the
    API.

## Language

UI copy in English (event requirement). Precise wording: "trend", "anomaly", "not significant" —
never "proves", "caused by".
