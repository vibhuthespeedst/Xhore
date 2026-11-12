# Fight Physics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the fight's physics as pure, tested TypeScript: body weight, height and muscle scores in; strike speed, force, damage, knockdown chance, pushback, guard, stamina, reach and timing out.

**Architecture:** A new workspace `games/arena-fight` holds the fight. This plan builds only `core/` (rules, no graphics) and `content/boxing.ts` (moves as data). Every function is pure; every number lives in `FIGHT_SETTINGS`. The fight rules (ticks, rounds, controllers) and the view come in later plans and only call these functions.

**Tech Stack:** TypeScript and Vitest, the same versions as `engine`. No new packages.

**Spec:** [design/gdd/fight-physics.md](../gdd/fight-physics.md)

## Global Constraints

- No new npm packages. `games/arena-fight/package.json` copies `engine`'s dev dependencies: `typescript ^7.0.2`, `vitest ^5.0.3`, plus `"@xhore/engine": "*"`.
- The fight imports only types from `@xhore/engine` (`AvatarState`, `RegionId`). Nothing in `engine`, `shared/` or `prototype/` imports the fight.
- Pure functions only: no clock, no I/O, no randomness, no React, no three.js. Chances are returned, never rolled.
- Every tuning number is in `FIGHT_SETTINGS` in `games/arena-fight/core/settings.ts`; functions take `settings: FightSettings = FIGHT_SETTINGS` as their last parameter.
- Code comments: one short line at most; none in tests.
- Commits are authored by the owner's git identity with no AI attribution or assistant names.
- `ProjectFlow.md`, `Decision.md` and `Architecture.md` are updated in plain language in the commit that finishes the step.

## Review Focus

- A body weight or height that is not a finite number (an empty input box gives `NaN`): `makeFighter` throws a `RangeError` naming the field. Test in Task 2.
- Weight 30 or 200 kg, scores of −5 or 150: clamped to 40–160 kg and 0–100, never extrapolated wildly. Tests in Tasks 1 and 2.
- `heightCm` left out: 175 cm is used. Test in Task 2.
- Fatigue of −0.1 or 1.2, health of 130: clamped to 0–1 and 0–100 before use. Test in Task 3.
- A 160 kg fighter with every score at 100 against a 40 kg fighter with every score at 10: every result field finite, damage ≤ 35, chance ≤ 1. Test in Task 3.

---

### Task 1: The fight workspace and strength from training level

**Files:**
- Create: `games/arena-fight/package.json`, `games/arena-fight/tsconfig.json`, `games/arena-fight/vitest.config.ts` (copies of `engine`'s, name `@xhore/arena-fight`, `main`/`types`/`exports` pointing at `./core/index.ts`, include `core`, `content`, `tests`)
- Create: `games/arena-fight/core/settings.ts`, `games/arena-fight/core/strengthStandards.ts`, `games/arena-fight/core/strength.ts`, `games/arena-fight/core/index.ts`
- Modify: `package.json` (root): add `"games/*"` to `workspaces`
- Test: `games/arena-fight/tests/strength.test.ts`

**Interfaces:**
- Produces: `type Lift = 'bench' | 'squat' | 'deadlift'`; `trainingLevel(score: number, settings?): number`; `oneRepMax(lift: Lift, level: number, weightKg: number, settings?): number`; `relativeStrength(lift: Lift | 'mean', level: number, weightKg: number, settings?): number`; `FIGHT_SETTINGS`, `type FightSettings = typeof FIGHT_SETTINGS`; `STRENGTH_STANDARDS: Readonly<Record<Lift, readonly (readonly number[])[]>>` (rows 50, 55 … 140 kg; columns beginner … elite, from the spec's sources).

- [ ] **Step 1: Write the failing tests** in `tests/strength.test.ts`:
  - `trainingLevel`: 0 → 0, 10 → 1, 20 → 2, 30 → 3, 40 → 3.5, 50 → 4, 75 → 4.5, 100 → 5, −5 → 0, 150 → 5.
  - `oneRepMax` at the table's own points: (`bench`, 1, 50) = 27, (`squat`, 1, 50) = 36, (`deadlift`, 1, 50) = 46, (`bench`, 4, 80) = 124, (`squat`, 4, 80) = 168, (`deadlift`, 4, 80) = 196.
  - Table rows: (`bench`, 3, 75) = 92. Interpolation: (`bench`, 3, 72.5) = 88.5; (`bench`, 3.5, 70) = 97.5.
  - Below level 1: (`bench`, 0, 50) = 18.9. Below 50 kg: (`bench`, 1, 45) = 24.3. Above 140 kg: (`bench`, 3, 150) ≈ 158 × (150/140)^0.67 (`toBeCloseTo`, 6). Weight 30 behaves as 40; weight 200 as 160.
  - `relativeStrength(lift, 3, w)` is 1 for every lift and for w in 50, 75, 140; `relativeStrength('squat', 1, 75)` ≈ 69/124; `'mean'` at level 5 and 75 kg is the mean of the three lifts' ratios; it rises with level for every lift.
  - "A 50 kg beginner cannot lift 80 kg": `oneRepMax(lift, trainingLevel(10), 50) < 80` for all three lifts.

- [ ] **Step 2: Run them to see them fail**
  Run: `npx vitest run --root games/arena-fight tests/strength.test.ts`
  Expected: FAIL, cannot resolve `../core/strength.js`.

- [ ] **Step 3: Implement** `settings.ts` (the level points `[[0,0],[10,1],[30,3],[50,4],[100,5]]`, weight limits 40–160, the 0.7 floor, the 0.67 exponent above 140 kg; later tasks add their numbers here), `strengthStandards.ts` (the three male tables from the spec's source, every 5 kg) and `strength.ts` (piecewise-linear level; bilinear table read; the spec's F3 rules outside the table). `index.ts` re-exports everything.

- [ ] **Step 4: Run the tests, then the whole suite and the type check**
  Run: `npm install` (links the new workspace; downloads nothing new), `npm test`, `npm run typecheck`
  Expected: all pass, including the 270 existing tests.

- [ ] **Step 5: Commit** — "Start the arena fight: strength from training level and body weight, read from real strength standards"

### Task 2: A fighter from a body

**Files:**
- Create: `games/arena-fight/core/fighter.ts`
- Modify: `games/arena-fight/core/settings.ts` (group weights from the spec's Core Rules table; group → lift: push → bench, legs → squat, hips → deadlift, others → mean; trunk 0.5 core + 0.3 hips + 0.2 pull; arms 0.6 push + 0.4 press; stamina and walking numbers from F13 and F14; default height 175, limits 140–210), `core/index.ts`
- Test: `games/arena-fight/tests/fighter.test.ts`

**Interfaces:**
- Consumes: `trainingLevel`, `oneRepMax`, `relativeStrength` (Task 1); `AvatarState`, `RegionId` from `@xhore/engine`.
- Produces:
  ```ts
  type GroupId = 'push' | 'press' | 'pull' | 'legs' | 'hips' | 'core' | 'neck'
  interface FighterBody { readonly weightKg: number; readonly heightCm?: number; readonly avatar: AvatarState }
  interface Fighter {
    readonly weightKg: number
    readonly heightM: number
    readonly level: Readonly<Record<GroupId, number>>
    readonly strength: Readonly<Record<GroupId, number>>
    readonly legs: number
    readonly trunk: number
    readonly arms: number
    readonly lifts: { readonly bench: number; readonly squat: number; readonly deadlift: number }
    readonly staminaMax: number
    readonly walkSpeed: number
  }
  function makeFighter(body: FighterBody, settings?: FightSettings): Fighter
  ```

- [ ] **Step 1: Write the failing tests.** Build test avatars with `createAvatar` from `@xhore/engine` and override region sizes and definitions with a small local helper.
  - Every region at 30, definition 50, 75 kg, 175 cm: every `level` is 3, every `strength` is 1, `legs`, `trunk` and `arms` are 1, `staminaMax` is 100, `walkSpeed` is 1.3, `heightM` is 1.75.
  - Every region at 10, 50 kg: `lifts` within 5% of 27, 36 and 46, each below 80. Every region at 50, 80 kg: within 5% of 124, 168 and 196.
  - Training only quads, glutes and hamstrings to 50 raises `legs` above 1.2 and leaves `arms` at 1.
  - Traps at 100 instead of 10 raises `strength.neck` and nothing else.
  - Definition 100 instead of 0 raises `staminaMax` from 85 to 115 at 75 kg; at 120 kg the same body has less stamina than at 75 kg.
  - `heightCm` left out gives `heightM` 1.75; weight 200 gives `weightKg` 160; a score of 150 counts as 100.
  - `weightKg: NaN` and `heightCm: NaN` each throw a `RangeError` whose message names the field.

- [ ] **Step 2: Run them to see them fail**
  Run: `npx vitest run --root games/arena-fight tests/fighter.test.ts`
  Expected: FAIL, cannot resolve `../core/fighter.js`.

- [ ] **Step 3: Implement `makeFighter`** with F1 (group score), F2, F4, F5's legs/trunk/arms, F13's `staminaMax` and F14's `walkSpeed` from the spec.

- [ ] **Step 4: Run the tests**
  Run: `npm test --workspace @xhore/arena-fight` and `npm run typecheck`
  Expected: PASS.

- [ ] **Step 5: Commit** — "Turn a body into a fighter: muscle groups, strength, stamina and walking speed"

### Task 3: Boxing moves and what a strike does

**Files:**
- Create: `games/arena-fight/content/boxing.ts`, `games/arena-fight/core/strike.ts`
- Modify: `games/arena-fight/core/settings.ts` (F6–F12 and F15 numbers), `core/index.ts` (re-export `strike.ts`; `content` is exported separately as `BOXING` from `index.ts`)
- Test: `games/arena-fight/tests/strike.test.ts`

**Interfaces:**
- Consumes: `Fighter`, `makeFighter` (Task 2).
- Produces:
  ```ts
  interface MoveSpec {
    readonly id: string
    readonly name: string
    readonly target: 'head' | 'body'
    readonly speed: number
    readonly force: number
    readonly chain: { readonly legs: number; readonly trunk: number; readonly arms: number }
    readonly rotation: number
    readonly reach: number
    readonly stamina: number
    readonly startup: number
    readonly active: number
    readonly recovery: number
  }
  interface StrikeContext { readonly blocked: boolean; readonly attackerFatigue: number; readonly defenderFatigue: number; readonly defenderHealth: number }
  interface StrikeResult {
    readonly speed: number
    readonly effectiveMass: number
    readonly momentum: number
    readonly force: number
    readonly headAccelG: number
    readonly damage: number
    readonly knockdownChance: number
    readonly guardBroken: boolean
    readonly pushback: number
    readonly staminaLoss: number
  }
  function strike(attacker: Fighter, move: MoveSpec, defender: Fighter, context: StrikeContext, settings?): StrikeResult
  function guardStrength(fighter: Fighter, fatigue: number, settings?): number
  function moveTiming(attacker: Fighter, move: MoveSpec, fatigue: number, settings?): { readonly startup: number; readonly active: number; readonly recovery: number }
  function reachOf(fighter: Fighter, move: MoveSpec): number
  function staminaCost(move: MoveSpec, missed: boolean, settings?): number
  const BOXING: readonly MoveSpec[]   // jab, cross, lead_hook, rear_hook, uppercut, body_hook, from the spec's Moves table
  ```
  `staminaLoss` is what the defender loses: body-hit drain plus, when blocked, the block cost `2 × F / G`. `knockdownChance` is 0 for body moves and blocked strikes.

- [ ] **Step 1: Write the failing tests** (`fresh` = `{ blocked: false, attackerFatigue: 0, defenderFatigue: 0, defenderHealth: 100 }`; `body(kg, score)` = every region at `score`, definition 50):
  - Cross force, 75 kg on 75 kg: score 10 in 2,300–2,700 N; 30 in 3,400–3,800 N; 100 in 4,500–5,000 N.
  - Jab force ÷ cross force in 0.55–0.65.
  - Score 30: 100 kg cross ≥ 1.5 × 50 kg cross.
  - Cross speed in 7–11 m/s for weights 50, 75, 100, 120 and scores 10, 30, 50, 100.
  - `headAccelG` of an intermediate cross on an intermediate in 55–65.
  - Neck: knockdown odds (`c/(1-c)`) of an intermediate's cross on a defender with traps at 100, divided by the odds with traps at 10, in 0.3–0.6.
  - Attacker fatigue 1: force 88–92% of fresh; speed lower; `moveTiming(...).startup` not shorter than fresh.
  - 80 kg score 50 against 50 kg score 10: the bigger fighter's cross damage ≥ 3 × the smaller's; pushback on the smaller ≥ 3 × pushback on the bigger; the smaller's guard breaks against it.
  - Blocked: damage below the clean hit's, `knockdownChance` 0, `staminaLoss` > 0, pushback above the clean head hit's.
  - `body_hook`: `knockdownChance` 0, `headAccelG` 0, `staminaLoss` > 0.
  - Knockdown chance at defender health 30 > at health 100.
  - Clamping: fatigue −0.1 equals fatigue 0; health 130 equals health 100.
  - 160 kg all-100 against 40 kg all-10, every move: every number finite, `damage` ≤ 35, `knockdownChance` ≤ 1.
  - Same call twice gives deep-equal results.
  - `reachOf` of a cross at 175 cm is 0.7875; `staminaCost(cross, true)` is 6.5.

- [ ] **Step 2: Run them to see them fail**
  Run: `npx vitest run --root games/arena-fight tests/strike.test.ts`
  Expected: FAIL, cannot resolve `../core/strike.js`.

- [ ] **Step 3: Implement** `content/boxing.ts` from the spec's Moves table, and `strike.ts` with F6–F12 and F15. `μ` for each move is worked out from its `force` and `speed`, not stored.

- [ ] **Step 4: Run the tests**
  Run: `npm test` and `npm run typecheck`
  Expected: PASS.

- [ ] **Step 5: Commit** — "Add boxing moves and strike physics: speed, mass behind the punch, force, damage, knockdowns, guard and pushback"

### Task 4: The matchup report and the project records

**Files:**
- Create: `games/arena-fight/tests/matchup.test.ts`
- Modify: `games/arena-fight/package.json` (script `"matchup": "vitest run tests/matchup.test.ts --disable-console-intercept"`), root `package.json` (script `"matchup": "npm run matchup --workspace @xhore/arena-fight"`), `ProjectFlow.md`, `Decision.md`, `Architecture.md`, `design/gdd/fight-physics.md` (worked examples to the printed numbers)

- [ ] **Step 1: Write the report test.** For four pairs (two 75 kg intermediates; 75 kg advanced against 75 kg intermediate; 80 kg advanced against 50 kg beginner; two 100 kg elites) it prints each fighter's weight, estimated lifts and walking speed, then each boxing move's force, damage and knockdown chance in both directions, as a plain table. It asserts only that every printed number is finite.

- [ ] **Step 2: Run it**
  Run: `npm run matchup`
  Expected: the table, then "1 passed".

- [ ] **Step 3: Update the records**: ProjectFlow (step 11's first part done, a "Fight physics" row in the map of parts and in "Where to look", body details as a new piece of handed-on data, progress log, Next up, the test count); Architecture section 6 (link to the spec; the muscle-to-fight table replaced by the physics summary); Decision (the step's decisions, already recorded with the spec, marked built).

- [ ] **Step 4: Run everything**
  Run: `npm test` and `npm run typecheck`
  Expected: all pass.

- [ ] **Step 5: Commit** — "Add the matchup report and record the fight physics in the project files"

## Execution

Native, in this session: the owner said "do it" on 2026-11-13, and the tasks build on each other's interfaces in order.
