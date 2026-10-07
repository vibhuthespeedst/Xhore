import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, makeConfig } from '../src/config.js'
import { isCountedSet, weeklyStimulus } from '../src/stimulus.js'
import { session, set, setsSession, weekWindow } from './helpers.js'

const config = DEFAULT_CONFIG
const week = weekWindow(0)

describe('which sets count', () => {
  it.each([
    [2, false],
    [3, true],
    [10, true],
    [30, true],
    [31, false],
  ])('a %i rep set counts: %s', (reps, counted) => {
    expect(isCountedSet(set('curl', reps), config)).toBe(counted)
  })

  it('rejects a set with non-finite reps', () => {
    expect(isCountedSet(set('curl', Number.NaN), config)).toBe(false)
  })

  it('reads the rep window from config', () => {
    const narrow = makeConfig({ reps: { min: 5, max: 8 } })
    expect(isCountedSet(set('curl', 3), narrow)).toBe(false)
    expect(isCountedSet(set('curl', 6), narrow)).toBe(true)
  })

  it('counts sets outside the rep window as skipped, giving no stimulus', () => {
    const result = weeklyStimulus(
      [session(week.midWeek, [set('curl', 2), set('curl', 31), set('curl', 10)])],
      {},
      config,
    )
    expect(result.countedSets).toBe(1)
    expect(result.skippedSets).toBe(2)
    expect(result.perRegion.biceps).toBe(1.0)
  })
})

describe('weekly stimulus per region', () => {
  it('gives the main region the full set and helpers their share', () => {
    const result = weeklyStimulus([setsSession(week.midWeek, 'curl', 1)], {}, config)
    expect(result.perRegion.biceps).toBeCloseTo(1.0, 10)
    expect(result.perRegion.forearms).toBeCloseTo(0.3, 10)
  })

  it('leaves untouched regions at zero', () => {
    const result = weeklyStimulus([setsSession(week.midWeek, 'curl', 3)], {}, config)
    expect(result.perRegion.quads).toBe(0)
    expect(result.perRegion.calves).toBe(0)
  })

  it('sums across sets', () => {
    const result = weeklyStimulus([setsSession(week.midWeek, 'curl', 9)], {}, config)
    expect(result.perRegion.biceps).toBeCloseTo(9.0, 10)
    expect(result.perRegion.forearms).toBeCloseTo(2.7, 10)
  })

  it('sums across sessions', () => {
    const result = weeklyStimulus(
      [setsSession(week.midWeek, 'curl', 3), setsSession(week.weekEnd, 'curl', 2)],
      {},
      config,
    )
    expect(result.perRegion.biceps).toBeCloseTo(5.0, 10)
  })

  it('sums contributions to a region shared by two exercises', () => {
    // Bench gives triceps 0.5, pushdown gives it 1.0.
    const result = weeklyStimulus(
      [session(week.midWeek, [set('bench_press', 10), set('tricep_pushdown', 10)])],
      {},
      config,
    )
    expect(result.perRegion.triceps).toBeCloseTo(1.5, 10)
  })

  it('scales stimulus by intensity', () => {
    const result = weeklyStimulus(
      [session(week.midWeek, [set('curl', 10, 24)])],
      { curl: { usualWeight: 20 } },
      config,
    )
    // I = clamp(24 / 20) = 1.2, so biceps gets 1.0 x 1.2.
    expect(result.perRegion.biceps).toBeCloseTo(1.2, 10)
    expect(result.perRegion.forearms).toBeCloseTo(0.36, 10)
  })

  it('reports average intensity inputs for later match scoring', () => {
    const result = weeklyStimulus(
      [session(week.midWeek, [set('curl', 10, 20), set('curl', 10, 24)])],
      { curl: { usualWeight: 20 } },
      config,
    )
    expect(result.intensitySum / result.countedSets).toBeCloseTo(1.1, 10)
  })
})

describe('hard set counts', () => {
  it('counts one hard set per region a set touches', () => {
    const result = weeklyStimulus([setsSession(week.midWeek, 'squat', 3)], {}, config)
    expect(result.hardSets.quads).toBe(3)
    expect(result.hardSets.glutes).toBe(3)
    expect(result.hardSets.calves).toBe(0)
  })

  it('is not scaled by trust, because it measures consistency', () => {
    const selfReported = weeklyStimulus(
      [setsSession(week.midWeek, 'curl', 4, { trust: 'self' })],
      {},
      config,
    )
    expect(selfReported.hardSets.biceps).toBe(4)
    expect(selfReported.perRegion.biceps).toBeCloseTo(2.0, 10)
  })

  it('can be restricted to direct work via config', () => {
    const directOnly = makeConfig({ definition: { minRegionWeight: 0.9 } })
    const result = weeklyStimulus([setsSession(week.midWeek, 'squat', 3)], {}, directOnly)
    expect(result.hardSets.quads).toBe(3)
    expect(result.hardSets.glutes).toBe(0)
  })
})

describe('last trained tracking', () => {
  it('records the latest session that touched each region', () => {
    const result = weeklyStimulus(
      [setsSession(week.weekEnd, 'curl', 1), setsSession(week.midWeek, 'curl', 1)],
      {},
      config,
    )
    expect(result.lastTrainedAt.biceps).toBe(week.weekEnd)
  })

  it('leaves untouched regions null', () => {
    const result = weeklyStimulus([setsSession(week.midWeek, 'curl', 1)], {}, config)
    expect(result.lastTrainedAt.quads).toBeNull()
  })
})
