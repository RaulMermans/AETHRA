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

## 3. Use Case — Evidence-Based Solar PV Screening (`pv-screening.json`, D80)
**Question it answers:** "For a large solar-panel (photovoltaic) plant, which Spanish zones does the evidence say to look at first, and which not to focus on?" It is a **screening** aid (where to investigate first), not a site approval or investment advice. Answer style: zone colour → why (sunshine, environment, heat) → what to check next.

- **Inputs:** NASA MERRA-2 `M2TMNXRAD SWGDN` (sunlight reaching the ground, monthly, 2000–2025, ~50 km zones, DOI `10.5067/OU3HJDS973O0`); MERRA-2 summer (June–August) `T2M`; MITECO 2024 *Zonificación ambiental para energías renovables — fotovoltaica* (environmental sensitivity: 0 = maximum/not recommended, 1 = very high, 2 = high, 3 = moderate, 4 = low); Global Energy Monitor *Global Solar Power Tracker* (Feb 2026 plant register, CC BY 4.0).
- **Statistics:** Theil–Sen slope + Mann–Kendall (Hamed–Rao when autocorrelated), Benjamini–Hochberg false-alarm control across 195 land zones, alpha 0.05.
- **Pre-registered verdict rule (fixed before results):** *avoid* if sunshine is in Spain's bottom 25 % **or** < 30 % of the zone is MITECO class 3–4; *good* if sunshine ≥ median **and** ≥ 50 % class 3–4 **and** sunshine is not significantly falling; *mixed* otherwise. Heat only informs, never changes the colour.
- **Results:** **46 green, 70 amber, 79 red** zones (51 without enough land). Green: Guadalquivir valley and inland Andalucía, Granada–Almería, inland Murcia/Alicante, La Mancha (Ciudad Real, Albacete, Cuenca), south Madrid–Guadalajara. **None north of 41° N or in the Canaries.**
- **Reality check:** of **36,231 MW** of operating solar plants (GEM register), **47.6 % sit in green zones**, 22.3 % amber, 29.2 % red. Most "red" MW are in Extremadura (Francisco Pizarro 553 MW, Talasol 300 MW): **red there comes from MITECO environmental sensitivity, not lack of sun.**
- **Sunshine trend:** stable — 0 of 195 zones show a significant rise or fall (median −0.19 % per decade). Decision: **plan a 25-year project with the historical average sunshine.** NASA POWER (CERES) and MERRA-2 agree year to year (r = 0.81–0.90 by region); neither shows a significant trend (Andalucía mean: POWER 5.02 vs MERRA-2 5.31 kWh/m²/day).
- **Heat:** summers warm **+0.67 °C per decade** (median), significant in **120 of 195** zones. At a typical panel loss of 0.4 % per °C that is ≈ **−0.27 % output per decade** (indicative). Decision: budget for heat losses; choose heat-tolerant modules and ventilation.
- **Landmarks:** green — Cifuentes-Trillo 626 MW, Mula 494 MW, Olmedilla 222.5 MW, Andasol 1-3 150 MW (CSP), Gemasolar 19.9 MW (CSP), PS10 and PS20 (CSP), Solnova 150 MW (CSP), Extresol 149.8 MW (CSP); amber — Núñez de Balboa 500 MW (48.9 % class 3–4, just under 50 %); red — Francisco Pizarro, Talasol.
- **Featured case — Jaén–Granada zone (`r20c23`, centre 37.5° N, 3.75° W):** sunshine **5.356 kWh/m²/day** (top 5 % of Spain); **86.3 %** of the zone has low/moderate MITECO sensitivity (84.0 % low); sunshine trend +0.04 % per decade (95 % range −0.56 to +1.07 → stable, plan with the average); summer warming +0.79 °C per decade (not significant in this zone). Of the 46 green zones, none beats it on both sunshine and low-sensitivity share. 14 operating solar phases registered in the zone (since 2017). Dust in the air (MERRA-2 `DUEXTTAU`, DOI `10.5067/FH9A0MLJPC7N`): mean **0.056** (2000–2025) — context only: budget panel cleaning and measure soiling on site.

## 4. Spain as a Solar Hub — Official Capacity Trend (`solar-capacity-trend.json`)
- **Source:** Eurostat `nrg_inf_epcrw` (solar photovoltaic net maximum electrical capacity, MW). Capacity = what panels can deliver at full sun, **not** electricity produced.
- **Spain end-2024: 35,823 MW (~36 GW)**, 7.6× the 2015 level (4,710 MW). Growth 2019–2024: **+32.4 % per year** → capacity doubles every **~2.5 years**.
- **Annual additions** (the informative trend): 2019 +4.0 GW, 2020 +1.3, 2021 +3.6, **2022 +10.2 (peak)**, 2023 +5.7, 2024 +6.2 GW. Additions grow **+811 MW per year each year** (2015–2024, 95 % range 300–1,394, p = 0.002, significant). Cumulative trend 2015–2024: +3,457 MW per year (p < 0.001).
- **EU27 2024:** Spain is **2nd** with **11.7 %** of EU solar capacity, after Germany (91.2 GW); Italy 3rd at 35.4 GW (only 0.4 GW behind); France 25.3 GW.
- **Link to the use case:** Spain keeps adding solar fast; the green zones are where NASA evidence says to look first for the next plants.

## 5. State of the Art by Technology (team research, 15 Nov 2026)
- **Solar PV / CSP:** Spanish surface solar radiation rose +3.9 W/m² per decade in 1985–2010 (Sanchez-Lorenzo, Calbó & Wild 2013, *Global and Planetary Change* 100:343-352). Projections show small PV changes in southern Europe (−14 % to +2 % for Europe by 2100, smallest in the south; Jerez et al. 2015, *Nature Communications*, doi:10.1038/ncomms10014). Panels lose ~0.3–0.5 % per °C; extreme Saharan dust episodes cut PV output ~16–20 %. Wet-cooled parabolic-trough CSP uses ~3 m³/MWh of water (tower ~1.5; dry cooling ~0.25 at 3–7.5 % higher cost). Best zones: Extremadura, Guadalquivir valley, La Mancha, Murcia.
- **Hydropower:** concentrated in the north-west (2024: 43.9 % of Galicia's and 32.5 % of Castilla y León's electricity, REE). CEDEX (2017) projects Spanish runoff −3/−7 % (2010–40) to −13/−24 % (2070–2100), largest losses in the south-west; Duero ~−11 % by 2039. Observed flow declines are partly due to irrigation and reforestation (Vicente-Serrano et al. 2019, doi:10.1029/2019GL084084). The Guadalquivir is **not** a hydro case (hydro ≈ 3 % of Andalusian capacity; solar fits there). Landmarks: Aldeadávila 1,139 MW, Villarino, Cortes-La Muela 1,762 MW (pumped storage), Alcántara 915 MW. PNIEC targets ~22.5 GW of storage by 2030.
- **Wind:** Iberian wind "stilling" stopped around 2000 (Utrabo-Carazo et al. 2022, *Atmospheric Research* 272:106153). Projections conflict: CORDEX shows rises in Galicia, Ebro valley and the Strait of Gibraltar (Santos et al. 2018, doi:10.1016/j.apenergy.2018.06.086), CMIP6 shows declines (Andres-Martin et al. 2023, doi:10.1111/nyas.15063). MERRA-2 underestimates Mediterranean wind power ~30 % (Staffell & Pfenninger 2016). Wind is Spain's top source (23.2 % of the 2024 mix, ~32 GW, REE).
- **Water/heat-linked:** the Ebro warms +0.05 °C per year, more below Ascó (Lorenzo-González et al. 2023, doi:10.1016/j.ejrh.2023.101379) — a risk for river-cooled plants. Floating PV cut evaporation 82.4 % in a fully covered south-east Spain irrigation pond (Energy 2025, doi:10.1016/j.energy.2025.138209). Green hydrogen needs ~20–30 L of water per kg.

## 6. Plain-Language Glossary (use when explaining)
- **MW / GW:** installed power — what the panels can give at full sun. 1 GW = 1,000 MW. Not the same as electricity produced over a year (MWh/GWh).
- **kWh/m²/day:** solar energy reaching each square metre per day; more = more production.
- **°C per decade, % per decade:** how much something changes every 10 years.
- **p-value:** probability the change is just chance; below 5 % = proven (significant).
- **95 % range (CI):** where the true change most likely lies; if it includes 0, treat it as stable.
- **Zone (~50 km):** one MERRA-2 grid square; use it to choose where to look, not a parcel.
- **MITECO class:** official environmental sensitivity for large solar plants (0 = not recommended … 4 = low).

## 7. How to Answer Typical Use-Case Questions
- *"Where should I look for a solar plant?"* → green zones (Guadalquivir, Granada–Almería, Murcia, La Mancha, south Madrid–Guadalajara) and the featured Jaén–Granada zone; explain sunshine + MITECO; add heat budgeting; finish with "check separately: grid connection, permits, land, prices".
- *"Why is Francisco Pizarro red?"* → plenty of sun; red because most of its zone is MITECO high/maximum sensitivity.
- *"Is sunshine increasing in Spain?"* → stable since 2000 in all 195 zones: plan with the historical average.
- *"Is Spain a good solar hub?"* → 2nd in the EU, ~36 GW, annual additions growing significantly (+811 MW per year each year).
- *"What about hydro or wind?"* → use §5 (north-west for hydro; wind projections uncertain).
