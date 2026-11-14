# Muscle Definition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show each muscle region's definition on the avatar, on that region only: raised bellies, lines between muscles, and tighter skin.

**Architecture:** The body pipeline places every muscle feature by numbers (`muscle_lines.py`), raises the big bellies as a second shape per region, bakes the lines into a normal map, and stores each region's mask in the body file. The avatar kit turns size and definition into one strength per region, sets the shapes, and writes a per-point weight that the skin's shader uses to fade the map in.

**Tech Stack:** Blender 4.5 with MPFB and numpy for the pipeline; TypeScript, three.js 0.186 and Vitest for the kit. No new packages or downloads.

**Spec:** [design/gdd/muscle-definition.md](../gdd/muscle-definition.md)

**Execution:** native, in one session. The look was tried first as a throwaway build into a scratch folder; the pipeline code that survived is checked by its pictures, as the pipeline always has been, and the kit was built test-first.

## Global Constraints

- No new npm packages, Python packages or asset downloads.
- The kit never works out a score. It reads `size` and `definition` and only decides how to show them.
- The body file stays a standard glTF file: shapes, a normal map and custom attributes only.
- Body file names: `<region>_size`, `<region>_definition`, `_mask_<region>`, for the 19 ids in `engine/src/regions.ts`.
- Code comments: one short line at most; none in tests.
- Commits are authored by the owner's git identity with no AI attribution or assistant names.
- `ProjectFlow.md`, `Decision.md` and `Architecture.md` are updated in plain language in the commit that finishes the step.

## Review Focus

- A score that is not a number (`NaN`): the strength is 0, never `NaN`. Test in Task 2.
- A point whose masks, times strengths, total over 1 through rounding: the weight is held at 1. Test in Task 3.
- A body file missing a definition shape or a mask: loading throws an error naming it, so the page falls back to the stand-in. Covered by the loader's existing fallback; the names are checked in Task 1's test.
- A three.js upgrade that renames the shader step the kit replaces: the shader test in Task 3 fails instead of the lines silently showing in full.
- Lines leaking onto a neighbouring muscle: Task 3's test defines only the calves and checks no point above the knee shows lines.

---

### Task 1: Body file carries definition shapes, masks and the lines picture

**Files:**
- Create: `tools/avatar-pipeline/muscle_lines.py`
- Modify: `tools/avatar-pipeline/build_body.py`, `tools/avatar-pipeline/run.mjs`, `.gitignore`
- Rebuild: `shared/avatar-kit/assets/body-male.glb`, `tools/avatar-pipeline/previews/`
- Test: `shared/avatar-kit/tests/modelBody.test.ts`

**Interfaces:**
- Produces, in the body file: shapes `<region>_definition`; point attributes `_mask_<region>` (three.js loads them under those lower-case names); `normalMap` on the material named `skin`.
- Produces, in `muscle_lines.py`: `height(points, normals, gates, landmarks, part) -> metres`, `gates_from_masks(masks)`, `normal_map(positions, normals, gates, corner_points, uv, landmarks, size) -> (pixels, filled)`, and the constants `SHAPE` and `MAP`.

- [x] **Step 1: Write the failing tests** `holds a definition shape and a mask for every region` and `carries the muscle lines on the skin and nowhere else`.
- [x] **Step 2: Run them.** Expected: FAIL, the file has no `biceps_definition` and the skin's `normalMap` is null.
- [x] **Step 3: Write `muscle_lines.py`**: the feature tables for the torso front and back and the four limb stretches, the height of a line and a belly (spec F3), and the bake (spec F4).
- [x] **Step 4: Extend `build_body.py`**: measure the leaner body for the waist, add `<region>_definition` shapes (bellies, plus the waist for `WAIST_REGIONS`), keep the masks as `_mask_<region>`, bake and attach the lines picture, render `look-toned-front` and `look-defined-front/back/side`, export attributes. Add `--fast` and `--map-size`; `run.mjs` passes extra arguments through.
- [x] **Step 5: Run `npm run build:body`.** Expected: `DONE`, and a report line for definition and for the lines picture.
- [x] **Step 6: Run the two tests.** Expected: PASS.

### Task 2: Definition strength

**Files:**
- Modify: `shared/avatar-kit/src/scores.ts`
- Test: `shared/avatar-kit/tests/scores.test.ts`

**Interfaces:**
- Produces: `definitionStrength(size: number, definition: number): number` (spec F1, floor 0.5).

- [x] **Step 1: Write the failing tests**: 0 without definition; 0.5 at size 0 and 1 at size 100 with full definition; 0.75 at (50, 100) and 0.375 at (50, 50); `NaN` definition gives 0 and `NaN` size gives 0.5.
- [x] **Step 2: Run them.** Expected: FAIL, `definitionStrength is not a function`.
- [x] **Step 3: Implement `definitionStrength`.**
- [x] **Step 4: Run them.** Expected: PASS.

### Task 3: The kit shows definition muscle by muscle

**Files:**
- Modify: `shared/avatar-kit/src/modelBody.ts`
- Test: `shared/avatar-kit/tests/modelBody.test.ts`

**Interfaces:**
- Consumes: `definitionStrength` from Task 2; the body file names from Task 1.
- Produces: a per-point attribute named `definition` on every mesh that grows (spec F2); the skin shader's use of it (spec F5).

- [x] **Step 1: Write the failing tests**: `shows a region's definition on that region only, and more of it on a bigger muscle` (biceps at size 50, definition 100 shows its definition shape at 0.75, abs at 0, biceps size still 0.5; everything at 100 shows 1); `draws the muscle lines over the defined muscle and nowhere else` (calves only: more than 50 points above 0.3, none above the knee, none over 1; nothing defined: all 0); `teaches the skin's shader to fade the lines in, and leaves the skin's own roughness alone`. Remove the old whole-body gloss test.
- [x] **Step 2: Run them.** Expected: FAIL, no definition shape index and no `definition` attribute.
- [x] **Step 3: Implement**: read the definition shape indices and masks per mesh, set both shapes in `applyScores`, fill the `definition` attribute, and replace the shader's normal-map step for skin (tilt, darker line walls, sheen).
- [x] **Step 4: Run the kit's tests and its type check.** Expected: 105 passed, no type errors.

### Task 4: Check it on the page, tune, and record it

- [x] **Step 1: Screenshot the page** after curls only for 12 weeks from Beginner, and after everything for 36 weeks from Advanced, front and back.
- [x] **Step 2: Tune** `DEFINITION_FLOOR` (0.35 to 0.5), `LINE_SHADE` (0.3 to 0.24) and the back and chest lines in `muscle_lines.py`; rebuild; rerun the tests; screenshot again.
- [x] **Step 3: Run `npm test` and `npm run typecheck`.** Expected: all pass.
- [x] **Step 4: Update `ProjectFlow.md`, `Decision.md` and `Architecture.md`, and commit.**
