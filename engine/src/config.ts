import type { Experience, TrustLevel } from './types.js'

/**
 * Every tuning number in the growth engine lives in this one object, as
 * CLAUDE.md requires. Nothing else in the engine hard-codes a magic number,
 * so the whole feel of the game can be retuned from here.
 */
export interface EngineConfig {
  /** Only working sets inside this rep window count at all. Inclusive. */
  readonly reps: {
    readonly min: number
    readonly max: number
  }
  readonly intensity: {
    readonly min: number
    readonly max: number
    /**
     * Used when a set has no baseline to compare against (a brand new user's
     * first session). Neutral by design: the first session defines what
     * "usual" means rather than being scored against nothing.
     */
    readonly fallback: number
  }
  /** Where each region starts, by self-declared experience. Also the decay floor. */
  readonly startingSize: Record<Experience, number>
  readonly growth: {
    /** k in gain = min(cap, k * S * (1 - size / 100)). */
    readonly k: number
    /** Most size a region can gain in one week. */
    readonly weeklyGainCap: number
    readonly maxSize: number
  }
  readonly decay: {
    /** Days untrained before a region starts shrinking. */
    readonly idleDays: number
    /** Size lost per week once idle. Never goes below the region's starting size. */
    readonly perWeek: number
  }
  readonly regrowth: {
    /** Lost size comes back this much faster, up to the previous peak. */
    readonly speedMultiplier: number
  }
  readonly definition: {
    readonly lookbackWeeks: number
    /** Hard sets in a week for that week to count toward the definition target. */
    readonly hardSetsPerWeek: number
    /** Fraction of the gap to the target closed each week. */
    readonly approachRate: number
    /**
     * A set counts as a "hard set" for a region when the exercise gives that
     * region more than this weight. At 0, helper regions count too; raise it
     * to make definition depend only on direct work.
     */
    readonly minRegionWeight: number
    readonly max: number
  }
  /** Trust credit: how much of a session's stimulus is awarded. */
  readonly trust: Record<TrustLevel, number>
  /**
   * Optional rules. Each one is checked in exactly one place, and with any of
   * them off the core "sets grow muscle" loop still works.
   */
  readonly features: {
    readonly decay: boolean
    readonly definition: boolean
    readonly trustCredit: boolean
    readonly doubleSpeedRegrowth: boolean
  }
}

export const DEFAULT_CONFIG: EngineConfig = {
  reps: { min: 3, max: 30 },
  intensity: { min: 0.5, max: 1.2, fallback: 1 },
  startingSize: { beginner: 10, intermediate: 30, advanced: 50 },
  growth: { k: 0.5, weeklyGainCap: 3, maxSize: 100 },
  decay: { idleDays: 14, perWeek: 0.5 },
  regrowth: { speedMultiplier: 2 },
  definition: {
    lookbackWeeks: 4,
    hardSetsPerWeek: 3,
    approachRate: 0.25,
    minRegionWeight: 0,
    max: 100,
  },
  trust: { self: 0.5, friend: 1 },
  features: {
    decay: true,
    definition: true,
    trustCredit: true,
    doubleSpeedRegrowth: true,
  },
}

/** Section-level overrides, for tests and for tuning experiments. */
export type ConfigOverrides = {
  readonly [K in keyof EngineConfig]?: Partial<EngineConfig[K]>
}

export function makeConfig(overrides: ConfigOverrides = {}): EngineConfig {
  return {
    reps: { ...DEFAULT_CONFIG.reps, ...overrides.reps },
    intensity: { ...DEFAULT_CONFIG.intensity, ...overrides.intensity },
    startingSize: { ...DEFAULT_CONFIG.startingSize, ...overrides.startingSize },
    growth: { ...DEFAULT_CONFIG.growth, ...overrides.growth },
    decay: { ...DEFAULT_CONFIG.decay, ...overrides.decay },
    regrowth: { ...DEFAULT_CONFIG.regrowth, ...overrides.regrowth },
    definition: { ...DEFAULT_CONFIG.definition, ...overrides.definition },
    trust: { ...DEFAULT_CONFIG.trust, ...overrides.trust },
    features: { ...DEFAULT_CONFIG.features, ...overrides.features },
  }
}
