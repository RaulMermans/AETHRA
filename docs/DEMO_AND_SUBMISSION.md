# Demo and Submission

Single source for event rules, the submission checklist, the pitch and the 7-slide outline.
Sources: local *[NASA] Guía del participante · Space Apps 2026.pdf* (revised 14 Nov 2026) and the
official site. The official site could not be read automatically on 14 Nov, so **a human must
confirm each rule marked ⚠️**.

## Rules that affect us

| Rule | Value | Source / status |
|---|---|---|
| Development start | Sat 14 Nov 2026, 09:00 local. Prior work must be declared | Local guide |
| **Submit for Judging deadline** | **Sun 15 Nov 2026, 23:59 local time**, final, no later edits | Local guide + two independent web sources (14 Nov). Official 2026 submission guide could not be fetched (TLS error) ⚠️ human confirms on the site |
| Local cut-off | Málaga may set an earlier local cut-off for review/pitches. It does **not** replace NASA's 23:59 | Local guide |
| Team | Registered members, same Local Event, added to the team. Guide p.3 says "pair or up to 6"; a 2025 official guide excerpt says 1–6 | ⚠️ confirm minimum on the 2026 site |
| NASA resource | At least one NASA resource from the challenge, and its real role explained. Partners (NOAA) complement, never replace | Local guide |
| Language | Project page, slides, written material in **English**. Video in another language only with English subtitles | Local guide |
| **Project Demo** | **One public link**: ≤ **7 slides** (cover included) **or** ≤ **30 s video** | Local guide ("regla oficial"). Not found in web sources; official 2026 guide unreadable from here ⚠️ |
| AI | Allowed. Declare the tools and how they were used. Team verifies generated content. Visible marking on generated images/video | Local guide |
| Branding / minors | No NASA logos/insignia in generated content. No identifiable minors | Local guide |
| Judging | Impact · Creativity · Validity · Relevance · Presentation, 1–5 each | Local guide. **Weights not fixed**: one jury FAQ says 20 % each, mentoring guide says local scales may differ. Don't assume weights |

### Local pitch (not the Project Demo, not a substitute for Submit for Judging)

Confirmed: pitches **Sun 15 Nov 17:30–19:00**, technical tests **16:30–17:15**, oral delivery in
Spanish or English, visuals in English. **Format disagreement in the local documents (unresolved):**
mentoring p.10 "2 min or 30 s video"; mentoring p.13 "2–2:30 min **or** 30 s video, plus 2 min Q&A";
jury p.9 "2–3 min incl. walking to stage, 2–3 questions"; jury p.17 "same format as the official
demo". → **Ask organizers before the 16:30 test.** Prepare a 2:00 version that can stretch to 2:30.

## Submission checklist

Tick only once you've checked it yourself. Owner: unassigned unless filled in.

- [ ] All members registered, accepted into the Málaga Local Event, added to the team
- [ ] Project associated with Challenge #02 *Be An Earth System Trend Detective!*
- [ ] Official challenge text and Resources list verified against the live page (see `PROJECT.md` §1)
- [ ] NASA resources listed with links and **what each one does** in the chain (MERRA-2 M2TMNXSLV 5.12.4, DOI 10.5067/AP1B0BA5PD2K, etc.)
- [ ] Partner data (NOAA GHCN-Daily) and non-NASA layers (Cesium ion/Bing, Esri, Sentinel-2 cloudless by EOX, GISCO) credited
- [ ] AI tools declared with how they were used. Generated images/video visibly marked
- [ ] Prior work declared, if any (e.g. repo scaffolding before 09:00 Sat)
- [ ] Project page text in English
- [ ] Public project link (repo and/or deployed app) opens in a private window with no login
- [ ] Project Demo: one public link, ≤ 7 slides incl. cover **or** ≤ 30 s video, opens without permissions
- [ ] Demo shows only what exists. Exploratory/extrapolated content labelled
- [ ] Deployed/demo build is **judge mode** (no `NEXT_PUBLIC_ENABLE_EXPLORATORY`); check `/explore?lab=energy` shows no Energy Lab, no infrastructure tool, no Buniel 3D, no CyL plant overlay from research cases (D61)
- [ ] Second-person scientific sign-off done (`SCIENTIFIC_REVIEW.md` §5) and D53 decided
- [ ] Non-NASA data credited: NOAA GHCN-Daily; Eurostat GISCO; Cesium ion, Esri, EOX Sentinel-2 cloudless, NASA GIBS imagery (globe credits)
- [ ] No NASA logos in generated content. No identifiable minors
- [ ] **Submit for Judging** pressed, confirmation screen/email captured (target: Sun 21:00, hard limit 23:59)
- [ ] Local pitch format confirmed with organizers. Laptop/support tested at 16:30

## Approved claim wording (pending second-person review — do not change numbers or strength)

Use these sentences as written. Each traces to a recorded file.

1. **Headline (Gate A).** "In NASA's MERRA-2 reanalysis, annual near-surface air temperature over
   Peninsular Spain and the Balearics rose by about **0.6 °C per decade** from 2000 to 2025 (95 % CI
   0.31–0.87 °C per decade; Theil–Sen with Mann–Kendall, p < 0.001; 26 complete years). The trend is positive in
   all six analysis windows we tested, with magnitudes from 0.41 to 0.83 °C per decade."
   — `data/results/gate_a_temperature/analysis_bundle.json`
2. **External station comparison** (not claimed independent, D75). "All 64 long-record NOAA weather stations we compared show a positive trend (significant at 57), and for 53
   of them the station trend is within 0.2 °C per decade of the reanalysis cell around it."
   — `data/results/noaa_validation/analysis_bundle.json`
3. **Energy question (Gate B, honest null).** "We found **no detectable change** in how often solar and
   wind resources are low on the same day (Peninsula + Balearics, 2001–2025: 0.0 days per decade, 95 %
   CI −1.8 to +2.2). The result is *insufficient evidence* in all five pre-registered regions."
   — `data/results/energy_gap/analysis_bundle.json`
4. **Descriptive context (never a headline on its own).** "In NASA POWER data, days when both
   resources are low occur about half as often as they would if solar and wind were independent
   (183 vs about 370 over 25 years). That describes the resource data. It is not a trend and not a
   measure of grid reliability." — `data/results/energy_gap/independence_check.json`

**Never say:** the energy gap is growing/shrinking · renewables are becoming more/less reliable ·
warming reduces/increases solar or wind output · anything about 2030 or the future · best sites ·
"proves", "caused by", "due to" · that temperature results say anything about energy production.
Regional rain or runoff "Supported" labels are not presentable (D53).

## One-sentence value proposition

"AETHRA turns NASA Earth data into traceable evidence about how Spain's environment has actually
changed — region by region, with the uncertainty and the sources attached — starting with the
conditions behind clean energy."
**Climate × PV industry framing (15 Nov).** "AETHRA puts NASA climate trends next to where Spain's
solar industry actually stands, and asks whether the conditions those plants depend on are changing.
Where the data can't say, we say so." Co-location, not correlation: we test climate trends where
registered plants are (Gate B regions, PV screening case); we do **not** correlate climate trends with
industry growth (D80/D85: plant chronology is not a census; two rising series correlate spuriously).
Never say "climate trends drive / explain PV deployment".

*(Visible product name is AETHRA, D56. GRIDSHIFT remains the internal energy-strategy working name,
D34. Challenge title stays Be An Earth System Trend Detective!)*

## 30-second demo script (video or opening of the live demo)

> (0–5 s, globe on Spain) "This is AETHRA: NASA Earth data for Spain, turned into evidence."
> (5–15 s, Temperature → Trend) "Air temperature from NASA MERRA-2, 2000 to 2025: up about 0.6 °C per
> decade, confidence interval shown, supported — and 64 NOAA stations agree on the direction."
> (15–25 s, Evidence cards → Solar + wind) "For clean energy we asked whether days with both low sun
> and low wind are becoming more common. Honest answer: no detectable change."
> (25–30 s, Sources) "Every number links back to its NASA source and its limits."

### Video voice-over (AI-generated, must be declared)

The 30 s videos in `docs/release/2026-11-15/video/` (`aethra_cyl_case_30s`, `aethra_seville_case_30s`,
`aethra_seville_pv_30s`, `aethra_seville_pv_live_30s`) carry a **synthetic voice** generated from each
video's own `.en.srt` with **Kokoro-82M** (open source, Apache-2.0, `hexgrad/Kokoro-82M`, voice
`af_heart`, run locally). Each subtitle cue is voiced and placed at its start time, so voice and
captions say exactly the same words. Picture is copied untouched; the previous audio track is replaced.

```
uv run --python 3.11 scripts/narrate_srt.py VIDEO.mp4 VIDEO.en.srt OUT.mp4 [--voice af_heart]
```

Changing the script means editing the `.srt` and re-running. Per the AI rule above, declare
"voice-over: Kokoro-82M TTS" with the AI tools and mark it visibly in the video or its description.

## Two-minute pitch (~270 words)

**Act 1 — Opportunity (15 s).** Spain is building one of Europe's largest solar and wind fleets. To plan
it well, people need to know how the environment behind it is changing.

**Act 2 — Blind spot (15 s).** Averages hide timing. Plenty of sun and wind on average doesn't tell you
how often both are low on the same day, or whether that is changing.

**Act 3 — NASA data and method (20 s).** We use MERRA-2 reanalysis and NASA POWER solar and wind data,
clipped to Spanish regions, with complete years only. Trends use Theil–Sen slopes, Mann–Kendall tests
checked for autocorrelation, 95 % confidence intervals, and a method we wrote down before looking.

**Act 4 — Verified finding (20 s).** Air temperature over Peninsular Spain and the Balearics rose about
0.6 °C per decade from 2000 to 2025, interval 0.31 to 0.87, in every window we tried. All 64 NOAA
stations we compared also show a positive trend (57 significant).

**Act 5 — Energy investigation (20 s).** In NASA's resource data, days when solar and wind are both low
happen about half as often as they would if the two were independent. But we find no detectable change in how often they happen since 2001, in any of
five regions. That's inconclusive, and we show it as inconclusive.

**Act 6 — Product (20 s).** On the globe, pick a variable and a region, see the series and the trend, and
open an EvidenceCard with region, period, method, uncertainty, sources and a "do not conclude" line.
If we have no card for a region, it says so.

**Act 7 — Relevance, limits, next steps (10 s).** These are reanalysis and satellite data, not plant
output, not forecasts, not causes. Next: link real infrastructure and observed generation, carefully.

## Demo flow (live, ~90 s, verified 3× on the production build 14 Nov)

> **Superseded 15 Nov (D72):** the first view now opens on Study findings. Use the step-by-step script in
> [JUDGE_EXPERIENCE.md](JUDGE_EXPERIENCE.md); the 14 Nov 3× verification does not cover it. Final pitch and
> slides: [PITCH_FINAL.md](PITCH_FINAL.md). Positioning: [PRODUCT_POSITIONING_FINAL.md](PRODUCT_POSITIONING_FINAL.md).

1. `/explore` opens on Spain, Temperature, judge mode.
2. Trend → Peninsula + Balearics: Supported increase +0.60 °C/decade (CI +0.31 to +0.87).
3. Region → Galicia: the Trend panel shows Galicia's own MERRA-2 result.
4. Map tools → Evidence cards: "Selected region: Galicia". Air temperature: "No air-temperature
   EvidenceCard for Galicia" + optional, labelled national reference. Solar + wind: "Result for Galicia",
   Insufficient evidence.
5. Open Sources & provenance and the "Do not conclude" line.
6. Back to Spain: national cards. Close (Esc).

## 7-slide outline (Project Demo, cover included)

| # | Slide | Content |
|---|---|---|
| 1 | Cover | Name, team, Challenge #02. One line: "Plenty of sun and wind on average is not the same as having them when needed." (context, not a finding) |
| 2 | The blind spot | Averages hide timing and joint shortfalls. Our questions: what changed, where, how much, is it supported? |
| 3 | NASA data + method | MERRA-2 M2TMNXSLV 5.12.4 (reanalysis), NASA POWER (CERES SYN1deg + MERRA-2 wind); NOAA GHCN-Daily as an external station comparison (MERRA-2 independence from land stations not confirmed, D75). Evidence chain diagram: source → QA → series → Theil–Sen/MK + CI → outcome → EvidenceCard |
| 4 | Verified finding | Claim 1 + chart (`gate_a_temperature/t2m.svg`) + claim 2 with `noaa_validation/slopes.svg` |
| 5 | Energy investigation | Claim 3 with the E1 chart; claim 4 in smaller type, labelled "descriptive" |
| 6 | Product | Screenshot: region → series → EvidenceCard with "Result for …", sources and "do not conclude" |
| 7 | Relevance, limits, next steps | What it does not show (generation, reliability, sites, forecasts, causes). Next: P1 infrastructure context, conditional generation comparison. Data credits + AI use declaration |

## Story arc (follows the evidence, never ahead of it)

Promise (Spain's clean-energy ambition) → Blind spot (averages hide timing) → Investigation (NASA
data, pre-defined method) → Evidence (the real result, and an honest "inconclusive") → Why it matters
(what further study it justifies). Avoid: "We built a NASA-powered renewable-energy dashboard."
