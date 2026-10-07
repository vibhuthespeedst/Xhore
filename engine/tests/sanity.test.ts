import { describe, expect, it } from 'vitest'
import { advanceWeek, createAvatar } from '../src/avatar.js'
import type { AvatarState } from '../src/types.js'
import { setsSession, weekWindow } from './helpers.js'

/**
 * The spec sanity check: a beginner doing 9 hard sets a week for one muscle
 * should reach about 50 in 3 to 4 months, about 80 in about 8 months, and
 * about 90 in about a year.
 *
 * Tricep pushdown is used because it is the one exercise in the catalogue with
 * no helper regions, so the triceps are trained in isolation and nothing else
 * muddies the curve. No baseline is supplied, so every set runs at intensity
 * 1.0 and weekly stimulus is exactly 9.
 */
const WEEKS_SIMULATED = 70
const WEEKS_PER_MONTH = 52 / 12

function simulate(weeks: number): number[] {
  let state: AvatarState = createAvatar({ experience: 'beginner' })
  const sizes = [state.regions.triceps.size]

  for (let index = 0; index < weeks; index += 1) {
    const week = weekWindow(index)
    state = advanceWeek(state, {
      sessions: [setsSession(week.midWeek, 'tricep_pushdown', 9)],
      weekStart: week.weekStart,
      weekEnd: week.weekEnd,
    }).state
    sizes.push(state.regions.triceps.size)
  }

  return sizes
}

const sizes = simulate(WEEKS_SIMULATED)

/** Weeks of training completed when the region first reaches `target`. */
function weeksToReach(target: number): number {
  const index = sizes.findIndex((size) => size >= target)
  if (index === -1) throw new Error(`never reached ${target} in ${WEEKS_SIMULATED} weeks`)
  return index
}

function monthsToReach(target: number): number {
  return weeksToReach(target) / WEEKS_PER_MONTH
}

describe('spec sanity targets', () => {
  it('reaches about 50 in 3 to 4 months', () => {
    const months = monthsToReach(50)
    expect(months).toBeGreaterThanOrEqual(2.9)
    expect(months).toBeLessThanOrEqual(4.2)
  })

  it('reaches about 80 in about 8 months', () => {
    const months = monthsToReach(80)
    expect(months).toBeGreaterThanOrEqual(6.9)
    expect(months).toBeLessThanOrEqual(9.3)
  })

  it('reaches about 90 in about a year', () => {
    const months = monthsToReach(90)
    expect(months).toBeGreaterThanOrEqual(9.9)
    expect(months).toBeLessThanOrEqual(14)
  })

  // Vitest hides test output on a normal run, so see this with: npm run curve
  it('prints the growth curve for eyeballing', () => {
    const rows = ['', '  week   size', '  ----   ----']
    for (let week = 0; week <= WEEKS_SIMULATED; week += 5) {
      rows.push(`  ${String(week).padStart(4)}   ${sizes[week].toFixed(1).padStart(5)}`)
    }
    rows.push(
      '',
      `  50 reached at week ${weeksToReach(50)} (${monthsToReach(50).toFixed(1)} months)`,
      `  80 reached at week ${weeksToReach(80)} (${monthsToReach(80).toFixed(1)} months)`,
      `  90 reached at week ${weeksToReach(90)} (${monthsToReach(90).toFixed(1)} months)`,
      '',
    )
    console.log(rows.join('\n'))
    expect(rows.length).toBeGreaterThan(0)
  })
})

describe('the shape of the curve', () => {
  it('starts a beginner at 10', () => {
    expect(sizes[0]).toBe(10)
  })

  it('gains the full capped 3 a week early on, while the muscle is small', () => {
    expect(sizes[1]).toBe(13)
    expect(sizes[2]).toBe(16)
  })

  it('never goes backwards while training continues', () => {
    for (let week = 1; week < sizes.length; week += 1) {
      expect(sizes[week]).toBeGreaterThanOrEqual(sizes[week - 1])
    }
  })

  it('slows down as it goes, so late gains are smaller than early ones', () => {
    const earlyGain = sizes[5] - sizes[4]
    const lateGain = sizes[60] - sizes[59]
    expect(lateGain).toBeLessThan(earlyGain)
  })

  it('approaches 100 without ever passing it', () => {
    for (const size of sizes) {
      expect(size).toBeLessThanOrEqual(100)
    }
    expect(sizes[WEEKS_SIMULATED]).toBeGreaterThan(90)
  })
})

describe('definition over the same year', () => {
  it('climbs towards 100 while the muscle is trained hard every week', () => {
    let state: AvatarState = createAvatar({ experience: 'beginner' })
    for (let index = 0; index < 12; index += 1) {
      const week = weekWindow(index)
      state = advanceWeek(state, {
        sessions: [setsSession(week.midWeek, 'tricep_pushdown', 9)],
        weekStart: week.weekStart,
        weekEnd: week.weekEnd,
      }).state
    }
    expect(state.regions.triceps.definition).toBeGreaterThanOrEqual(90)
    expect(state.regions.triceps.definition).toBeLessThan(100)
  })

  it('leaves untrained regions at zero definition and starting size', () => {
    let state: AvatarState = createAvatar({ experience: 'beginner' })
    for (let index = 0; index < 12; index += 1) {
      const week = weekWindow(index)
      state = advanceWeek(state, {
        sessions: [setsSession(week.midWeek, 'tricep_pushdown', 9)],
        weekStart: week.weekStart,
        weekEnd: week.weekEnd,
      }).state
    }
    expect(state.regions.quads.definition).toBe(0)
    expect(state.regions.quads.size).toBe(10)
  })
})
