# Solar PV registry chronology (EXPLORATORY)

This add-on answers a narrow question: **how many currently operating solar PV project phases in the local Global Energy Monitor (GEM) snapshot report each start year?** It does not reconstruct Spain's historical installed capacity, generation or suitability.

## Source and method

- Dataset: Global Energy Monitor, *Global Solar Power Tracker*, February 2026 Spain utility-scale subset (projects ≥ 1 MW), CC BY 4.0. Local input: [`data/gem_solar_spain/gem_solar_spain_utility_2026-02.csv`](../data/gem_solar_spain/gem_solar_spain_utility_2026-02.csv). SHA-256 and the precise CSV filter are recorded in [`pv-history.json`](../apps/web/public/data/pv-history.json).
- `scripts/build_pv_history.py` selects unique `gem_phase_id` rows with `status=operating` and `technology_type` equal to `PV` or `Assumed PV`, counts phases by the reported `start_year`, and splits the two technology labels. The chart covers 2000–2025; one reported 1983 start is listed outside it. A zero means no **registry entry** for that reported year, not zero PV additions in Spain.
- The featured Jaén cell (`r20c23`, 37.25–37.75° N, 4.0625–3.4375° W) is linked by the same point-in-cell rule used by the solar screen. This is a coarse-map association, not a site claim.

## What the snapshot supports

The February 2026 snapshot contains **2,538** operating PV/Assumed PV phases in Spain; **2,470** have a reported start year, **68** do not. The Jaén case cell contains **14** operating phases: **1** labelled PV and **13** Assumed PV, all with reported start years. These counts describe the registry's current entries and make the local case concrete. The historical bars can show how its **reported entries** are distributed over years, but not whether this location was the best place to build.

## Why no significance test or MW trend

The annual registry sequence is not a complete, stable sampling frame. In particular, **all 792 entries labelled 2017 are `Assumed PV`**, and 500 of the 562 entries labelled 2023 are also `Assumed PV`. A trend fit through those counts would risk turning cataloguing patterns into a purported installation trend. The `start_year` field has 68 missing values. GEM capacities mix `MWac`, `MWp/dc` and `unknown`, which must not be summed into an annual capacity series without conversion assumptions. The export therefore contains **no Theil–Sen slope, p-value or significance label**. MW is nameplate capacity, not MWh generation, and no global comparator is present in this repo to establish that Spain is comparatively better than other countries.

For a defensible national PV build-out trend, add an official year-by-year installed-capacity source with a consistent MW basis and revisions, then define the analysis period and test before examining its trend. The present GEM chronology is useful as project context beside the NASA resource and MITECO environmental screen, not as independent proof of an optimal investment destination.
