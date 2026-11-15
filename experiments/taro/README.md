# TARO experimental character

Isolated from `/explore`. AETHRA Core stays the orbital mark (D65). This folder is not on the
demo path and does not answer scientific questions.

## Rebuild

Requires Blender 4.2.

```bash
TARO_STAGE=final blender --background --python experiments/taro/blender/build_taro.py
```

`TARO_STAGE=lookdev` renders the turnaround and joint-calibration frames and skips the GLB.

## View

From `experiments/taro`:

```bash
python3 -m http.server 8765
```

Open `http://127.0.0.1:8765/web/index.html`. The page loads `export/taro.glb`. If that fails,
it shows `renders/front.png`.

## What is real

| File | Role |
|---|---|
| `source/taro.blend` | Editable Blender 4.2 file |
| `export/taro.glb` | glTF binary, skinned, with the clips below |
| `export/report.json` | Counts from the export that produced the GLB |
| `renders/*.png` | EEVEE stills from that same build |
| `web/` | Standalone Three.js viewer. `apps/web` loads its own copy of the GLB (`public/taro/taro.glb`) in `components/explore/TaroModel3D.tsx` (D81) |

Clips: `idle`, `greeting`, `listening`, `thinking`, `explaining`, `discovery`,
`insufficient`, `error`, `guiding`, plus a `*_reduced` hold for each.
Looping body clips are idle, listening, and thinking. `prefers-reduced-motion` selects
the hold clips and stops the mixer.

Canonical proportions and the state map are in `SPEC.md`. Measured limits are in
`VALIDATION.md`.
