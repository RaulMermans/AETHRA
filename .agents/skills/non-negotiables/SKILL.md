---
name: non-negotiables
description: >-
  The short list of rules this project cannot break and still succeed: the hard stops for
  science, claims, product scope, demo and submission, and team safety. Use at the start of any
  task, before any commit, before writing any claim (UI text, README, slides, pitch, project
  page), and whenever something feels like a shortcut. Includes a claim-review checklist. If a
  request conflicts with a rule here, stop and ask the human; don't work around it.
---

# Non-Negotiables

These rules decide whether the project succeeds. Each one comes from `AGENTS.md`, `PROJECT.md`,
`ROADMAP.md`, `UX_UI_RULES.md` or `DEMO_AND_SUBMISSION.md`. **When a request conflicts with
one, stop, name the rule and ask the human.** Don't look for a workaround.

## 1. Science

1. **Every number has provenance:** dataset, version/DOI, variable, units, period, spatial
   support, method.
2. **Statistics live in tested Python** (`packages/science`). The browser renders and never
   computes or re-aggregates slopes, CIs, p-values or significance.
3. **Never silently change** a dataset, version, variable, baseline, period, extent, threshold,
   event definition or trend method. Ask first, then record it in `docs/DECISIONS.md`.
4. **No p-hacking.** Don't change thresholds or tests after seeing results. Don't report only
   the best of several variants. Gate B is closed to new variants (D41).
5. **Only a recorded gate check upgrades** a dataset or result to READY/validated.
6. **Label everything that isn't an observation:** EXPLORATORY, SYNTHETIC, EXTRAPOLATED, modelled
   or reanalysis, in code, data files and UI.
7. **Scientific controls are never cut** to save time. Cut scope instead: narrow the claim, drop
   a variable, show a static EvidenceCard.

## 2. Claims

8. **No claim without a recorded result.** This covers UI, docs, README, slides, pitch and
   project page.
9. **"No robust trend" and "Insufficient evidence" are valid, presentable results.** Never
   inflate them.
10. **Banned unless a gate-checked result supports them:** causal wording ("caused by",
    "due to"), energy production, grid stability, prices, blackouts, optimal sites, investment
    advice, and **anything about 2030** or the future.
11. **Generic warming is not energy evidence.** Keep the energy angle as motivation only.

## 3. Product scope

12. **The challenge's five tasks come first** (`challenge-contract`). P0 must be green before
    any P1 work. **P2 is off-limits:** forecasting, ML, site ranking, new tools or industries,
    new map tools, visual effects, branding.
13. **The EvidenceCard is the product.** Don't build dashboards, atlases or recommendation
    engines (`product-thesis`).
14. **Don't edit LOCKED decisions** and don't change the primary scientific question.

## 4. Demo and submission

15. **Feature freeze Sun 15 Nov, 14:00.** After that, demo-path bug fixes only.
16. **The demo shows only what exists.** No mock-ups presented as working features.
17. **Slide 5 holds only a gate-checked finding** that a second person has reviewed.
18. **Submit for Judging by 21:00 Sun** (hard limit 23:59) and capture the confirmation.
19. Everything in **English**. **≤ 7 slides or ≤ 30 s video** through one public link. NASA
    resources named with their role. AI use declared. No NASA logos. Links work in a private
    window.
20. **The demo path runs 3× in a row** on the presenting machine, with a fallback recording.

## 5. Team safety

21. **Never overwrite teammates' work.** No force push, no `reset --hard`, no `clean -f`, no
    history rewrite. Don't discard uncommitted changes you didn't make. Don't edit files with
    unresolved conflicts (`UU`) without asking.
22. **Don't push, merge, open PRs or change GitHub settings** unless the human asked in this
    session.
23. **No secrets committed** (`.env`, `~/.netrc`, tokens). Data files stay **< 50 MB**.
24. **Report honestly:** what you ran, what passed, what you skipped. Never write "works" or
    "verified" without having run it.

## Claim-review checklist (run on any user-facing sentence)

- [ ] Which recorded result supports it? Name the file (`data/results/…`, `evidence-cards.json`).
- [ ] Does it state units, region/extent, period, and the uncertainty (CI) with the number?
- [ ] Is the outcome state worded exactly as in `UX_UI_RULES.md`?
- [ ] Is the data type stated (reanalysis / satellite–gauge / model / station)?
- [ ] Is it free of causal, future/2030, energy-production, grid, price and site claims?
- [ ] Is anything exploratory, synthetic or extrapolated labelled as such?
- [ ] Would a sceptical judge scoring *Validity* accept it? If unsure, weaken the claim.

Any unchecked box means the sentence doesn't ship. Rewrite it or ask the human.
