import type { EngineConfig } from './config.js'
import type { RegionState } from './types.js'
import { clamp } from './math.js'
import { daysBetween } from './time.js'

export interface RegionGrowth {
  readonly size: number
  readonly peakSize: number
  readonly decayApplied: number
  readonly gainApplied: number
  readonly regrowthBoosted: boolean
}

/** gain = min(cap, k * S * (1 - size / 100)). */
export function sizeGain(size: number, stimulus: number, config: EngineConfig): number {
  if (stimulus <= 0) return 0
  const headroom = 1 - size / config.growth.maxSize
  if (headroom <= 0) return 0
  return Math.min(config.growth.weeklyGainCap, config.growth.k * stimulus * headroom)
}

/**
 * A region untrained for 14+ days loses 0.5 a week, never below its starting
 * size. Training the region during the week cancels decay outright, so a
 * comeback week never shrinks the muscle it just worked.
 */
export function decayAmount(
  region: RegionState,
  weekEndIso: string,
  trainedThisWeek: boolean,
  config: EngineConfig,
): number {
  if (!config.features.decay) return 0
  if (trainedThisWeek) return 0
  if (region.lastTrainedAt === null) return 0
  if (daysBetween(region.lastTrainedAt, weekEndIso) < config.decay.idleDays) return 0
  return Math.max(0, Math.min(config.decay.perWeek, region.size - region.startingSize))
}

/**
 * Lost size regrows at double speed, but only up to the previous peak. When a
 * weekly gain would carry the region past that peak, the part below the peak is
 * spent at double speed and the remainder grows at normal speed.
 */
export function applyRegrowth(
  size: number,
  peakSize: number,
  baseGain: number,
  config: EngineConfig,
): { gain: number; boosted: boolean } {
  if (baseGain <= 0) return { gain: 0, boosted: false }
  if (!config.features.doubleSpeedRegrowth) return { gain: baseGain, boosted: false }

  const room = peakSize - size
  if (room <= 0) return { gain: baseGain, boosted: false }

  const multiplier = config.regrowth.speedMultiplier
  const boostedGain = baseGain * multiplier
  if (boostedGain <= room) return { gain: boostedGain, boosted: true }

  const spentReachingPeak = room / multiplier
  const remainingAtNormalSpeed = Math.max(0, baseGain - spentReachingPeak)
  return { gain: room + remainingAtNormalSpeed, boosted: true }
}

/** One week of decay then growth for a single region. */
export function growRegion(
  region: RegionState,
  stimulus: number,
  weekEndIso: string,
  config: EngineConfig,
): RegionGrowth {
  const trainedThisWeek = stimulus > 0
  const decayApplied = decayAmount(region, weekEndIso, trainedThisWeek, config)
  const afterDecay = region.size - decayApplied

  const baseGain = sizeGain(afterDecay, stimulus, config)
  const { gain, boosted } = applyRegrowth(afterDecay, region.peakSize, baseGain, config)
  const size = clamp(afterDecay + gain, 0, config.growth.maxSize)

  return {
    size,
    peakSize: Math.max(region.peakSize, size),
    decayApplied,
    // Measured after the ceiling at 100, so the report never claims unearned gain.
    gainApplied: size - afterDecay,
    regrowthBoosted: boosted && size > afterDecay,
  }
}
