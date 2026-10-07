import { describe, expect, it } from 'vitest'
import { makeConfig } from '../src/config.js'
import { advanceWeek, createAvatar } from '../src/avatar.js'
import type { EngineConfig } from '../src/config.js'
import { setsSession, weekWindow } from './helpers.js'

const week = weekWindow(0)

/** One ordinary hard week of curls, run under whatever config is given. */
function oneHardWeek(config: EngineConfig) {
  const avatar = createAvatar({ experience: 'beginner', config })
  return advanceWeek(avatar, {
    sessions: [setsSession(week.midWeek, 'curl', 9)],
    weekStart: week.weekStart,
    weekEnd: week.weekEnd,
    config,
  })
}

const FLAGS = ['decay', 'definition', 'trustCredit', 'doubleSpeedRegrowth'] as const

describe('optional features fail safe', () => {
  it.each(FLAGS)('still grows muscle with %s switched off', (flag) => {
    const config = makeConfig({ features: { [flag]: false } })
    const { state } = oneHardWeek(config)
    expect(state.regions.biceps.size).toBeGreaterThan(10)
  })

  it('still grows muscle with every optional feature switched off', () => {
    const config = makeConfig({
      features: {
        decay: false,
        definition: false,
        trustCredit: false,
        doubleSpeedRegrowth: false,
      },
    })
    const { state, report } = oneHardWeek(config)

    // The core loop is untouched: 9 sets at full intensity, capped at 3 a week.
    expect(state.regions.biceps.size).toBe(13)
    expect(report.countedSets).toBe(9)
    expect(report.regions.biceps.stimulus).toBeCloseTo(9, 10)
  })

  it('leaves definition at zero when definition is off, without affecting size', () => {
    const off = makeConfig({ features: { definition: false } })
    const on = makeConfig({ features: { definition: true } })
    const withoutDefinition = oneHardWeek(off)
    const withDefinition = oneHardWeek(on)

    expect(withoutDefinition.state.regions.biceps.definition).toBe(0)
    expect(withDefinition.state.regions.biceps.definition).toBeGreaterThan(0)
    expect(withoutDefinition.state.regions.biceps.size).toBe(
      withDefinition.state.regions.biceps.size,
    )
  })

  it('holds sizes steady through a long layoff when decay is off', () => {
    const off = makeConfig({ features: { decay: false } })
    let state = oneHardWeek(off).state
    const afterTraining = state.regions.biceps.size

    for (let index = 1; index <= 10; index += 1) {
      const idleWeek = weekWindow(index)
      state = advanceWeek(state, {
        sessions: [],
        weekStart: idleWeek.weekStart,
        weekEnd: idleWeek.weekEnd,
        config: off,
      }).state
    }
    expect(state.regions.biceps.size).toBe(afterTraining)
  })

  it('still reports every region whatever is switched off', () => {
    const config = makeConfig({
      features: { decay: false, definition: false, trustCredit: false },
    })
    const { report } = oneHardWeek(config)
    expect(Object.keys(report.regions)).toHaveLength(19)
  })
})
