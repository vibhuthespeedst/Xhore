import { describe, expect, it } from 'vitest'
import { GROUP_IDS, makeFighter } from '../core/fighter.js'
import { avatarAt, fighterAt, within } from './helpers.js'

describe('makeFighter', () => {
  it('reads an all-intermediate 75 kg body as the reference fighter', () => {
    const fighter = makeFighter({ weightKg: 75, heightCm: 175, avatar: avatarAt(30, 50) })
    for (const group of GROUP_IDS) {
      expect(fighter.level[group]).toBeCloseTo(3, 10)
      expect(fighter.strength[group]).toBeCloseTo(1, 10)
    }
    expect(fighter.legs).toBeCloseTo(1, 10)
    expect(fighter.trunk).toBeCloseTo(1, 10)
    expect(fighter.arms).toBeCloseTo(1, 10)
    expect(fighter.staminaMax).toBeCloseTo(100, 10)
    expect(fighter.walkSpeed).toBeCloseTo(1.3, 10)
    expect(fighter.heightM).toBeCloseTo(1.75, 10)
  })

  it('gives a 50 kg beginner the strength standards, far from 80 kg', () => {
    const { lifts } = fighterAt(50, 10)
    expect(within(lifts.bench, 27, 0.05)).toBe(true)
    expect(within(lifts.squat, 36, 0.05)).toBe(true)
    expect(within(lifts.deadlift, 46, 0.05)).toBe(true)
    for (const kg of Object.values(lifts)) expect(kg).toBeLessThan(80)
  })

  it('gives an 80 kg advanced lifter the strength standards', () => {
    const { lifts } = fighterAt(80, 50)
    expect(within(lifts.bench, 124, 0.05)).toBe(true)
    expect(within(lifts.squat, 168, 0.05)).toBe(true)
    expect(within(lifts.deadlift, 196, 0.05)).toBe(true)
  })

  it('puts trained legs into the legs and not the arms', () => {
    const fighter = fighterAt(75, 30, { quads: 50, glutes: 50, hamstrings: 50 })
    expect(fighter.legs).toBeGreaterThan(1.2)
    expect(fighter.arms).toBeCloseTo(1, 10)
  })

  it('reads the traps as the neck and nothing else', () => {
    const weak = fighterAt(75, 30, { traps: 10 })
    const strong = fighterAt(75, 30, { traps: 100 })
    expect(strong.strength.neck).toBeGreaterThan(weak.strength.neck)
    for (const group of GROUP_IDS.filter((g) => g !== 'neck')) {
      expect(strong.strength[group]).toBe(weak.strength[group])
    }
  })

  it('gives more stamina for definition and less for a heavier body', () => {
    const at = (weightKg: number, definition: number) =>
      makeFighter({ weightKg, heightCm: 175, avatar: avatarAt(30, definition) }).staminaMax
    expect(at(75, 100)).toBeCloseTo(115, 10)
    expect(at(75, 0)).toBeCloseTo(85, 10)
    expect(at(120, 50)).toBeLessThan(at(75, 50))
  })

  it('fills in a missing height and keeps weight and scores in range', () => {
    expect(makeFighter({ weightKg: 75, avatar: avatarAt(30) }).heightM).toBeCloseTo(1.75, 10)
    expect(makeFighter({ weightKg: 200, avatar: avatarAt(30) }).weightKg).toBe(160)
    expect(fighterAt(75, 150)).toEqual(fighterAt(75, 100))
  })

  it('refuses a weight or a height that is not a number', () => {
    expect(() => makeFighter({ weightKg: Number.NaN, avatar: avatarAt(30) })).toThrow(/weightKg/)
    expect(() => makeFighter({ weightKg: 75, heightCm: Number.NaN, avatar: avatarAt(30) })).toThrow(/heightCm/)
    expect(() => makeFighter({ weightKg: Number.NaN, avatar: avatarAt(30) })).toThrow(RangeError)
  })
})
