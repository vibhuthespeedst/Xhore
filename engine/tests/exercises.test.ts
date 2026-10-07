import { describe, expect, it } from 'vitest'
import { EXERCISES, EXERCISE_IDS } from '../src/exercises.js'
import { REGION_IDS, isRegionId } from '../src/regions.js'
import type { RegionId } from '../src/regions.js'

/**
 * The exercise table transcribed straight from the project spec. Kept separate from
 * the source so this is a real second reading of the spec, not a copy of the
 * implementation.
 */
const SPEC_TABLE: Record<string, Record<string, number>> = {
  curl: { biceps: 1.0, forearms: 0.3 },
  bench_press: { chest_mid: 1.0, delt_front: 0.5, triceps: 0.5 },
  incline_bench_press: { chest_upper: 1.0, delt_front: 0.6, triceps: 0.4 },
  dips: { chest_lower: 1.0, triceps: 0.6, delt_front: 0.3 },
  overhead_press: { delt_front: 1.0, delt_side: 0.5, triceps: 0.6 },
  lateral_raise: { delt_side: 1.0, traps: 0.2 },
  pull_up: { lats: 1.0, biceps: 0.5, mid_back: 0.4, delt_rear: 0.3 },
  barbell_row: { mid_back: 1.0, lats: 0.7, delt_rear: 0.5, biceps: 0.4 },
  squat: { quads: 1.0, glutes: 0.7, hamstrings: 0.3, lower_back: 0.3 },
  romanian_deadlift: { hamstrings: 1.0, glutes: 0.8, lower_back: 0.6, forearms: 0.3 },
  hip_thrust: { glutes: 1.0, hamstrings: 0.4 },
  tricep_pushdown: { triceps: 1.0 },
  calf_raise: { calves: 1.0 },
  cable_crunch: { abs: 1.0, obliques: 0.3 },
}

describe('regions', () => {
  it('has the 19 regions from the spec', () => {
    expect(REGION_IDS).toHaveLength(19)
  })

  it('has no duplicates', () => {
    expect(new Set(REGION_IDS).size).toBe(REGION_IDS.length)
  })

  it('names exactly the regions the spec lists', () => {
    expect([...REGION_IDS].sort()).toEqual(
      [
        'abs',
        'biceps',
        'calves',
        'chest_lower',
        'chest_mid',
        'chest_upper',
        'delt_front',
        'delt_rear',
        'delt_side',
        'forearms',
        'glutes',
        'hamstrings',
        'lats',
        'lower_back',
        'mid_back',
        'obliques',
        'quads',
        'traps',
        'triceps',
      ].sort(),
    )
  })
})

describe('exercise catalogue', () => {
  it('holds the 14 exercises from the spec', () => {
    expect(EXERCISE_IDS).toHaveLength(14)
    expect([...EXERCISE_IDS].sort()).toEqual(Object.keys(SPEC_TABLE).sort())
  })

  it.each(EXERCISE_IDS)('%s matches the spec table exactly', (id) => {
    expect(EXERCISES[id].regions).toEqual(SPEC_TABLE[id])
  })

  it.each(EXERCISE_IDS)('%s has exactly one main region at weight 1.0', (id) => {
    const mains = Object.values(EXERCISES[id].regions).filter((weight) => weight === 1.0)
    expect(mains).toHaveLength(1)
  })

  it.each(EXERCISE_IDS)('%s only names real regions, with helpers below 1.0', (id) => {
    for (const [region, weight] of Object.entries(EXERCISES[id].regions)) {
      expect(isRegionId(region)).toBe(true)
      expect(weight).toBeGreaterThan(0)
      expect(weight).toBeLessThanOrEqual(1.0)
    }
  })

  it('scores dips and pull-ups on reps rather than load', () => {
    const bodyweight = EXERCISE_IDS.filter((id) => EXERCISES[id].bodyweight)
    expect([...bodyweight].sort()).toEqual(['dips', 'pull_up'])
  })

  it('covers every region that has an exercise, and leaves none unreachable by accident', () => {
    const covered = new Set<RegionId>()
    for (const id of EXERCISE_IDS) {
      for (const region of Object.keys(EXERCISES[id].regions) as RegionId[]) {
        covered.add(region)
      }
    }
    // Every region in the spec is reachable by at least one exercise.
    const missing = REGION_IDS.filter((region) => !covered.has(region))
    expect(missing).toEqual([])
  })
})
