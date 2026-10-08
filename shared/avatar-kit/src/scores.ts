import type { RegionId } from '@xhore/engine'

/**
 * What the kit needs to know about one region. An engine `RegionState` fits
 * as it is, so an avatar's regions can be handed over without conversion.
 */
export interface RegionScore {
  /** 0 to 100. */
  readonly size: number
  /** 0 to 100. */
  readonly definition: number
}

export type RegionScores = Readonly<Record<RegionId, RegionScore>>

const MAX_SCORE = 100

/**
 * Turns a 0 to 100 score into a 0 to 1 strength for blending shapes. Anything
 * that is not a usable number shows as 0 rather than breaking the display.
 */
export function scoreToStrength(score: number): number {
  if (!Number.isFinite(score)) return 0
  return Math.min(1, Math.max(0, score / MAX_SCORE))
}

export function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount
}
