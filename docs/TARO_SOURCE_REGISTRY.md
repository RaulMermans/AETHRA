# TARO source registry

Machine copy: `apps/web/lib/agent/knowledge/sources.ts`.

## Tiers

| Tier | Meaning | May support |
|---|---|---|
| **A** | Project scientific / register artifacts | Numerical AETHRA claims |
| **B** | NASA/JRC ATBDs and technical docs | Mechanisms, product caveats |
| **C** | Dated official ES operators/regulators | Only with date + scope; **none ingested except CyL overlay** |
| **D** | Vetted educational | Definitions |
| **E** | Exploratory notes | Labelled EXPLORATORY only |

A model’s parametric memory is **not a tier**.

## Tier A (authoritative for numbers)

- `apps/web/public/data/evidence-cards.json`
- `data/results/*/analysis_bundle.json` and Gate A/B pipelines
- `apps/web/public/data/climate-bundle.json` (Trend panel; Core does not re-aggregate)
- `apps/web/public/data/energy-infrastructure.json` (652 included installations, CyL only, D49)
- `docs/DATASETS.md`, `ENERGY_RESEARCH.md`, `SCIENTIFIC_REVIEW.md`, `DECISIONS.md`

## Tier B (explanations)

- NASA POWER methodology (read 14 Nov 2026)
- MERRA-2 M2TMNXSLV 5.12.4 DOI `10.5067/AP1B0BA5PD2K`
- JRC PVGIS methodology (PV thermal/performance **education**, not a plant run)
- `docs/FUTURE_CLIMATE_PROJECTIONS.md` (candidate NEX-GDDP; unused)

## Tier C (operating / legal — stale unless dated)

Red Eléctrica, ESIOS, REData, CNMC, OMIE, BOE, MITECO, IDAE, CCAA registries, ENTSO-E. **Not in the retrieval index.** TARO must not quote live capacity, prices, or permits as facts.

Exception: Junta de Castilla y León `energia_cyl_renov_instal_polig` as already ingested (IGCYL, info dates 2024-06-19 → 2025-11-18).

## Freshness / update rules

1. Register source, owner, URL, date, version, licence.
2. Do not crawl the web into Tier A/B.
3. Invalidate answers when the bundle SHA or card export changes.
4. Never rewrite historical scientific conclusions in place.
5. CyL count is tested against `counts.installations` (`tests/test_aethra_agent.py`).
