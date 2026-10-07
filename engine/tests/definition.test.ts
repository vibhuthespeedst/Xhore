import { describe, expect, it } from 'vitest'
import { DEFAULT_CONFIG, makeConfig } from '../src/config.js'
import {
  definitionTarget,
  moveTowardTarget,
  nextDefinition,
  trimHistory,
} from '../src/definition.js'
import { regionRecord } from '../src/regions.js'
import type { HardSetWeek } from '../src/types.js'
import { addDays } from '../src/time.js'
import { START } from './helpers.js'

const config = DEFAULT_CONFIG

/** One history entry per argument, giving every region that many hard sets. */
function history(...hardSetsPerWeek: readonly number[]): HardSetWeek[] {
  return hardSetsPerWeek.map((count, index) => ({
    weekEnd: addDays(START, index * 7 + 6),
    counts: regionRecord(() => count),
  }))
}

describe('definition target', () => {
  it.each([
    [[], 0],
    [[0, 0, 0, 0], 0],
    [[3, 0, 0, 0], 25],
    [[3, 3, 0, 0], 50],
    [[3, 3, 3, 0], 75],
    [[3, 3, 3, 3], 100],
  ])('%j qualifying weeks gives target %i', (weeks, expected) => {
    expect(definitionTarget(history(...weeks), 'biceps', config)).toBe(expected)
  })

  it('needs at least 3 hard sets for a week to count', () => {
    expect(definitionTarget(history(2, 2, 2, 2), 'biceps', config)).toBe(0)
    expect(definitionTarget(history(3, 3, 3, 3), 'biceps', config)).toBe(100)
  })

  it('only looks at the last 4 weeks', () => {
    // Eight perfect weeks followed by nothing recent still scores zero.
    expect(definitionTarget(history(3, 3, 3, 3, 0, 0, 0, 0), 'biceps', config)).toBe(0)
    expect(definitionTarget(history(0, 0, 0, 0, 3, 3, 3, 3), 'biceps', config)).toBe(100)
  })

  it('is tracked per region', () => {
    const weeks: HardSetWeek[] = [
      { weekEnd: addDays(START, 6), counts: regionRecord((region) => (region === 'biceps' ? 4 : 0)) },
    ]
    expect(definitionTarget(weeks, 'biceps', config)).toBe(25)
    expect(definitionTarget(weeks, 'quads', config)).toBe(0)
  })

  it('reads its window and threshold from config', () => {
    const relaxed = makeConfig({ definition: { lookbackWeeks: 2, hardSetsPerWeek: 1 } })
    expect(definitionTarget(history(1, 1), 'biceps', relaxed)).toBe(100)
  })
})

describe('moving towards the target', () => {
  it('closes 25% of the gap each week', () => {
    expect(moveTowardTarget(0, 100, config)).toBe(25)
    expect(moveTowardTarget(25, 100, config)).toBe(43.75)
  })

  it('moves downwards by the same rule', () => {
    expect(moveTowardTarget(100, 0, config)).toBe(75)
  })

  it('stays put when it is already on target', () => {
    expect(moveTowardTarget(50, 50, config)).toBe(50)
  })

  it('approaches the target over several weeks without overshooting', () => {
    let definition = 0
    const path: number[] = []
    for (let week = 0; week < 6; week += 1) {
      definition = moveTowardTarget(definition, 100, config)
      path.push(Number(definition.toFixed(4)))
    }
    expect(path).toEqual([25, 43.75, 57.8125, 68.3594, 76.2695, 82.2021])
    expect(definition).toBeLessThan(100)
  })
})

describe('nextDefinition', () => {
  it('reports both the new value and the target it is heading for', () => {
    const result = nextDefinition(0, history(3, 3, 3, 3), 'biceps', config)
    expect(result.target).toBe(100)
    expect(result.definition).toBe(25)
  })

  it('falls back towards zero once the hard sets stop', () => {
    const result = nextDefinition(80, history(0, 0, 0, 0), 'biceps', config)
    expect(result.target).toBe(0)
    expect(result.definition).toBe(60)
  })

  it('stays within 0 to 100', () => {
    expect(nextDefinition(100, history(3, 3, 3, 3), 'biceps', config).definition).toBe(100)
    expect(nextDefinition(0, history(), 'biceps', config).definition).toBe(0)
  })

  it('leaves definition untouched when the feature is off', () => {
    const off = makeConfig({ features: { definition: false } })
    const result = nextDefinition(42, history(3, 3, 3, 3), 'biceps', off)
    expect(result.definition).toBe(42)
  })
})

describe('history trimming', () => {
  it('keeps only the weeks the rule can still see', () => {
    const trimmed = trimHistory(history(1, 2, 3, 4, 5, 6), config)
    expect(trimmed).toHaveLength(4)
    expect(trimmed.map((week) => week.counts.biceps)).toEqual([3, 4, 5, 6])
  })

  it('leaves a short history alone', () => {
    expect(trimHistory(history(1, 2), config)).toHaveLength(2)
  })
})
