# Fight physics

> **Status**: Designed
> **Author**: project owner
> **Last Updated**: 2026-11-13
> **Last Verified**: 2026-11-13
> **Implements Pillar**: your real training shows in your fighter

## Summary

The fight physics turns a player's body weight, height and avatar muscle scores into how hard, how fast and how far each strike lands, how much a hit hurts, how likely it is to knock someone down, and how quickly a fighter tires. Every number is calibrated against published sports science, so a fighter who trains is stronger in the way a real person would be.

> **Quick reference** — Layer: `Core` · Priority: `MVP` · Key deps: `Growth engine (muscle scores), Body details (weight, height)`

## Overview

In a real fight, three things decide who wins: technique, physics and strength. A heavier person puts more mass behind a punch, a stronger person throws it faster and holds a guard better, and a skilled person lands it at the right moment. This system covers the physics and the strength. Technique is the player's own skill with the controls: every avatar throws every move with good form, so nothing about technique is hidden in a number. The fight rules (rounds, moves in progress, blocking, the computer opponent) are a separate system that asks this one "what happens when this strike lands?" and gets back plain numbers. This system never rolls dice; it hands back chances, and the fight rules roll them with the fight's seed.

## Player Fantasy

My gym work is visible in the ring. When I train, my punches land heavier and push my friend back; when I skip legs, my punches lose their snap, because real punches are driven from the ground. A strong neck helps me take a punch. But like in a real fight, a sharper player can still beat a slightly stronger one, and a 50 kg beginner should not expect to beat an 80 kg experienced lifter.

## Detailed Design

### Core Rules

1. **Inputs.** Each fighter has a body weight in kg (40 to 160), a height in cm (140 to 210, 175 when not given) and the avatar state from the growth engine (19 regions, each with a size and a definition from 0 to 100).
2. **Muscle groups.** The 19 regions are combined into seven groups by how they work together in the gym (weights from the exercise table, grouped by movement):

   | Group | Regions (weight) | Gym lift it stands for |
   | --- | --- | --- |
   | push | chest_mid 1, chest_upper 0.6, chest_lower 0.6, delt_front 0.5, triceps 0.5 | Bench press |
   | press | delt_front 1, delt_side 0.5, triceps 0.6 | Overhead press |
   | pull | lats 1, mid_back 1, delt_rear 0.4, biceps 0.4 | Rows, pull-ups |
   | legs | quads 1, glutes 0.7, hamstrings 0.3, calves 0.2 | Squat |
   | hips | hamstrings 1, glutes 0.8, lower_back 0.6, forearms 0.2 | Deadlift |
   | core | abs 1, obliques 1, lower_back 0.3 | Crunches, twists |
   | neck | traps 1 | Shrugs, neck work |

3. **Training level.** Each group's score becomes a training level from 0 (never trained) to 5 (elite), matching the growth engine's own starting points: a beginner starts at 10, an intermediate at 30, an advanced lifter at 50.
4. **Strength.** A level and a body weight give an estimated one-rep max for bench press, squat and deadlift, read from real strength standards (Strength Level's tables, built from millions of logged lifts). The fight uses each group's strength *relative to an intermediate of the same weight*; body weight enters separately, as mass.
5. **Power chain.** A strike's power comes from the legs, the trunk and the arms in fixed shares. For a rear straight punch the shares are legs 38.5%, trunk 37.4% and arms 24.1%, from measurements of trained boxers. Each move has its own shares.
6. **A strike.** Speed comes from the power chain. The mass behind the strike (its "effective mass") comes from body weight and the power chain. Speed times effective mass is the strike's momentum; momentum over the contact time is its peak force.
7. **What a hit does.** A head hit accelerates the head; a strong neck stiffens it, which lowers that acceleration. Damage to health follows head acceleration for head hits and momentum for body hits. Body hits also drain stamina. A clean head hit has a chance of a knockdown that rises steeply with acceleration, with how much the move twists the head, and as health runs low. Every hit pushes the target back by the momentum it carries, so a light fighter is moved more.
8. **Blocking.** A guard is as strong as the arms and shoulders behind it. A blocked strike still passes a share of its damage through, more when the strike is strong against the guard, and pushes the blocker back by its full momentum. A strike far stronger than the guard breaks it.
9. **Stamina.** Stamina capacity comes from definition (consistent training, as the spec says) and shrinks a little for heavier bodies. Strikes cost stamina, more when they miss. A tired fighter strikes slower and weaker, braces the neck less and holds a weaker guard.
10. **Movement and reach.** Walking speed comes from the legs relative to body weight. Reach comes from height.
11. **No randomness and no clock.** The same inputs always give the same outputs. All chances are returned as numbers between 0 and 1.
12. **Weight classes.** The physics always uses real body weights. Whether ranked fights between very different weights are adjusted is a leaderboard question (Q-16), not a physics one.

### States and Transitions

The physics keeps no state of its own; the fight rules hold it and pass it in. The states it reacts to:

| State | Entry Condition | Exit Condition | Behavior |
| --- | --- | --- | --- |
| Fresh | Stamina above 70% | Stamina falls below 70% | Full speed and force |
| Tiring | Stamina 30% to 70% | Stamina leaves that range | Small losses (fatigue effects grow with the square of fatigue) |
| Exhausted | Stamina below 30% | Stamina recovers above 30% | Strikes up to 8% slower and 10% weaker, neck bracing 15% weaker, guard 20% weaker |
| Hurt | Health below 100 | New round (health resets) | Knockdown threshold lowered, down to 60% of normal at 0 health |
| Guard broken | A blocked strike over 1.6 times the guard's strength | Set by the fight rules (a short stagger) | Half of the strike's damage gets through |

### Interactions with Other Systems

| System | Flows in | Flows out | Who owns what |
| --- | --- | --- | --- |
| Growth engine | Avatar state (region sizes and definitions) | Nothing | Only the growth engine writes scores (D-007) |
| Body details (on the page, later) | Body weight and height | Nothing | The player enters them; friends can see them |
| Fight rules | Which move, who strikes whom, blocked or not, fatigue, health | Speed, force, momentum, damage, knockdown chance, guard broken, pushback, stamina cost and drain, move timing, reach | The fight rules roll the dice and hold the fight's state |
| Fight view (later) | Pushback and force | Nothing | It draws heavier hits as heavier; it never changes an outcome |
| Weigh-in card (later) | Estimated lifts and punch force | Nothing | Shows each fighter's numbers before a fight |

## Formulas

All numbers live in one settings object, `FIGHT_SETTINGS` in `games/arena-fight/core/settings.ts`.

### F1. Group score

```
s_group = Σ (w_r × size_r) / Σ w_r
```

| Symbol | Type | Range | Description |
| --- | --- | --- | --- |
| size_r | float | 0–100 | A region's size from the growth engine |
| w_r | float | 0–1 | The region's weight in the group (Core Rules, table) |
| s_group | float | 0–100 | The group's score |

**Output range**: 0 to 100, because it is a weighted average of values in that range.
**Worked example**: legs with quads 40, glutes 30, hamstrings 20, calves 10: (40 + 21 + 6 + 2) / 2.2 = 31.4.

### F2. Training level

```
L = piecewise-linear(s) through (0, 0), (10, 1), (30, 3), (50, 4), (100, 5)
```

| Symbol | Type | Range | Description |
| --- | --- | --- | --- |
| s | float | 0–100 | A group score (clamped) |
| L | float | 0–5 | 0 never trained, 1 beginner, 2 novice, 3 intermediate, 4 advanced, 5 elite |

**Output range**: 0 to 5. Scores outside 0 to 100 are clamped first.
**Worked example**: s = 40 → L = 3.5 (between intermediate and advanced).

### F3. One-rep max

```
1RM(lift, L, M) = table(lift, L, M)                    for 1 ≤ L ≤ 5, 50 ≤ M ≤ 140
                = table(lift, 1, M) × (0.7 + 0.3 L)    for L < 1
                × (M / 50)                             when M < 50 (table read at 50)
                × (M / 140)^0.67                       when M > 140 (table read at 140)
```

`table` reads Strength Level's male standards for bench press, squat and deadlift in 5 kg rows, interpolating straight-line between rows and between levels.

| Symbol | Type | Range | Description |
| --- | --- | --- | --- |
| lift | enum | bench, squat, deadlift | Which standard |
| L | float | 0–5 | Training level (F2) |
| M | float | 40–160 kg | Body weight (clamped) |
| 1RM | float | about 15–380 kg | Estimated one-rep max |

**Output range**: positive and finite over the input ranges. Above 140 kg the 0.67 power is the allometric exponent for force (Jaric 2002).
**Worked example**: the owner's question. A 50 kg beginner (L = 1): bench 27, squat 36, deadlift 46 kg. None of them is anywhere near 80 kg. An 80 kg advanced lifter (L = 4): bench 124, squat 168, deadlift 196 kg.

### F4. Relative strength

```
ρ_push = 1RM(bench, L, M) / 1RM(bench, 3, M)
ρ_legs = 1RM(squat, L, M) / 1RM(squat, 3, M)
ρ_hips = 1RM(deadlift, L, M) / 1RM(deadlift, 3, M)
ρ_press, ρ_pull, ρ_core, ρ_neck = mean of the three ratios above at that group's level
```

| Symbol | Type | Range | Description |
| --- | --- | --- | --- |
| ρ | float | about 0.3–1.8 | Strength relative to an intermediate of the same weight (1 = intermediate) |

**Output range**: about 0.3 (never trained) to 1.8 (elite, light body).
**Worked example**: a 75 kg beginner's legs: 69 / 124 = 0.56.

### F5. Power chain

```
legs  = ρ_legs
trunk = 0.5 ρ_core + 0.3 ρ_hips + 0.2 ρ_pull
arms  = 0.6 ρ_push + 0.4 ρ_press
P     = c_legs × legs + c_trunk × trunk + c_arms × arms
```

| Symbol | Type | Range | Description |
| --- | --- | --- | --- |
| c_legs, c_trunk, c_arms | float | 0–1, sum 1 | The move's power shares (Moves table) |
| P | float | about 0.3–1.8 | The strike's power index (1 = intermediate) |

**Output range**: a weighted average of the ρ values, so within their range.
**Worked example**: an all-intermediate fighter has P = 1 for every move. Training only legs to advanced raises the cross's P to about 1.11 and the jab's to about 1.07, because the cross draws more from the legs.

### F6. Strike speed and effective mass

```
v     = v_move × P^0.2 × (1 − 0.08 f²)
μ     = F_move × Δt_head / (v_move × 75)
m_eff = μ × 75 × (M / 75)^0.75 × P^0.4 × (1 − 0.02 f²)
```

| Symbol | Type | Range | Description |
| --- | --- | --- | --- |
| v_move | float | 7.5–10 m/s | The move's speed for a 75 kg intermediate |
| F_move | float | 2,100–3,800 N | The move's head force for a 75 kg intermediate |
| Δt_head | float | 0.008 s | Contact time on the head |
| f | float | 0–1 | Fatigue: 1 − stamina / stamina capacity |
| v | float | about 5–11.5 m/s | Fist speed at impact |
| m_eff | float | about 0.7–6.5 kg | Mass behind the strike |

**Output range**: a cross stays between about 7.5 and 10 m/s for scores from 10 to 100 (Olympic boxers' straight punches: 9.14 ± 2.06 m/s, Walilko 2005); every move stays between about 5 and 11.5 m/s. The exponents 0.2 and 0.4 were chosen so that strength alone reproduces the spread of punch force between novice, intermediate and elite boxers (Smith 2000). The 0.75 power on body weight sits between pure geometry (0.67) and plain proportion (1); heavier classes hit harder mainly through effective mass (Walilko 2005). It is an estimate and a tuning knob.
**Worked example**: a 75 kg intermediate's cross: v = 9.0 m/s, m_eff = 3.2 kg.

### F7. Momentum and force

```
p      = m_eff × v
F_head = p / Δt_head        (Δt_head = 0.008 s)
F_body = p / Δt_body        (Δt_body = 0.012 s, softer target)
```

| Symbol | Type | Range | Description |
| --- | --- | --- | --- |
| p | float | about 5–67 kg·m/s | Momentum carried by the strike |
| F | float | about 650–8,300 N | Peak force at impact on the head |

**Output range**: finite and positive over all inputs.
**Worked example**: 75 kg, rear cross: 2,535 N for a beginner, 3,600 N for an intermediate, 4,718 N for an elite fighter. Measured: 2,381, 3,722 and 4,800 N for novice, intermediate and elite boxers (Smith 2000). A jab is 0.59 of a cross, as measured (lead 2,847 N against rear 4,800 N). By weight, an intermediate cross is 2,656 N at 50 kg and 4,467 N at 100 kg.

### F8. Pushback

```
Δv = k_push × p / M_target       k_push: blocked 1.0, body hit 0.8, head hit 0.4
```

| Symbol | Type | Range | Description |
| --- | --- | --- | --- |
| Δv | float | about 0.01–1.7 m/s | Backward speed given to the target |

**Output range**: always positive and finite; heavier targets move less.
**Worked example**: an 80 kg advanced fighter's blocked cross gives a 50 kg beginner 0.70 m/s; the beginner's blocked cross gives the bigger fighter 0.17 m/s.

### F9. Head acceleration

```
m_head = 4.5 × (1 + ρ_neck × (M_target / 75)^0.67 / 3) × (1 − 0.15 f_target²)
a      = F_head / m_head          (reported in g = a / 9.81)
```

| Symbol | Type | Range | Description |
| --- | --- | --- | --- |
| 4.5 | float | kg | An adult head's mass |
| m_head | float | about 4.1–8.0 kg | Head mass plus what a braced neck adds |
| a | float | about 8–210 g | Peak head acceleration |

**Output range**: finite and positive. The 1/3 makes an intermediate 75 kg neck give 6.0 kg, which reproduces the measured 58 ± 13 g from a 3,427 N punch (Walilko 2005).
**Worked example**: two 75 kg intermediates, cross: 61 g.

### F10. Damage

```
head:  D = 7 × (a / 600 m/s²)
body:  D = 6 × (p / 28.8) / T_body,   T_body = (M_target / 75)^0.5 × ρ_core^0.3
blocked: D × leak,   leak = clamp(0.15 × F / G, 0.03, 0.5)
guard broken: D × 0.5
any hit: D ≤ 35
body hits also drain stamina: 8 × (p / 28.8) / T_body
```

| Symbol | Type | Range | Description |
| --- | --- | --- | --- |
| D | float | 0–35 | Health points removed (health is 100 per round) |
| 600, 28.8 | float | — | Head acceleration and momentum of an intermediate's cross on an intermediate |
| G | float | N | Guard strength (F12) |

**Output range**: 0 to 35 by the cap. The cap is a tuning knob; a knockdown is the way a single blow ends things.
**Worked example**: two intermediates: a clean cross takes 7 health. The 80 kg advanced fighter's cross takes 10.2 from the 50 kg beginner; the beginner's takes 3.0 back: more than three times less.

### F11. Knockdown chance (clean head hits only)

```
e      = a_g × rot_move
e50    = 160 × (0.6 + 0.4 × H / 100)
chance = 1 / (1 + exp(−(e − e50) / 18))
```

| Symbol | Type | Range | Description |
| --- | --- | --- | --- |
| a_g | float | g | Head acceleration (F9) |
| rot_move | float | 0.8–1.5 | How much the move twists the head; twisting is the strongest predictor of being knocked out |
| H | float | 0–100 | The target's health |
| chance | float | 0–1 | Chance this hit knocks the target down |

**Output range**: 0 to 1 (logistic). Body hits return 0.
**Worked example**: two fresh 75 kg intermediates: cross 0.4%, rear hook 2.9%. A fully trained neck instead of an untrained one cuts the odds of the same cross to 0.43 times, and of the hook to 0.26 times (Collins 2014: 5% lower concussion odds per pound of neck strength). A 100 kg elite fighter's rear hook on a fresh 75 kg intermediate: 40%.

### F12. Guard strength

```
G = 3,600 N × arms × (M / 75)^0.67 × (1 − 0.2 f²)
broken when F > 1.6 × G
```

**Output range**: about 600 to 8,500 N.
**Worked example**: a 50 kg beginner's guard holds 1,281 N; the 80 kg advanced fighter's cross carries 4,359 N, 3.4 times that, so it breaks through.

### F13. Stamina

```
S_max     = 100 × (0.85 + 0.30 × d̄ / 100) × (M / 75)^−0.25
cost      = move.stamina (× 1.3 on a miss)
block     = 2 × F / G
recovery  = 8 per second standing, 4 moving, 0 while striking; +50% of S_max between rounds
f         = 1 − S / S_max
```

| Symbol | Type | Range | Description |
| --- | --- | --- | --- |
| d̄ | float | 0–100 | Average definition of all 19 regions |
| S_max | float | about 70–135 | Stamina capacity |

**Output range**: S_max between about 70 (160 kg, no definition) and 135 (40 kg, full definition). The −0.25 power follows how aerobic capacity scales with body size.
**Worked example**: a 75 kg fighter with average definition 50 has 100.

### F14. Walking speed

```
v_walk = 1.3 m/s × legs^0.25 × (M / 75)^−0.12
```

**Output range**: about 0.9 to 1.6 m/s. An estimate and a tuning knob.

### F15. Reach and timing

```
reach    = move.reach × height_m
startup  = round(move.startup × v_move / v)          (ticks at 60 per second)
recovery = round(move.recovery × (1 + 0.2 f²))
```

**Worked example**: a 175 cm fighter's cross reaches 0.79 m from the body's centre; 10 cm more height adds 4.5 cm. Reach matters little in real fights (under 1% of the difference between winners and losers in most UFC divisions), so it stays small here.

### Moves: boxing

| Move | Target | v_move m/s | F_move N | Shares legs / trunk / arms | rot | Reach × height | Stamina | Startup / active / recovery ticks |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Jab | Head | 7.5 | 2,124 | 0.25 / 0.30 / 0.45 | 0.8 | 0.46 | 3 | 9 / 2 / 14 |
| Cross | Head | 9.0 | 3,600 | 0.385 / 0.374 / 0.241 | 1.0 | 0.45 | 5 | 13 / 3 / 18 |
| Lead hook | Head | 9.5 | 3,300 | 0.30 / 0.50 / 0.20 | 1.4 | 0.36 | 5.5 | 15 / 3 / 20 |
| Rear hook | Head | 10.0 | 3,800 | 0.30 / 0.50 / 0.20 | 1.5 | 0.35 | 5.5 | 17 / 3 / 22 |
| Uppercut | Head | 8.5 | 3,300 | 0.45 / 0.35 / 0.20 | 1.3 | 0.32 | 5.5 | 16 / 3 / 22 |
| Body hook | Body | 9.0 | 3,400 | 0.35 / 0.45 / 0.20 | — | 0.35 | 5.5 | 16 / 3 / 20 |

The cross's shares and force come from measurements; the jab's force is 0.59 of the cross (Smith 2000). The other moves' numbers are estimates within the measured ranges, to be tuned by playing. A jab at 9 ticks (150 ms) is quicker than human reaction time (about 200 to 250 ms), so it is blocked by keeping a guard up rather than by reacting, as in real boxing.

For the kicking style later: a roundhouse kick at 14 m/s and 4,600 N, shares 0.45 / 0.40 / 0.15, sits inside the measured ranges (6.9 to 18.3 m/s, up to 6,400 N; Corcoran 2024).

## Edge Cases

| Scenario | Expected Behavior | Rationale |
| --- | --- | --- |
| Body weight not a number | Creating the fighter fails with a clear error | A fight with a made-up weight would be silently wrong |
| Body weight 30 or 200 kg | Clamped to 40 or 160 kg | Outside that, the strength data does not apply |
| Height missing | 175 cm | Reach matters little; a missing height should not block a fight |
| A score below 0 or above 100 | Clamped | Stored data could be edited by hand |
| Fatigue or health out of range | Clamped to 0–1 and 0–100 | The fight rules might round past the ends |
| 160 kg elite against a 40 kg beginner | All numbers finite; damage capped at 35; knockdown chance close to 1 | Realistic mismatch without broken numbers |
| Body hit | Knockdown chance 0; stamina drained | Body shots wear a fighter down rather than switching the lights off |
| A missed strike | Costs 1.3 times the stamina | Missing tires a fighter more than landing |

## Dependencies

| System | Direction | Nature of Dependency |
| --- | --- | --- |
| Growth engine | This depends on it | Data dependency: region sizes and definitions |
| Body details (page) | This depends on it | Data dependency: body weight and height |
| Fight rules | It depends on this | Data dependency: strike results, timing, reach |
| Fight view | It depends on this | Data dependency: pushback and force, for drawing |
| Leaderboard | Neither | Results only; physics is not involved |

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
| --- | --- | --- | --- | --- |
| Speed power on P | 0.2 | 0.1–0.35 | Training changes speed more | Speed nearly fixed |
| Effective-mass power on P | 0.4 | 0.2–0.6 | Training changes power more | Strength matters less |
| Effective-mass power on weight | 0.75 | 0.6–1.0 | Bigger fighters hit much harder | Weight matters less |
| Neck share | 1/3 | 0.2–0.5 | Necks protect more | Necks matter less |
| Knockdown threshold e50 | 160 | 120–220 | Fewer knockdowns | More knockdowns |
| Knockdown spread | 18 | 12–30 | Chances change gradually | Sharper cut-off |
| Head damage per reference hit | 7 | 4–12 | Shorter rounds | Longer rounds |
| Body damage per reference hit | 6 | 3–10 | Body work ends rounds sooner | Body work mostly tires |
| Guard leak | 0.15 | 0.05–0.3 | Blocking protects less | Blocking nearly perfect |
| Guard break ratio | 1.6 | 1.3–2.5 | Guards hold longer | Guards break easily |
| Damage cap per hit | 35 | 20–50 | Single blows can end more | No blow takes more than this |
| Fatigue: speed, force, neck, guard | 8%, 10%, 15%, 20% | 0–30% | Tiredness matters more | Tiredness matters less |
| Stamina costs and recovery | Moves table, 8/s | — | Slower or faster pace | — |

## Visual/Audio Requirements

Heavier hits look heavier: the target's pushback is drawn from the returned speed, and a broken guard shows a stagger. Not part of this step.

## Game Feel

- A heavier, stronger fighter feels like a wall: blocked shots barely move them, while theirs push a lighter fighter back.
- A lighter fighter is not slower with the hands, but tires a little less and moves a little more freely.
- Tiredness is felt in the last part of a round: strikes come out later and land softer.

## UI Requirements

A weigh-in card before each fight (later): each fighter's weight, height, estimated bench, squat and deadlift, and punch power in newtons, so players can see why a fight looks the way it does.

## Cross-References

- [Architecture.md](../../Architecture.md), section 6: the arena fight game this physics serves.
- [Decision.md](../../Decision.md): D-056 (fights decide the leaderboard), D-058 (this physics), D-059 (friend-group leaderboard).
- The implementation plan: [design/plans/2026-11-13-fight-physics.md](../plans/2026-11-13-fight-physics.md).

## Acceptance Criteria

- [ ] A 50 kg fighter with every muscle at 10 has estimated bench, squat and deadlift of 27, 36 and 46 kg (within 5%), and none reaches 80 kg.
- [ ] An 80 kg fighter with every muscle at 50 has 124, 168 and 196 kg (within 5%).
- [ ] A 75 kg fighter's rear cross: muscles at 10 → 2,300–2,700 N; at 30 → 3,400–3,800 N; at 100 → 4,500–5,000 N.
- [ ] A jab carries 0.55–0.65 of a cross's force.
- [ ] At the same training, a 100 kg fighter's cross is at least 1.5 times a 50 kg fighter's.
- [ ] A cross's fist speed stays between 7 and 11 m/s for every body from 50 to 120 kg and every score from 10 to 100.
- [ ] Two 75 kg intermediates: a clean cross accelerates the head 55–65 g.
- [ ] A neck trained to 100 instead of 10 lowers the odds of a knockdown from the same cross to 0.3–0.6 times.
- [ ] A fully tired fighter's cross carries 88–92% of the fresh force.
- [ ] An 80 kg advanced fighter's cross does at least 3 times the head damage of a 50 kg beginner's cross in return.
- [ ] A blocked strike does less damage than a clean one; a strike over 1.6 times the guard breaks it.
- [ ] Body hits never cause a knockdown and always drain stamina.
- [ ] The same inputs always give the same outputs.
- [ ] No tuning number is written anywhere except `FIGHT_SETTINGS`.

## Open Questions

| Question | Owner | Deadline | Resolution |
| --- | --- | --- | --- |
| Q-16: Are ranked fights between very different body weights adjusted? | Owner | Before the leaderboard (step 17) | Open |
| Q-17: Should muscle growth slow to real-life pace? The fight reads a score of 50 as "advanced", which takes about five years in real life; the growth engine gets there in 3 to 4 months. | Owner | Before friends use the app | Open |
| Women's strength tables, with the female body (Q-12) | Owner | With the female body | Strength Level publishes them; added then |
| Age (strength falls after about 40) | Owner | Later | Not modelled yet |

## Sources

- Walilko, Viano and Bir (2005), Biomechanics of the head for Olympic boxer punches to the face, British Journal of Sports Medicine: punch force 3,427 ± 811 N, fist speed 9.14 ± 2.06 m/s, effective mass 2.9 ± 2.0 kg, head 58 ± 13 g; heavier classes hit harder through effective mass. https://pmc.ncbi.nlm.nih.gov/articles/PMC1725037
- Smith et al. (2000), Development of a boxing dynamometer and its punch force discrimination efficacy, Journal of Sports Sciences: rear hand 4,800 / 3,722 / 2,381 N and lead hand 2,847 / 2,283 / 1,604 N for elite, intermediate and novice boxers. https://www.sponet.de/sponet/Record/4004380?lng=en
- Strength Level, strength standards by body weight (bench press, squat, deadlift; beginner to elite). https://strengthlevel.com/strength-standards/bench-press/kg, https://strengthlevel.com/strength-standards/squat/kg, https://strengthlevel.com/strength-standards/deadlift/kg
- Jaric, Radosavljevic-Jaric and Johansson (2002), muscle force scales with body mass to the power 0.67. https://link.springer.com/doi/10.1007/s00421-002-0638-9
- Filimonov et al. (1985), share of a straight punch's force from rear leg push-off 38.46%, trunk 37.42%, arm 24.12% (via a summary). https://sas.blogs.lincoln.ac.uk/?p=1295
- Loturco et al. (2016), strength and power are highly associated with punching impact in elite amateur boxers (r = 0.67 to 0.85). https://www.scilit.net/publications/c71fd1996dad786dd11c9dfc1f0d85c8
- Mosler et al. (2024), effective mass rises with body mass and training tenure. https://mdpi.com/2076-3417/14/17/7785
- Corcoran et al. (2024), Impact force and velocities for kicking strikes in combat sports: a literature review. https://pmc.ncbi.nlm.nih.gov/articles/PMC10974023/
- Collins et al. (2014), every pound of neck strength lowers concussion odds by 5%. https://www.springermedicine.com/neck-strength-a-protective-factor-reducing-risk-for-concussion-i/21683656
- Greco-Roman wrestlers have markedly stronger necks than non-athletes. https://sponet.de/sponet/Record/4008351?lng=en
- Lota et al. (2022), rotational head acceleration is a strong predictor of brain injury in combat sports. https://pubmed.ncbi.nlm.nih.gov/35107134/
- Punch force falls 4% to 10% with fatigue. https://pmc.ncbi.nlm.nih.gov/articles/PMC12729554/ and https://pubmed.ncbi.nlm.nih.gov/33858296/
- UFC data: reach explains little (AgentMMA, 6,695 bouts; Kirk). https://agentmma.com/mma-lab/ufc-reach-advantage. Favourites win about 65% to 69%. https://agentmma.com/mma-lab/ufc-favorites-win-rate. About a third of fights end by KO or TKO, about half at heavyweight. https://agentmma.com/mma-lab/ufc-decision-rate, https://fightmatrix.com/ufc-records/ufc-fight-outcomes-by-weight-class
