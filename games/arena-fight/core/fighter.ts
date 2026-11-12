import { clamp, REGION_IDS } from '@xhore/engine'
import type { AvatarState, RegionId } from '@xhore/engine'
import { FIGHT_SETTINGS, type FightSettings } from './settings.js'
import { oneRepMax, relativeStrength, trainingLevel } from './strength.js'

export type GroupId = 'push' | 'press' | 'pull' | 'legs' | 'hips' | 'core' | 'neck'

export const GROUP_IDS: readonly GroupId[] = ['push', 'press', 'pull', 'legs', 'hips', 'core', 'neck']

export interface FighterBody {
  readonly weightKg: number
  readonly heightCm?: number
  readonly avatar: AvatarState
}

export interface Fighter {
  readonly weightKg: number
  readonly heightM: number
  readonly level: Readonly<Record<GroupId, number>>
  readonly strength: Readonly<Record<GroupId, number>>
  readonly legs: number
  readonly trunk: number
  readonly arms: number
  readonly lifts: { readonly bench: number; readonly squat: number; readonly deadlift: number }
  readonly staminaMax: number
  readonly walkSpeed: number
}

export function makeFighter(body: FighterBody, settings: FightSettings = FIGHT_SETTINGS): Fighter {
  if (!Number.isFinite(body.weightKg)) throw new RangeError(`weightKg must be a number, got ${body.weightKg}`)
  const heightCm = body.heightCm ?? settings.heightCm.default
  if (!Number.isFinite(heightCm)) throw new RangeError(`heightCm must be a number, got ${body.heightCm}`)

  const weightKg = clamp(body.weightKg, settings.bodyWeightKg.min, settings.bodyWeightKg.max)
  const heightM = clamp(heightCm, settings.heightCm.min, settings.heightCm.max) / 100
  const size = (id: RegionId) => clamp(body.avatar.regions[id].size, 0, 100)

  const level = byGroup((group) => {
    const weights = Object.entries(settings.groups[group]) as [RegionId, number][]
    const total = weights.reduce((sum, [, w]) => sum + w, 0)
    return trainingLevel(weights.reduce((sum, [id, w]) => sum + w * size(id), 0) / total, settings)
  })
  const strength = byGroup((group) => relativeStrength(settings.groupLift[group], level[group], weightKg, settings))

  const { trunkShares: t, armsShares: a, stamina, walking } = settings
  const legs = strength.legs
  const trunk = t.core * strength.core + t.hips * strength.hips + t.pull * strength.pull
  const arms = a.push * strength.push + a.press * strength.press
  const relativeWeight = weightKg / settings.referenceWeightKg

  const definition =
    REGION_IDS.reduce((sum, id) => sum + clamp(body.avatar.regions[id].definition, 0, 100), 0) / REGION_IDS.length
  const staminaMax =
    stamina.base * (stamina.floor + (stamina.perDefinition * definition) / 100) * relativeWeight ** stamina.weightExponent

  return {
    weightKg,
    heightM,
    level,
    strength,
    legs,
    trunk,
    arms,
    lifts: {
      bench: oneRepMax('bench', level.push, weightKg, settings),
      squat: oneRepMax('squat', level.legs, weightKg, settings),
      deadlift: oneRepMax('deadlift', level.hips, weightKg, settings),
    },
    staminaMax,
    walkSpeed: walking.speed * legs ** walking.legsExponent * relativeWeight ** walking.weightExponent,
  }
}

function byGroup(make: (group: GroupId) => number): Record<GroupId, number> {
  return Object.fromEntries(GROUP_IDS.map((group) => [group, make(group)])) as Record<GroupId, number>
}
