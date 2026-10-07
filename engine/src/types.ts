import type { ExerciseId } from './exercises.js'
import type { RegionId } from './regions.js'

/**
 * Bumped only when stored state changes shape. Changes are additive: fields
 * get added, never renamed or removed, so old saved avatars keep loading.
 */
export const SCHEMA_VERSION = 1

export type Experience = 'beginner' | 'intermediate' | 'advanced'

/** How much a session is believed. Friend-confirmed sessions count double a self-report. */
export type TrustLevel = 'self' | 'friend'

export interface LoggedSet {
  readonly exerciseId: ExerciseId
  readonly reps: number
  /** Load used. Omitted for pure bodyweight work, where reps carry the signal. */
  readonly weight?: number
}

export interface Session {
  readonly id: string
  /** ISO timestamp. The engine never reads a clock; all time arrives as data. */
  readonly performedAt: string
  readonly trust: TrustLevel
  readonly sets: readonly LoggedSet[]
}

/** What counts as "usual" for one exercise, which is what intensity is measured against. */
export interface ExerciseBaseline {
  readonly usualWeight?: number
  readonly usualReps?: number
}

export type Baselines = Readonly<Partial<Record<ExerciseId, ExerciseBaseline>>>

export interface RegionState {
  /** 0 to 100. */
  readonly size: number
  /** 0 to 100. */
  readonly definition: number
  /** Decay floor: a region never shrinks below where it started. */
  readonly startingSize: number
  /** Best size ever reached. Lost size regrows at double speed up to here. */
  readonly peakSize: number
  /** ISO timestamp of the last counted set for this region, or null if never trained. */
  readonly lastTrainedAt: string | null
}

/** Hard sets per region for one processed week, used by the definition rule. */
export interface HardSetWeek {
  readonly weekEnd: string
  readonly counts: Readonly<Record<RegionId, number>>
}

export interface AvatarState {
  readonly schemaVersion: number
  readonly experience: Experience
  readonly regions: Readonly<Record<RegionId, RegionState>>
  /**
   * Most recent processed weeks, oldest first, trimmed to the definition
   * lookback window.
   */
  readonly hardSetHistory: readonly HardSetWeek[]
}

export interface RegionWeekReport {
  readonly stimulus: number
  readonly hardSets: number
  readonly sizeBefore: number
  readonly sizeAfter: number
  readonly decayApplied: number
  readonly gainApplied: number
  /** True when regrowth to the previous peak sped this region's gain up. */
  readonly regrowthBoosted: boolean
  readonly definitionBefore: number
  readonly definitionAfter: number
  readonly definitionTarget: number
}

/**
 * What one processed week did. The prototype draws from this, and weekly match
 * scoring will read it later without the growth code needing to change.
 */
export interface WeekReport {
  readonly weekStart: string
  readonly weekEnd: string
  readonly sessionCount: number
  readonly countedSets: number
  /** Sets rejected for falling outside the rep window. */
  readonly skippedSets: number
  /** Sets rejected for sitting outside the week being processed. */
  readonly outOfWindowSets: number
  /** Mean intensity factor across counted sets, or null if nothing counted. */
  readonly averageIntensity: number | null
  readonly regions: Readonly<Record<RegionId, RegionWeekReport>>
}
