# TARO domain ontology

Canonical records live in `apps/web/lib/agent/knowledge/concepts.ts` and `claims.ts`. This page is the curriculum index against **what the repo actually contains**.

Relation kinds are explicit. **Not every edge is causal.**

## Domain coverage vs implementation

| Domain | Curriculum | In Core/TARO today | AETHRA measured? |
|---|---|---|---|
| 01 Earth system | Full conceptual | Partial educational claims | No (context only) |
| 02 Energy meteorology | GHI/DNI/WS/hydro | POWER solar + WS50M via Gate B cards | Resource, not equipment |
| 03 NASA data | POWER, MERRA-2, GPM, GLDAS, MODIS, NEX-GDDP | Cards for MERRA-2 T2M and POWER joint-low; GPM/GLDAS on Trend panel not as Core cards | See `DATASETS.md` classes |
| 04 Statistics | Theil–Sen, MK, BH, CI | Quoted from cards only | Python only |
| 05 PV | Full chain | Temperature–efficiency mechanism (Tier B) | **No** plant model |
| 06 Wind | Power curves, hub height | WS50M caveats | **No** power curve |
| 07 Hydro | Basin → turbine | Precip questions → `NOT_AVAILABLE` | GPM ≠ discharge |
| 08 Other tech | CSP, storage, H2, … | Catalog status: not active modules | None |
| 09 Grid operation | REE, balancing | Educational refusal of blackout claims | **No** system model |
| 10 Markets | OMIE, LCOE, PPA | No ingested series | **No** |
| 11 Spain industry | MITECO, IDAE, CCAA | Five Gate B CCAA + CyL register | CyL register only |
| 12 Geography / development | Lifecycle 1–13 | Pins + D50 scope | No parcel legal layer |
| 13 Complementarity | Resource vs generation vs system value | Gate B resource only; E1 insufficient | Resource coincidence |
| 14 Scenarios | SSP, NEX-GDDP | `unsupported_forecast` | **No** projection artifact |

## Concepts (canonical ids)

`SolarIrradiance` · `PVModuleTemperature` · `WindSpeed50m` · `ClimateTrend` · `JointLowResourceDay` · `CapacityFactor` · `InstalledCapacity` · `ObservedGeneration` · `Runoff` · `ResearchCandidate`

## Required distinctions

- GHI ≠ POA ≠ MWh
- WS50M ≠ hub-height ≠ turbine output  
- MW ≠ MWh ≠ capacity factor
- Precipitation ≠ runoff ≠ discharge ≠ reservoir inflow ≠ hydro MWh
- Resource complementarity ≠ generation complementarity ≠ system value
- Historical 95% CI ≠ forecast interval
- Empty map pixel ≠ available land

## Conflicts recorded (do not silently reconcile)

1. ROADMAP: “do not implement AETHRA Intelligence while P0 boxes are open” vs D65/D68 human waiver for Core/TARO. **P0 review still PENDING.**
2. D23 browser statistics vs ADR-002 / D47 render-only. TARO follows ADR-002.
3. D44 Energy Tech Lab rankings vs AGENTS anti-goals. Judge mode hides them; TARO must not quote them.
4. D53 Python `significant` vs BH screen for rain/runoff. Core does not promote those labels.
5. `ENERGY_RESEARCH.md` §4 still says Gate 1 not passed; D41/D48 say Gate 1 passed. **Use D41/D48 + SCIENTIFIC_REVIEW.**
6. 25 foundational documents named in the TARO brief: **absent**. Do not invent their text.
