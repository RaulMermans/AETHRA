# Submission package (15 Nov 2026)

Text ready to paste into the Space Apps project page. Every number is copied from an artifact
(see `PITCH_FINAL.md` §6). The pitch, 2-minute script, 7-slide outline and judge Q&A live in
`PITCH_FINAL.md`; the live demo path in `JUDGE_EXPERIENCE.md`. **Items marked VERIFY must be checked
by a team member on the official site before pressing Submit** — an automated check could not load
the official challenge page on 15 Nov (TLS certificate error from the build machine).

## 1. Project description (project page, ~250 words)

**AETHRA — Earth evidence, not answers you want.**

A solar developer asks: *where in Spain should we look first for the next solar farm, and are the
conditions those plants depend on changing?* AETHRA answers with NASA data and says how strong the
evidence is.

We split Spain into 246 NASA MERRA-2 grid cells (0.5° × 0.625°). For each cell we measured the
2000–2025 solar resource and its trend, the summer air-temperature trend, and the share of land that
MITECO rates low or moderate environmental sensitivity for PV. A verdict rule fixed before the results
were seen (`pv-screening/v1`) marks cells *look here first* (46), *mixed* (70) or *avoid* (79); 51 have
too little land or data.

**The sun is not fading:** none of the 195 cells tested shows a supported irradiance trend after FDR
correction. **Summers are warming:** 120 cells show a supported summer temperature increase (median
+0.67 °C per decade). Of the operating solar capacity in the Global Energy Monitor register, 47.6 % sits
in *look here first* cells and 29.2 % in *avoid* cells (descriptive, not a census).

The same pipeline says so when the data can't decide: days with both low sun and low wind show **no
detectable change** (insufficient evidence in all five pre-registered regions), while MERRA-2 air
temperature over the Peninsula and Balearics rose **+0.60 °C per decade (95 % CI +0.31 to +0.87)**,
with all 64 long-record NOAA stations compared showing a positive trend.

Every result is an EvidenceCard with variable, units, region, period, slope and interval, method,
source and a "do not conclude" line. Statistics run in tested Python; the browser only renders them.
Results are **exploratory until independent review**. AETHRA does not forecast, rank investment sites
or estimate electricity production.

*We don't tell you what you want to hear. We show you what NASA's evidence supports.*

## 2. Elevator pitch (one sentence)

AETHRA turns NASA Earth data into defensible screening evidence: it shows a solar analyst where to look
first in Spain, whether the sun and heat there are changing, and says "insufficient evidence" when the
data can't tell.

## 3. NASA data used (citations)

| Product | Role in AETHRA | Citation / access | Artifact |
|---|---|---|---|
| NASA MERRA-2 M2TMNXSLV v5.12.4, T2M | Gate A temperature trend (supported contrast) | GMAO (2015), doi:10.5067/AP1B0BA5PD2K | `data/results/gate_a_temperature/analysis_bundle.json` |
| NASA MERRA-2 M2TMNXRAD v5.12.4, SWGDN (via Giovanni) | PV screening: solar resource and its trend per grid cell | GMAO (2015), doi:10.5067/OU3HJDS973O0 | `apps/web/public/data/pv-screening.json` |
| NASA MERRA-2 M2TMNXSLV v5.12.4, T2M (June–August) | PV screening: summer temperature trend per grid cell | doi:10.5067/AP1B0BA5PD2K | `pv-screening.json` |
| NASA POWER daily (ALLSKY_SFC_SW_DWN, T2M, T2M_MAX, AOD_55) | Seville case study, four pre-registered tests 2001–2025 | NASA POWER API v2.10.3 | `apps/web/public/data/pv-case-sevilla.json` |
| NASA POWER daily, ALLSKY_SFC_SW_DWN (CERES SYN1deg Ed4.2) | Gate B daily solar resource | NASA POWER API v2.10.3, https://power.larc.nasa.gov/ | `data/results/energy_gap/analysis_bundle.json` |
| NASA POWER daily, WS50M (GMAO MERRA-2) | Gate B daily wind resource | as above | as above |
| NASA GPM IMERG Final V07 monthly | Rain / dry-wet context maps (EXPLORATORY regional labels) | doi:10.5067/GPM/IMERG/3B-MONTH/07 | `apps/web/public/data/climate-bundle.json` |
| NASA GLDAS Noah v2.1 monthly 0.25° | Modelled runoff context (EXPLORATORY) | doi:10.5067/SXAVCZFAQLNO | `climate-bundle.json` |
| NOAA GHCN-Daily (non-NASA) | External station comparison for MERRA-2 temperature | NOAA NCEI GHCN-Daily | `data/results/noaa_validation/analysis_bundle.json` |
| MITECO environmental zoning for PV, 2024 (non-NASA) | Share of low/moderate-sensitivity land per cell | MITECO, Zonificación ambiental para energías renovables: fotovoltaica | `pv-screening.json` |
| Global Energy Monitor, Global Solar Power Tracker Feb 2026 (non-NASA) | Operating plants shown for context (not a census) | CC BY 4.0 | `apps/web/public/data/solar-plants.json` |
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
- **Video voice-over:** the 30 s videos use a synthetic voice (Kokoro-82M open-source TTS, voice
  `af_heart`) generated from each video's own captions with `scripts/narrate_srt.py`. Declare it as
  "AI voice-over: Kokoro-82M TTS" in the video description.
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
3. Public deployment: https://nasa-project-spain.vercel.app/explore answers HTTP 200 (checked 15 Nov, 20:15 CET). Still check in a private window that it is the latest commit and the judge build (`/explore?lab=energy` shows no Energy Lab).
4. AI-generated image status of brand assets.
5. Independent scientific sign-off (`SCIENTIFIC_REVIEW.md` §5) — until then all findings are labelled
   EXPLORATORY.

## 7. Presentation assets (generated and checked 15 Nov, D76)

| Asset | Path | How it was made / checked |
|---|---|---|
| 7-slide deck (PDF, 1280 × 720) | `docs/release/2026-11-15/deck/aethra-deck.pdf` (+ `.html`, `slide-1…7.png`) | `scripts/build_deck.py` reads every number from `evidence-cards.json`; each slide rendered to PNG and inspected; 7 pages |
| Real screenshots of the judge build | `docs/release/2026-11-15/slides/01…06` | `npm run e2e:capture` on the production judge build |
| Fallback screen recording (no audio) | `docs/release/2026-11-15/judge-path-run1-1440x900.webm` | Automated run of the judge path; record a narrated version on the presenting machine if time allows |
| Automated functional validation | `docs/SCENARIO_VALIDATION.md` | 5 SIMULATED use cases, Playwright |
| 30 s videos with AI voice-over, captions (.vtt) and transcripts | `docs/release/2026-11-15/video/` | Narration = caption text; claims checked against `pv-screening.json` and `pv-case-sevilla.json` (15 Nov) |
| HTML pitch deck (7 slides) + PDF | `presentation/` | Team deck (`95f77b4`) |
| Judge Q&A, 30-s and 2-min scripts, Claim Test | `docs/PITCH_FINAL.md` | — |

The deck states "EXPLORATORY until independent review" on the contrast and closing slides; keep that
until `SCIENTIFIC_REVIEW.md` §5 is signed. No NASA logo is used.
