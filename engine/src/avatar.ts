import type { EngineConfig } from './config.js'
import { DEFAULT_CONFIG } from './config.js'
import type {
  AvatarState,
  Baselines,
  Experience,
  RegionState,
  RegionWeekReport,
  Session,
  WeekReport,
} from './types.js'
import { SCHEMA_VERSION } from './types.js'
import type { RegionId } from './regions.js'
import { REGION_IDS, regionRecord } from './regions.js'
import { weeklyStimulus } from './stimulus.js'
import { growRegion } from './growth.js'
import { nextDefinition, trimHistory } from './definition.js'
import { isWithin } from './time.js'

export interface CreateAvatarOptions {
  readonly experience: Experience
  readonly config?: EngineConfig
}

/**
 * A fresh avatar. Starting size comes from self-declared experience, and that
 * same number becomes the floor decay can never push the region below.
 */
export function createAvatar(options: CreateAvatarOptions): AvatarState {
  const config = options.config ?? DEFAULT_CONFIG
  const startingSize = config.startingSize[options.experience]

  return {
    schemaVersion: SCHEMA_VERSION,
    experience: options.experience,
    regions: regionRecord<RegionState>(() => ({
      size: startingSize,
      definition: 0,
      startingSize,
      peakSize: startingSize,
      lastTrainedAt: null,
    })),
    hardSetHistory: [],
  }
}

export interface AdvanceWeekInput {
  readonly sessions: readonly Session[]
  /** ISO bounds of the week being processed. Inclusive at both ends. */
  readonly weekStart: string
  readonly weekEnd: string
  readonly baselines?: Baselines
  readonly config?: EngineConfig
}

export interface AdvanceWeekResult {
  readonly state: AvatarState
  readonly report: WeekReport
}

/**
 * The one entry point that moves an avatar forward. Order within a week is
 * decay, then growth, then definition. The avatar passed in is never mutated:
 * a new state comes back, alongside a report of what the week did.
 *
 * This engine is the only writer of size and definition anywhere in the app.
 */
export function advanceWeek(state: AvatarState, input: AdvanceWeekInput): AdvanceWeekResult {
  const config = input.config ?? DEFAULT_CONFIG
  const baselines = input.baselines ?? {}

  // Sessions outside the week are counted in the report rather than silently
  // folded in, so a wrong date is visible instead of mysterious.
  const inWeek: Session[] = []
  let outOfWindowSets = 0
  for (const session of input.sessions) {
    if (isWithin(session.performedAt, input.weekStart, input.weekEnd)) {
      inWeek.push(session)
    } else {
      outOfWindowSets += session.sets.length
    }
  }

  const stimulus = weeklyStimulus(inWeek, baselines, config)

  // The current week counts towards its own definition target, so it is
  // appended before the target is read.
  const hardSetHistory = trimHistory(
    [...state.hardSetHistory, { weekEnd: input.weekEnd, counts: stimulus.hardSets }],
    config,
  )

  const regions = {} as Record<RegionId, RegionState>
  const regionReports = {} as Record<RegionId, RegionWeekReport>

  for (const regionId of REGION_IDS) {
    const before = state.regions[regionId]
    const regionStimulus = stimulus.perRegion[regionId]
    const grown = growRegion(before, regionStimulus, input.weekEnd, config)
    const { definition, target } = nextDefinition(
      before.definition,
      hardSetHistory,
      regionId,
      config,
    )
    const trainedAt = stimulus.lastTrainedAt[regionId]

    regions[regionId] = {
      size: grown.size,
      definition,
      startingSize: before.startingSize,
      peakSize: grown.peakSize,
      lastTrainedAt: trainedAt ?? before.lastTrainedAt,
    }

    regionReports[regionId] = {
      stimulus: regionStimulus,
      hardSets: stimulus.hardSets[regionId],
      sizeBefore: before.size,
      sizeAfter: grown.size,
      decayApplied: grown.decayApplied,
      gainApplied: grown.gainApplied,
      regrowthBoosted: grown.regrowthBoosted,
      definitionBefore: before.definition,
      definitionAfter: definition,
      definitionTarget: target,
    }
  }

  return {
    state: {
      schemaVersion: SCHEMA_VERSION,
      experience: state.experience,
      regions,
      hardSetHistory,
    },
    report: {
      weekStart: input.weekStart,
      weekEnd: input.weekEnd,
      sessionCount: inWeek.length,
      countedSets: stimulus.countedSets,
      skippedSets: stimulus.skippedSets,
      outOfWindowSets,
      averageIntensity:
        stimulus.countedSets > 0 ? stimulus.intensitySum / stimulus.countedSets : null,
      regions: regionReports,
    },
  }
}
