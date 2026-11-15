# AETHRA — Earth System Trend Detective for Spain

[![CI](https://github.com/rorro6787/nasa-project-spain/actions/workflows/ci.yml/badge.svg)](https://github.com/rorro6787/nasa-project-spain/actions/workflows/ci.yml)

NASA International Space Apps Challenge 2026 (Málaga) · Challenge #02 *Be An Earth System Trend Detective!*

**AETHRA turns NASA Earth data into traceable evidence about how Spain's environment has actually
changed, region by region, with the uncertainty and the sources attached, starting with the conditions
behind solar energy.** When the data support a trend, AETHRA shows it. When they don't, it says
*insufficient evidence* instead of guessing.

> **Status:** all results are **EXPLORATORY until independent scientific review**
> ([docs/SCIENTIFIC_REVIEW.md](docs/SCIENTIFIC_REVIEW.md) §5). AETHRA does not forecast, rank
> investment sites or estimate electricity production.

| | |
|---|---|
| 🎬 30 s videos (captioned, transcripts) | [docs/release/2026-11-15/video/](docs/release/2026-11-15/video/) |
| 🖥️ 7-slide deck | [presentation/](presentation/) · [docs/release/2026-11-15/deck/](docs/release/2026-11-15/deck/) |
| 📝 Project page text, data citations, AI disclosure | [docs/SUBMISSION_PACKAGE.md](docs/SUBMISSION_PACKAGE.md) |
| 🧭 Live demo path for judges | [docs/JUDGE_EXPERIENCE.md](docs/JUDGE_EXPERIENCE.md) |

## How it answers the challenge

| The challenge asks the tool to… | AETHRA |
|---|---|
| Identify relevant Earth-science variables | NASA MERRA-2 air temperature, NASA POWER daily solar (CERES SYN1deg) and 50 m wind (MERRA-2), GPM IMERG precipitation, GLDAS runoff, with versions and DOIs |
| Obtain data for a region | Spain, Autonomous Communities (NUTS-2) and provinces (NUTS-3), plus a native-cell PV screening grid |
| Generate and visualize a time series | Annual series and trend maps on a CesiumJS globe (`/explore`) |
| Determine direction and magnitude | Theil–Sen slope with a 95 % confidence interval |
| Evaluate statistical significance | Mann–Kendall (ties, autocorrelation checked), Benjamini–Hochberg across regions, window sensitivity, comparison with 64 NOAA stations |

Statistics are computed in tested Python ([packages/science](packages/science)); the browser only
renders them. Every result is an **EvidenceCard**: variable, units, region, period, slope and interval,
method, NASA source and a "do not conclude" line.

## Results

Wording approved in [docs/DEMO_AND_SUBMISSION.md](docs/DEMO_AND_SUBMISSION.md); each traces to a recorded file.

1. **Temperature (supported).** In NASA's MERRA-2 reanalysis, annual near-surface air temperature over
   Peninsular Spain and the Balearics rose by about **0.6 °C per decade** from 2000 to 2025 (95 % CI
   0.31–0.87 °C per decade; Theil–Sen with Mann–Kendall, p < 0.001; 26 complete years).
   — [`data/results/gate_a_temperature/analysis_bundle.json`](data/results/gate_a_temperature/analysis_bundle.json)
2. **External station comparison** (not claimed independent). All 64 long-record NOAA weather stations
   we compared show a positive trend (significant at 57), and for 53 of them the station trend is within
   0.2 °C per decade of the reanalysis cell around it.
   — [`data/results/noaa_validation/analysis_bundle.json`](data/results/noaa_validation/analysis_bundle.json)
3. **Solar + wind (honest null).** We found **no detectable change** in how often solar and wind
   resources are low on the same day (Peninsula + Balearics, 2001–2025: 0.0 days per decade, 95 % CI
   −1.8 to +2.2). The result is *insufficient evidence* in all five pre-registered regions.
   — [`data/results/energy_gap/analysis_bundle.json`](data/results/energy_gap/analysis_bundle.json)

**Solar PV screening (EXPLORATORY).** A map of 246 grid cells that tells an analyst *where to look
first* for utility-scale PV, using NASA irradiance, its trend, and MITECO environmental-sensitivity
classes, with a verdict rule fixed before the results were seen (`pv-screening/v1`). Registered plants
from the Global Energy Monitor tracker are shown for context only. It is screening, not investment
advice. Details: [docs/EVIDENCE_SCREENING_PLAN.md](docs/EVIDENCE_SCREENING_PLAN.md),
[docs/PV_SEVILLA_CASE.md](docs/PV_SEVILLA_CASE.md), [docs/PV_HISTORY.md](docs/PV_HISTORY.md).

**TARO** is the in-app research companion. It is rule-based (no LLM in the judge build) and answers
from published EvidenceCards ([docs/TARO_KNOWLEDGE_ARCHITECTURE.md](docs/TARO_KNOWLEDGE_ARCHITECTURE.md)).

## Data

| Product | Role |
|---|---|
| NASA MERRA-2 M2TMNXSLV v5.12.4, T2M ([doi:10.5067/AP1B0BA5PD2K](https://doi.org/10.5067/AP1B0BA5PD2K)) | Temperature trend |
| NASA POWER daily v2.10.3 (ALLSKY_SFC_SW_DWN from CERES SYN1deg; WS50M from MERRA-2) | Daily solar and wind resource |
| NASA GPM IMERG Final V07 monthly ([doi:10.5067/GPM/IMERG/3B-MONTH/07](https://doi.org/10.5067/GPM/IMERG/3B-MONTH/07)) | Rain context maps (EXPLORATORY) |
| NASA GLDAS Noah v2.1 monthly ([doi:10.5067/SXAVCZFAQLNO](https://doi.org/10.5067/SXAVCZFAQLNO)) | Modelled runoff context (EXPLORATORY) |
| NOAA GHCN-Daily | Station comparison for MERRA-2 temperature |
| Eurostat GISCO NUTS 2021 · MITECO PV sensitivity 2024 · GEM Global Solar Power Tracker | Boundaries, environmental sensitivity, plant register |

Full inventory, readiness and provenance: [docs/DATASETS.md](docs/DATASETS.md). Globe imagery credits
(NASA GIBS, EOX Sentinel-2 cloudless, Esri, Cesium) are shown in the app.

## Run it

Requires Node 20+ (Node 22.6+ for the TARO policy test) and Python 3.11.

```bash
cd apps/web
npm ci
npm run dev        # http://localhost:3000/explore  (judge mode)
```

`.env` is optional for the app (copy `.env.example`; only data downloads need Earthdata credentials).
The research build with the exploratory Energy Lab is `NEXT_PUBLIC_ENABLE_EXPLORATORY=1 npm run dev`;
it is never used for judging. Rebuilding data: [scripts/README.md](scripts/README.md).

## Verify

```bash
python3.11 -m venv .venv && .venv/bin/pip install -r requirements-test.txt
.venv/bin/python -m pytest -q packages/science tests     # statistics kernels, evidence chain, demo safety, release guards
cd apps/web && npm run typecheck && npm run lint && npm run build
npm run e2e                                              # Playwright: simulated use cases (docs/SCENARIO_VALIDATION.md)
```

[CI](.github/workflows/ci.yml) runs pytest and the web typecheck, lint and judge build on every push
and PR. It skips two tests that need gitignored raw data (`test_miteco_cvd_pngs_match_rasters`,
`test_numbers_reproducible_for_sample_cells`); run those locally after downloading the data. Ruff is
advisory. Last full release validation: [docs/FINAL_RELEASE_VALIDATION.md](docs/FINAL_RELEASE_VALIDATION.md).

On Windows use `.venv\Scripts\python.exe`. Line endings are pinned by `.gitattributes`, so data-file
SHA-256 values match on every OS.

## Repository

```text
apps/web/          Next.js + TypeScript + CesiumJS globe, EvidenceCards, TARO (app)
packages/science/  NumPy trend statistics (Theil–Sen, Mann–Kendall, Hamed–Rao, BH) + tests
scripts/           Data download, processing and export (every output records its provenance)
data/              Processed Spain subsets, analysis bundles (data/results), provenance metadata
tests/             Evidence chain, demo safety, release guards, accessibility
docs/              Project, decisions (DECISIONS.md), datasets, scientific review, submission
docs/release/      Screenshots, deck, captioned videos and validation runs of 15 Nov 2026
presentation/      HTML pitch deck and logo kit
experiments/taro/  TARO avatar experiments (not part of the app build)
services/api/      Placeholder, not used (results are served as static files)
```

Key docs: [PROJECT](docs/PROJECT.md) · [DECISIONS](docs/DECISIONS.md) · [DATASETS](docs/DATASETS.md) ·
[SCIENTIFIC_REVIEW](docs/SCIENTIFIC_REVIEW.md) · [UX_UI_RULES](docs/UX_UI_RULES.md) ·
[ACCESSIBILITY](docs/ACCESSIBILITY.md) · [TEAM_WORKFLOW](docs/TEAM_WORKFLOW.md) ·
[AGENTS.md](AGENTS.md) (rules for AI coding agents). Event reference material: [docs/reference/event/](docs/reference/event/).

## AI use

Code and documentation were written with an AI coding assistant (Anthropic Claude via Claude Code),
directed and reviewed by the team. Scientific definitions were fixed in `docs/` before results were
computed, and every number comes from tested Python, not from a model. The video voice-overs are
synthetic (Kokoro-82M TTS). Full disclosure: [docs/SUBMISSION_PACKAGE.md](docs/SUBMISSION_PACKAGE.md) §4.

## License

GPL-3.0, see [LICENSE](LICENSE). Third-party data keep their own licences (see [docs/DATASETS.md](docs/DATASETS.md)).
