/**
 * The 19 muscle regions the avatar is made of.
 *
 * Declared as a tuple so `RegionId` is a union of exact strings: a mistyped
 * region name becomes a compile error instead of a silent no-op at runtime.
 * The order here is the order the prototype may list them in.
 */
export const REGION_IDS = [
  'biceps',
  'triceps',
  'forearms',
  'delt_front',
  'delt_side',
  'delt_rear',
  'chest_upper',
  'chest_mid',
  'chest_lower',
  'lats',
  'traps',
  'mid_back',
  'lower_back',
  'abs',
  'obliques',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
] as const

export type RegionId = (typeof REGION_IDS)[number]

export function isRegionId(value: string): value is RegionId {
  return (REGION_IDS as readonly string[]).includes(value)
}

/** Build a full per-region record, so no region is ever accidentally missing. */
export function regionRecord<T>(make: (regionId: RegionId) => T): Record<RegionId, T> {
  const out = {} as Record<RegionId, T>
  for (const regionId of REGION_IDS) {
    out[regionId] = make(regionId)
  }
  return out
}
