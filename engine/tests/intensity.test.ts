import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, makeConfig } from '../src/config.js'
import { EXERCISES } from '../src/exercises.js'
import { intensityForSet } from '../src/intensity.js'
import { set } from './helpers.js'

const config = DEFAULT_CONFIG

describe('intensity factor', () => {
  it('is 1.0 at the usual weight', () => {
    const i = intensityForSet(set('curl', 10, 20), EXERCISES.curl, { usualWeight: 20 }, config)
    expect(i).toBe(1.0)
  })

  it('scales with load between the clamps', () => {
    const i = intensityForSet(set('curl', 10, 22), EXERCISES.curl, { usualWeight: 20 }, config)
    expect(i).toBeCloseTo(1.1, 10)
  })

  it('clamps at 0.5 for very light work', () => {
    const i = intensityForSet(set('curl', 10, 2), EXERCISES.curl, { usualWeight: 20 }, config)
    expect(i).toBe(0.5)
  })

  it('clamps at 1.2 for very heavy work', () => {
    const i = intensityForSet(set('curl', 10, 60), EXERCISES.curl, { usualWeight: 20 }, config)
    expect(i).toBe(1.2)
  })

  it('uses reps over usual reps for bodyweight exercises', () => {
    const i = intensityForSet(set('pull_up', 12), EXERCISES.pull_up, { usualReps: 10 }, config)
    expect(i).toBeCloseTo(1.2, 10)
  })

  it('ignores logged load on a bodyweight exercise', () => {
    const withLoad = intensityForSet(
      set('dips', 10, 999),
      EXERCISES.dips,
      { usualReps: 10, usualWeight: 1 },
      config,
    )
    expect(withLoad).toBe(1.0)
  })

  it('treats a set with no baseline as an ordinary working set', () => {
    const i = intensityForSet(set('curl', 10, 20), EXERCISES.curl, undefined, config)
    expect(i).toBe(config.intensity.fallback)
    expect(i).toBe(1.0)
  })

  it('falls back when a weighted exercise is logged without load', () => {
    const i = intensityForSet(set('curl', 10), EXERCISES.curl, { usualWeight: 20 }, config)
    expect(i).toBe(1.0)
  })

  it('reads its clamps from config', () => {
    const wide = makeConfig({ intensity: { min: 0.1, max: 3 } })
    const i = intensityForSet(set('curl', 10, 60), EXERCISES.curl, { usualWeight: 20 }, wide)
    expect(i).toBe(3)
  })
})
