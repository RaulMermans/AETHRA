# Earth System Trend Detective — Spain

NASA Space Apps Challenge 2026 (Málaga) · *Be An Earth System Trend Detective!*

Explore what changed in Spain's environment — where, when, how much, and whether the change is
statistically significant — using NASA Earth observation data, with full provenance.

**Status:** implementation in progress — see [docs/ROADMAP.md](docs/ROADMAP.md).

## Start here

1. [docs/PROJECT.md](docs/PROJECT.md) — challenge, rules, scope, MVP
2. [docs/TEAM_WORKFLOW.md](docs/TEAM_WORKFLOW.md) — Git workflow
3. [docs/DECISIONS.md](docs/DECISIONS.md) — current vs open decisions
4. [docs/DATASETS.md](docs/DATASETS.md) — candidate NASA datasets
5. [docs/UX_UI_RULES.md](docs/UX_UI_RULES.md) — UI guidelines
6. [AGENTS.md](AGENTS.md) — guidelines for AI coding agents

## Structure

```text
apps/web/          Next.js + TypeScript + Tailwind, CesiumJS globe, ECharts (frontend, Vercel)
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

Web app: see [apps/web/README.md](apps/web/README.md).

## License

GPL-3.0 — see [LICENSE](LICENSE).
