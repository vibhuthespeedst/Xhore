import { clamp } from '@xhore/engine'
import type { Fighter } from './fighter.js'
import { FIGHT_SETTINGS, type FightSettings } from './settings.js'

export interface MoveSpec {
  readonly id: string
  readonly name: string
  readonly target: 'head' | 'body'
  readonly speed: number
  readonly force: number
  readonly chain: { readonly legs: number; readonly trunk: number; readonly arms: number }
  readonly rotation: number
  readonly reach: number
  readonly stamina: number
  readonly startup: number
  readonly active: number
  readonly recovery: number
}

export interface StrikeContext {
  readonly blocked: boolean
  readonly attackerFatigue: number
  readonly defenderFatigue: number
  readonly defenderHealth: number
}

export interface StrikeResult {
  readonly speed: number
  readonly effectiveMass: number
  readonly momentum: number
  readonly force: number
  readonly headAccelG: number
  readonly damage: number
  readonly knockdownChance: number
  readonly guardBroken: boolean
  readonly pushback: number
  readonly staminaLoss: number
}

export function strike(
  attacker: Fighter,
  move: MoveSpec,
  defender: Fighter,
  context: StrikeContext,
  settings: FightSettings = FIGHT_SETTINGS,
): StrikeResult {
  const s = settings.strike
  const tired = clamp(context.attackerFatigue, 0, 1) ** 2
  const defenderTired = clamp(context.defenderFatigue, 0, 1) ** 2
  const power = powerOf(attacker, move)

  const speed = strikeSpeed(move, power, tired, settings)
  const effectiveMass =
    ((move.force * s.contactSeconds.head) / move.speed) *
    (attacker.weightKg / settings.referenceWeightKg) ** s.massWeightExponent *
    power ** s.massExponent *
    (1 - s.fatigue.mass * tired)
  const momentum = effectiveMass * speed
  const force = momentum / s.contactSeconds[move.target]
  const physics = { speed, effectiveMass, momentum, force }

  const relativeWeight = defender.weightKg / settings.referenceWeightKg
  let headAccel = 0
  let damage: number
  if (move.target === 'head') {
    const neck = 1 + defender.strength.neck * relativeWeight ** s.neck.weightExponent * s.neck.share
    headAccel = force / (s.headMassKg * neck * (1 - s.fatigue.neck * defenderTired))
    damage = (s.damage.head * headAccel) / s.damage.headReferenceAccel
  } else {
    damage = (s.damage.body * momentum) / s.damage.bodyReferenceMomentum / bodyToughness(defender, settings)
  }

  if (context.blocked) {
    const guard = guardStrength(defender, context.defenderFatigue, settings)
    const guardBroken = force > s.guard.breakRatio * guard
    const leak = guardBroken
      ? s.guard.brokenLeak
      : clamp((s.guard.leak * force) / guard, s.guard.minLeak, s.guard.maxLeak)
    return {
      ...physics,
      headAccelG: 0,
      damage: Math.min(damage * leak, s.damage.cap),
      knockdownChance: 0,
      guardBroken,
      pushback: (s.push.blocked * momentum) / defender.weightKg,
      staminaLoss: (s.guard.blockCost * force) / guard,
    }
  }

  const headAccelG = headAccel / s.gravity
  const health = clamp(context.defenderHealth, 0, 100)
  const { threshold, hurtFloor, spread } = s.knockdown
  const knockdownThreshold = threshold * (hurtFloor + ((1 - hurtFloor) * health) / 100)
  return {
    ...physics,
    headAccelG,
    damage: Math.min(damage, s.damage.cap),
    knockdownChance:
      move.target === 'head' ? 1 / (1 + Math.exp(-(headAccelG * move.rotation - knockdownThreshold) / spread)) : 0,
    guardBroken: false,
    pushback: ((move.target === 'head' ? s.push.head : s.push.body) * momentum) / defender.weightKg,
    staminaLoss:
      move.target === 'body'
        ? (s.damage.bodyDrain * momentum) / s.damage.bodyReferenceMomentum / bodyToughness(defender, settings)
        : 0,
  }
}

export function guardStrength(fighter: Fighter, fatigue: number, settings: FightSettings = FIGHT_SETTINGS): number {
  const { guard, fatigue: tiredness } = settings.strike
  return (
    guard.strengthN *
    fighter.arms *
    (fighter.weightKg / settings.referenceWeightKg) ** guard.weightExponent *
    (1 - tiredness.guard * clamp(fatigue, 0, 1) ** 2)
  )
}

export function moveTiming(
  attacker: Fighter,
  move: MoveSpec,
  fatigue: number,
  settings: FightSettings = FIGHT_SETTINGS,
): { readonly startup: number; readonly active: number; readonly recovery: number } {
  const tired = clamp(fatigue, 0, 1) ** 2
  const speed = strikeSpeed(move, powerOf(attacker, move), tired, settings)
  return {
    startup: Math.max(1, Math.round((move.startup * move.speed) / speed)),
    active: move.active,
    recovery: Math.round(move.recovery * (1 + settings.strike.fatigue.recovery * tired)),
  }
}

export function reachOf(fighter: Fighter, move: MoveSpec): number {
  return move.reach * fighter.heightM
}

export function staminaCost(move: MoveSpec, missed: boolean, settings: FightSettings = FIGHT_SETTINGS): number {
  return missed ? move.stamina * settings.strike.missedStamina : move.stamina
}

function powerOf(fighter: Fighter, move: MoveSpec): number {
  return move.chain.legs * fighter.legs + move.chain.trunk * fighter.trunk + move.chain.arms * fighter.arms
}

function strikeSpeed(move: MoveSpec, power: number, tired: number, settings: FightSettings): number {
  const s = settings.strike
  return move.speed * power ** s.speedExponent * (1 - s.fatigue.speed * tired)
}

function bodyToughness(fighter: Fighter, settings: FightSettings): number {
  const d = settings.strike.damage
  return (
    (fighter.weightKg / settings.referenceWeightKg) ** d.bodyWeightExponent * fighter.strength.core ** d.bodyCoreExponent
  )
}
