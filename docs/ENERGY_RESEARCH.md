# Energy Research Brief — "The Hidden Energy Gap" (Gate B)

**Status: P1 · pre-registration FROZEN v1, Sat 14 Nov 2026 ~20:30 CET, before any regional data
was downloaded.** Go-ahead given by a team member in session ("vamos a hacer el research"); a second
approval is still pending (D34/D35). Nothing here is a result. Results go to
`data/results/energy_gap/`. Any change after this point needs a dated amendment in §11, made before
the affected output is viewed.

## 0. Frozen specification v1 (overrides earlier sections where they differ)

| Item | Frozen choice |
|---|---|
| Inputs | NASA POWER daily API, community `RE`, `ALLSKY_SFC_SW_DWN` (kWh m⁻² day⁻¹) and `WS50M` (m s⁻¹), time standard **LST** |
| Period | **2001-01-01 → 2025-12-31** (n = 25 years). Verified 14 Nov via API header `sources`: 2000/2001 window = SRB + SYN1DEG (break → start 2001); 2025 = SYN1DEG + MERRA2 only; 2026 adds FLASHFLUX + GEOSIT (excluded). Each yearly request's `sources` is stored in the manifest; any year in 2001–2025 listing FLASHFLUX or GEOSIT is flagged |
| Download | Regional API, one request per parameter × year × tile; tiles lon [−9.5, 0.0] and [0.0, 4.5], lat [35.5, 44.0] (API limit 10° in longitude). Raw responses kept gzip-compressed with SHA-256 in a manifest |
| Regions (5) | **R0 Peninsula + Balearics** (union of NUTS-2 polygons excluding ES70 Canarias, ES63 Ceuta, ES64 Melilla) · **ES11 Galicia** · **ES41 Castilla y León** · **ES24 Aragón** · **ES61 Andalucía**. Polygons: `apps/web/public/data/spain-admin.json` (GISCO NUTS 2021) |
| Sampling rationale | Contrasting regimes chosen a priori, not from data: Atlantic cloudy/windy NW (Galicia), continental high plateau (Castilla y León), Ebro-valley wind channel with cierzo (Aragón), high-insolation south (Andalucía), and the national aggregate. Not chosen for current installed capacity or for any result |
| Regional series | cos(latitude)-weighted mean of POWER grid points whose centre lies inside the polygon; the number of points and the native solar resolution (1°) are reported per region. A region with < 2 grid points is reported as insufficient support |
| Night-time | Not applicable: daily insolation integrates the day, so night zeros never enter the indicator |
| Seasonality | Monthly thresholds (§6.2) for events; monthly reference means for anomalies (E3) |
| Primary estimand | **E1, threshold P20, reference 2001–2020**: Theil–Sen trend of annual joint-low-day count, days/decade, 95 % CI; Mann–Kendall with ties correction; Hamed–Rao variance correction used if lag-1 autocorrelation of the detrended series is outside ±1.96/√n |
| Added before data (A1) | **E0**: trend of annual mean solar insolation and annual mean WS50M per region (marginal resource trends, descriptive context for E1/E2) |
| Confirmatory family | E1 across the 5 regions, Benjamini–Hochberg q = 0.10. Everything else is descriptive |
| EvidenceCard (pre-specified) | **E1 for R0 Peninsula + Balearics at P20**, whatever its outcome. Regional cards may follow, but the headline card is not chosen by significance |
| Outcome states | Supported increase/decrease: BH-adjusted p < 0.10 **and** 95 % CI excludes 0 **and** same sign at P10 and P30. "No robustly supported trend": otherwise, when the minimum detectable trend (80 % power, simulated) is ≤ 2× the observed |slope|. "Insufficient evidence": otherwise, or < 20 complete years, or median joint-low count < 5 days/yr |
| Resource ≠ generation | Results describe meteorological resource at 50 m and surface irradiance on a horizontal plane. No power curves, PV models, capacity factors, or grid statements |

## 1. Research question

Have the frequency or duration of periods with **jointly low solar and wind resources** changed
across selected Spanish regions between 2001 and the latest climate-quality year, and what does the
evidence support?

## 2. Hypothesis (to test, not to confirm)

Regional averages of solar and wind may hide differences in the frequency, persistence or seasonality
of jointly unfavourable conditions, and these may be evolving differently by region.
**H0:** no monotonic trend in the annual count of joint-low days in a region.

## 3. Estimands (separate questions, kept separate)

| # | Estimand | Role |
|---|---|---|
| E1 | Trend (days/decade) in the annual count of **joint-low days** per region | **Primary, confirmatory** |
| E2 | Trend in annual count of solar-low days, and of wind-low days, separately | Decomposition (descriptive) |
| E3 | Trend in the annual rank correlation (Kendall τ) between daily solar and wind anomalies | Change in dependence (descriptive) |
| E4 | Trend in annual count of joint-low **episodes** ≥ 2 consecutive days, and max episode length | Persistence (descriptive) |

E1 can change because the marginals changed (E2) or because their dependence changed (E3). We
report both, and we don't call it a change in "complementarity" unless E3 supports that.

## 4. Data (candidate; Gate 1 not yet passed)

Facts from NASA POWER docs read 14 Nov 2026 (<https://power.larc.nasa.gov/docs/methodology/>,
`…/data/sources_fluxes/`, `…/data/sources_meteorology/`, `…/services/api/temporal/daily/`). Items marked ⚠️ are still to verify.

| | Solar | Wind |
|---|---|---|
| POWER parameter | `ALLSKY_SFC_SW_DWN` (all-sky surface shortwave downward irradiance, daily) | `WS50M` (wind speed at 50 m above grid-mean elevation, daily mean) |
| Units | kWh m⁻² day⁻¹ (⚠️ confirm in parameter dictionary) | m s⁻¹ |
| Source lineage | GEWEX SRB R4-IP 1984–2000 · **CERES SYN1deg Ed4.2** 2001-01-01 → NRT−~3–4 months · CERES FLASHFlux (NRT, **not climate quality**) | **MERRA-2** 1981 → ~1 month behind NRT · GEOS-IT appended for NRT and overwritten later |
| Native grid | 1° × 1° | 0.5° × 0.625° |
| Type | Satellite-derived flux product (model-assisted retrieval) | **Reanalysis**, not observation |
| Documented caveats | SRB→SYN1deg step at 2001-01-01 "not a physical climate signal". Not recommended for trends across source changes | Mean regional flow, not local sites. End trend analyses ≥ 2 months behind NRT. Validation vs ISD 10 m hourly: RMSE 2.47 m/s, R² 0.40 |

Decisions this implies:
- **Period:** start **2001-01-01** (avoids the SRB/SYN1deg break). End at the last complete
  calendar year fully covered by SYN1deg, which excludes FLASHFlux (⚠️ determine the exact month:
  likely 2024 or 2025). Expected n ≈ 24 years.
- **Daily resolution, local solar time (LST)** (POWER default). Daily insolation integrates the day, so
  normal night-time zeros never enter the indicator. Hourly analysis is out of scope (P2).
- **Regional output grid:** POWER regional daily/monthly is documented on a 0.5° grid, one parameter
  per regional request (⚠️ regional box size limit not found). Solar information is no finer than
  1°. Never imply sub-1° precision.
- **Wind ≠ generation, irradiance ≠ PV output.** No power curves or PV models in this study.
- Existing `data/nasa_merra2_wind_spain_monthly` (U50M/V50M monthly *vector* means) is **not**
  usable for wind resource: √(U²+V²) of monthly means underestimates speed.

## 5. Spatial support (pre-register before downloading)

Proposed regions (team to approve): **Peninsula + Balearics aggregate**, plus four CCAA chosen for
contrasting regimes: **Galicia** (cloudy, windy NW), **Castilla y León** (northern Meseta),
**Aragón** (Ebro valley wind), **Andalucía** (high-solar south). Canarias is analysed separately and
only if D6 says so. Each regional series is the area-weighted mean of grid points whose centre lies
in the GISCO NUTS-2 polygon (same boundary as D19).

## 6. Indicator definition (frozen at approval)

1. Daily regional series S(d) (solar) and W(d) (wind).
2. **Reference period 2001–2020.** For each calendar month m: thresholds S₂₀(m), W₂₀(m) are the
   20th percentiles of daily values in month m over the reference period. Monthly thresholds
   remove the seasonal cycle from the event definition.
3. **Solar-low day:** S(d) < S₂₀(m). **Wind-low day:** W(d) < W₂₀(m). **Joint-low day:** both.
4. **Episode:** maximal run of consecutive joint-low days. Primary minimum duration 1 day (E1); E4
   uses ≥ 2 days.
5. Missing days: a year counts only if ≥ 95 % of days have both variables. Missing days are never
   filled.
6. Aggregation: annual counts (calendar year). Seasonal counts (DJF, JJA) are descriptive only.
7. **Sensitivity (reported together, never picked):** thresholds P10 and P30. Reference 2001–2010.
   E1 is reported for P20 regardless of how the others look.

Expected count under independence at P20: 0.2 × 0.2 × 365 ≈ 15 days/yr per region.

## 7. Statistics

- Theil–Sen slope (days/decade) with 95 % CI. Mann–Kendall **with ties correction** (counts are
  discrete). Lag-1 autocorrelation diagnostic; modified MK (Hamed–Rao) if non-negligible.
- Multiple comparisons: Benjamini–Hochberg (q = 0.10) across the 5 regions for E1 only. E2–E4 are
  descriptive, with no significance claims.
- **Power check before interpreting:** simulate the minimum detectable trend for n ≈ 24 with the
  observed count variance. If the plausible effect is below it, the expected honest outcome is
  "insufficient evidence" and we say so up front.
- A difference between two regions needs its own test, e.g. a trend in the between-region
  difference series. Two separate "significant" labels don't establish a difference.

## 8. Interpretation limits (go on the EvidenceCard)

Not generation, not capacity factor, not grid reliability, not outage risk, not site viability, not a
forecast. Coarse (≥ 1° solar) regional support. Reanalysis wind has known biases, and Mediterranean
wind power is underestimated. Results describe 2001–20xx only.

**Decision relevance:** tells a resource analyst whether historically jointly unfavourable days have
become more or less frequent in a region. That can justify, but does not replace, a generation-based
study (storage, hybridisation, dispatch).

## 9. Go / no-go (Gate 3)

**GO to primary demo** only if all hold by **Sun 15 Nov 12:00**: both inputs pass Gate 1 (lineage,
period end, units verified) · §5–§6 approved before data were inspected · ≥ 20 complete years per
region · median joint-low count ≥ 5 days/yr · tests pass in `packages/science` · sensitivity table
produced · claim reviewed by a second person. **The result may be null.** A supported "no robust
change" is a valid demo finding.

**NO-GO → slide 7 "next research step"** if any condition fails, or Gate A is not yet green.

## 10. Feasibility assessment (14 Nov 2026)

| Criterion | Assessment |
|---|---|
| Challenge relevance | High. Solar irradiance and wind are NASA Earth-science variables, and the indicator is a derived time series with trend + significance |
| NASA source availability | Good. POWER daily point/regional API, documented lineage. Small JSON downloads (no large data) |
| Scientific feasibility | Moderate. n ≈ 24 annual counts gives low power and a likely inconclusive E1. Grid mismatch 1° vs 0.5° × 0.625°. FLASHFlux end-of-record must be excluded |
| Implementation effort | ~6–10 person-hours: fetch + indicator + stats + bundle export. UI reuses the Gate A EvidenceCard |
| Originality | High compared with static resource atlases. Joint-shortfall trend framing is uncommon in hackathon tools |
| Human relevance | Clear story ("abundance ≠ availability") without overclaiming |
| Demo reliability | Medium. Depends on Gate A plumbing and an approval step under time pressure |

**Recommendation: CONDITIONAL GO.** Run it time-boxed, only after the Gate A contract (P0-B1)
exists and §5–§6 are approved, with the hard cut at Sun 12:00. Gate A must not lose people to it.

## 10b. Result and decision (Sat 14 Nov 2026, ~22:00)

Full numbers: [`data/results/README.md`](../data/results/README.md).

- **Gate 1 (both inputs): PASSED.** Lineage verified per request from API headers, units from API
  metadata, native grids observed, zero fill values, reproducible fetch + SHA-256 manifest.
- **Gate 3 checks:** definitions frozen before data ✔ · night/season/missing handled ✔ · 25/25
  complete years ✔ · median joint-low count 7–11 ≥ 5 ✔ · sensitivity done ✔ · tests pass ✔ ·
  **second-person review ✗ (pending)**.
- **Hypothesis (change in joint-low frequency): not supported.** Outcome "insufficient evidence" in
  all 5 regions. Nationally, changes beyond about −1.8 / +2.2 days per decade are inconsistent with the data.
- **Descriptive finding:** joint shortfalls occur at about half the rate expected by chance, in every
  year 2001–2025, everywhere except Aragón (0.79).

**Decision: CONDITIONAL GO for the demo, NO-GO for any "the gap is growing/shrinking" claim.**
The energy EvidenceCard (honest null + complementarity context) can anchor the story *if* a second
member reviews it. The challenge-complete "supported trend" stays the Gate A temperature card. No
further thresholds, regions or variables are to be tried on this question before submission.

## 11. Amendment log

| # | When | Change | Seen data before? |
|---|---|---|---|
| A3 | Sat 14 Nov ~21:30 | Hamed–Rao variance factor floored at 1 (correction may only make the test more conservative). Found **after** seeing outputs: Andalucía E2 wind-low days got factor 0.024 (p 0.083 → < 0.001) from a negative lag-1 autocorrelation. Direction is conservative: it can only raise p-values. E1 outcomes were "insufficient evidence" before and after | **Yes**, disclosed |
| A2 | Sat 14 Nov ~20:45 | Regional weighting changed from "centre inside polygon" to **cos(lat) × fraction of the grid cell's area inside the polygon** (cell = centre ± half spacing). Reason: a single test request showed solar is served on its native 1° grid (centres at x.5°), where centre-inside drops coastal cells. Effective cell count reported per region | No. One 2001 solar request for the western tile, used only to read the grid |
| A1 | Sat 14 Nov ~20:30 | Froze §0. Added E0. Period end 2025 and units verified from API header. Sensitivity reference 2001–2010 kept. Team member asked to start the research now, ahead of the Gate A contract; staffing risk accepted | No regional data. Only a 5–12 day single-point (Madrid) probe used to read API headers |
