# Solar PV screening: featured Jaén–Granada cell (15 Nov 2026)

**EXPLORATORY editorial case, selected after viewing the results.** This is a concrete example of where to investigate next, not a finding that a parcel is suitable, the best site in Spain, or an investment recommendation. The original green/amber/red rule and its thresholds remain unchanged (contract `research/2026-11-15_pv-screening-contrato.md` in the parent workspace; implemented in `scripts/build_pv_screening.py`).

## Problem and proposed use

An analyst looking for a large solar PV project sees many sunny areas. Sunshine alone misses the environmental screen, while a green environmental class says nothing about grid capacity or legal availability. AETHRA puts historical NASA resource context and the MITECO map on the same **~50 km MERRA-2 cell** so the team can choose where to commission detailed site work first.

## Why show this cell

The selected cell is `r20c23`, centred at 37.5° N, 3.75° W in Jaén province, but its bounds cross both Jaén and Granada. The exact values and comparisons are exported in `apps/web/public/data/pv-screening.json` under `cells` and `featured_case` by `scripts/build_pv_screening.py`:

- Mean incoming shortwave flux, 2000–2025: **5.356 kWh/m²/day** (MERRA-2 `SWGDN`, 95th percentile among eligible Spanish cells). This is horizontal incoming radiation, **not** PV electricity.
- MITECO 2024 sensitivity: **86.3%** of classified ~1 km pixels within this ~50 km cell are class 3 (moderate) or 4 (low); **84.0%** are class 4. The percentage is mapped area, not developable area or an approval.
- It passes the frozen `good` screening rule. The irradiance trend of +0.04% per decade has a 95% CI of −0.56 to +1.07% per decade and is **not robust after FDR**. Do not say sunlight is rising here.
- Across the **46 green cells**, five have more irradiance and four have a larger class-3/4 share. None matches or beats this cell on **both** mapped measures. These are descriptive, post-hoc comparisons; another cell may be preferable once parcel, grid, ownership, slope, biodiversity and permits are checked.

The MITECO classes run from 0 (maximum sensitivity, not recommended) to 4 (low). The rasters used here were majority-resampled from 25 m originals to 0.01° (~1 km), then the class shares were counted inside the MERRA-2 cell. Thus **86.3% does not mean that 86.3% can be built on**. It only says the coarse screening map assigns those pixels low or moderate environmental sensitivity. A local environmental impact assessment and current regulations still apply.

NASA MERRA-2 is a reanalysis, with native 0.5° × 0.625° support; DOI [10.5067/OU3HJDS973O0](https://doi.org/10.5067/OU3HJDS973O0). MITECO source and transformation: [`data/miteco_pv_sensitivity_2024/`](../data/miteco_pv_sensitivity_2024/README.md). The registered plant markers are contextual evidence from GEM February 2026, not a suitability test. The MERRA-2 dust source provides a separate **exploratory** atmospheric dust AOT mean of 0.055952 (dimensionless, 2000–2025, 26 complete years) in [`giovanni-dust.json`](../apps/web/public/data/giovanni-dust.json); dust is not a factor in this PV verdict and cannot estimate module soiling. The [GEM chronology](JAEN_PV_TREND_STUDY.md) describes reported start years without an inferential trend. [IGN geographic references](JAEN_PLACES.md) locate the cell but do not identify buildable parcels.
