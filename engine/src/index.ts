/**
 * Public surface of the growth engine. The prototype, the mobile app and the
 * server all import from here and nowhere deeper, so internals stay free to
 * change. Pure functions only: no I/O, no React, no system clock.
 */

export type { EngineConfig, ConfigOverrides } from './config.js'
export { DEFAULT_CONFIG, makeConfig } from './config.js'

export type { RegionId } from './regions.js'
export { REGION_IDS, REGION_LABELS, isRegionId, regionRecord } from './regions.js'

export type { Exercise, ExerciseId } from './exercises.js'
export { EXERCISES, EXERCISE_IDS, getExercise, isExerciseId } from './exercises.js'

export type {
  AvatarState,
  Baselines,
  Experience,
  ExerciseBaseline,
  HardSetWeek,
  LoggedSet,
  RegionState,
  RegionWeekReport,
  Session,
  TrustLevel,
  WeekReport,
} from './types.js'
export { SCHEMA_VERSION } from './types.js'

export type { CreateAvatarOptions, AdvanceWeekInput, AdvanceWeekResult } from './avatar.js'
export { createAvatar, advanceWeek } from './avatar.js'

export type { WeeklyStimulus } from './stimulus.js'
export { weeklyStimulus, isCountedSet, trustFactor } from './stimulus.js'

export { intensityForSet } from './intensity.js'

export type { RegionGrowth } from './growth.js'
export { sizeGain, decayAmount, applyRegrowth, growRegion } from './growth.js'

export { definitionTarget, moveTowardTarget, nextDefinition, trimHistory } from './definition.js'

export { clamp, roundTo } from './math.js'
export { MS_PER_DAY, addDays, daysBetween, isWithin, toTime } from './time.js'
