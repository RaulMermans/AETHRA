# Judge Experience: live demo path (15 Nov 2026; updated for D75/D76)

One continuous investigation: **QUESTION → DATA → ANALYSIS → EVIDENCE → INTERPRETATION → RESEARCH
DECISION** (product loop: Discover → Quantify → Validate → Explain → Explore). Every control named
below exists in the judge build today. Labels are quoted exactly as they appear in English.

## 0. Preconditions (check before every run)

- [ ] Production **judge build**: built *without* `NEXT_PUBLIC_ENABLE_EXPLORATORY`. Quick check:
      no "Energy Lab" tab top-left; `/explore?lab=energy` still opens Climate trends.
- [ ] Browser window **≥ 1200 CSS px wide** (otherwise the findings panel does not auto-open: go to
      step 1-fallback). Zoom 100 %. Language toggle on **EN**.
- [ ] Fresh tab, no `#cam=` in the URL. Wait for "Preparing Spain…" to disappear (Cesium needs WebGL;
      allow ~5–10 s on first load, longer on venue Wi-Fi).
- [ ] Fallback video open in another tab (§4).
- [ ] TARO is not in the judge build (D76); nothing to close.

## 1. Sequence (≈ 2:00)

| t | Step (brief §5) | Action | What is on screen | Say (short) |
|---|---|---|---|---|
| 0:00 | **1 Question** | Load `/explore` | Globe on Spain. Right: **Study findings** panel, first card "Are days when solar and wind are both low becoming more common in Spain?" → **Not proven yet** badge, "No clear change since 2001 in any of the 5 regions we checked." | "An energy analyst's question: are low-sun, low-wind days getting more common?" |
| 0:15 | **2 Context** | Point at "What it means for you" / "What we can't say" in that card | Plain interpretation for the analyst; region chips under **Open a region**; slopes per decade under **Show the numbers** | "NASA POWER satellite irradiance and MERRA-2 wind, daily, 2001–2025, five regions fixed before we looked." The map behind is temperature context, not the answer |
| 0:25 | **3 Trend** | Click the **Castilla y León** chip | Camera flies to Castilla y León, map clips to the region; **Research cases** sheet opens: research question, chart (solid = observed years, dashed = Theil–Sen fit on 2001–2025), **Verdict: Insufficient evidence** | "Solid points are observations, dashed is the fitted trend. The verdict: insufficient evidence." The judge build chart ends at 2025 (D75): no future band. If asked: "nothing after 2025 is predicted, by design" |
| 0:45 | **4 Conclusion + 5 EvidenceCard** | In the case sheet click **Open EvidenceCard** | Evidence cards panel: "Selected region: Castilla y León", **Result for Castilla y León**, Solar + wind joint lows, ◆ Insufficient evidence, **0.00 days per decade (95 % CI −1.55 to +1.67)**, method, n = 25, p, "Do not conclude: …" | "Zero days per decade, interval from minus 1.5 to plus 1.7. With 25 years we could only detect about two days a decade. Not detecting a change is not proof of stability." |
| 1:00 | 5 Provenance | Read the receipt top-down (1 Claim → 2 Verdict → 3 How much → 4 What this does not show), then in **6 · NASA data & provenance** expand **Sources & provenance** | NASA POWER products, CERES SYN1deg, MERRA-2, roles | "Every number traces to a NASA product, a region, a period and a method." |
| 1:10 | **6 Contrast** | Click **Return to Spain** (case sheet) or press Esc then **Explore Spain ▾ → Overview**; then **Trend** (bottom right) → tab **Study findings** | "Is Spain getting warmer?" → **Proven** badge, "Yes: about +0.6 °C every 10 years since 2000." Under **Show the numbers**: Supported increase, +0.60 °C per decade, 95 % CI +0.31 to +0.87, p, n = 26, 2000–2025, NOAA check | "Same tool, same rules, different answer: air temperature rose about 0.6 °C per decade, and 64 NOAA stations agree on the direction. The detector says yes when the data say yes." |
| 1:30 | 6 (optional) | Click **Open Evidence cards** → topic **Air temperature** | National temperature EvidenceCard with series, CI, window range 0.41–0.83, do-not-conclude line | Only if time allows |
| 1:40 | **7 Research decision** | Stay on Study findings; point at **A question we can't answer** ("…less profitable in 2040" → **Outside our data**) | Joint-low vs chance ratios and the GPM/GLDAS "not findings here" note sit inside **Show the numbers** | "So the analyst's answer: the claim that joint lows are increasing is not supported. It stays a hypothesis. Next step is an observed-generation or station-wind study, not a construction decision. We don't tell you what you want to hear. We show you what NASA's evidence supports." |

**Step 1-fallback (narrow window or panel closed):** click **Trend** (bottom right) → tab
**Study findings**. Everything else is identical.

## 2. Scientific values shown (all from artifacts; do not round differently on stage)

| Value | Artifact |
|---|---|
| CyL joint lows 0.00 days/decade, CI −1.55 to +1.67, p 0.794 (BH 0.794), n 25, MDT 2.0 | `evidence-cards.json` `energy-gap-ES41` ← `data/results/energy_gap/analysis_bundle.json` |
| Region rows: R0 0.00, Galicia −0.87, CyL 0.00, Aragón +0.52, Andalucía −1.14 days/decade | `energy-research-cases.ts` (test `test_quoted_e1_numbers_match_energy_bundle_and_cards`) |
| Complementarity ratios (Peninsula 0.50, CyL 0.43, Aragón 0.79 …) | `data/results/energy_gap/independence_check.json` |
| Temperature +0.60 °C/decade, CI +0.31 to +0.87, n 26, p 0.0004, windows +0.41 to +0.83 | `gate_a_temperature/analysis_bundle.json` |
| 64/64 NOAA stations with a positive trend (57 significant), 53 within 0.2 °C/decade | `noaa_validation/analysis_bundle.json` |

## 3. Screens and states a judge may hit

| State | Where | What it means |
|---|---|---|
| ◆ Insufficient evidence | All 5 joint-low cards | No detectable trend *and* too little power to call it "no trend" (frozen rule, `ENERGY_RESEARCH.md` §0) |
| ▲ Supported increase | Temperature cards, Trend panel for temperature | p < 0.05, CI excludes 0, positive in every window |
| EXPLORATORY — multiplicity unadjusted | Rain, rain anomaly, runoff in the Trend panel | D60 guard; those labels do not survive BH across regions. Not findings |
| "No … EvidenceCard for X" + optional national reference | Evidence cards for a region without its own card | Scope-exact (D50). The national card is never shown as a regional result |
| EXPLORATORY banners | Findings panel, case sheet, cards | Pending second-person review. Keep them visible; they are honest |

## 4. Fallback route

1. **App loads but globe fails (WebGL):** the error panel says "3D globe unavailable". Switch to the
   fallback recording.
2. **Slow network:** narrate step 1 from the slide while it loads; the panels render before imagery.
3. **Fallback recording (record before 16:30):** the exact sequence of §1, 1440 × 900, EN, ~1:50, no
   audio needed. Narration for the recording:

> "An energy analyst asks: are days with both low sun and low wind becoming more common in Spain?
> AETHRA answers from NASA POWER data, 2001 to 2025, in five regions fixed before we looked. In
> Castilla y León the trend is zero days per decade, with an interval from minus 1.5 to plus 1.7:
> insufficient evidence. Not detecting a change is not proof of stability. Every number opens into
> an EvidenceCard with its NASA source, method and limits. Ask the same tool about air temperature
> and it finds a supported increase of about 0.6 °C per decade, confirmed in direction by 64 NOAA
> stations. Different questions, different answers, same rules. We don't tell you what you want to
> hear. We show you what NASA's evidence supports."

4. **Total failure:** slides 4–6 carry the same numbers and a screenshot of each state.

## 5. Risks and dependencies

| Risk | Mitigation |
|---|---|
| Second-person review not signed by pitch time | Keep "EXPLORATORY — pending independent review" visible; say it out loud once. Do not say "verified" |
| Judge asks about the hatched 2026–2040 band | "It marks that we have no validated projection. We don't forecast." Team may remove the band in judge mode (audit §4.4) |
| Judge opens a province | Rebuilt on the D64 NUTS-3 boundaries (D75). Temperature labels hold after BH; rain/runoff show EXPLORATORY — multiplicity unadjusted (D53) |
| Judge opens Rain/Runoff | They show EXPLORATORY; explain multiplicity in one sentence |
| TARO answers off-script or slowly | Not in the judge build (D76). If a judge asks for it: "TARO is a deterministic guide that only quotes EvidenceCards", ask the first starter question only |
| Venue screen < 1200 px wide | Use step 1-fallback |
| Demo path changed tonight (findings panel opens by default) | **Must be re-run 3× on the presenting machine.** The 14 Nov 3× verification no longer covers it |

Verification of this sequence so far: production build + first-view screenshot in headless Chrome
(1440 × 900) on 15 Nov 01:07. Clicks in steps 3–7 were checked in code, **not** clicked through in a
browser by this audit.

**Update 15 Nov (D75/D76):** steps 1–7 are now clicked through automatically in a real browser on
the production judge build: `scripts/e2e_judge_path.py` (3 consecutive runs, 65/65 checks) and the
Playwright suite `apps/web/e2e/` (S01 = this path, 16/16). This is a technical rehearsal on a
development machine; the **3 live rehearsals on the presenting machine are still required**.
Presentation stills: `docs/release/2026-11-15/slides/`.
