# Case study: Seville countryside solar cell `r20c20` (EXPLORATORY)

**Status:** EXPLORATORY editorial case. Selected on 15 Nov 2026 **after** viewing the screening
results and the GEM registry. It is an investigation example, not a site ranking, investment advice or
a statement about electricity output.

## 1. Pre-registration (written before the NASA POWER series were downloaded)

This section was committed to the working tree before `scripts/build_pv_case_sevilla.py` fetched any
POWER data. The screening values for this cell (MERRA-2 irradiance and summer temperature trends in
`pv-screening.json`) **had already been seen** when the cell was chosen. The four POWER tests below
were not.

**Place.** MERRA-2 cell `r20c20`, bounds 37.25–37.75° N, 5.9375–5.3125° W (0.5° × 0.625°), centre
37.5° N, 5.625° W, in the province of Seville (Carmona, Alcalá de Guadaíra, Lora del Río area). NASA
POWER is queried at the cell centre. POWER solar parameters have native ~1° support and meteorology
0.5° × 0.625°. The values are therefore regional context for the cell, not a parcel measurement.

**Period.** Complete calendar years 2001–2025 (POWER solar lineage starts in 2001). A year is
complete only if all days have a valid (non-fill) value. Fewer than 20 complete years → *Insufficient
evidence*.

**Variables (fixed family of four; no others will be added or substituted):**

| id | Why it matters for PV | POWER parameter | Annual statistic | Units |
|---|---|---|---|---|
| `ghi` | Incoming solar resource | `ALLSKY_SFC_SW_DWN` | mean of daily values | kWh m⁻² day⁻¹ |
| `t_summer` | Module temperature losses grow with air temperature | `T2M` | mean of June–August daily values | °C |
| `hot_days` | Extreme-heat days for modules and inverters | `T2M_MAX` | count of days with T2M_MAX > 35 °C | days yr⁻¹ |
| `aod` | Aerosol (dust, haze) attenuates sunlight | `AOD_55` | mean of daily values | dimensionless |

The 35 °C threshold matches the hot-day definition already used in the repo (R3, D74). AOD is
atmospheric aerosol optical depth at 550 nm. It is **not** panel soiling and not a PV-output loss.

**Test.** `packages/science/trends.py::trend`: Theil–Sen slope with Gilbert 95 % CI and Mann–Kendall
p (ties-corrected, Hamed–Rao when lag-1 autocorrelation is significant). Benjamini–Hochberg FDR across
the four tests. Outcome states as in `UX_UI_RULES.md`:

- **Supported increase/decrease**: BH q < 0.05 **and** the 95 % CI excludes 0.
- **No robust trend detected**: otherwise.
- **Insufficient evidence**: < 20 complete years.

No window-sensitivity test is run; this is stated as a limitation, so a supported result stays
EXPLORATORY. Slopes are reported per decade. `ghi` is also expressed as % per decade relative to its
2001–2025 mean.

**PV development (descriptive only).** From the GEM February 2026 snapshot: operating PV / Assumed PV
phases inside the cell by reported `start_year` (2000–2025, split explicit vs assumed), pipeline
phases (construction, pre-construction), and the MITECO class at each operating phase point. No trend
test, no MW sum across mixed MWac/MWp bases; outcome **Insufficient evidence** for an installation
trend, for the same reasons as [`JAEN_PV_TREND_STUDY.md`](JAEN_PV_TREND_STUDY.md).

**What the case may not say:** that the climate caused construction, that the place is optimal, any
electricity yield, revenue, 2030/future statement, or that warming is reducing output here.

## 2. Results (run 15 Nov 2026)

Code: [`scripts/build_pv_case_sevilla.py`](../scripts/build_pv_case_sevilla.py) (`--fetch` downloads once;
without it the build is reproduced from the cached response). Output:
[`pv-case-sevilla.json`](../apps/web/public/data/pv-case-sevilla.json) (`schema=pv-case/v1`, `status=EXPLORATORY`),
annual series [`data/results/pv_case_sevilla/annual_series.csv`](../data/results/pv_case_sevilla/annual_series.csv),
raw POWER response `data/raw/power_point/pv_case_sevilla_r20c20_2001-2025.json.gz` (POWER API v2.10.3,
sources reported: MERRA2, SYN1DEG, POWER; point 37.5° N, 5.625° W). Tests: `tests/test_pv_case_sevilla.py`.

### Climate variables, 2001–2025, 25 complete years each

| Variable | Mean | Theil–Sen slope / decade | 95 % CI | p | BH q | Outcome |
|---|---:|---:|---|---:|---:|---|
| GHI (kWh m⁻² day⁻¹) | 5.025 | +0.047 (+0.93 %) | −0.010 to +0.112 (−0.21 to +2.22 %) | 0.097 | 0.097 | No robust trend detected |
| JJA T2M (°C) | 28.10 | +0.49 | −0.01 to +0.95 | 0.053 | 0.096 | No robust trend detected |
| Days T2M_MAX > 35 °C | 76.3 | +5.6 | 0.0 to +11.7 | 0.042 | 0.096 | No robust trend detected |
| AOD 550 nm | 0.166 | −0.009 | −0.020 to +0.001 | 0.072 | 0.096 | No robust trend detected |

No Hamed–Rao correction was triggered. The point estimates lean towards more heat, slightly more sun and
less aerosol, but **none passes the pre-registered FDR rule**. Hot days has nominal p = 0.042, but its
CI touches 0 and q = 0.096, so it is not reported as supported. This agrees with the screening's
MERRA-2 values for the cell (irradiance +0.09 %/decade, not robust; JJA T2M +0.50 °C/decade, CI
0.02–0.96, BH q 0.05, over 2000–2025): no robust trend in sunlight, and a warming signal that sits at
the edge of detectability in a single ~50 km cell.

### PV development (GEM February 2026, descriptive)

- **64** operating PV / Assumed PV phases (26 PV, 38 Assumed PV) at **57** locations; **51** exact points.
- Reported start years: 2007 (1), 2017 (20), 2019 (7), 2020 (10), 2021 (2), 2022 (1), 2023 (8),
  2024 (6), 2025 (7); 2 phases without a year.
- MITECO class at the phase point: class 4 = 42, class 3 = 13, class 2 = 2, class 0 = 7.
- Capacity by basis, never summed: 469.4 MWac, 748.8 MWp/dc, 507.7 MW unknown basis.
- Pipeline: 5 phases under construction, 9 in pre-construction.
- **Installation trend: Insufficient evidence** (inventory, not a census; the 2017 group is catalogue-driven).

### Story that the evidence supports

Seville's countryside is where Spain's register shows the most operating PV phases among the cells that
pass the screening. Sunlight there is high (mean ~5.0 kWh m⁻² day⁻¹ GHI) and shows no robust trend over 25
years. Heat is the variable to watch: summers average 28 °C and about 76 days a year exceed 35 °C, with
upward point estimates that do not yet pass the test. The build-out is shown next to the climate record,
not explained by it.

## 3. Where it appears

Explore → Solar screening panel: a "Case study · Seville countryside" card opens cell `r20c20` (camera
flies there) and the cell card shows `PvCaseStudy` (development chart, four climate variables with
outcome state, limits). The Jaén–Granada case (D80) is unchanged.
