import { clamp } from '@xhore/engine'
import { FIGHT_SETTINGS, type FightSettings } from './settings.js'
import { STRENGTH_STANDARDS, type Lift } from './strengthStandards.js'

export type { Lift }

const TOP_LEVEL = 5

export function trainingLevel(score: number, settings: FightSettings = FIGHT_SETTINGS): number {
  const points = settings.levelPoints
  const s = clamp(score, points[0][0], points[points.length - 1][0])
  for (let i = 1; i < points.length; i++) {
    const [s1, l1] = points[i]
    if (s <= s1) {
      const [s0, l0] = points[i - 1]
      return l0 + ((l1 - l0) * (s - s0)) / (s1 - s0)
    }
  }
  return points[points.length - 1][1]
}

export function oneRepMax(lift: Lift, level: number, weightKg: number, settings: FightSettings = FIGHT_SETTINGS): number {
  const weight = clamp(weightKg, settings.bodyWeightKg.min, settings.bodyWeightKg.max)
  const { min, max, step } = settings.tableWeightKg
  const rows = STRENGTH_STANDARDS[lift]
  const position = (clamp(weight, min, max) - min) / step
  const row = Math.min(Math.floor(position), rows.length - 2)
  const along = position - row

  const atLevel = (l: number): number => {
    const column = Math.min(Math.floor(l) - 1, TOP_LEVEL - 2)
    const between = l - 1 - column
    const read = (r: readonly number[]) => r[column] + (r[column + 1] - r[column]) * between
    return read(rows[row]) + (read(rows[row + 1]) - read(rows[row])) * along
  }

  const l = clamp(level, 0, TOP_LEVEL)
  const share = settings.untrainedShare
  const kg = l >= 1 ? atLevel(l) : atLevel(1) * (share + (1 - share) * l)
  if (weight < min) return kg * (weight / min)
  if (weight > max) return kg * (weight / max) ** settings.heavyWeightExponent
  return kg
}

export function relativeStrength(
  lift: Lift | 'mean',
  level: number,
  weightKg: number,
  settings: FightSettings = FIGHT_SETTINGS,
): number {
  if (lift === 'mean') {
    const lifts: readonly Lift[] = ['bench', 'squat', 'deadlift']
    return lifts.reduce((sum, each) => sum + relativeStrength(each, level, weightKg, settings), 0) / lifts.length
  }
  return oneRepMax(lift, level, weightKg, settings) / oneRepMax(lift, settings.referenceLevel, weightKg, settings)
}
