import type { EngineConfig } from './config.js'
import type { Baselines, LoggedSet, Session } from './types.js'
import type { RegionId } from './regions.js'
import { EXERCISES, isExerciseId } from './exercises.js'
import { regionRecord } from './regions.js'
import { intensityForSet } from './intensity.js'
import { toTime } from './time.js'

export interface WeeklyStimulus {
  /** S per region: summed over the week, of (region weight x intensity x trust). */
  readonly perRegion: Readonly<Record<RegionId, number>>
  /** Hard sets per region, used by the definition rule. Not scaled by trust. */
  readonly hardSets: Readonly<Record<RegionId, number>>
  /** Latest counted set per region, or null if the region was untouched. */
  readonly lastTrainedAt: Readonly<Record<RegionId, string | null>>
  readonly countedSets: number
  readonly skippedSets: number
  /** Sum of the intensity factors of counted sets, for averaging. */
  readonly intensitySum: number
}

/** Only working sets of 3 to 30 reps count towards anything. */
export function isCountedSet(set: LoggedSet, config: EngineConfig): boolean {
  if (!isExerciseId(set.exerciseId)) return false
  if (!Number.isFinite(set.reps)) return false
  return set.reps >= config.reps.min && set.reps <= config.reps.max
}

/**
 * Trust credit: a self-reported session earns half credit, a friend-confirmed
 * one earns full. Applied per set as it lands in the stimulus total, so a week
 * that mixes confirmed and self-reported sessions stays correct.
 */
export function trustFactor(session: Session, config: EngineConfig): number {
  if (!config.features.trustCredit) return 1
  return config.trust[session.trust] ?? config.trust.self
}

export function weeklyStimulus(
  sessions: readonly Session[],
  baselines: Baselines,
  config: EngineConfig,
): WeeklyStimulus {
  const perRegion = regionRecord(() => 0)
  const hardSets = regionRecord(() => 0)
  const lastTrainedAt = regionRecord<string | null>(() => null)
  let countedSets = 0
  let skippedSets = 0
  let intensitySum = 0

  for (const session of sessions) {
    const trust = trustFactor(session, config)

    for (const set of session.sets) {
      if (!isCountedSet(set, config)) {
        skippedSets += 1
        continue
      }

      const exercise = EXERCISES[set.exerciseId]
      const intensity = intensityForSet(set, exercise, baselines[set.exerciseId], config)
      countedSets += 1
      intensitySum += intensity

      const entries = Object.entries(exercise.regions) as [RegionId, number][]
      for (const [region, weight] of entries) {
        perRegion[region] += weight * intensity * trust

        if (weight > config.definition.minRegionWeight) {
          hardSets[region] += 1
          const current = lastTrainedAt[region]
          if (current === null || toTime(session.performedAt) > toTime(current)) {
            lastTrainedAt[region] = session.performedAt
          }
        }
      }
    }
  }

  return { perRegion, hardSets, lastTrainedAt, countedSets, skippedSets, intensitySum }
}
