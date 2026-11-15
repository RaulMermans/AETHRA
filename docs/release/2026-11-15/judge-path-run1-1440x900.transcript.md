# Transcript — `judge-path-run1-1440x900.webm`

**Audio:** none. The file has a single VP9 video stream (800×500, 25 fps, 49.96 s) and **no audio
stream** (checked with ffprobe on 2026-11-15). It is a silent Playwright recording of the judge path,
so there is nothing spoken to transcribe. Below is a **descriptive transcript**: what appears on
screen, in order, so the video is usable without seeing it (blind / low vision) and confirms nothing
is lost without sound (deaf / hard of hearing).

Captions file (same content, timed): [`judge-path-run1-1440x900.en.vtt`](judge-path-run1-1440x900.en.vtt)
(WebVTT, `kind=descriptions`). To use it in a player:

```html
<video src="judge-path-run1-1440x900.webm" controls>
  <track kind="descriptions" src="judge-path-run1-1440x900.en.vtt" srclang="en" label="Description" default>
</video>
```

Values below are the ones the app displays; their source is
`apps/web/public/data/evidence-cards.json` (NASA POWER daily solar + wind, NASA MERRA-2 air
temperature). Timings are approximate (frames sampled every 2.5 s).

| Time | What is shown |
|---|---|
| 0:00–0:04 | AETHRA opens on `/explore`. Dark screen with a spinner and the text "Preparing Spain…". Left side: map controls (Spain / Region / Province; Temperature selected; year 2025) and a colour legend from 9.3 °C to 22 °C. |
| 0:04–0:08 | The 3D globe appears, with dots for NOAA weather stations ("Temperature / rain gauge. Not a power plant."). The **Study findings** panel opens on the right. |
| 0:08–0:13 | **Research question:** "Are days when solar and wind resources are both low becoming more frequent in Spain (2001–2025)?" Note: pre-computed by the Python pipeline; exploratory until independent human review. |
| 0:13–0:18 | **Answer — joint solar + wind lows (NASA POWER): Insufficient evidence (5/5 regions).** "No detectable trend in joint low-resource days, 2001–2025, in any of the five pre-registered regions. Not detecting a change is not proof of stability. Not generation." Per region (days per decade): Peninsula + Balearics 0.00, Galicia −0.87, Castilla y León 0.00, Aragón +0.52, Andalucía −1.14. Meanwhile the globe zooms to Spain and paints the 2025 temperature map. |
| 0:18–0:20 | **Contrast — air temperature (NASA MERRA-2): Supported increase**, +0.60 °C per decade (95% CI +0.31 to +0.87; n = 26), 2000–2025. |
| 0:20–0:24 | The user selects **Castilla y León**. The **Research cases** panel shows case study 003 "Solar–wind resource complementarity", label "EXPLORATORY", verdict "Insufficient evidence": trend 0.00 days per decade (CI −1.55 to +1.67), 25 years, median 7 days/year. |
| 0:24–0:31 | The camera flies to Castilla y León, outlined in yellow. A line chart shows joint-low days per year (2001–2025) with a dashed Theil–Sen line that stays flat. |
| 0:31–0:34 | The panel scrolls: complementarity is descriptive (160 observed joint-low days vs 368 expected if independent, ratio 0.43); why this region was chosen; the 652 registered plants (378 PV, 274 wind) are context only, not NASA evidence, and not site suitability. Buttons "Open EvidenceCard" and "Return to Spain". |
| 0:34–0:39 | The **EvidenceCard** opens: "Have days with jointly low solar and wind resources become more or less frequent in Castilla y León since 2001?" → **Insufficient evidence**, ±0.00 days per decade, 95% CI −1.55 to +1.67, with the yearly chart. |
| 0:39–0:44 | The card lists **What / Where / When / Evidence** (Theil–Sen slope + Gilbert 95% CI; Mann–Kendall with Hamed–Rao correction; n = 25 years) and a warning box: "Do not conclude: not electricity generation, not grid reliability or outage risk, not site suitability, not a forecast." "Sources & provenance" is expanded. |
| 0:44–0:47 | The panel closes. The globe shows Castilla y León with station dots and the hint "Drag to orbit · Scroll to zoom · Click a station". |
| 0:47–0:49 | The **This place** panel: Castilla y León air temperature — **Supported increase**, +0.61 °C per decade (95% CI +0.29 to +0.95), 2000–2025, n = 26 years; 2025 value 12.3 °C (observed); source NASA MERRA-2 T2M, area-weighted. |
| 0:49–0:50 | The view returns to **Study findings**. End of recording. |

**What a viewer should take away:** the main energy question (joint solar + wind lows) has an
honest *insufficient evidence* answer in all five regions, while air temperature shows a supported
warming trend; the app shows uncertainty (95% CI) and what *not* to conclude.
