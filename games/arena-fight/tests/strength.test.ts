import { describe, expect, it } from 'vitest'
import { oneRepMax, relativeStrength, trainingLevel } from '../core/strength.js'
import type { Lift } from '../core/strength.js'

const LIFTS: readonly Lift[] = ['bench', 'squat', 'deadlift']

describe('trainingLevel', () => {
  it.each([
    [0, 0],
    [10, 1],
    [20, 2],
    [30, 3],
    [40, 3.5],
    [50, 4],
    [75, 4.5],
    [100, 5],
    [-5, 0],
    [150, 5],
  ])('reads a score of %d as level %d', (score, level) => {
    expect(trainingLevel(score)).toBeCloseTo(level, 10)
  })
})

describe('oneRepMax', () => {
  it.each([
    ['bench', 1, 50, 27],
    ['squat', 1, 50, 36],
    ['deadlift', 1, 50, 46],
    ['bench', 4, 80, 124],
    ['squat', 4, 80, 168],
    ['deadlift', 4, 80, 196],
    ['bench', 3, 75, 92],
  ] as const)('%s at level %d and %d kg is %d kg', (lift, level, weight, kg) => {
    expect(oneRepMax(lift, level, weight)).toBeCloseTo(kg, 10)
  })

  it('reads between rows and between levels in a straight line', () => {
    expect(oneRepMax('bench', 3, 72.5)).toBeCloseTo(88.5, 10)
    expect(oneRepMax('bench', 3.5, 70)).toBeCloseTo(97.5, 10)
  })

  it('gives someone who never trained 70% of a beginner', () => {
    expect(oneRepMax('bench', 0, 50)).toBeCloseTo(18.9, 10)
  })

  it('scales below 50 kg in proportion to body weight', () => {
    expect(oneRepMax('bench', 1, 45)).toBeCloseTo(24.3, 10)
  })

  it('scales above 140 kg with the 0.67 power of body weight', () => {
    expect(oneRepMax('bench', 3, 150)).toBeCloseTo(158 * (150 / 140) ** 0.67, 6)
  })

  it('treats body weights outside 40 to 160 kg as the nearest limit', () => {
    expect(oneRepMax('squat', 3, 30)).toBe(oneRepMax('squat', 3, 40))
    expect(oneRepMax('squat', 3, 200)).toBe(oneRepMax('squat', 3, 160))
  })

  it('leaves a 50 kg beginner unable to lift 80 kg', () => {
    for (const lift of LIFTS) expect(oneRepMax(lift, trainingLevel(10), 50)).toBeLessThan(80)
  })
})

describe('relativeStrength', () => {
  it('is 1 for an intermediate of any weight', () => {
    for (const lift of [...LIFTS, 'mean'] as const) {
      for (const weight of [50, 75, 140]) expect(relativeStrength(lift, 3, weight)).toBeCloseTo(1, 10)
    }
  })

  it('compares with an intermediate of the same weight', () => {
    expect(relativeStrength('squat', 1, 75)).toBeCloseTo(69 / 124, 10)
  })

  it('averages the three lifts for the other muscle groups', () => {
    const mean =
      (relativeStrength('bench', 5, 75) + relativeStrength('squat', 5, 75) + relativeStrength('deadlift', 5, 75)) / 3
    expect(relativeStrength('mean', 5, 75)).toBeCloseTo(mean, 10)
  })

  it('rises with every level', () => {
    for (const lift of [...LIFTS, 'mean'] as const) {
      for (let level = 0; level < 5; level += 0.5) {
        expect(relativeStrength(lift, level + 0.5, 75)).toBeGreaterThan(relativeStrength(lift, level, 75))
      }
    }
  })
})
