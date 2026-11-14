# Demo and Submission

Single source for event rules, the submission checklist, the pitch and the 7-slide outline.
Sources: local *[NASA] Guía del participante · Space Apps 2026.pdf* (revised 14 Nov 2026) and the
official site. The official site could not be read automatically on 14 Nov, so **a human must
confirm each rule marked ⚠️**.

## Rules that affect us

| Rule | Value | Source / status |
|---|---|---|
| Development start | Sat 14 Nov 2026, 09:00 local. Prior work must be declared | Local guide |
| **Submit for Judging deadline** | **Sun 15 Nov 2026, before 23:59 local time** (no later edits) | Local guide; official site ⚠️ verify |
| Local cut-off | Málaga may set an earlier local cut-off for review/pitches. It does **not** replace NASA's 23:59 | Local guide |
| Team | Registered members, same Local Event, added to the team. Guide p.3 says "pair or up to 6"; our older note said 1–6 | ⚠️ confirm minimum |
| NASA resource | At least one NASA resource from the challenge, and its real role explained. Partners (NOAA) complement, never replace | Local guide |
| Language | Project page, slides, written material in **English**. Video in another language only with English subtitles | Local guide |
| **Project Demo** | **One public link**: ≤ **7 slides** (cover included) **or** ≤ **30 s video** | Local guide ("regla oficial") |
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
- [ ] No NASA logos in generated content. No identifiable minors
- [ ] **Submit for Judging** pressed, confirmation screen/email captured (target: Sun 21:00, hard limit 23:59)
- [ ] Local pitch format confirmed with organizers. Laptop/support tested at 16:30

## One-sentence pitch

*Draft. Update once a finding is verified.*
"We use NASA Earth data to show, region by region across Spain, whether environmental conditions
really changed — by how much, how sure we are, and where the evidence comes from — starting with
the conditions that matter for clean energy."

## Demo flow (target ~90 s live)

1. Open `/explore` on Spain (Cesium globe).
2. Pick the variable (Gate A: MERRA-2 2 m air temperature, or Gate B result if passed).
3. Pick a region (Spain analysis extent → one CCAA).
4. Read the time series with the observed years only, and the period stated.
5. Read the trend: slope ± 95 % CI per decade, test, n, outcome state.
6. Open the EvidenceCard: dataset, version/DOI, spatial support, QA, limitations, "do not conclude".
7. Optional: compare a second region. Show that a difference between regions needs its own test.

## 7-slide outline (Project Demo, cover included)

Slide 5's content is **not written yet on purpose**. It holds only a verified finding.

| # | Slide | Content |
|---|---|---|
| 1 | Cover + human problem | Title, team, challenge #02. "Having abundant renewable resources is not the same as having them when needed." (context, not a finding) |
| 2 | The overlooked question | Averages hide timing and joint shortfalls. Our question: *what changed, where, how much, and is it supported?* Energy question shown as the motivating application |
| 3 | Why NASA data | Decades of consistent coverage across all of Spain. Named products (MERRA-2, GPM IMERG, GLDAS, POWER if used) and the type of each (reanalysis / satellite-gauge / model). NOAA stations as independent check |
| 4 | Method + evidence chain | Source → QA → series → Theil–Sen + Mann–Kendall (autocorrelation-checked) → CI → outcome state → EvidenceCard. One diagram |
| 5 | **The verified finding** | **Candidate text, use only after second-person review:** "Across Peninsular Spain, days when sunshine *and* wind are both scarce happen about half as often as chance would predict, in every year 2001–2025. Over those 25 years we find no detectable change in how often they occur (0.0 days/decade, 95 % CI −1.8 to +2.2; NASA POWER: CERES SYN1deg + MERRA-2). Meanwhile the air warmed +0.60 °C/decade (95 % CI 0.31–0.87; MERRA-2)." Show the E1 chart and the EvidenceCard |
| 6 | Product demo + user value | Screenshot/GIF of region → series → EvidenceCard. What the analyst gets in seconds |
| 7 | Impact, limits, next steps | What it does not prove (no generation, no site viability, no forecast). Next: Gate B research or regional comparison. AI and data credits |

## Story arc (follows the evidence, never ahead of it)

Promise (Spain's clean-energy ambition) → Blind spot (averages hide timing) → Investigation (NASA
data, pre-defined method) → Evidence (the real result, or an honest "inconclusive") → Why it matters
(what further study it justifies). Avoid: "We built a NASA-powered renewable-energy dashboard."
