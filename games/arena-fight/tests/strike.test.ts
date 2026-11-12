import { describe, expect, it } from 'vitest'
import { BOXING } from '../content/boxing.js'
import { moveTiming, reachOf, staminaCost, strike } from '../core/strike.js'
import type { MoveSpec, StrikeContext } from '../core/strike.js'
import { fighterAt } from './helpers.js'

const FRESH: StrikeContext = { blocked: false, attackerFatigue: 0, defenderFatigue: 0, defenderHealth: 100 }

function move(id: string): MoveSpec {
  const found = BOXING.find((m) => m.id === id)
  if (!found) throw new Error(`no move ${id}`)
  return found
}

const JAB = move('jab')
const CROSS = move('cross')
const REAR_HOOK = move('rear_hook')
const BODY_HOOK = move('body_hook')
const intermediate = fighterAt(75, 30)
const odds = (chance: number) => chance / (1 - chance)

function expectBetween(value: number, low: number, high: number) {
  expect(value).toBeGreaterThanOrEqual(low)
  expect(value).toBeLessThanOrEqual(high)
}

describe('how hard a strike lands', () => {
  it.each([
    [10, 2300, 2700],
    [30, 3400, 3800],
    [100, 4500, 5000],
  ])('a 75 kg fighter with muscles at %d throws a cross of %d to %d N', (score, low, high) => {
    expectBetween(strike(fighterAt(75, score), CROSS, intermediate, FRESH).force, low, high)
  })

  it('makes a jab 55% to 65% of a cross', () => {
    const jab = strike(intermediate, JAB, intermediate, FRESH).force
    const cross = strike(intermediate, CROSS, intermediate, FRESH).force
    expectBetween(jab / cross, 0.55, 0.65)
  })

  it('lets a 100 kg fighter hit at least 1.5 times as hard as a 50 kg one with the same training', () => {
    const heavy = strike(fighterAt(100, 30), CROSS, intermediate, FRESH).force
    const light = strike(fighterAt(50, 30), CROSS, intermediate, FRESH).force
    expect(heavy).toBeGreaterThanOrEqual(1.5 * light)
  })

  it('keeps a cross between 7 and 11 m/s for every body', () => {
    for (const weight of [50, 75, 100, 120]) {
      for (const score of [10, 30, 50, 100]) {
        expectBetween(strike(fighterAt(weight, score), CROSS, intermediate, FRESH).speed, 7, 11)
      }
    }
  })
})

describe('what a clean hit does', () => {
  it('accelerates an intermediate head by 55 to 65 g with an intermediate cross', () => {
    expectBetween(strike(intermediate, CROSS, intermediate, FRESH).headAccelG, 55, 65)
  })

  it('makes a knockdown less likely against a trained neck', () => {
    const weak = strike(intermediate, CROSS, fighterAt(75, 30, { traps: 10 }), FRESH).knockdownChance
    const strong = strike(intermediate, CROSS, fighterAt(75, 30, { traps: 100 }), FRESH).knockdownChance
    expectBetween(odds(strong) / odds(weak), 0.3, 0.6)
  })

  it('makes a knockdown more likely as health runs low', () => {
    const fresh = strike(intermediate, REAR_HOOK, intermediate, FRESH).knockdownChance
    const hurt = strike(intermediate, REAR_HOOK, intermediate, { ...FRESH, defenderHealth: 30 }).knockdownChance
    expect(hurt).toBeGreaterThan(fresh)
  })

  it('makes a tired fighter weaker and slower', () => {
    const fresh = strike(intermediate, CROSS, intermediate, FRESH)
    const tired = strike(intermediate, CROSS, intermediate, { ...FRESH, attackerFatigue: 1 })
    expectBetween(tired.force / fresh.force, 0.88, 0.92)
    expect(tired.speed).toBeLessThan(fresh.speed)
    expect(moveTiming(intermediate, CROSS, 1).startup).toBeGreaterThanOrEqual(moveTiming(intermediate, CROSS, 0).startup)
  })

  it('lets an 80 kg advanced fighter overpower a 50 kg beginner', () => {
    const big = fighterAt(80, 50)
    const small = fighterAt(50, 10)
    const bigHits = strike(big, CROSS, small, FRESH)
    const smallHits = strike(small, CROSS, big, FRESH)
    expect(bigHits.damage).toBeGreaterThanOrEqual(3 * smallHits.damage)
    expect(bigHits.pushback).toBeGreaterThanOrEqual(3 * smallHits.pushback)
    expect(strike(big, CROSS, small, { ...FRESH, blocked: true }).guardBroken).toBe(true)
  })
})

describe('blocking and body shots', () => {
  it('blocks most of the damage but takes the full push', () => {
    const clean = strike(intermediate, CROSS, intermediate, FRESH)
    const blocked = strike(intermediate, CROSS, intermediate, { ...FRESH, blocked: true })
    expect(blocked.damage).toBeLessThan(clean.damage)
    expect(blocked.knockdownChance).toBe(0)
    expect(blocked.staminaLoss).toBeGreaterThan(0)
    expect(blocked.pushback).toBeGreaterThan(clean.pushback)
    expect(blocked.guardBroken).toBe(false)
  })

  it('wears the body down without knocking anyone down', () => {
    const hit = strike(intermediate, BODY_HOOK, intermediate, FRESH)
    expect(hit.knockdownChance).toBe(0)
    expect(hit.headAccelG).toBe(0)
    expect(hit.damage).toBeGreaterThan(0)
    expect(hit.staminaLoss).toBeGreaterThan(0)
  })
})

describe('edge cases', () => {
  it('keeps fatigue and health in range', () => {
    const base = strike(intermediate, CROSS, intermediate, FRESH)
    expect(strike(intermediate, CROSS, intermediate, { ...FRESH, attackerFatigue: -0.1, defenderFatigue: -0.1 })).toEqual(base)
    expect(strike(intermediate, CROSS, intermediate, { ...FRESH, defenderHealth: 130 })).toEqual(base)
  })

  it('stays finite and capped in the biggest mismatch', () => {
    const giant = fighterAt(160, 100)
    const smallest = fighterAt(40, 10)
    for (const m of BOXING) {
      for (const blocked of [false, true]) {
        const result = strike(giant, m, smallest, { ...FRESH, blocked })
        for (const value of Object.values(result)) {
          if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true)
        }
        expect(result.damage).toBeLessThanOrEqual(35)
        expect(result.knockdownChance).toBeLessThanOrEqual(1)
      }
    }
  })

  it('gives the same result for the same inputs', () => {
    const once = strike(fighterAt(80, 50), REAR_HOOK, fighterAt(60, 20), FRESH)
    expect(strike(fighterAt(80, 50), REAR_HOOK, fighterAt(60, 20), FRESH)).toEqual(once)
  })
})

describe('reach and stamina', () => {
  it('reaches 45% of the fighter height with a cross', () => {
    expect(reachOf(intermediate, CROSS)).toBeCloseTo(0.7875, 10)
  })

  it('charges 1.3 times the stamina for a miss', () => {
    expect(staminaCost(CROSS, false)).toBe(5)
    expect(staminaCost(CROSS, true)).toBeCloseTo(6.5, 10)
  })
})
