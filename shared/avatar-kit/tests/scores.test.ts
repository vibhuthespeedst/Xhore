import { describe, expect, it } from 'vitest'
import { definitionStrength, lerp, scoreToStrength } from '../src/scores.js'

describe('definitionStrength', () => {
  it('shows nothing without definition, however big the muscle', () => {
    expect(definitionStrength(0, 0)).toBe(0)
    expect(definitionStrength(100, 0)).toBe(0)
  })

  it('shows half on the smallest muscle and all of it on the biggest', () => {
    expect(definitionStrength(0, 100)).toBeCloseTo(0.5, 10)
    expect(definitionStrength(100, 100)).toBe(1)
  })

  it('rises with both size and definition', () => {
    expect(definitionStrength(50, 100)).toBeCloseTo(0.75, 10)
    expect(definitionStrength(50, 50)).toBeCloseTo(0.375, 10)
  })

  it('shows anything that is not a usable number as 0', () => {
    expect(definitionStrength(50, Number.NaN)).toBe(0)
    expect(definitionStrength(Number.NaN, 100)).toBeCloseTo(0.5, 10)
  })
})

describe('scoreToStrength', () => {
  it('maps the 0 to 100 score range onto 0 to 1', () => {
    expect(scoreToStrength(0)).toBe(0)
    expect(scoreToStrength(25)).toBe(0.25)
    expect(scoreToStrength(100)).toBe(1)
  })

  it('holds scores outside the range at the nearest end', () => {
    expect(scoreToStrength(-20)).toBe(0)
    expect(scoreToStrength(140)).toBe(1)
  })

  it('shows anything that is not a usable number as 0', () => {
    expect(scoreToStrength(Number.NaN)).toBe(0)
    expect(scoreToStrength(Number.POSITIVE_INFINITY)).toBe(0)
  })
})

describe('lerp', () => {
  it('blends from one value to another', () => {
    expect(lerp(2, 6, 0)).toBe(2)
    expect(lerp(2, 6, 0.5)).toBe(4)
    expect(lerp(2, 6, 1)).toBe(6)
  })
})
