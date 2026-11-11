import { MathUtils } from 'three'

/**
 * How a standing body moves while idle, so the avatar does not stand like a
 * statue: a slow breath that lifts the chest and shoulders, and a slight sway.
 * Only numbers worked out from the time, so it is tested without graphics.
 */
export interface BreathingPose {
  /** How far the chest leans back as the lungs fill, in radians. */
  readonly chestLift: number
  /** How far each shoulder rises, in radians. */
  readonly shoulderLift: number
  /** How far the upper body sways to the side, in radians. Swings both ways. */
  readonly sway: number
}

/** Seconds per breath. A resting adult takes 12 to 20 breaths a minute. */
export const BREATH_SECONDS = 4.5
/** Seconds per sway. Slower than a breath and not a multiple of it, so the two never fall into step. */
export const SWAY_SECONDS = 7.3

const CHEST_LIFT = MathUtils.degToRad(1.5)
const SHOULDER_LIFT = MathUtils.degToRad(2.5)
const SWAY = MathUtils.degToRad(0.8)

/** The pose `seconds` into the idle motion. At 0 the lungs are empty, so the body is in the stance from its file. */
export function breathingPose(seconds: number): BreathingPose {
  // 0 with the lungs empty, 1 with them full, easing in and out like a real breath.
  const fill = (1 - Math.cos((2 * Math.PI * seconds) / BREATH_SECONDS)) / 2
  return {
    chestLift: CHEST_LIFT * fill,
    shoulderLift: SHOULDER_LIFT * fill,
    sway: SWAY * Math.sin((2 * Math.PI * seconds) / SWAY_SECONDS),
  }
}
