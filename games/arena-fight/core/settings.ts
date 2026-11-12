import type { RegionId } from '@xhore/engine'
import type { GroupId } from './fighter.js'
import type { Lift } from './strengthStandards.js'

const groups: Readonly<Record<GroupId, Readonly<Partial<Record<RegionId, number>>>>> = {
  push: { chest_mid: 1, chest_upper: 0.6, chest_lower: 0.6, delt_front: 0.5, triceps: 0.5 },
  press: { delt_front: 1, delt_side: 0.5, triceps: 0.6 },
  pull: { lats: 1, mid_back: 1, delt_rear: 0.4, biceps: 0.4 },
  legs: { quads: 1, glutes: 0.7, hamstrings: 0.3, calves: 0.2 },
  hips: { hamstrings: 1, glutes: 0.8, lower_back: 0.6, forearms: 0.2 },
  core: { abs: 1, obliques: 1, lower_back: 0.3 },
  neck: { traps: 1 },
}

const groupLift: Readonly<Record<GroupId, Lift | 'mean'>> = {
  push: 'bench',
  press: 'mean',
  pull: 'mean',
  legs: 'squat',
  hips: 'deadlift',
  core: 'mean',
  neck: 'mean',
}

// Every tuning number of the fight. Where each one comes from: design/gdd/fight-physics.md.
export const FIGHT_SETTINGS = {
  groups,
  groupLift,
  trunkShares: { core: 0.5, hips: 0.3, pull: 0.2 },
  armsShares: { push: 0.6, press: 0.4 },
  referenceWeightKg: 75,
  heightCm: { min: 140, max: 210, default: 175 },
  stamina: { base: 100, floor: 0.85, perDefinition: 0.3, weightExponent: -0.25 },
  walking: { speed: 1.3, legsExponent: 0.25, weightExponent: -0.12 },
  levelPoints: [
    [0, 0],
    [10, 1],
    [30, 3],
    [50, 4],
    [100, 5],
  ],
  referenceLevel: 3,
  bodyWeightKg: { min: 40, max: 160 },
  tableWeightKg: { min: 50, max: 140, step: 5 },
  untrainedShare: 0.7,
  heavyWeightExponent: 0.67,
}

export type FightSettings = typeof FIGHT_SETTINGS
