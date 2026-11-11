import { describe, expect, it } from 'vitest'
import { MathUtils } from 'three'
import { BREATH_SECONDS, SWAY_SECONDS, breathingPose } from '../src/breathing.js'

describe('breathing', () => {
  it('starts with empty lungs, in the stance from the body file', () => {
    const pose = breathingPose(0)
    expect(pose.chestLift).toBe(0)
    expect(pose.shoulderLift).toBe(0)
    expect(pose.sway).toBe(0)
  })

  it('fills the lungs halfway through a breath and empties them by its end', () => {
    const full = breathingPose(BREATH_SECONDS / 2)
    const empty = breathingPose(BREATH_SECONDS)
    expect(full.chestLift).toBeGreaterThan(0)
    expect(full.shoulderLift).toBeGreaterThan(0)
    expect(empty.chestLift).toBeCloseTo(0, 10)
    expect(empty.shoulderLift).toBeCloseTo(0, 10)
  })

  it('never takes the chest or shoulders below their resting stance', () => {
    for (let seconds = 0; seconds < 60; seconds += 0.05) {
      const pose = breathingPose(seconds)
      expect(pose.chestLift).toBeGreaterThanOrEqual(0)
      expect(pose.shoulderLift).toBeGreaterThanOrEqual(0)
    }
  })

  it('sways to both sides, more slowly than it breathes', () => {
    expect(SWAY_SECONDS).toBeGreaterThan(BREATH_SECONDS)
    expect(breathingPose(SWAY_SECONDS / 4).sway).toBeGreaterThan(0)
    expect(breathingPose((3 * SWAY_SECONDS) / 4).sway).toBeLessThan(0)
  })

  it('stays small enough to read as breathing rather than a movement', () => {
    for (let seconds = 0; seconds < 60; seconds += 0.05) {
      const pose = breathingPose(seconds)
      for (const angle of [pose.chestLift, pose.shoulderLift, pose.sway]) {
        expect(Math.abs(MathUtils.radToDeg(angle))).toBeLessThanOrEqual(3)
      }
    }
  })
})
