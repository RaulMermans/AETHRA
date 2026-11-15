# Impact Validation

**Status: HUMAN IMPACT UNVALIDATED.** No participant sessions have been run (15 Nov 2026). Do not
quote impact numbers, testimonials or "faster than X" anywhere until §5 contains real observations.

## 0. What is and is not demonstrated (updated 15 Nov, D76)

| Layer | Claim we can make | Evidence | Status |
|---|---|---|---|
| **Intended value** | AETHRA helps an analyst tell apart an apparent pattern, a quantified trend, a statistically supported finding, an inconclusive result and an unsupported inference before an assumption enters a study | Product design; Claim Test (A insufficient evidence · B supported increase · C outside the evidence) | Hypothesis |
| **Functional capability** | The judge build completes the flagship tasks and shows the required evidence | 5 SIMULATED use cases, Playwright, 16/16 + 12/12 passes (`SCENARIO_VALIDATION.md`) | Verified (automated) |
| **Scientific validity** | The displayed numbers are what the pipeline produced and reproduce | Gate A/B re-runs identical (`FINAL_RELEASE_VALIDATION.md`) | Verified by reproduction; human review pending |
| **Human impact** | Real users interpret evidence correctly / faster / decide better | — | **Not measured** |

The automated "time-to-evidence proxy" (median 1.9–11.5 s per scenario) is a software timing on a
dev machine, not a human reading time, and is never compared with another product.

## 1. Intended beneficiary (hypothesis)

A regional renewable-energy resource assessment analyst (energy agency, development research team,
environmental planning body, applied energy research institute).

## 2. Job-to-be-done

"Help me determine whether apparent historical changes in environmental conditions are supported
strongly enough to justify further technical investigation."

## 3. Outcome measure

**Primary:** a new user reaches the relevant EvidenceCard and states the outcome correctly
("insufficient evidence", not "no change" and not "increasing").
**Secondary:** time-to-evidence; correct source and period; at least one correct caveat; a
reasonable next research step.

## 4. Small usability protocol (2–3 participants, ~15 min each)

**Research question:** Does AETHRA help a new user reach and correctly interpret a defensible NASA
trend finding?

**Participants:** 2–3 people who did not build AETHRA. Record background in one line each (e.g.
"MSc energy engineering, no NASA data experience"). Prefer someone with energy or environmental
analysis background. Teammates and their friends are acceptable only if disclosed.

**Setup:** judge build, ≥ 1200 px wide window, EN, fresh tab on `/explore`. Facilitator does not
point or explain. Screen + audio recorded only with verbal consent; no minors.

**Task (read aloud, verbatim):**
> "Determine whether jointly low solar-wind conditions became more frequent in Castilla y León
> between 2001 and 2025. Find the evidence, and tell me what the conclusion does *not* establish."

**Stop:** when the participant gives an answer, or at 5 minutes.

**Then ask:**
1. "What is the result, in your own words?"
2. "Which NASA data and which years is it based on?"
3. "What does this result not tell you?"
4. "If you were the analyst, what would you do next?"
5. "Was anything confusing?"

**Measures and scoring (decide before running; do not change after):**

| # | Measure | How | Pass criterion |
|---|---|---|---|
| M1 | Time-to-evidence | Stopwatch from the end of reading the task to the moment the CyL joint-low EvidenceCard is on screen | Recorded as is; no target claimed |
| M2 | Significance interpretation | Answer to Q1 | Says no detectable / not supported / insufficient evidence. **Fail** if "no change", "stable", "decreasing" or "increasing" |
| M3 | Source and period | Answer to Q2 | Names NASA POWER (or satellite solar + MERRA-2 wind) **and** 2001–2025 |
| M4 | Locates EvidenceCard | Observation | Opens the "Result for Castilla y León" joint-low card unaided |
| M5 | Caveats | Answer to Q3 | ≥ 1 of: not generation, not a forecast, not site suitability, not proof of stability |
| M6 | Next step | Answer to Q4 | Proposes further study (e.g. generation data, station wind, longer record), **not** "build / don't build" |

**Record per participant:** background · exact task wording used · M1 time · verbatim answers ·
M2–M6 pass/fail · completion (yes / partial / no) · observed confusion (where they hesitated, what
they clicked first) · facilitator interventions (should be none).

**Optional comparison:** the same task in NASA POWER Data Access Viewer or Giovanni. Only if the
participant gets an equivalent task, equivalent time, and you disclose that those tools are not built
to answer a pre-registered joint-low question and AETHRA's result was precomputed. Report it as a
workflow difference, never as "X % faster".

## 5. Results

*None yet.* Template:

| P | Background | M1 (s) | M2 | M3 | M4 | M5 | M6 | Completed | Confusion observed |
|---|---|---|---|---|---|---|---|---|---|
| P1 | | | | | | | | | |

## 6. Limitations (even after running)

n = 2–3 is formative, not evidence of effect. Participants will not be the real target users. The
first view now shows the answer directly, which makes M1 easy by design. The task is one we built the
product around. Nothing here measures better decisions in practice.

## 7. What a real evaluation would need later

Recruited analysts from the target organisations; several tasks including ones the product was not
designed around; a comparison arm with equivalent preparation; pre-registered measures; interpretation
errors as the primary outcome; follow-up on whether a decision actually changed.

## 8. How to talk about impact today

Say: "A defined user, a defined research decision, and a protocol to test whether we help." Do not
say: "AETHRA reduces time-to-evidence by X", "analysts trust it", "it improved planning".
