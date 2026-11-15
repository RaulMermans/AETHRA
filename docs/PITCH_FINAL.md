# Pitch (final, 15 Nov 2026)

Audience: Space Apps judges (Impact · Creativity · Validity · Relevance · Presentation; weights not
assumed). Every finding sentence maps to an artifact (§6). Positioning source:
`PRODUCT_POSITIONING_FINAL.md`. Live steps: `JUDGE_EXPERIENCE.md`.

## 1. One sentence

"AETHRA turns NASA Earth data into defensible discoveries: it tells a renewable-energy analyst
whether a historical change in Spain's environment is statistically supported, by how much, and
from which NASA source, including when the honest answer is *insufficient evidence*."

## 2. Thirty seconds

> "Analysts planning renewable energy need to know whether the conditions behind it are changing. But a pattern,
> a trend and a proven change are different things. We asked NASA's data one question: are days with
> both low sun and low wind becoming more common in Spain? Answer: no detectable change since 2001,
> in any of five regions. That's insufficient evidence, and AETHRA shows it as exactly that. Ask
> about air temperature and the same tool finds a supported rise of about 0.6 °C per decade. We
> don't tell you what you want to hear. We show you what NASA's evidence supports."

## 3. Two minutes (~280 words, spoken)

**Problem (0:00–0:20).** "Earth data are abundant. Defensible conclusions are harder. Picture an
analyst at a regional energy agency in Castilla y León. Before a study assumes that 'dark, windless
days are getting more common', someone has to check whether the record supports it."

**Question (0:20–0:35).** "So that is our question: are days when solar *and* wind resources are both
low becoming more frequent? Joint lows matter because averages hide timing. This is a resource
indicator, not a measure of the grid."

**Investigation (0:35–0:55).** "We use NASA POWER: CERES satellite irradiance and MERRA-2 wind, daily,
2001 to 2025, in five regions we fixed before looking at the data. A joint-low day is when both fall
below their own monthly 20th percentile. Trends use Theil–Sen slopes with Mann–Kendall tests,
checked for autocorrelation and adjusted for testing five regions."

**Discovery (0:55–1:15)** *(live: Castilla y León → EvidenceCard)*. "In Castilla y León: zero days per
decade, interval minus 1.5 to plus 1.7. Insufficient evidence, in all five regions. And not detecting a
change is not proof of stability: 25 years can only reveal trends of about two days a decade."

**Contrast (1:15–1:35)** *(live: Study findings)*. "Same tool, same rules, air temperature from MERRA-2:
a supported increase of about 0.6 °C per decade, 2000 to 2025, interval 0.31 to 0.87, and all 64
NOAA weather stations we compared warmed too. Two questions, two different scientific outcomes, both visible."

**Why it matters (1:35–2:00).** "So the analyst's answer is precise: the 'more joint lows' assumption is
not supported and stays a hypothesis; the next step is a study with observed generation, not a
construction decision. Every number opens into an EvidenceCard with its source, period, method,
uncertainty and limits. We don't tell you what you want to hear. We show you what NASA's evidence
supports."

## 4. Seven slides (cover included; confirm format with organizers)

| # | Title | Content | Artifact / visual |
|---|---|---|---|
| 1 | **Earth data are abundant. Defensible conclusions are harder to reach.** | AETHRA · Challenge #02 *Be An Earth System Trend Detective!* · team. The analyst (hypothesis): regional renewable-energy resource analyst. "From climate data to defensible discoveries." | Logo only (no NASA logos) |
| 2 | **Are low solar and wind resource conditions becoming more frequent?** | Why joint lows: averages hide timing. A resource indicator, *not* electricity-system reliability. The decision: investigate further, or not | Simple diagram, no data |
| 3 | **The investigation** | WHAT: `ALLSKY_SFC_SW_DWN` (CERES SYN1deg Ed4.2) + `WS50M` (MERRA-2), via NASA POWER · WHERE: 5 pre-registered regions, area-weighted · WHEN: 2001–2025, daily → annual · Definition: both below monthly P20 (ref 2001–2020) · HOW: Theil–Sen + Gilbert 95 % CI, Mann–Kendall, Hamed–Rao, BH across 5 regions | Evidence-chain strip: source → QA → series → test → outcome → EvidenceCard |
| 4 | **No statistically supported trend in joint-low frequency** | Approved claim 3. CyL card: 0.0 days/decade (CI −1.55 to +1.67). Line: "Failing to detect a change is not proof of stability (detectable ≈ 2–3 days/decade)." Small, labelled *descriptive*: claim 4 | `energy_gap/e1_joint_low_days.svg` |
| 5 | **The detector also says yes when the data say yes** | Approved claims 1 + 2: +0.6 °C/decade (CI 0.31–0.87), all 6 windows positive; 64/64 NOAA stations warming. "Not linked to energy, not causal." EvidenceCard anatomy callouts | `gate_a_temperature/t2m.svg`, `noaa_validation/slopes.svg`. **Only if second-person review is signed; otherwise label "EXPLORATORY — pending independent review"** |
| 6 | **The product: one investigation, end to end** | 3 screenshots in sequence: first view (question + answer + contrast) → CyL case sheet → CyL EvidenceCard with Sources open | Real screenshots from the judge build |
| 7 | **Why it matters** | What the evidence supports / does not support / next study needed (observed generation, station wind, longer record). Limits: curated, reanalysis/satellite, resource ≠ generation. Credits: NASA MERRA-2, NASA POWER (CERES, MERRA-2), NOAA GHCN-Daily, GISCO, Cesium/Esri/EOX. AI use declared. Close: **"We don't tell you what you want to hear. We show you what NASA's evidence supports."** | Text |

## 5. Key takeaway

**AETHRA distinguishes what Earth's data actually establish from what we merely assume.**

## 6. Claim → artifact map

| Spoken claim | Artifact |
|---|---|
| Zero days per decade, CI −1.5 to +1.7 (CyL) | `energy_gap/analysis_bundle.json` → `results.ES41.E1_joint_low_days_P20` |
| Insufficient evidence in all five regions | same file, `E1_outcome` × 5 |
| Detectable ≈ 2 days/decade (CyL), 2–3 across regions | `E1_minimum_detectable_trend_per_decade` (2.0–3.2) |
| +0.6 °C/decade, CI 0.31–0.87, 2000–2025 | `gate_a_temperature/analysis_bundle.json` |
| 64 NOAA stations warmed | `noaa_validation/analysis_bundle.json` `summary` |
| About half as often as independence | `energy_gap/independence_check.json` |

## 7. Judge Q&A preparation

| Likely question | Answer (keep it short) |
|---|---|
| "Isn't 'no trend' a failed result?" | "It's a result. It stops a wrong assumption from entering a study. We pre-registered the test so we couldn't go looking for significance." |
| "Can I pick any NASA variable?" | "Not yet. These are curated, precomputed investigations. A general variable search isn't built, and we don't claim it." |
| "Is this computed live?" | "No. A tested Python pipeline produces versioned results; the browser only displays them. That's why every number is reproducible." |
| "Why Castilla y León?" | "One of five regions fixed before we saw any data, as a continental plateau contrast. Not because of plant density." |
| "Does warming reduce solar output?" | "We don't test that. Temperature and joint lows are separate questions; we computed no link between them." |
| "What about 2030?" | "We don't forecast. A historical trend isn't a projection." |
| "Why reanalysis, not stations?" | "Regional coverage and consistency. We checked temperature against 64 NOAA stations: all agree on direction." |
| "Why insufficient evidence instead of no trend?" | "Our frozen rule only says 'no robust trend' when the test had enough power to see a meaningful change. With 25 years it didn't." |
| "Who reviewed this?" | Answer truthfully with the state of `SCIENTIFIC_REVIEW.md` §5 at pitch time. |
| "What's new vs Giovanni/Worldview?" | "They're excellent for access and exploration. We focus on the end of the workflow: a pre-registered estimand, an outcome state with uncertainty, and a 'do not conclude' line attached to the result." |
| "What's TARO?" | "A deterministic guide that quotes EvidenceCards. No language model is generating numbers." |
| "What's the impact?" | "A clear research decision for a defined analyst. We haven't measured impact yet; we have a usability protocol ready." |
