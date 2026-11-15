# ☀️ Real solar plants in Spain (Global Energy Monitor, Feb 2026)

**What it is:** every **utility-scale (≥ 1 MW)** solar project in Spain from the *Global Solar Power Tracker* (Global Energy Monitor, February 2026): location, size, technology and status. We use it as **landmarks** on the map and to **validate** the screening (do real plants sit where our evidence says "good"?).

| | |
|---|---|
| File | `gem_solar_spain_utility_2026-02.csv` (3,990 projects) |
| Original | `Global-Solar-Power-Tracker-February-2026.xlsx`, kept in `data/raw/gem/` (not in Git) |
| Licence | Global Energy Monitor, CC BY 4.0 (cite GEM) |

## Main columns

| Column | Meaning |
|---|---|
| `project_name`, `phase_name` | Plant name |
| `capacity_mw` | Size in megawatts |
| `technology_type` | `PV`, `Assumed PV` (probably PV) or `Solar Thermal` (CSP) |
| `status` | `operating`, `construction`, `pre-construction`, `announced`, `shelved`, `cancelled`… |
| `latitude`, `longitude`, `location_accuracy` | Position; `exact` or `approximate` |
| `state_province` | Autonomous community |
| `miteco_pv_sensitivity_class` | **Added by us:** MITECO class at the plant's point (0 = not recommended … 4 = low), see `../miteco_pv_sensitivity_2024/` |

## Facts hidden in here 🔍 (operating plants)

- **2,591 operating plants, ~36.2 GW**; 1,082 more in pre-construction.
- Top regions: Extremadura 9.3 GW · Andalucía 8.9 GW · Castilla-La Mancha 8.1 GW · Aragón 2.9 GW · Castilla y León 2.7 GW · Murcia 2.0 GW.
- Biggest: Cifuentes-Trillo 626 MW, Francisco Pizarro 553 MW, Núñez de Balboa 500 MW, Mula 494 MW.
- By MITECO class: **43 % of operating MW in low-sensitivity zones**, **22 % (~7.9 GW) in "maximum / not recommended" zones**. Many plants predate the map (2020/2024), 38 % of locations are approximate and the map was resampled to ~1 km, so treat this as indicative.
