import type { EngineConfig } from './config.js'
import type { Exercise } from './exercises.js'
import type { ExerciseBaseline, LoggedSet } from './types.js'
import { clamp } from './math.js'

/**
 * Intensity factor for one set: I = clamp(weight / usualWeight, 0.5, 1.2).
 * Bodyweight exercises use reps / usualReps instead, because on those the bar
 * load is not what got harder.
 */
export function intensityForSet(
  set: LoggedSet,
  exercise: Exercise,
  baseline: ExerciseBaseline | undefined,
  config: EngineConfig,
): number {
  const basis = exercise.bodyweight
    ? ratio(set.reps, baseline?.usualReps)
    : ratio(set.weight, baseline?.usualWeight)

  // No baseline yet means there is nothing to compare against, so the set is
  // treated as an ordinary working set rather than scored against zero.
  const value = basis ?? config.intensity.fallback
  return clamp(value, config.intensity.min, config.intensity.max)
}

function ratio(value: number | undefined, usual: number | undefined): number | null {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return null
  if (usual === undefined || !Number.isFinite(usual) || usual <= 0) return null
  return value / usual
}
