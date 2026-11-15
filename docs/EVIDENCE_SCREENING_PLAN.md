# Evidence-based screening plan (energy technologies, Spain)

Status: **PLAN, agreed in brainstorming 15 Nov 2026**. Not yet implemented.
Framing: **evidence-based screening**, not investment advice. AETHRA tells an analyst *where to look first and where not to focus* for a given energy technology, based on NASA trend evidence plus the published state of the art. It never says "build here".

## 1. The question the app answers

> "For technology X, which Spanish zones are supported by climate-trend evidence and the literature, and which zones should I not focus on?"

Every zone colour must be backed by (a) our own trend analysis (Theil–Sen slope + Mann-Kendall, CI, significance) and (b) at least one published study or official source.

## 2. Technologies compared (state-of-the-art research, 15 Nov)

| Technology | Published evidence | Our data | Clear yes/no zones | Real landmarks | Decision |
|---|---|---|---|---|---|
| ☀️ **Solar PV + CSP** | Strong: brightening since the 1980s, stable projections, heat losses well quantified | Almost complete: NASA POWER irradiance (5 regions), MERRA-2 air temperature (+0.60 °C/decade, supported), NOAA hot days | Yes: south/west · No: cloudy north | Francisco Pizarro, Núñez de Balboa, Mula, Andasol, Gemasolar, PS10/PS20 | ⭐ **Flagship** |
| 💧 **Hydropower (+ pumped storage)** | Strong (CEDEX 2017, IPCC AR6) | GLDAS runoff, GPM rain; 25 years may give "insufficient evidence"; irrigation also drives flows | Yes: north-west · No: south | Aldeadávila, Villarino, Cortes-La Muela, Alcántara | 🥈 **Contrast case** ("where not") |
| 🌬️ **Wind** | Conflicting (CORDEX vs CMIP6 disagree) | Monthly vector-mean wind is biased low; hourly data needed | Uncertain | Tarifa, La Muela, Sotavento | Context only |
| 🌡️ **Water/heat-linked** (river-cooled nuclear, floating PV, green H2) | Medium (Ebro warming +0.05 °C/yr) | Missing river water temperature | Partial | Ascó, Sierra Brava, Puertollano | Future work |

## 3. Flagship use case

**"Where does solar PV keep performing in a warming climate?"** Focus: Guadalquivir valley and Extremadura.

- **Per-zone metric** (transparent, defined before seeing results):
  `PV yield change (%/decade) ≈ irradiance trend (%/decade) − 0.4 %/°C × temperature trend (°C/decade)`
  - Irradiance: NASA POWER / CERES (5 regions) and MERRA-2 `SWGDN` (grid, to download)
  - Temperature: MERRA-2 `T2M` (summer daytime preferred) + NOAA `TMAX` stations
  - 0.4 %/°C: typical crystalline-silicon PV temperature coefficient (range 0.3–0.5 %/°C)
- **Map:** 🟢 irradiance holds and heat penalty is small · 🟡 mixed / not significant · 🔴 cloudy north or extreme-heat hotspots. Real plants overlaid as landmarks; MITECO environmental-sensitivity zones as the official "where not" mask.
- **Contrast on the same map:** hydropower "where not" (south: Guadalquivir, Guadiana, lower Tajo, Segura) vs north-west.
- **Honesty rules:** "insufficient evidence" is a valid result; no MWh, prices or 2040 values; projections only quoted from literature, never extrapolated by us.

## 4. Key sources (details in the research notes)

- Sanchez-Lorenzo, Calbó & Wild (2013), *Global and Planetary Change* 100:343-352: Spanish solar radiation +3.9 W/m² per decade, 1985-2010.
- Sanchez-Lorenzo et al. (2017), *Remote Sensing of Environment* 189:108-117, doi:10.1016/j.rse.2016.11.018: European surface radiation trends from satellites.
- Jerez et al. (2015), *Nature Communications*, doi:10.1038/ncomms10014: European PV output change −14 % to +2 % by 2100; smallest changes in southern Europe.
- CEDEX (2017), climate-change impact on Spanish water resources: runoff −3/−7 % (2010-40) to −13/−24 % (2070-2100).
- Lorenzo-Lacruz et al. (2012), doi:10.1016/j.jhydrol.2011.11.023, and Vicente-Serrano et al. (2019), doi:10.1029/2019GL084084: observed streamflow decline, partly due to irrigation and reforestation.
- Santos et al. (2018), doi:10.1016/j.apenergy.2018.06.086 · Andres-Martin et al. (2023), doi:10.1111/nyas.15063: Iberian wind projections (conflicting signals).
- Lorenzo-González et al. (2023), doi:10.1016/j.ejrh.2023.101379: Ebro river warming.
- MITECO, *Zonificación ambiental para la implantación de energías renovables*: official environmental-sensitivity map (5 classes).

Research notes (Spanish, working copies): `../research/2026-11-15_estado-arte_{solar,hidroelectrica,eolica,agua-calor-emergentes}.md` in the team workspace.

## 5. Data to fetch

| # | Data | Where | Status |
|---|---|---|---|
| 1 | MERRA-2 surface solar radiation grid (`SWGDN`, product `M2TMNXRAD`), monthly 2000-2026 | NASA Giovanni | ⏳ |
| 2 | Real solar plant locations | Global Energy Monitor, *Global Solar Power Tracker* | ⏳ |
| 3 | Environmental-sensitivity map for PV | MITECO zonificación ambiental | ⏳ |
| 4 | *(optional)* Dust optical depth (`DUEXTTAU`, `M2TMNXAER`) | NASA Giovanni | ⏳ |

## 6. Work split

| Block | Owner | Output |
|---|---|---|
| Data download | Team (+ Claude organises into `data/`) | Items in §5 |
| PV yield metric per zone | Person A | Precomputed bundle, same statistics as Gate A/B |
| Map: zones, landmarks, evidence card, judge-mode visibility | Person B | Screening view |
| TARO knowledge from §4 sources, storytelling, Vercel deployment | Person C | KnowledgeClaims, pitch, public link |

## 7. Open decisions

- Update `PRODUCT_POSITIONING_FINAL.md`: from "no siting" to **evidence-based screening** (where to look first / where not to focus).
- Make the screening view visible in judge mode once validated.
