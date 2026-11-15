# Earth System Trend Detective — Spain

*Working title: **GRIDSHIFT** (not a final brand).*
NASA International Space Apps Challenge 2026 (Málaga) · Challenge #02 *Be An Earth System Trend Detective!*

**What it is.** An evidence-first trend investigation tool. A user picks a NASA Earth-science variable and
a region of Spain. The tool shows the real time series, the trend's direction and magnitude with
uncertainty, and whether the trend is statistically supported. Every number links back to its NASA
source on an **EvidenceCard** (provenance). The first application domain we want to explore is clean-energy resources (solar,
wind). That work is a **proposed research track**, not a result yet. See [docs/ENERGY_RESEARCH.md](docs/ENERGY_RESEARCH.md).

## Challenge alignment

| The challenge asks the tool to… | Where we stand (14 Nov 2026, evening) |
|---|---|
| Identify relevant Earth-science variables from NASA data | ✅ MERRA-2 T2M, GPM IMERG, GLDAS on disk, with versions and DOIs |
| Obtain the data for a region | ✅ Spain clip; regional scopes (CCAA / province) in the UI |
| Generate and visualize a time series | ✅ Annual series in `/explore` (Cesium globe + chart) |
| Determine direction and magnitude | ✅ Theil–Sen + 95 % CI in tested Python (`packages/science`); the browser only renders (D47) |
| Evaluate statistical significance | ✅ Mann–Kendall (ties, autocorrelation-checked), BH across regions, window/threshold sensitivity; maps show slope only (BH q stored); NOAA station check (P0-S5); 🟡 regional rain/runoff labels not multiplicity-adjusted (D53) |

**Scientific readiness (14 Nov, ~22:00):** two reproducible AnalysisBundles exist, both pending a
second-person review. Gate A: MERRA-2 air temperature, Peninsula + Balearics, **+0.60 °C/decade (95 % CI
0.31–0.87), supported**. Gate B: NASA POWER solar + wind, **no detectable trend in jointly low days**
(insufficient evidence), and joint lows occur at about half the chance rate every year. See
[data/results/README.md](data/results/README.md). Gates: [docs/ROADMAP.md](docs/ROADMAP.md).

## Start here

| Doc | What it holds |
|---|---|
| [docs/PROJECT.md](docs/PROJECT.md) | Challenge contract, product thesis, MVP vs vision, anti-goals |
| [docs/ROADMAP.md](docs/ROADMAP.md) | P0/P1/P2, gates, owners, cut rules, timeline to submission |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Decision register (statuses, pending approvals) |
| [docs/DATASETS.md](docs/DATASETS.md) | Dataset inventory and readiness classes, NASA POWER candidate |
| [docs/ENERGY_RESEARCH.md](docs/ENERGY_RESEARCH.md) | Pre-registered solar–wind research brief (Gate B) |
| [docs/DEMO_AND_SUBMISSION.md](docs/DEMO_AND_SUBMISSION.md) | Event rules, submission checklist, approved claims, pitch, 7-slide outline |
| [docs/SCIENTIFIC_REVIEW.md](docs/SCIENTIFIC_REVIEW.md) | Technical review of Gate A/B + NOAA check; human sign-off list (PENDING) |
| [docs/UX_UI_RULES.md](docs/UX_UI_RULES.md) | Scientific presentation rules for the UI |
| [docs/TEAM_WORKFLOW.md](docs/TEAM_WORKFLOW.md) | Git workflow |
| [docs/adr/](docs/adr/) | ADR-001 Cesium globe (accepted) · ADR-002 evidence-chain alignment (proposed) |
| [AGENTS.md](AGENTS.md) | Guardrails for AI coding agents |

## Structure

```text
apps/web/          Next.js + TypeScript + Tailwind, CesiumJS globe (ADR-001)
scripts/           Python download + processing; build_climate_bundle.py computes current trends
services/api/      FastAPI (planned; empty) — serves immutable analysis results
packages/science/  NumPy-only trend statistics (Theil–Sen, Mann–Kendall, Hamed–Rao, BH) + tests
data/              Catalogs, processed Spain subsets, provenance metadata
docs/              Project documentation + event reference PDFs
tests/             Evidence-chain, scope/demo-safety and data-file tests (run with .venv/bin/python)
```

## Run

```bash
cp .env.example .env                       # fill in locally; never commit .env
cd apps/web && npm install && npm run dev  # http://localhost:3000 → /explore (judge mode)
# Exploratory Energy Lab / infrastructure layer (research only, never for judging):
# NEXT_PUBLIC_ENABLE_EXPLORATORY=1 npm run dev
```

Rebuilding the climate bundle and downloading data: [scripts/README.md](scripts/README.md).
Web app details: [apps/web/README.md](apps/web/README.md).

## Verify (judge build)

```bash
.venv/bin/python -m pytest -q packages/science tests          # 68 tests: kernels, evidence chain, demo safety, release guards
cd apps/web && npm run typecheck && npm run lint && npm run build
npx next start -p 3518 &                                       # judge build (no NEXT_PUBLIC_ENABLE_EXPLORATORY)
cd ../.. && .venv/bin/python scripts/e2e_judge_path.py --base http://localhost:3518 --out /tmp/e2e --runs 3
cd apps/web && npm run e2e                                    # Playwright: 5 SIMULATED use cases + first screen (docs/SCENARIO_VALIDATION.md)
```

Last full validation: `docs/FINAL_RELEASE_VALIDATION.md` (15 Nov 2026). Submission text:
`docs/SUBMISSION_PACKAGE.md`.

## License

GPL-3.0 — see [LICENSE](LICENSE).
