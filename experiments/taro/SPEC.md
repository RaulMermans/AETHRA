# TARO canonical model specification

**Status:** experimental. Not part of the AETHRA Core MVP.

AETHRA Core on `/explore` stays the orbital mark from D65. The personality spec still
describes that mark as non-humanoid. This character is an isolated production study
from the supplied TARO sheet. It does not replace Core, does not answer scientific
questions, and is not on the demo path while P0-P1–P0-P3 are open.

The supplied character sheet is the visual source of truth. Lighting blooms, rim
glows, and speed streaks in that illustration are not geometry.

## Identity

Youthful stylized explorer, about four and a half heads tall, large head, short legs,
oversized gloves and boots. Hair silhouette is the recognition feature: two tall
glossy black masses rising up and outward, a lower center peak, bangs over the
forehead, and a rounded back mass.

Face: large outlined eyes, small nose, simple mouth, thin brows. Expressions stay
inside the sheet (neutral, happy, curious, thinking, surprised, confident, concerned).
Concerned is the insufficient-evidence expression: attentive and neutral, not afraid.

## Palette

| Role | Hex | Material |
|---|---|---|
| Space navy undersuit | `#0B1E3A` | Roughness 0.55, non-metal |
| Mineral white armor, gloves, boots | `#F5F6F8` | Roughness 0.48 |
| Energy orange | `#FF7A3D` | Shoulder rings and boot nozzles. Nozzles emit at strength 1.4 |
| Electric cyan | `#00E5FF` | Belt core. Base color plus emission strength 2.5 |
| Soft metal | `#C9D1D9` | Metallic 0.65, roughness 0.35 |
| Black hair and pupils | `#111318` | Hair roughness 0.32 |
| Skin | `#F4C2A4` | Roughness 0.62. Not in the sheet swatches; matched to the face paint |
| Iris | `#7ED0EA` | Slight emission so the eyes survive small sizes |

Flat materials, no textures. UVs are generated so a later painted map has a place to go.
Texture resolution is therefore 0. A 1024 map would blur the flat suit at this size.

## Proportions (meters, Blender Z-up, character faces −Y)

| Landmark | Value |
|---|---|
| Head center | (0, 0, 1.32), radius 0.15 |
| Eye centers | x = ±0.055, y = −0.132, z = 1.318 |
| Shoulder | z = 1.12, x = ±0.18 |
| Hip | z = 0.74 |
| Boot center | z = 0.18, size 0.16 × 0.24 × 0.34 |
| Hair tips | about z = 1.72 |

Character left is +X. Rest pose is a relaxed A-pose. Armor, hair, gloves, boots, and
eyes are rigid shells weighted 100% to one bone. The neck, torso, and limbs are
separate shells with overlapped cuffs so ordinary bends do not candy-wrapper.

## Rig

`root → pelvis → spine → chest → neck → head`

Arms: `shoulder → upper_arm → forearm → hand`

Legs: `thigh → shin → foot`

Eyes: `eye_L`, `eye_R`, parented to `head`.

Facial animation is shape keys on one `Face` mesh: `blink`, `happy`, `curious`,
`thinking`, `surprised`, `confident`, `concerned`.

## Clips

24 fps. Looping clips start and end on the same pose.

| Clip | Loop | Use |
|---|---|---|
| `idle` | yes | Breath, blink, small head drift |
| `greeting` | no | Wave and smile |
| `listening` | yes | Head tilt, curious face |
| `thinking` | yes | Hand toward chin. Does not mean analysis finished |
| `explaining` | no | Open hands |
| `discovery` | no | Short lift. Does not mean a result is significant |
| `insufficient` | no | Concerned, still |
| `error` | no | Same family as insufficient, small head shake |
| `guiding` | no | Hover and point. The app still owns the camera |
| `*_reduced` | hold | Same pose family without cyclic motion |

The runtime may play only these names. An LLM does not pick clips.

## Performance budget

Target 15–35k triangles, one skinned draw per material after glTF primitives are
merged by the loader, no textures, GLB under 5 MB. Measured numbers live in
`export/report.json` after a real export, not in this spec.
