// Every tuning number of the fight. Where each one comes from: design/gdd/fight-physics.md.
export const FIGHT_SETTINGS = {
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
