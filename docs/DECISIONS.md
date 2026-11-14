# Decisions

Status: **CURRENT** (what we're using now — anyone can change it, just update this table) ·
**OPEN** (not decided) · **DEFERRED** (later, if there's time) · **SUPERSEDED** (replaced).

Add new decisions at the bottom; mark replaced ones as superseded.

| # | Decision | Rationale | Status |
|---|---|---|---|
| D1 | Stack: Next.js + TypeScript + Tailwind (web), FastAPI (API), NumPy/xarray/SciPy (science), PostgreSQL + PostGIS if needed, Vercel for web | Team's established architecture | CURRENT |
| D2 | Monorepo: `apps/web`, `services/api`, `packages/science` | One place to review | CURRENT |
| D3 | Heavier analysis usually in `packages/science`; quick computations can live in the API or browser | Flexibility during the hackathon | CURRENT |
| D4 | Geographic focus: Spain (other areas welcome for context/comparison) | Challenge framing and local event | CURRENT |
| D5 | Default extent: Peninsula + Balearics bbox `-9.5, 35.9, 4.4, 43.9` | Matches catalog Spain links | CURRENT |
| D6 | Include Canary Islands | Different climate regime | OPEN |
| D7 | Primary environmental variable | Pick whatever gives the best story | OPEN |
| D8 | Primary NASA dataset | See `DATASETS.md` for candidates | OPEN |
| D9 | Trend method (e.g. Mann-Kendall + Sen's slope) | Pick one and go | OPEN |
| D10 | "Insufficient evidence" is a valid, displayable result | Scientific honesty | CURRENT |
| D11 | NOAA GHCN-Daily (`data/noaa_ghcnd_spain`) usable freely alongside NASA data | Event requires at least one NASA resource; partners complement it | CURRENT |
| D12 | Prefer not committing very large raw files; samples and curated subsets are fine | Repo size | CURRENT |
| D13 | ~~App scaffolding only when implementation is authorized~~ | Development window opened 14 Nov 09:00 | SUPERSEDED by D18 |
| D14 | PostGIS usage | Only if spatial queries need it | OPEN |
| D15 | Multiple variables, forecasting, attribution, user accounts | Nice to have if time allows | DEFERRED |
| D16 | Consolidated `data/datasets.md` link list into `docs/DATASETS.md` | Single dataset list | CURRENT |
| D17 | 3D globe engine: CesiumJS instead of MapLibre GL JS for `/explore` — see [ADR-001](adr/001-cesium-globe.md) | Immersive 3D Earth, terrain, time-dynamic layers | CURRENT (proposed 14 Nov 2026, open to team review) |
| D18 | Project rules relaxed to guidelines; implementation open | Team agreement 14 Nov 2026 to move fast | CURRENT |
| D21 | The `/explore` globe renders **only Spain** — mainland, Balearics, Canarias, Ceuta, Melilla (Cesium `ClippingPolygonCollection`, inverse). Outline = same GISCO NUTS 2021 boundary as D19, simplified ~300 m by `scripts/build_web_boundary.py` → `apps/web/public/data/spain-{boundary,outline}.geojson`. Hover/click outside Spain is ignored. Imagery is only requested inside two boxes (Peninsula+Balearics+Ceuta/Melilla, Canarias — `SPAIN_IMAGERY_EXTENTS`) and the camera is kept inside `CAMERA_BOUNDS`; terrain cannot be limited this way. Does not decide the analysis extent (D5/D6) | Study is about Spain; same boundary as the data clip keeps map and data consistent | CURRENT (14 Nov 2026) |
