# AETHRA Intelligence — architecture (spec only)

**Status:** Deterministic core + LLM socket **implemented** (D65, D66). Plug in an OpenAI-compatible
model with `AETHRA_LLM_*`. PostgreSQL, projections and a character face remain DEFERRED.

AETHRA Intelligence is a domain-restricted research assistant. **TARO** is its visible
companion (D69). See `docs/TARO_KNOWLEDGE_ARCHITECTURE.md`. It retrieves approved EvidenceCards and AnalysisBundles. It does not compute
trends, p-values, CIs or significance.

## Intended data flow

1. User question in `/explore`.
2. Deterministic intent resolver (allowlisted intents only). Optional LLM may *propose* an intent;
   a schema validator accepts or rejects it.
3. Typed query against immutable JSON (and later PostgreSQL if authorized).
4. Structured `AgentAnswer` (see `docs/AI_DOMAIN_POLICY.md`).
5. Deterministic template → optional LLM paraphrase, re-validated against the evidence contract.
6. UI may offer actions (`OPEN_EVIDENCE_CARD`, `FLY_TO_REGION`, `SHOW_TIME_SERIES`) only after
   the user confirms. Camera never moves as a side effect of a failed answer.

`services/api/` is a README stub today. Do not add FastAPI solely for a prototype if a Next.js
route that reads `public/data/evidence-cards.json` is enough.

## Security model

System prompt is **not** the control plane. Enforce: intent allowlist, tool allowlist, typed
inputs, evidence-id authorization, structured output validation, claim→evidence mapping,
deterministic fallbacks, prompt-injection tests. Retrieved text and user input are untrusted.

## Implementation status

| Component | Status |
|---|---|
| EvidenceCards / climate-bundle / energy-gap bundle | READY (read-only knowledge) |
| Judge-mode feature flags | READY (D51, D61) |
| Deterministic `POST /api/aethra/ask` | READY |
| Skills / allowlisted tools / session memory | READY |
| OpenAI-compatible LLM adapter | READY, off until env is set |
| Chat UI + vacant face slot | READY |
| Character face / Rive | NOT STARTED |
| PostgreSQL / pgvector | NOT JUSTIFIED for MVP |

First vertical slice: “What is the temperature trend over Peninsula + Balearics?”
must quote Gate A exactly, refuse out-of-domain questions, and return insufficient evidence for
Gate B joint-low trends.

## Plug in an LLM later

Copy `apps/web/.env.example` to `.env.local` and set:

```
AETHRA_LLM_BASE_URL=https://api.openai.com/v1
AETHRA_LLM_API_KEY=...
AETHRA_LLM_MODEL=gpt-4.1-mini
AETHRA_LLM_ENABLE_INTENT=1
AETHRA_LLM_ENABLE_PARAPHRASE=1
```

Any OpenAI-compatible `/chat/completions` host works (OpenAI, Groq, vLLM, Ollama with a compatible
proxy). Restart `next dev`. `GET /api/aethra/status` reports `llm.configured`. If the model is
down or a paraphrase fails the number check, the UI still shows the deterministic EvidenceCard text.

Do not give the model tools outside `retrieve_evidence`, `list_study_regions`, `get_evidence_card`.
Do not let it compute statistics. Face art replaces `AethraCoreFace` only.
