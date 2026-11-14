# Decisions

Status: **LOCKED** (change only by team agreement, recorded here) · **MVP DEFAULT** (use unless a
reason to change is recorded) · **OPEN** (not decided) · **DEFERRED** (after MVP).

Add new decisions at the bottom. Never delete one; mark it superseded.

| # | Decision | Rationale | Status |
|---|---|---|---|
| D1 | Stack: Next.js + TypeScript + Tailwind (web), FastAPI (API), NumPy/xarray/SciPy (science), PostgreSQL + PostGIS, Vercel for web | Team's established architecture | LOCKED |
| D2 | Monorepo: `apps/web`, `services/api`, `packages/science` | One place to review; clear boundaries | LOCKED |
| D3 | Scientific computation only in `packages/science` (Python); API serves results; browser only renders | Traceability, testability; UX rule 14 | LOCKED |
| D4 | Geographic focus: Spain | Challenge framing and local event | LOCKED |
| D5 | Default extent: Peninsula + Balearics bbox `-9.5, 35.9, 4.4, 43.9` | Matches catalog Spain links | MVP DEFAULT |
| D6 | Include Canary Islands | Different climate regime; separate extent/projection | OPEN |
| D7 | Primary environmental variable | Pending dataset validation | OPEN |
| D8 | Primary NASA dataset | Must meet criteria in `DATASETS.md` | OPEN |
| D9 | Trend method (e.g. Mann-Kendall + Sen's slope, seasonal variant, autocorrelation handling) | Must be validated before use | OPEN |
| D10 | "Insufficient evidence" is a valid, displayed result | Scientific honesty | LOCKED |
| D11 | NOAA GHCN-Daily (`data/noaa_ghcnd_spain_daily`) used only for validation, never as the primary source | Event rule: NASA resource required | MVP DEFAULT |
| D12 | Raw downloaded data is not committed; only small curated subsets and provenance metadata | Repo size; reproducibility | MVP DEFAULT |
| D13 | App scaffolding (`create-next-app`, FastAPI app, `pyproject.toml`) created only when implementation is authorized | Event rule: no solution development before 14 Nov 09:00 | LOCKED |
| D14 | PostGIS usage | Only if the MVP needs spatial queries; precomputed files may suffice | OPEN |
| D15 | Multiple variables, forecasting, attribution, user accounts | Out of MVP scope | DEFERRED |
| D16 | Consolidated `data/datasets.md` link list into `docs/DATASETS.md` | Single source of dataset truth | LOCKED |
