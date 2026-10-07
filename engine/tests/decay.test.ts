import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, makeConfig } from '../src/config.js'
import { decayAmount, growRegion } from '../src/growth.js'
import { addDays } from '../src/time.js'
import { regionState } from './helpers.js'

const config = DEFAULT_CONFIG
const TRAINED = '2026-01-06T00:00:00.000Z'

/** A region that has been trained up to 13 and is now sitting idle. */
function idle() {
  return regionState({ size: 13, startingSize: 10, peakSize: 13, lastTrainedAt: TRAINED })
}

describe('decay threshold', () => {
  it('does nothing before 14 idle days', () => {
    expect(decayAmount(idle(), addDays(TRAINED, 13), false, config)).toBe(0)
  })

  it('kicks in at exactly 14 idle days', () => {
    expect(decayAmount(idle(), addDays(TRAINED, 14), false, config)).toBe(0.5)
  })

  it('costs 0.5 for each week processed while idle', () => {
    expect(decayAmount(idle(), addDays(TRAINED, 21), false, config)).toBe(0.5)
    expect(decayAmount(idle(), addDays(TRAINED, 70), false, config)).toBe(0.5)
  })

  it('reads the idle window and rate from config', () => {
    const harsh = makeConfig({ decay: { idleDays: 7, perWeek: 1 } })
    expect(decayAmount(idle(), addDays(TRAINED, 7), false, harsh)).toBe(1)
  })
})

describe('decay floor', () => {
  it('never drops a region below its starting size', () => {
    const atFloor = regionState({ size: 10, startingSize: 10, lastTrainedAt: TRAINED })
    expect(decayAmount(atFloor, addDays(TRAINED, 60), false, config)).toBe(0)
  })

  it('only takes the part that is above the starting size', () => {
    const justAbove = regionState({ size: 10.3, startingSize: 10, lastTrainedAt: TRAINED })
    expect(decayAmount(justAbove, addDays(TRAINED, 60), false, config)).toBeCloseTo(0.3, 10)
  })

  it('shrinks week after week, then stops at the floor', () => {
    let region = idle()
    const sizes: number[] = []
    for (let weekIndex = 2; weekIndex <= 10; weekIndex += 1) {
      const grown = growRegion(region, 0, addDays(TRAINED, weekIndex * 7), config)
      region = { ...region, size: grown.size, peakSize: grown.peakSize }
      sizes.push(Number(grown.size.toFixed(4)))
    }
    expect(sizes).toEqual([12.5, 12, 11.5, 11, 10.5, 10, 10, 10, 10])
    expect(region.peakSize).toBe(13)
  })
})

describe('when decay does not apply', () => {
  it('spares a region that was trained during the week', () => {
    expect(decayAmount(idle(), addDays(TRAINED, 60), true, config)).toBe(0)
  })

  it('spares a region trained this week even after a long layoff', () => {
    // Stimulus arriving this week cancels decay outright, so a comeback week
    // never shrinks the muscle it just worked.
    const grown = growRegion(idle(), 4, addDays(TRAINED, 60), config)
    expect(grown.decayApplied).toBe(0)
    expect(grown.size).toBeGreaterThan(13)
  })

  it('spares a region that was never trained', () => {
    const untouched = regionState({ size: 10, startingSize: 10, lastTrainedAt: null })
    expect(decayAmount(untouched, addDays(TRAINED, 365), false, config)).toBe(0)
  })

  it('can be switched off entirely', () => {
    const off = makeConfig({ features: { decay: false } })
    expect(decayAmount(idle(), addDays(TRAINED, 60), false, off)).toBe(0)
  })
})

describe('decay then regrowth', () => {
  it('brings lost size back at double speed up to the old peak', () => {
    const weekEnd = addDays(TRAINED, 60)
    // Decayed down to 11 from a peak of 13.
    const decayed = regionState({
      size: 11,
      startingSize: 10,
      peakSize: 13,
      lastTrainedAt: TRAINED,
    })
    const comeback = growRegion(decayed, 2, weekEnd, config)

    const baseGain = 0.5 * 2 * (1 - 11 / 100)
    expect(comeback.gainApplied).toBeCloseTo(baseGain * 2, 10)
    expect(comeback.regrowthBoosted).toBe(true)
    expect(comeback.size).toBeLessThanOrEqual(13)
  })

  it('returns to normal speed once past the old peak', () => {
    const weekEnd = addDays(TRAINED, 60)
    const nearPeak = regionState({
      size: 12.9,
      startingSize: 10,
      peakSize: 13,
      lastTrainedAt: TRAINED,
    })
    const grown = growRegion(nearPeak, 9, weekEnd, config)
    // 0.1 of room spends 0.05 of the capped 3 point budget at double speed,
    // and the remaining 2.95 is added at normal speed.
    expect(grown.size).toBeCloseTo(15.95, 10)
    expect(grown.peakSize).toBeCloseTo(15.95, 10)
  })
})
