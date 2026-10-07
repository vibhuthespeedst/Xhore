import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, makeConfig } from '../src/config.js'
import { applyRegrowth, growRegion, sizeGain } from '../src/growth.js'
import { regionState, weekWindow } from './helpers.js'

const config = DEFAULT_CONFIG
const week = weekWindow(0)

describe('weekly size gain', () => {
  it('follows gain = k x S x (1 - size / 100)', () => {
    // 0.5 x 4 x 0.9
    expect(sizeGain(10, 4, config)).toBeCloseTo(1.8, 10)
    // 0.5 x 4 x 0.5
    expect(sizeGain(50, 4, config)).toBeCloseTo(1.0, 10)
  })

  it('caps at 3 a week', () => {
    // Uncapped this would be 4.05.
    expect(sizeGain(10, 9, config)).toBe(3)
    expect(sizeGain(10, 100, config)).toBe(3)
  })

  it('shrinks towards zero as a region approaches 100', () => {
    expect(sizeGain(99, 4, config)).toBeCloseTo(0.02, 10)
    expect(sizeGain(100, 4, config)).toBe(0)
  })

  it('gives nothing without stimulus', () => {
    expect(sizeGain(10, 0, config)).toBe(0)
  })

  it('reads k and the cap from config', () => {
    const faster = makeConfig({ growth: { k: 1, weeklyGainCap: 10 } })
    expect(sizeGain(10, 9, faster)).toBeCloseTo(8.1, 10)
  })
})

describe('growing a region over one week', () => {
  it('adds the gain to the current size', () => {
    const grown = growRegion(regionState({ size: 10 }), 4, week.weekEnd, config)
    expect(grown.size).toBeCloseTo(11.8, 10)
    expect(grown.gainApplied).toBeCloseTo(1.8, 10)
    expect(grown.decayApplied).toBe(0)
  })

  it('never pushes a region past 100', () => {
    const grown = growRegion(
      regionState({ size: 99.9, peakSize: 99.9, startingSize: 10 }),
      1000,
      week.weekEnd,
      config,
    )
    expect(grown.size).toBe(100)
    expect(grown.gainApplied).toBeCloseTo(0.1, 10)
  })

  it('slows to a crawl near the top, so 100 is approached and not walked to', () => {
    // The (1 - size / 100) term means an ordinary hard week barely moves a
    // region that is already near the ceiling.
    const grown = growRegion(regionState({ size: 99.9, peakSize: 99.9 }), 9, week.weekEnd, config)
    expect(grown.gainApplied).toBeCloseTo(0.0045, 10)
    expect(grown.size).toBeLessThan(100)
  })

  it('tracks the best size ever reached', () => {
    const grown = growRegion(regionState({ size: 10, peakSize: 10 }), 4, week.weekEnd, config)
    expect(grown.peakSize).toBeCloseTo(11.8, 10)
  })

  it('does not lower the peak when a region is below it', () => {
    const grown = growRegion(regionState({ size: 10, peakSize: 40 }), 0, week.weekEnd, config)
    expect(grown.peakSize).toBe(40)
  })
})

describe('double speed regrowth', () => {
  it('doubles the gain while a region is below its previous peak', () => {
    const normal = applyRegrowth(20, 20, 0.8, config)
    const regrowing = applyRegrowth(20, 30, 0.8, config)
    expect(normal.gain).toBeCloseTo(0.8, 10)
    expect(normal.boosted).toBe(false)
    expect(regrowing.gain).toBeCloseTo(1.6, 10)
    expect(regrowing.boosted).toBe(true)
  })

  it('stops doubling at the peak and grows at normal speed above it', () => {
    // 1 point of room left, 3 points of base gain. Reaching the peak spends
    // 0.5 of that budget at double speed; the remaining 2.5 grows normally.
    const result = applyRegrowth(29, 30, 3, config)
    expect(result.gain).toBeCloseTo(3.5, 10)
    expect(29 + result.gain).toBeCloseTo(32.5, 10)
  })

  it('never earns less than the unboosted gain', () => {
    for (const size of [10, 20, 29, 29.9, 30]) {
      const base = 3
      const result = applyRegrowth(size, 30, base, config)
      expect(result.gain).toBeGreaterThanOrEqual(base - 1e-9)
    }
  })

  it('gives nothing extra without stimulus', () => {
    expect(applyRegrowth(20, 30, 0, config)).toEqual({ gain: 0, boosted: false })
  })

  it('can be switched off, leaving plain growth', () => {
    const off = makeConfig({ features: { doubleSpeedRegrowth: false } })
    const result = applyRegrowth(20, 30, 0.8, off)
    expect(result.gain).toBeCloseTo(0.8, 10)
    expect(result.boosted).toBe(false)
  })

  it('regrows lost size faster than it was first built', () => {
    const fresh = growRegion(regionState({ size: 20, peakSize: 20 }), 4, week.weekEnd, config)
    const comeback = growRegion(regionState({ size: 20, peakSize: 40 }), 4, week.weekEnd, config)
    expect(comeback.gainApplied).toBeCloseTo(fresh.gainApplied * 2, 10)
    expect(comeback.regrowthBoosted).toBe(true)
  })
})
