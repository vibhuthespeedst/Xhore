import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, makeConfig } from '../src/config.js'
import { trustFactor, weeklyStimulus } from '../src/stimulus.js'
import { advanceWeek, createAvatar } from '../src/avatar.js'
import { session, set, setsSession, weekWindow } from './helpers.js'

const config = DEFAULT_CONFIG
const week = weekWindow(0)

describe('trust credit', () => {
  it('awards half for a self-reported session and full for a confirmed one', () => {
    expect(trustFactor(session(week.midWeek, [], 'self'), config)).toBe(0.5)
    expect(trustFactor(session(week.midWeek, [], 'friend'), config)).toBe(1)
  })

  it('makes a self-reported week worth exactly half a confirmed one', () => {
    const selfReported = weeklyStimulus(
      [setsSession(week.midWeek, 'curl', 9, { trust: 'self' })],
      {},
      config,
    )
    const confirmed = weeklyStimulus(
      [setsSession(week.midWeek, 'curl', 9, { trust: 'friend' })],
      {},
      config,
    )
    expect(selfReported.perRegion.biceps).toBeCloseTo(confirmed.perRegion.biceps / 2, 10)
    expect(selfReported.perRegion.biceps).toBeCloseTo(4.5, 10)
  })

  it('credits each session at its own level within one week', () => {
    const mixed = weeklyStimulus(
      [
        setsSession(week.midWeek, 'curl', 4, { trust: 'self' }),
        setsSession(week.weekEnd, 'curl', 4, { trust: 'friend' }),
      ],
      {},
      config,
    )
    // 4 x 0.5 self plus 4 x 1.0 confirmed.
    expect(mixed.perRegion.biceps).toBeCloseTo(6.0, 10)
  })

  it('leaves the rep window and intensity rules alone', () => {
    const result = weeklyStimulus(
      [session(week.midWeek, [set('curl', 2), set('curl', 10, 24)], 'self')],
      { curl: { usualWeight: 20 } },
      config,
    )
    expect(result.skippedSets).toBe(1)
    // One counted set at I = 1.2, halved for self-reporting.
    expect(result.perRegion.biceps).toBeCloseTo(0.6, 10)
    expect(result.intensitySum).toBeCloseTo(1.2, 10)
  })

  it('shows up as slower growth over a real week', () => {
    const avatar = createAvatar({ experience: 'beginner' })
    const selfWeek = advanceWeek(avatar, {
      sessions: [setsSession(week.midWeek, 'curl', 4, { trust: 'self' })],
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
    })
    const confirmedWeek = advanceWeek(avatar, {
      sessions: [setsSession(week.midWeek, 'curl', 4, { trust: 'friend' })],
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
    })
    expect(selfWeek.state.regions.biceps.size).toBeLessThan(
      confirmedWeek.state.regions.biceps.size,
    )
  })

  it('can be switched off, giving every session full credit', () => {
    const off = makeConfig({ features: { trustCredit: false } })
    expect(trustFactor(session(week.midWeek, [], 'self'), off)).toBe(1)
    const result = weeklyStimulus(
      [setsSession(week.midWeek, 'curl', 9, { trust: 'self' })],
      {},
      off,
    )
    expect(result.perRegion.biceps).toBeCloseTo(9.0, 10)
  })

  it('reads its rates from config, so the prototype can expose a toggle', () => {
    const generous = makeConfig({ trust: { self: 0.8 } })
    expect(trustFactor(session(week.midWeek, [], 'self'), generous)).toBe(0.8)
  })
})
