# Featured solar cell: installation chronology (EXPLORATORY)

## Question and spatial support

What does the local project register say about **reported start years** of operating photovoltaic phases inside the featured NASA MERRA-2 grid cell? The cell `r20c23` has bounds **37.25–37.75° N, 4.0625–3.4375° W** (0.5° × 0.625°); its centre, **37.5° N, 3.75° W**, lies in Jaén. **The cell also includes Granada.** A project point anywhere inside these bounds is counted. This is a grid-cell association, not a cadastral parcel or evidence of buildability.

## Source, method and exact counts

Input: Global Energy Monitor (GEM), *Global Solar Power Tracker*, February 2026 Spain utility-scale snapshot (projects ≥ 1 MW), local [`gem_solar_spain_utility_2026-02.csv`](../data/gem_solar_spain/gem_solar_spain_utility_2026-02.csv), SHA-256 `7bad769602dd5095eba0447a8ec5f4b8fe57f9256115d2c6833a829ec246c272`. Code: [`scripts/build_pv_history.py`](../scripts/build_pv_history.py). Published result: [`pv-history.json`](../apps/web/public/data/pv-history.json), `schema=pv-history/v1`, `status=EXPLORATORY`.

The script counts unique `gem_phase_id` entries with `status=operating` and `technology_type=PV` or `Assumed PV`, assigns them to the cell by their reported point, and groups by `start_year`. **Unit: registered operating project phases, not plants, MW, MWh or annual construction permits.** All 14 cell entries have a reported year; 13 are labelled `Assumed PV` and only one explicitly `PV`. The 14 phase IDs are distinct. GEM marks 13 points `exact` and one `approximate`; a reported point's precision is not a parcel survey. The 13 `Assumed PV` records use MWac ratings and the one explicit PV record MWp/dc, so their capacities should not be added as one homogeneous MW series.

| Reported start year | PV | Assumed PV | Total cell entries | Cumulative entries with reported year by then |
|---:|---:|---:|---:|---:|
| 2017 | 0 | 4 | 4 | 4 |
| 2021 | 0 | 1 | 1 | 5 |
| 2022 | 1 | 1 | 2 | 7 |
| 2023 | 0 | 5 | 5 | 12 |
| 2024 | 0 | 1 | 1 | 13 |
| 2025 | 0 | 1 | 1 | 14 |

The 2000–2025 chart includes zero entries in the other listed years. **Zero means no current GEM phase in this cell carries that start year**, not that no solar installation existed in those years. The 2026 snapshot cannot reconstruct plants that closed, changed identity or are absent from its utility-scale coverage. The national extract has 2,538 operating PV/Assumed PV phases, of which 2,470 have a reported start year and 68 do not; the 2017 national group comprises 792 phases, **all** `Assumed PV`.

## Trend assessment

**Outcome: insufficient evidence for an inferential installation trend in this cell.** This verdict is exported as `featured_cell.trend_assessment` in `pv-history.json`, with `slope_per_year`, `ci95` and `p_value` explicitly null. No Theil–Sen slope, confidence interval, Mann–Kendall p-value or significance label is computed from this series. Four reasons are material:

1. Only **14** currently listed phases contribute, concentrated in six reported years; the apparent upward staircase is a cumulative count of a fixed inventory and therefore increases by construction.
2. **13 of 14** cell entries have inferred PV technology. A start-year count from a current tracker has unknown year-specific capture and survival rates, so a 2017-to-2025 difference mixes commissioning with cataloguing.
3. The cell crosses **Jaén and Granada**. Its centre in Jaén does not make every installation a Jaén installation.
4. The dataset is a project-phase registry, not an official annual installed-capacity census; mixed MWac/MWp ratings and unknown project coverage rule out a defensible MW growth or generation claim.

The chart can **describe** that the February 2026 register contains 4 cell phases labelled 2017 and 14 with reported start years through 2025. It cannot show that the place is Spain's best PV location, that its solar resource caused construction, or that any specific parcel should host a new plant. A defensible trend study would need an annual, consistently defined census for the same area (including closures and revisions), verified commissioning dates, one capacity basis, and a method specified before testing. The current MERRA-2 irradiance/MITECO screening and the GEM chronology answer different questions; keeping them separate is the product value.

## Usable case narrative

The Jaén–Granada cell is an **illustrative investigation target**: mapped incoming solar resource is high (MERRA-2 mean 5.356 kWh/m²/day in 2000–2025), and 86.3% of classified MITECO pixels are low or moderate sensitivity (2024). The GEM snapshot provides context that operating PV phases are registered in the broad cell and reports their start years. Those three sources justify **further parcel-level study**, not a site decision. Before any development claim, check dust deposition/soiling, current ecology, terrain, ownership, grid connection and permits at actual candidate parcels. See [`PV_FEATURED_CASE.md`](PV_FEATURED_CASE.md) for the screening comparison and its provenance.
