# Knowledge and memory (spec only)

**Status:** Session memory READY in-process (D66). PostgreSQL / pgvector still DEFERRED.

## Authoritative sources already in the repo

| Record | Location | Role |
|---|---|---|
| AnalysisBundle | `data/results/*/analysis_bundle.json`, `apps/web/public/data/climate-bundle.json` | Statistics |
| EvidenceCard | `apps/web/public/data/evidence-cards.json` | Claims shown to users |
| GeographicRegion | `spain-admin.json`, GISCO NUTS | Scope |
| EnergyInstallation | `energy-infrastructure.json` | CyL register metadata |
| ResearchCase | `energy-research-cases.ts` (editorial) + Python bundles (numbers) | Framing |

Do not duplicate canonical numbers in a vector index. D62 tests keep editorial copies honest.

TARO curated knowledge (definitions and mechanisms only) lives in
`apps/web/lib/agent/knowledge/`. Tier A numbers still come only from EvidenceCards and bundles.

## When (not) to use pgvector

Only if we must retrieve *unstructured documentation* (ATBDs, caveats). Never for slopes, p-values
or plant MW. Every chunk keeps source, version, section, citation, retrieval date, license.

Do not fine-tune a model on our datasets to “remember” facts.

## Memory kinds

- **Scientific knowledge** — versioned files / future DB. Permanent.
- **Session memory** — selected region, variable, year, case, recent turns. Not evidence.
- **Personal preferences** — deferred; needs consent and deletion.

Proposed relational entities (SourceSnapshot, AnalysisBundle, EvidenceCard, GeographicRegion,
EnergyInstallation, ResearchCase) wait until a backend is authorized. FastAPI is a stub today.
