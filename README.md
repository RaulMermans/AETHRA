# Earth System Trend Detective — Spain

NASA Space Apps Challenge 2026 (Málaga) · *Be An Earth System Trend Detective!*

Explore what changed in Spain's environment — where, when, how much, and whether the change is
statistically significant — using NASA Earth observation data, with full provenance.

**Status:** foundation only. No product code yet — see [docs/ROADMAP.md](docs/ROADMAP.md).

## Start here

1. [docs/PROJECT.md](docs/PROJECT.md) — challenge, rules, scope, MVP
2. [docs/TEAM_WORKFLOW.md](docs/TEAM_WORKFLOW.md) — Git rules (mandatory)
3. [docs/DECISIONS.md](docs/DECISIONS.md) — what is locked vs open
4. [docs/DATASETS.md](docs/DATASETS.md) — candidate NASA datasets
5. [docs/UX_UI_RULES.md](docs/UX_UI_RULES.md) — UI rules (mandatory)
6. [AGENTS.md](AGENTS.md) — rules for AI coding agents

## Structure

```text
apps/web/          Next.js + TypeScript + Tailwind, MapLibre, ECharts (frontend, Vercel)
services/api/      FastAPI — serves analysis results
packages/science/  NumPy / xarray / SciPy — all scientific computation
data/              Catalogs, sample datasets, provenance metadata
docs/              Project documentation + event reference PDFs
tests/             Cross-component and scientific validation tests
```

## Setup

```bash
cp .env.example .env   # fill in locally; never commit .env
```

Per-component setup is added when implementation starts (see `docs/DECISIONS.md` D13).

## License

GPL-3.0 — see [LICENSE](LICENSE).
