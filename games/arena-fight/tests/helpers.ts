import { createAvatar, REGION_IDS } from '@xhore/engine'
import type { AvatarState, RegionId, RegionState } from '@xhore/engine'
import { makeFighter } from '../core/fighter.js'
import type { Fighter } from '../core/fighter.js'

export function avatarAt(size: number, definition = 50, sizes: Partial<Record<RegionId, number>> = {}): AvatarState {
  const base = createAvatar({ experience: 'intermediate' })
  const regions = Object.fromEntries(
    REGION_IDS.map((id) => [id, { ...base.regions[id], size: sizes[id] ?? size, definition }]),
  ) as Record<RegionId, RegionState>
  return { ...base, regions }
}

export function fighterAt(weightKg: number, size: number, sizes: Partial<Record<RegionId, number>> = {}): Fighter {
  return makeFighter({ weightKg, heightCm: 175, avatar: avatarAt(size, 50, sizes) })
}

export function within(actual: number, expected: number, share: number): boolean {
  return Math.abs(actual / expected - 1) <= share
}
