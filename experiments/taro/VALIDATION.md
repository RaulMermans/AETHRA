# TARO validation

Measured from the Blender 4.2.15 export on 14 Nov 2026. Numbers are copied from
`export/report.json` and from loading the GLB in the standalone viewer.

## Assets that exist

| Asset | Size | Notes |
|---|---|---|
| `source/taro.blend` | 4.5 MB | Saved by the build script after the rest pose |
| `export/taro.glb` | 1.48 MB | 24,744 triangles, 46 meshes, 14 materials, 1 skin, 22 joints |
| Textures | none | Flat palette materials. Smart-projected UVs are in the meshes |

Triangle count is inside the 15–35k guide. The GLB is under 5 MB. There are 46
skinned draws. That is the main runtime cost, not the triangle count.

## Clips in the GLB

`idle`, `greeting`, `listening`, `thinking`, `explaining`, `discovery`,
`insufficient`, `error`, `guiding`, and the matching `*_reduced` holds.
`idle` includes bone channels and one morph-weight channel. The Face mesh has
seven shape keys: blink, happy, curious, thinking, surprised, confident, concerned.

## What was checked

- EEVEE turnaround: front, left, right, back, three-quarter, small front, dark front.
- Expression stills and pose stills under `renders/`.
- GLB magic, JSON chunk, triangle count, animation names, skin, and morph targets
  parsed without Blender.
- Browser viewer at `web/index.html`: the model loaded, Idle was selected, and
  Greeting at clip time 0.92 s raised the right-side glove in front of the chest.
  The bone quaternion matched the greeting channel in the file.
- The viewer is not imported by `apps/web`. `/explore` was not modified.

## What was not checked

- `npm run typecheck` and `npm run lint` in `apps/web` (no app files changed).
- ruff (not installed).
- A full pass of every clip in the browser. Greeting was the deformation check.
- Mobile layout, screen readers beyond the button names, and `prefers-reduced-motion`
  in the browser.
- Draco compression. The file is uncompressed glTF.

## Limits of this model

This is a rigged blockout, not a finished hero sculpt.

- Hair is a voxel remesh of the spike silhouette. A seam remains on the crown.
- The face reads at launcher size, but the mouth shapes are small geometric moves,
  not a blendshape sheet that matches every drawing on the character sheet.
- Armor is rounded boxes and cylinders. Gloves have no fingers. Boots are rigid
  and parented to the shins.
- Orange nozzles are small and easy to miss at icon size.
- Joint calibration found that local X raises the arm and bends the elbow. The
  wave, thinking, and guiding poses use that axis. They are readable, not polished.
- An LLM must not drive these clips. The page only maps the nine named states.

## Not done, on purpose

TARO is not mounted in AETHRA Core. P0-P1 through P0-P3 are still open, and D65
keeps the Core face as the orbital mark. Putting this character on `/explore`
needs an explicit decision first.
