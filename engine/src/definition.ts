import type { EngineConfig } from './config.js'
import type { HardSetWeek } from './types.js'
import type { RegionId } from './regions.js'
import { clamp } from './math.js'

/**
 * Definition target = 100 x (weeks of the last 4 with at least 3 hard sets for
 * the region) / 4. It measures consistency, so trust credit is not applied.
 */
export function definitionTarget(
  history: readonly HardSetWeek[],
  regionId: RegionId,
  config: EngineConfig,
): number {
  const window = history.slice(-config.definition.lookbackWeeks)
  const qualifying = window.filter(
    (week) => (week.counts[regionId] ?? 0) >= config.definition.hardSetsPerWeek,
  ).length
  return (config.definition.max * qualifying) / config.definition.lookbackWeeks
}

/** Each week, definition moves 25% of the way to its target. */
export function moveTowardTarget(current: number, target: number, config: EngineConfig): number {
  return current + (target - current) * config.definition.approachRate
}

export function nextDefinition(
  current: number,
  history: readonly HardSetWeek[],
  regionId: RegionId,
  config: EngineConfig,
): { definition: number; target: number } {
  if (!config.features.definition) {
    return { definition: current, target: current }
  }
  const target = definitionTarget(history, regionId, config)
  const definition = clamp(moveTowardTarget(current, target, config), 0, config.definition.max)
  return { definition, target }
}

/** Keeps only the weeks the definition rule can still see. */
export function trimHistory(
  history: readonly HardSetWeek[],
  config: EngineConfig,
): readonly HardSetWeek[] {
  return history.slice(-config.definition.lookbackWeeks)
}
