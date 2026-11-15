# Submission package (15 Nov 2026)

Text ready to paste into the Space Apps project page. Every number is copied from an artifact
(see `PITCH_FINAL.md` §6). The pitch, 2-minute script, 7-slide outline and judge Q&A live in
`PITCH_FINAL.md`; the live demo path in `JUDGE_EXPERIENCE.md`. **Items marked VERIFY must be checked
by a team member on the official site before pressing Submit** — an automated check could not load
the official challenge page on 15 Nov (TLS certificate error from the build machine).

## 1. Project description (project page, ~220 words)

**AETHRA — Earth evidence, not answers you want.**

An energy analyst asks: *are days when both sunshine and wind are low becoming more frequent in
Spain?* AETHRA answers with NASA data and states how strong the evidence is.

We built daily joint-low-resource counts from NASA POWER (CERES SYN1deg solar, MERRA-2 50 m wind),
2001–2025, for five regions fixed before we looked, and tested them with Theil–Sen slopes, 95 %
intervals and Mann–Kendall tests, adjusted for the five regions. The answer is **insufficient
evidence in all five regions** (Castilla y León: 0.00 days per decade, 95 % CI −1.55 to +1.67). With
25 years, the test could only detect trends of about 2–3 days per decade, so "no detected trend" is
not proof of stability.

The same pipeline gives a different answer when the data support one: NASA MERRA-2 2 m air
temperature over the Peninsula and Balearics rose **+0.60 °C per decade (95 % CI +0.31 to +0.87),
2000–2025**, and all 64 long-record NOAA stations we compared also warmed.

Every result is an EvidenceCard with variable, units, region, period, slope and interval, method,
source and a "do not conclude" line. Statistics run in tested Python; the browser only renders them.
Results are **exploratory until independent review**. AETHRA does not forecast, rank sites or
estimate electricity production.

*We don't tell you what you want to hear. We show you what NASA's evidence supports.*

## 2. Elevator pitch (one sentence)

AETHRA turns NASA Earth data into defensible discoveries: it tells an energy analyst whether a
suspected change is actually supported, and shows the evidence either way.

## 3. NASA data used (citations)

| Product | Role in AETHRA | Citation / access | Artifact |
|---|---|---|---|
| NASA MERRA-2 M2TMNXSLV v5.12.4, T2M | Gate A temperature trend (supported contrast) | GMAO (2015), doi:10.5067/AP1B0BA5PD2K | `data/results/gate_a_temperature/analysis_bundle.json` |
| NASA POWER daily, ALLSKY_SFC_SW_DWN (CERES SYN1deg Ed4.2) | Gate B daily solar resource | NASA POWER API v2.10.3, https://power.larc.nasa.gov/ | `data/results/energy_gap/analysis_bundle.json` |
| NASA POWER daily, WS50M (GMAO MERRA-2) | Gate B daily wind resource | as above | as above |
| NASA GPM IMERG Final V07 monthly | Rain / dry-wet context maps (EXPLORATORY regional labels) | doi:10.5067/GPM/IMERG/3B-MONTH/07 | `apps/web/public/data/climate-bundle.json` |
| NASA GLDAS Noah v2.1 monthly 0.25° | Modelled runoff context (EXPLORATORY) | doi:10.5067/SXAVCZFAQLNO | `climate-bundle.json` |
| NOAA GHCN-Daily (non-NASA) | External station comparison for MERRA-2 temperature | NOAA NCEI GHCN-Daily | `data/results/noaa_validation/analysis_bundle.json` |
| Eurostat GISCO NUTS 2021 (non-NASA) | Region and province boundaries | © EuroGeographics for the administrative boundaries | `apps/web/public/data/spain-admin.json` |
| NASA GIBS Blue Marble, Sentinel-2 cloudless (EOX), Esri elevation, Cesium | Globe base layers only (not analysed) | credits shown on the globe | — |

**VERIFY (eligibility):** confirm on the challenge **Resources** tab that at least one of MERRA-2,
NASA POWER, GPM IMERG or GLDAS (or a portal that serves them, e.g. Earthdata/GES DISC/Giovanni) is
listed, and record the exact listing and date here. Not verified by the agent.

## 4. AI-use disclosure (draft — team must confirm completeness)

- **Coding assistant:** Anthropic Claude (Claude Code) was used to write and refactor code (Python
  pipeline scripts, Next.js/Cesium frontend, tests), draft documentation, and run checks. Team members
  directed the work and reviewed outputs; scientific definitions were fixed in `docs/` before results
  were computed, and statistics come from tested Python code, not from the model.
- **In-app assistant (TARO):** deterministic retrieval over published EvidenceCards; the LLM socket
  is off in the judge build (D66/D69). It is not used in the timed demo.
- **Images / video:** VERIFY with the team whether the AETHRA logo kit (D58) or the TARO avatar were
  AI-generated; if so, mark them visibly as required by the local guide (`DEMO_AND_SUBMISSION.md`).
  The fallback recording is a real screen capture of the app.

## 5. Prior-work statement

All commits in the repository are dated 14–15 Nov 2026 (first commit `a425a49`, 14 Nov 11:14 CET).
No pre-event code is present in git history. VERIFY: team confirms no other pre-event material was
reused; if any was, list it here.

## 6. What the agent could NOT verify (human action before Submit)

1. Official challenge page, Resources list, deadline and demo format (page unreachable from the
   build machine: TLS certificate error).
2. Team registration and project-page fields.
3. Public deployment (no Vercel credentials on the build machine).
4. AI-generated image status of brand assets.
5. Independent scientific sign-off (`SCIENTIFIC_REVIEW.md` §5) — until then all findings are labelled
   EXPLORATORY.
