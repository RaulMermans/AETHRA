# Accessibility — AETHRA inclusive mode

AETHRA's `/explore` has an **Accessibility** button in the top bar. It opens a small dialog with three
independent switches. Each one is saved per viewer (`localStorage["aethra-a11y"]`) and mirrored on
`<html>` as a data attribute so CSS and components can react:

| Switch | Attribute | For whom | In one line |
|---|---|---|---|
| Blind / low vision | `data-a11y-screenreader="on"` | screen-reader users, low vision | text alternatives, announcements, map in words, read aloud |
| Deaf / hard of hearing | `data-a11y-deaf="on"` | deaf, hard of hearing, noisy rooms | every sound or spoken cue also appears as text on screen |
| Colour-blind safe | `data-a11y-colorblind="on"` | colour-vision deficiency | CVD-safe palettes plus symbols, so colour is never the only cue |

Shared contract (`apps/web/lib/a11y/accessibility.tsx`): `useAccessibility()` returns `settings`,
`setFlag`, `toggle`, `announce(text)` (polite aria-live region) and `notify(text)` (visible toast).
Read-aloud lives in `apps/web/lib/a11y/speak.ts`.

---

## Deaf / hard of hearing

**Owner:** agent C · **Status:** done and verified (15 Nov 2026)

### Starting point

AETHRA had **no audio at all** (repo-wide search for `Audio`, `AudioContext`, `speechSynthesis`,
`<audio>`, `<video>`, sound files: no hits). The only sound we add is the optional *Read aloud* button of
the blind mode. The deaf-mode rule is: **nothing is ever only heard**.

### What it does

1. **Captions for everything spoken.** All speech goes through `speak()` (`lib/a11y/speak.ts`). It
   emits a `{text, state:"start"}` event *before* any audio starts and `{state:"end"}` when it ends.
   `<CaptionBar/>` (`components/a11y/CaptionBar.tsx`, mounted by `AccessibilityProvider`) shows the
   exact text at the bottom of the screen.
   - Shown for **everyone** while speaking (captions help in noisy rooms too), not only in deaf mode.
   - Stays readable after the voice stops: at least 5 s in total, 8 s extra in deaf mode.
   - `aria-live="off"`: screen-reader users already hear the voice, so it is not read twice.
   - White on near-black (contrast > 15:1), no animation, a **✕ Close captions** button (it hides the
     text but does not stop the voice).
   - If the browser has no speech synthesis, `speak()` still shows the caption and makes no sound.
2. **Screen-reader cues become visible.** With deaf mode on, every `announce(text)` (e.g. "Colour-blind
   safe colours: on", "Map now shows solar zones") also appears as a toast. Those echo toasts are
   `aria-hidden` so assistive tech does not repeat them.
3. **Readable, steady toasts** (`notify()` and the echoes): white on `neutral-950` (> 15:1, WCAG AA
   needs 4.5:1), 16 px text, on screen 6 s (10 s in deaf mode, always ≥ 5 s), no animation or flashing
   (WCAG 2.3.1 allows at most 3 flashes/s; we have none), duplicates replace each other instead of
   blinking, each toast can be dismissed with **✕**.
4. **Demo video.** `docs/release/2026-11-15/judge-path-run1-1440x900.webm` has **no audio track**
   (ffprobe: one VP9 video stream, no audio). Instead of a speech transcript it has a descriptive one:
   - [`judge-path-run1-1440x900.en.vtt`](release/2026-11-15/judge-path-run1-1440x900.en.vtt) — WebVTT,
     13 timed cues describing what is on screen (`<track kind="descriptions">`).
   - [`judge-path-run1-1440x900.transcript.md`](release/2026-11-15/judge-path-run1-1440x900.transcript.md)
     — same content as a table, with the values shown and their source.

### How to use it in code

```ts
import { speak, stopSpeaking, isSpeaking, onSpeech } from "@/lib/a11y/speak";
speak("Castilla y León: insufficient evidence", { lang: "en" }); // captioned automatically
const off = onSpeech(({ text, state }) => console.log(state, text)); off();

const { announce, notify } = useAccessibility();
announce("Map now shows solar zones"); // screen readers; ALSO a toast when deaf mode is on
notify("Data source unavailable");      // always a visible toast
```

Never call `window.speechSynthesis`, `new Audio()` or `AudioContext` directly, and never add
`<audio>`/`<video>` without `<track kind="captions|subtitles|descriptions">`:
`tests/test_a11y_no_audio_only.py` fails the build if you do.

### How it was verified

| Check | Command | Result (15 Nov 2026) |
|---|---|---|
| No audio-only code; speak→captions contract; media have .vtt + transcript; scanner self-test with bad fixtures | `python tests/test_a11y_no_audio_only.py` | 4/4 pass |
| Browser: deaf mode toast via the real menu (contrast ≥ 4.5, no animation, still visible at 5.2 s, dismissible); control with deaf off (no toast); `speak()` with stubbed `speechSynthesis` shows the exact caption, `aria-live="off"`, lingers after speech, closes | `npx playwright test e2e/a11y-deaf.spec.ts` (against `next dev`, `E2E_BASE_URL=http://localhost:3000`, system Chrome) | see agents/2026-11-15_a11y-sordos.md |
| Types / lint | `npm run typecheck`, `npx eslint lib/a11y components/a11y e2e/a11y-deaf.spec.ts` | clean |

Limits: the e2e test stubs `speechSynthesis` (headless Chrome has no voices), so it proves the
caption path, not real audio output. The video transcript was made from frames sampled every 2.5 s, so
cue times are approximate (±1 s).

---

## Blind / low vision

**Owner:** agent B · **Status:** in progress — *agent B: complete this section with your final report.*

From agent B's progress log (15 Nov): skip link and landmarks; the globe exposed as `role="img"` with a
dynamic label; a **Map in words** view (solar zones by traffic-light verdict with a *Select* button,
climate maps described in text); focus moves into panels on open and back on close, `Esc` closes;
`announce()` on panel, layer, zone and data changes; **Read aloud** buttons (`ReadAloudButton`, uses
`speak()`, so it is always captioned) on findings, executive tiles and the zone sheet; EN/ES copy in
`lib/i18n/a11y-blind-copy.ts`. Verification planned: `e2e/a11y-screenreader.spec.ts` with
`@axe-core/playwright` plus a keyboard-only path.

<!-- AGENT B: replace this paragraph with "What it does" + "How it was verified" (commands and results). -->

---

## Colour-blind safe

**Owner:** agent A · **Status:** done (from agent A's progress log, 15 Nov) — *agent A may refine.*

- **Palettes:** sequential maps switch to viridis / inferno / cividis (lightness always increases, so
  order survives any colour vision); diverging maps use blue–white–orange (`lib/globe/climate.ts`).
- **Verdict colours** (good / mixed / avoid) use Okabe–Ito `#0072B2 / #E69F00 / #D55E00` **plus
  symbols** ✓ ~ ✕, so colour is never the only cue; MITECO sensitivity classes and their PNG overlays
  have CVD versions (`*-cvd.png`, built by `scripts/build_miteco_cvd_png.py`).
- **Legends** add shapes or bars (▼/▲, ▁▃▅▇, ● ▲ ■ ◌) next to colour; a CSS fallback recolours any
  remaining inline verdict swatches.
- **Verified:** `python tests/test_cvd_palettes.py` 6/6 — minimum ΔE2000 between verdict colours 22.2
  normal / 18.2 protan / 12.5 deutan / 15.5 tritan (the default colours fail at 7.0 protan / 7.7
  deutan); sequential L* monotonic under all four simulations. `e2e/a11y-colorblind.spec.ts` against
  the dev server.

<!-- AGENT A: add final e2e numbers if they changed. -->

---

## Standards referenced

WCAG 2.2 AA: 1.1.1 non-text content, 1.2.1/1.2.2 captions and alternatives for time-based media,
1.3.1 info and relationships, 1.4.1 use of colour, 1.4.3 contrast (minimum), 2.1.1 keyboard,
2.2.1 timing adjustable (toasts ≥ 5 s and dismissible), 2.3.1 three flashes, 4.1.3 status messages.
