# Muscle definition

> **Status**: Implemented
> **Author**: project owner
> **Last Updated**: 2026-11-14
> **Last Verified**: 2026-11-14
> **Implements Pillar**: your real training shows on your body

## Summary

Every one of the 19 muscle regions shows its own progress on the avatar. Size was already shown muscle by muscle. This adds definition: as a muscle is trained, its bellies rise and the lines round it appear, on that muscle only. Train biceps and the biceps become visible while the rest of the body stays as it was.

> **Quick reference** — Layer: `Presentation` · Priority: `MVP` · Key deps: `Growth engine (size and definition scores), Body file`

## Overview

Before this, a trained body only got bigger. A fully grown avatar looked large and smooth, with no abs, no line under the chest and no separation between the shoulder and the arm, so a muscle never became "visible". Definition was shown for the whole body at once, as slightly glossier skin, which nobody could see.

Now the body file carries, for every region, a second shape and a share of one picture of muscle lines. The avatar kit fades both in by that region's definition score. The engine's definition score answers quickly to training (most of the way in four weeks), so a player sees a muscle sharpen within weeks, and sees it soften again if they stop.

## Player Fantasy

I curl for a month and my avatar's arms change: the biceps stands out and a line appears along it. My friend who skips legs has a defined chest over smooth thighs, and everyone can see it. The body tells the truth about each muscle separately.

## Detailed Design

### Core Rules

1. The growth engine gives every region a size and a definition, each 0 to 100. Nothing here changes those rules. Definition moves 25% of the way each week towards 100 × (weeks of the last 4 with at least 3 hard sets) / 4.
2. The avatar kit turns the two scores into one **definition strength** per region (F1). It needs definition, and it shows more on a bigger muscle.
3. Three things fade in with that strength, on that region's skin only:
   - **Bellies**: the big muscle bellies rise as real shape, up to 7 mm. Each region has a shape named `<region>_definition` in the body file.
   - **Lines**: the grooves between muscles, and the smaller bellies such as the blocks of the abs, come from one picture (a normal map) that tilts the light. A point of skin shows the picture as far as the muscles that own it are defined (F2).
   - **Skin**: the skin over a defined muscle takes a slight sheen, and the walls of its lines are drawn a little darker (F5).
4. The abs, obliques and lower back also draw the waist in as they are defined, up to 1.25 cm, the way a leaner body's waist is.
5. Which skin belongs to which muscle comes from the body file's masks, named `_mask_<region>`. A point's masks never total more than 1. Where two muscles share skin, such as the groove between biceps and triceps, each one brings its share of the line.
6. Definition never changes how big a muscle is shown. The kit never works out a score.
7. Nothing is drawn under the trunks, so the glutes show size only.

### What is drawn

All of it is placed by numbers in [muscle_lines.py](../../tools/avatar-pipeline/muscle_lines.py), on the front and back views of the torso and round each limb.

| Area | Bellies (shape) | Lines and small bellies (picture) |
| --- | --- | --- |
| Chest | | Line between the pecs, line under each pec, split between upper and mid chest, line between pec and shoulder, collarbone |
| Abs and obliques | | Centre line, three cross lines, the outer edge, four blocks a side, four rib ridges, the oblique above the hip |
| Back | | Spine groove, two columns beside it, lower edge of the traps, shoulder-blade muscles, upper and lower edges of the lats |
| Shoulder | Front, side and rear heads | Lower edge of the shoulder, the two splits between its heads |
| Upper arm | Biceps, two heads of the triceps | Lines either side of the biceps, split between its heads, split between the triceps heads, the flat tendon above the elbow |
| Forearm | Two muscle groups near the elbow | Four lines running to the wrist |
| Thigh | Middle, outer and teardrop quads; two hamstrings | Lines between the quads, the outer thigh line, the hamstring split, the hollow behind the knee |
| Lower leg | Two calf heads, the shin muscle | Line between the calf heads, their lower edge, a line either side below them, one down the outer shin |

### States and Transitions

None. The display holds no state: the same scores always give the same picture. The viewer already eases between two sets of scores, and definition eases with them.

### Interactions with Other Systems

| System | Direction | What crosses |
| --- | --- | --- |
| Growth engine | in | each region's `size` and `definition` |
| Body pipeline | in | the body file: shapes, masks and the lines picture |
| Viewer | out | the body it draws; no change to the viewer |
| Arena fight | none yet | the fight will show the same body, so fighters look as trained as they are |

## Formulas

### F1. Definition strength

`S = (d / 100) × (0.5 + 0.5 × s / 100)`

| Variable | Meaning | Range |
| --- | --- | --- |
| `d` | the region's definition score | 0 to 100 |
| `s` | the region's size score | 0 to 100 |
| `S` | how strongly the region's bellies and lines show | 0 to 1 |

Scores outside 0 to 100 are held at the nearest end. A score that is not a number counts as 0.

**Worked example.** A beginner does only curls for 12 weeks. The biceps reaches a size of about 45 and a definition of about 97. `S = 0.97 × (0.5 + 0.5 × 0.45) = 0.70`. The chest, never trained, has `d = 0`, so `S = 0`.

**Why size is in it.** Definition reaches 100 in about two months, long before size does. If lines showed in full at once, a slim beginner would have a complete six-pack in eight weeks and nothing would be left to earn. Half shows on the smallest muscle and all of it on the biggest.

### F2. How strongly a point of skin shows the lines

`W(p) = min(1, Σ over regions of mask_r(p) × S_r)`

| Variable | Meaning | Range |
| --- | --- | --- |
| `mask_r(p)` | how much of point `p`'s skin belongs to region `r` | 0 to 1; a point's masks total at most 1 |
| `S_r` | region `r`'s definition strength (F1) | 0 to 1 |
| `W(p)` | the share of the lines picture shown at `p` | 0 to 1 |

**Worked example.** A point in the groove between biceps and triceps has masks of 0.5 and 0.5. With biceps at `S = 0.70` and triceps at 0, `W = 0.35`: the groove shows at about a third, and reaches full only when both muscles are defined.

### F3. Height of the muscle features

A line: `h = −depth × strength × exp(−(distance / width)²)`. A belly: `h = height × (1 − x² − y²)²` inside the belly and 0 outside, where `x` and `y` are the distances from its centre divided by its radii.

| Variable | Meaning | Range |
| --- | --- | --- |
| `depth` | how deep a line is cut; negative raises a ridge | 1.2 to 4.5 mm |
| `width` | how far a line spreads | 5 to 20 mm |
| `strength` | how strong the line is at that spot along it | 0.3 to 1 |
| `height` | how high a belly rises; negative presses a hollow | −3 to 7 mm |

**Worked example.** The line under the pec is 4 mm deep and 8 mm wide. On the line `h = −4 mm`; 8 mm to the side `h = −4 × exp(−1) = −1.5 mm`; 16 mm to the side `h = −0.07 mm`.

### F4. From height to the lines picture

For every texel of the skin's picture, the pipeline finds the point of the body it covers, works out `h` there, and stores the direction the skin now faces:

`n = normalise(−∂h/∂u × m, −∂h/∂v × m, 1)`, with `m = max(|Pu|, |Pv|) / |Pu × Pv|`

`∂h/∂u` and `∂h/∂v` are how fast the height changes per texel across and up the picture. `Pu` and `Pv` are how far the body's surface moves per texel in those directions, so `m` turns a change per texel into a slope. This is the form three.js expects when a body file carries no tangents.

**Worked example.** Where the picture is laid on the body evenly at 1.2 mm per texel, `m = 1 / 1.2 mm`. A height falling 0.5 mm per texel across the picture gives a slope of 0.42, so the skin tilts about 23°.

### F5. Shading

At each pixel, with `t = (tx, ty)` the tilt stored in the picture and `W` from F2:

- the tilt applied is `t × W`;
- the skin colour is multiplied by `1 − 0.24 × min(1, 2 × |t|) × W`;
- the skin's roughness is multiplied by `1 − (1 − 0.52 / 0.7) × W`, from 0.7 (soft) down to 0.52 (tight).

**Worked example.** On the wall of a deep line (`|t| = 0.5`) over a fully defined muscle (`W = 1`), the colour is multiplied by `1 − 0.24 = 0.76` and the roughness is 0.52. Over an untrained muscle (`W = 0`) nothing changes.

## Edge Cases

- **A score that is not a number**: counts as 0, so nothing shows rather than the display breaking.
- **Definition without size** (a new player who trains every week): half strength, never more.
- **Size without definition** (a big muscle after a month off): `d` has fallen, so the lines fade while the size stays. Coming back restores them within weeks.
- **A body file without the definition shapes or masks**: loading it fails with a message naming the missing shape or mask, and the page falls back to the stand-in body, as for any unusable file.
- **A viewer that is not the avatar kit** (Blender, or a game engine later): it shows the lines picture in full everywhere, because the fading is done by the kit's shader.
- **Skin no muscle owns** (head, hands, feet): all masks are 0, so nothing shows.

## Dependencies

- Growth engine: `size` and `definition` per region. No change.
- Body pipeline: Blender 4.5 and MPFB, as before. No new downloads.
- three.js 0.186: the kit replaces one step of the standard material's shader.

## Tuning Knobs

| Knob | Where | Value | What it changes |
| --- | --- | --- | --- |
| `DEFINITION_FLOOR` | [scores.ts](../../shared/avatar-kit/src/scores.ts) | 0.5 | the share shown on the smallest muscle (F1) |
| `LINE_STRENGTH` | [modelBody.ts](../../shared/avatar-kit/src/modelBody.ts) | 1 | how hard the lines tilt the light |
| `LINE_SHADE` | modelBody.ts | 0.24 | how dark the walls of a line are drawn |
| `SOFT_ROUGHNESS`, `CUT_ROUGHNESS` | modelBody.ts | 0.7, 0.52 | the skin's sheen, undefined and defined |
| Each feature's place, width and depth | [muscle_lines.py](../../tools/avatar-pipeline/muscle_lines.py) | see the file | where a line runs and how strong it is |
| `LEAN_MACRO` | [build_body.py](../../tools/avatar-pipeline/build_body.py) | weight 0.2 | how far the waist draws in |
| `WAIST_REGIONS` | build_body.py | abs, obliques, lower back | which regions draw the waist in |
| `MUSCLE_MAP_SIZE` | build_body.py | 2048 | the lines picture's size in texels |

The first four take effect on the page at once. The rest need `npm run build:body`.

## Visual/Audio Requirements

The lines must read at the size the page shows the avatar (about 600 pixels tall) and must not look painted on when zoomed in. No sound.

## Game Feel

Progress should be visible within a month of training a muscle, and unmistakable within three. Losing it should be visible too.

## UI Requirements

None new. The muscle list already shows each region's definition bar next to its size bar.

## Cross-References

- [Architecture.md](../../Architecture.md): the body file and the avatar kit.
- [fight-physics.md](fight-physics.md): the fight reads the same scores.
- Decisions D-061 and D-062 in [Decision.md](../../Decision.md).

## Acceptance Criteria

- [x] AC1: the body file holds `<region>_definition` and `_mask_<region>` for all 19 regions. Test: "holds a definition shape and a mask for every region".
- [x] AC2: the skin carries the lines picture and the trunks do not. Test: "carries the muscle lines on the skin and nowhere else".
- [x] AC3: F1 holds: 0 without definition, 0.5 at size 0, 0.75 at size 50, 1 at size 100, and 0 for a score that is not a number. Tests: `definitionStrength`.
- [x] AC4: defining one region shows that region's shape at F1 and no other, and leaves every size shape alone. Test: "shows a region's definition on that region only".
- [x] AC5: with only the calves defined, no point above the knee shows lines; with nothing defined, no point does. Test: "draws the muscle lines over the defined muscle and nowhere else".
- [x] AC6: the skin's shader is taught to fade the lines, and the skin's own roughness does not change with scores. Test: "teaches the skin's shader to fade the lines in".
- [x] AC7: on the page, 12 weeks of curls alone makes the arms visibly more muscular and leaves the chest and abs smooth. Checked by screenshot on 2026-11-14.
- [x] AC8: on the page, a body trained all over for 36 weeks from Advanced shows abs, the line under the chest, shoulder heads, arm lines, a spine groove and lats. Checked by screenshot on 2026-11-14.

The screenshots for AC7 and AC8 are in [pictures/muscle-definition-page.jpg](pictures/muscle-definition-page.jpg). Top row: a beginner before, and after 12 weeks of curls alone. Bottom row: trained all over, front and back.

## Open Questions

- **File size.** The body file grew from 2.7 MB to 5.1 MB. About 1 MB of that is the masks, stored as full numbers. They could be packed to a quarter of that if the size matters on phones.
- **Drawn by numbers.** The lines are placed by code, not sculpted by an artist. If an artist later makes a better lines picture for this body, it replaces `muscle-lines.png` with no change to the kit.
- **The forearm** has general lines rather than named muscles, because its muscles twist with the hand.
- **Growth pace (Q-17).** With today's pace a beginner's biceps is at `S = 0.70` after 12 weeks. If growth is slowed to real-life pace, `DEFINITION_FLOOR` should be looked at again.
