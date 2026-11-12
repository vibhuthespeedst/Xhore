import { describe, expect, it } from 'vitest'
import { BOXING } from '../content/boxing.js'
import type { Fighter } from '../core/fighter.js'
import { strike } from '../core/strike.js'
import type { StrikeContext } from '../core/strike.js'
import { fighterAt } from './helpers.js'

const FRESH: StrikeContext = { blocked: false, attackerFatigue: 0, defenderFatigue: 0, defenderHealth: 100 }

interface Named {
  readonly name: string
  readonly fighter: Fighter
}

const named = (name: string, weightKg: number, score: number): Named => ({ name, fighter: fighterAt(weightKg, score) })

const PAIRS: readonly (readonly [Named, Named])[] = [
  [named('75 kg intermediate', 75, 30), named('75 kg intermediate', 75, 30)],
  [named('75 kg advanced', 75, 50), named('75 kg intermediate', 75, 30)],
  [named('80 kg advanced', 80, 50), named('50 kg beginner', 50, 10)],
  [named('100 kg elite', 100, 100), named('100 kg elite', 100, 100)],
]

const n = (value: number, digits = 0) => value.toFixed(digits).padStart(6)
const pct = (chance: number) => `${(chance * 100).toFixed(1)}%`.padStart(6)

describe('matchup report', () => {
  it('prints how each pair of bodies compares in a fight', () => {
    const numbers: number[] = []
    for (const [a, b] of PAIRS) {
      console.log(`\n${a.name}  against  ${b.name}`)
      for (const { name, fighter } of [a, b]) {
        const { bench, squat, deadlift } = fighter.lifts
        console.log(
          `  ${name.padEnd(20)} lifts bench ${n(bench)} kg  squat ${n(squat)} kg  deadlift ${n(deadlift)} kg` +
            `  walks ${fighter.walkSpeed.toFixed(2)} m/s  stamina ${fighter.staminaMax.toFixed(0)}`,
        )
      }
      console.log(`  ${'move'.padEnd(10)} ${'A hits B: force  damage  knockdown'.padEnd(36)}B hits A: force  damage  knockdown`)
      for (const move of BOXING) {
        const ab = strike(a.fighter, move, b.fighter, FRESH)
        const ba = strike(b.fighter, move, a.fighter, FRESH)
        numbers.push(ab.force, ab.damage, ab.knockdownChance, ba.force, ba.damage, ba.knockdownChance)
        console.log(
          `  ${move.name.padEnd(10)} ${n(ab.force)} N ${n(ab.damage, 1)}  ${pct(ab.knockdownChance)}` +
            `              ${n(ba.force)} N ${n(ba.damage, 1)}  ${pct(ba.knockdownChance)}`,
        )
      }
    }
    for (const value of numbers) expect(Number.isFinite(value)).toBe(true)
  })
})
