import { describe, expect, it } from 'vitest'
import { REGION_IDS } from '@xhore/engine'
import { PARTS, PART_ORDER, STAND_IN_SHAPES } from '../src/standInLayout.js'

const muscles = STAND_IN_SHAPES.filter((shape) => shape.region !== null)
const fixedParts = STAND_IN_SHAPES.filter((shape) => shape.region === null)

describe('stand-in layout', () => {
  it.each(REGION_IDS)('gives %s at least one shape', (regionId) => {
    expect(muscles.some((shape) => shape.region === regionId)).toBe(true)
  })

  it('only names real regions', () => {
    for (const shape of muscles) {
      expect(REGION_IDS).toContain(shape.region)
    }
  })

  it('gives every shape a real thickness in all three directions', () => {
    for (const shape of STAND_IN_SHAPES) {
      for (const radius of [...shape.small, ...shape.large]) {
        expect(radius).toBeGreaterThan(0)
      }
    }
  })

  it('makes every muscle shape bigger at 100 than at 0, and never smaller in any direction', () => {
    for (const shape of muscles) {
      const grows = shape.large.map((radius, axis) => radius - (shape.small[axis] ?? 0))
      expect(Math.min(...grows)).toBeGreaterThanOrEqual(0)
      expect(Math.max(...grows)).toBeGreaterThan(0)
    }
  })

  it('keeps the head, hands, feet and frame the same at every score', () => {
    for (const shape of fixedParts) {
      expect(shape.large).toEqual(shape.small)
      expect(shape.push).toEqual([0, 0, 0])
    }
  })

  it('lists every part after the part it hangs from', () => {
    PART_ORDER.forEach((part, index) => {
      const parent = PARTS[part].parent
      if (parent !== null) {
        expect(PART_ORDER.indexOf(parent)).toBeLessThan(index)
      }
    })
    expect([...PART_ORDER].sort()).toEqual(Object.keys(PARTS).sort())
  })
})
