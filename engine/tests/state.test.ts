import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG } from '../src/config.js'
import { advanceWeek, createAvatar } from '../src/avatar.js'
import { REGION_IDS } from '../src/regions.js'
import { SCHEMA_VERSION } from '../src/types.js'
import { EXPERIENCES, deepClone, session, set, setsSession, weekWindow } from './helpers.js'

const week = weekWindow(0)

describe('a new avatar', () => {
  it.each([
    ['beginner', 10],
    ['intermediate', 30],
    ['advanced', 50],
  ] as const)('starts a %s at size %i everywhere', (experience, expected) => {
    const avatar = createAvatar({ experience })
    for (const region of REGION_IDS) {
      expect(avatar.regions[region].size).toBe(expected)
      expect(avatar.regions[region].startingSize).toBe(expected)
      expect(avatar.regions[region].peakSize).toBe(expected)
    }
  })

  it('starts with no definition and nothing trained', () => {
    const avatar = createAvatar({ experience: 'beginner' })
    for (const region of REGION_IDS) {
      expect(avatar.regions[region].definition).toBe(0)
      expect(avatar.regions[region].lastTrainedAt).toBeNull()
    }
  })

  it.each(EXPERIENCES)('covers all 19 regions for a %s', (experience) => {
    const avatar = createAvatar({ experience })
    expect(Object.keys(avatar.regions).sort()).toEqual([...REGION_IDS].sort())
  })

  it('stamps the schema version onto stored state', () => {
    expect(createAvatar({ experience: 'beginner' }).schemaVersion).toBe(SCHEMA_VERSION)
    expect(SCHEMA_VERSION).toBe(1)
  })

  it('takes its starting sizes from config', () => {
    expect(createAvatar({ experience: 'advanced', config: DEFAULT_CONFIG }).regions.abs.size).toBe(
      DEFAULT_CONFIG.startingSize.advanced,
    )
  })
})

describe('advanceWeek', () => {
  it('never mutates the avatar passed in', () => {
    const avatar = createAvatar({ experience: 'beginner' })
    const before = deepClone(avatar)
    const result = advanceWeek(avatar, {
      sessions: [setsSession(week.midWeek, 'curl', 9)],
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
    })

    expect(avatar).toEqual(before)
    expect(result.state).not.toBe(avatar)
    expect(result.state.regions.biceps.size).toBeGreaterThan(avatar.regions.biceps.size)
  })

  it('carries the schema version and experience forward', () => {
    const avatar = createAvatar({ experience: 'intermediate' })
    const { state } = advanceWeek(avatar, {
      sessions: [],
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
    })
    expect(state.schemaVersion).toBe(SCHEMA_VERSION)
    expect(state.experience).toBe('intermediate')
  })

  it('stamps lastTrainedAt only on the regions that were worked', () => {
    const avatar = createAvatar({ experience: 'beginner' })
    const { state } = advanceWeek(avatar, {
      sessions: [setsSession(week.midWeek, 'curl', 3)],
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
    })
    expect(state.regions.biceps.lastTrainedAt).toBe(week.midWeek)
    expect(state.regions.forearms.lastTrainedAt).toBe(week.midWeek)
    expect(state.regions.quads.lastTrainedAt).toBeNull()
  })

  it('keeps an earlier lastTrainedAt when a region is skipped this week', () => {
    const avatar = createAvatar({ experience: 'beginner' })
    const first = advanceWeek(avatar, {
      sessions: [setsSession(week.midWeek, 'curl', 3)],
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
    })
    const next = weekWindow(1)
    const second = advanceWeek(first.state, {
      sessions: [setsSession(next.midWeek, 'squat', 3)],
      weekStart: next.weekStart,
      weekEnd: next.weekEnd,
    })
    expect(second.state.regions.biceps.lastTrainedAt).toBe(week.midWeek)
    expect(second.state.regions.quads.lastTrainedAt).toBe(next.midWeek)
  })

  it('does nothing to sizes in a week with no sessions', () => {
    const avatar = createAvatar({ experience: 'beginner' })
    const { state, report } = advanceWeek(avatar, {
      sessions: [],
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
    })
    expect(state.regions.biceps.size).toBe(10)
    expect(report.countedSets).toBe(0)
    expect(report.averageIntensity).toBeNull()
  })
})

describe('the week report', () => {
  it('counts sessions, counted sets and skipped sets', () => {
    const avatar = createAvatar({ experience: 'beginner' })
    const { report } = advanceWeek(avatar, {
      sessions: [
        session(week.midWeek, [set('curl', 10), set('curl', 2)]),
        setsSession(week.weekEnd, 'squat', 3),
      ],
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
    })
    expect(report.sessionCount).toBe(2)
    expect(report.countedSets).toBe(4)
    expect(report.skippedSets).toBe(1)
    expect(report.outOfWindowSets).toBe(0)
  })

  it('reports sessions dated outside the week instead of silently folding them in', () => {
    const avatar = createAvatar({ experience: 'beginner' })
    const nextWeek = weekWindow(1)
    const { state, report } = advanceWeek(avatar, {
      sessions: [setsSession(nextWeek.midWeek, 'curl', 5)],
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
    })
    expect(report.sessionCount).toBe(0)
    expect(report.outOfWindowSets).toBe(5)
    expect(state.regions.biceps.size).toBe(10)
  })

  it('includes a session logged exactly on the week boundary', () => {
    const avatar = createAvatar({ experience: 'beginner' })
    const { report } = advanceWeek(avatar, {
      sessions: [setsSession(week.weekEnd, 'curl', 1), setsSession(week.weekStart, 'curl', 1)],
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
    })
    expect(report.sessionCount).toBe(2)
    expect(report.outOfWindowSets).toBe(0)
  })

  it('reports average intensity, which weekly match scoring will read later', () => {
    const avatar = createAvatar({ experience: 'beginner' })
    const { report } = advanceWeek(avatar, {
      sessions: [session(week.midWeek, [set('curl', 10, 20), set('curl', 10, 24)])],
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
      baselines: { curl: { usualWeight: 20 } },
    })
    expect(report.averageIntensity).toBeCloseTo(1.1, 10)
  })

  it('explains what happened to each region', () => {
    const avatar = createAvatar({ experience: 'beginner' })
    const { report } = advanceWeek(avatar, {
      sessions: [setsSession(week.midWeek, 'curl', 4)],
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
    })
    const biceps = report.regions.biceps
    expect(biceps.stimulus).toBeCloseTo(4, 10)
    expect(biceps.hardSets).toBe(4)
    expect(biceps.sizeBefore).toBe(10)
    expect(biceps.gainApplied).toBeCloseTo(1.8, 10)
    expect(biceps.sizeAfter).toBeCloseTo(11.8, 10)
    expect(biceps.definitionTarget).toBe(25)
    expect(report.regions.quads.stimulus).toBe(0)
  })
})

describe('hard set history', () => {
  it('records each processed week and trims to the definition window', () => {
    let state = createAvatar({ experience: 'beginner' })
    for (let index = 0; index < 6; index += 1) {
      const current = weekWindow(index)
      state = advanceWeek(state, {
        sessions: [setsSession(current.midWeek, 'curl', index + 1)],
        weekStart: current.weekStart,
        weekEnd: current.weekEnd,
      }).state
    }
    expect(state.hardSetHistory).toHaveLength(DEFAULT_CONFIG.definition.lookbackWeeks)
    expect(state.hardSetHistory.map((entry) => entry.counts.biceps)).toEqual([3, 4, 5, 6])
  })
})
