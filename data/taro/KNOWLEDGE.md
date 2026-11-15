# TARO — Curated Domain & Scientific Knowledge Base

## 1. Validated & Precomputed AETHRA Evidence

### Gate A — Near-Surface Air Temperature (`gate-a-temperature-R0`)
- **Dataset:** NASA MERRA-2 `M2TMNXSLV v5.12.4` (`T2M`, 2 m air temperature, reanalysis, `0.5° × 0.625°`, DOI `10.5067/AP1B0BA5PD2K`).
- **Extent:** Peninsula + Balearics (`age`), area-weighted (`cos φ × cell fraction`). Canary Islands (`ES70`) are a separate climate regime and not averaged into the headline.
- **Period:** `2000–2025` (`n = 26` complete calendar years).
- **Result:** **Supported increase** (`+0.60 °C per decade`, 95% CI `+0.31 to +0.87 °C per decade`, `p = 0.0004`, Mann–Kendall + Theil–Sen + Gilbert CI).
- **Window sensitivity:** Positive across all 6 tested windows (`+0.41 to +0.83 °C/decade`).
- **External station comparison (`P0-S5`):** Compared against 64 paired NOAA GHCN-Daily stations (`2001–2025`): `64/64` agree in warming sign, median slope difference `+0.004 °C/decade`, median Pearson `r = 0.934` (`53/64` within `±0.2 °C/decade`). Not claimed strictly independent because MERRA-2 assimilates land surface observations.

### Gate B — Joint Low Solar + Wind Resource Days (`energy-gap-*`)
- **Datasets:** NASA POWER daily `ALLSKY_SFC_SW_DWN` (CERES SYN1deg Ed4.2, `1° × 1°`) and `WS50M` (MERRA-2 50 m wind, `0.5° × 0.625°`).
- **Period:** `2001–2025` (`n = 25` complete years; starts in 2001 to avoid the SRB→SYN1deg break, ends in 2025 to exclude FLASHFlux/GEOS-IT).
- **Definition (`E1`):** Days per year when *both* daily solar insolation and daily mean 50 m wind speed fall below their own monthly 20th percentile (`2001–2020` reference).
- **Results (5 pre-registered scopes, BH FDR adjusted):** **Insufficient evidence** in all 5/5 regions:
  - **Peninsula + Balearics (`energy-gap-R0`):** `0.00 days/decade` (95% CI `-1.85 to +2.16`, `p = 0.759`, median `8.0 days/yr`, complementarity ratio `0.50`).
  - **Galicia (`energy-gap-ES11`):** `-0.87 days/decade` (95% CI `-2.92 to +1.33`, `p = 0.438`, median `7.0 days/yr`, complementarity ratio `0.51`).
  - **Castilla y León (`energy-gap-ES41`):** `0.00 days/decade` (95% CI `-1.55 to +1.67`, `p = 0.794`, median `7.0 days/yr`, complementarity ratio `0.43`).
  - **Aragón (`energy-gap-ES24`):** `+0.52 days/decade` (95% CI `-1.88 to +2.50`, `p = 0.638`, median `11.0 days/yr`, complementarity ratio `0.79`).
  - **Andalucía (`energy-gap-ES61`):** `+0.00 days/decade` (95% CI `-1.43 to +1.76`, `p = 0.814`, median `6.0 days/yr`, complementarity ratio `0.55`).
- **Descriptive Complementarity:** Across studied regions, joint solar+wind low days occur at roughly half (`0.43–0.79×`) the rate expected if solar and wind were statistically independent (year-shift surrogate null model).

### Precomputed Regional Scopes (`climate-bundle.json`, D46/D53/D64)
- Contains precomputed Python Theil–Sen trends for **all 19 CCAA and 52 Spanish provinces** (official Eurostat GISCO NUTS-3 2021 boundaries) across:
  - **Temperature (`MERRA-2 T2M`, 2000–2025):** `72/72` scopes hold after Benjamini–Hochberg (`BH`) multiplicity control.
  - **Precipitation (`GPM IMERG Final Run V07B`, 2000–2024):** Satellite-gauge precipitation (`0.1°`). Regional trends do not survive BH FDR (`6 → 0`), so regional precipitation outcomes are labelled **EXPLORATORY — multiplicity unadjusted** (D53/D60).
  - **Modelled Runoff (`GLDAS Noah v2.1`, 2000–2025):** Land-surface model runoff (`0.25°`), *not* gauged river discharge. Regional trends are also **EXPLORATORY — multiplicity unadjusted**.

## 2. Core Physical & Statistical Mechanisms
- **PV Cell Temperature vs Air Temperature:** Photovoltaic modules lose conversion efficiency as cell temperature rises, but cell temperature depends on plane-of-array (`POA`) irradiance, wind cooling, mounting, and module thermal coefficients—not just MERRA-2 2 m air temperature (`T2M`). Historical warming does not prove lower PV generation (`MWh`).
- **GHI vs DNI vs POA:** `GHI` is global horizontal irradiance (`ALLSKY_SFC_SW_DWN` is horizontal all-sky shortwave). `DNI` is direct normal irradiance (needed for CSP). `POA` is irradiance on the tilted panel surface. Higher GHI in southern Spain does not automatically mean more electricity without accounting for temperature, clipping, curtailment, and grid access.
- **Wind Power Curves:** Turbine output follows a non-linear power curve (cut-in ~3–4 m/s, near-cubic ramp, rated power, cut-out ~25 m/s). Regional daily mean `WS50M` cannot be multiplied into `MWh` because hub height, air density, wake losses, and sub-daily gusts are not in the 50 km grid.
- **Rain vs Hydropower:** Less GPM rainfall does not directly translate into less hydropower `MWh`. Snowpack, evapotranspiration, reservoir storage rules, hydraulic head, and environmental flows sit in between.
- **Theil–Sen vs OLS & Autocorrelation:** Theil–Sen takes the median of all pairwise slopes (robust to outliers), paired with Gilbert 95% confidence intervals and Mann–Kendall tests. Positive lag-1 serial autocorrelation reduces the effective sample size (`n_eff < n`), which AETHRA accounts for via Hamed–Rao variance correction (`floored at 1`, D42).
- **Spanish Electricity Context:** Red Eléctrica (`REE`) is the TSO; `OMIE` runs the wholesale market; `CNMC` is the regulator; `MITECO` / `IDAE` handle energy policy. The Castilla y León register layer (`652` operating wind/PV facilities from PRETOR/JCYL) records installed capacity (`MW`), never generation (`MWh`).
