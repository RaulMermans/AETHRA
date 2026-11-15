# Simulated Use Cases — Automated Functional Validation (15 Nov 2026)

**These personas are hypothetical.** The tests show that the judge build *can complete* each task and
*shows the right evidence*. They are not user studies, interviews or testimonials, and they say
nothing about whether real people understand the evidence or decide better (see
`IMPACT_VALIDATION.md`).

## Three kinds of validation — never merged into one score

| Kind | Question | Status | Evidence |
|---|---|---|---|
| **Functional** | Can the application complete the intended task? | **Verified (automated)** | This file; `apps/web/e2e/scenarios.spec.ts` |
| **Scientific** | Is the numerical conclusion supported by the analysis? | **Verified by reproduction; human review pending** | `FINAL_RELEASE_VALIDATION.md` §3, `SCIENTIFIC_REVIEW.md` §5/§7 |
| **Human impact** | Do real people understand better or decide better? | **UNVALIDATED** | No participants yet; protocol in `IMPACT_VALIDATION.md` |

## How to run

```bash
cd apps/web
npm run build                 # judge build (NEXT_PUBLIC_ENABLE_EXPLORATORY unset)
npm run e2e                   # all scenarios + first-screen checks (starts next start -p 3519)
npm run e2e:scenarios         # S01–S04 × 3 for the time-to-evidence proxy
npm run e2e:capture           # presentation stills → docs/release/2026-11-15/slides/
```

Playwright 1.57 (dev dependency only), system Chrome with SwiftShader WebGL, 1440 × 900 unless stated,
one worker. Traces kept on failure; video recorded (`E2E_VIDEO=0` disables it where Playwright has no
ffmpeg build). Expected values are read from `public/data/evidence-cards.json` and
`lib/i18n/messages.ts`; no scientific value is hard-coded in the tests.

## Results (final run on the release build)

`npm run e2e`: **16 passed, 0 failed** (56.7 s). `npm run e2e:scenarios`: **12 passed** (S01–S04 × 3).

### Time-to-evidence proxy

- **Start:** the ready application ("Preparing Spain" gone, globe canvas visible).
- **End:** every required evidence field of the scenario has been asserted visible.
- Measured by the test runner on a development machine with software WebGL. It is **not** a human
  reading time and is not compared with any other product.

| Scenario | Simulated goal | Status | Interactions | Time-to-evidence, 3 runs (median) | App ready |
|---|---|---|---|---|---|
| **S01** Skeptical energy analyst | "Are simultaneous low sun + low wind days increasing in Castilla y León?" | PASS ×3 | 3 clicks | 11.2 / 11.5 / 11.9 s (**11.5 s**; includes the ~7 s camera flight to the region) | 1.3–2.1 s |
| **S02** Climate researcher | "Is air temperature increasing over the Peninsula and Balearics?" | PASS ×3 | 1 click | 1.8 / 1.9 / 2.2 s (**1.9 s**) | 0.8–1.0 s |
| **S03** Overconfident planner | "So this installation will be less profitable in 2040." | PASS ×3 | 0 (on first screen) + 1 API call | 1.7 / 2.3 / 3.4 s (**2.3 s**) | 0.8–1.0 s |
| **S04** Curious non-specialist | "Is the indicator becoming more frequent, and what does the uncertainty mean?" | PASS ×3 | 3 keyboard activations | 2.4 / 3.1 / 3.5 s (**3.1 s**) | 0.9 s |
| **S05** Adversarial user | Reach unsupported or stale views | PASS (9 tests) | — | — | — |
| First screen (D72) | Fresh, refresh, Spanish + refresh, 390 px phone | PASS (3 tests) | ≤ 2 taps on phone | — | — |

Raw rows: `docs/release/2026-11-15/scenario-metrics.json`.

### Key verified evidence per scenario

- **S01:** region "Castilla y León"; verdict "Insufficient evidence" + its explanation; slope
  0.00 days per decade; 95 % CI −1.55 to +1.67; period 2001–2025; NASA POWER sources; bundle path
  `data/results/energy_gap/analysis_bundle.json` under Sources & provenance; history-only chart caption;
  no currency, energy-output, site-recommendation or suitability wording on the page.
- **S02:** "Supported increase"; +0.60 °C per decade; 95 % CI +0.31 to +0.87; 2000–2025; Peninsula +
  Balearics; MERRA-2; NOAA external station comparison with the "not claimed independent" note;
  "Not a cause of warming…"; no causal wording.
- **S03:** the Study findings boundary block shows the 2040 profitability claim as "Outside the
  evidence: no estimate given" and contains no number other than the year in the claim; the
  deterministic assistant API (`/api/aethra/ask`) answers with a non-supported status and no
  currency / MWh / percentage figure. *Limitation:* the assistant is not in the judge UI (D76), so its
  API is tested directly; the test checks the absence of figures, not answer quality.
- **S04:** reached by keyboard only; receipt sections appear in order 1 Claim → 2 Verdict → 3 How
  much → 4 What this does not show → 5 Method → 6 NASA data & provenance; verdict has text + glyph
  (not colour only); the CI explanation and the do-not-conclude line are visible without expanding;
  Limitations open with Enter. *Limitation:* presence and reachability only — not comprehension.
- **S05:** `?lab=energy`, `?concept=…`, `?scope=provincia&id=09` (rebuilt province, shows Burgos),
  `?scope=provincia&id=ZZ`, `?scope=ccaa&id=ES99`, `?scope=bogus`, `#cam=nan…` → no Energy Lab, no
  ranking/suitability text, no TARO, no relationship maps, no page errors, unknown ids stay national;
  an unknown data URL is a 404; **SYNTHETIC FIXTURE** (cards and bundle return 503): "No finding was
  invented" is shown and the temperature value is not rendered.

### Product problems the suite revealed (fixed)

1. **Scope substitution on invalid URLs** — `?scope=provincia&id=ZZ` silently showed **Málaga**,
   `?scope=ccaa&id=ES99` showed **Andalucía**. Fixed: unknown ids keep the national view (D76).
2. **Demo dead end** (found by the earlier e2e run) — "Open EvidenceCard" from a research case opened
   the temperature topic ("No air-temperature EvidenceCard for Castilla y León"). Fixed (D75).
3. **Ambiguous zero** — "±0.00 days per decade" could be read as uncertainty. Now "0.00".
4. **Clipped axis label** — "2025" was cut off at the right edge of the card and case charts.

## Screenshots

- Validation milestones: `apps/web/e2e-results/screenshots/` (regenerated per run, not committed).
- Presentation stills (judge build): `docs/release/2026-11-15/slides/01…06`.
- Earlier full-path recording: `docs/release/2026-11-15/judge-path-run1-1440x900.webm`.
