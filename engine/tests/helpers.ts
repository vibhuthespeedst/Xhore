import type { ExerciseId } from '../src/exercises.js'
import type { Experience, LoggedSet, RegionState, Session, TrustLevel } from '../src/types.js'
import { addDays } from '../src/time.js'

/** A fixed Monday. The engine reads no clock, so every test date is explicit. */
export const START = '2026-01-05T00:00:00.000Z'

export interface WeekWindow {
  readonly weekStart: string
  readonly weekEnd: string
  /** A moment inside the week, for logging sessions. */
  readonly midWeek: string
}

/** Week 0 starts at START; each later week is the next 7 day block. */
export function weekWindow(index: number): WeekWindow {
  const weekStart = addDays(START, index * 7)
  return {
    weekStart,
    weekEnd: addDays(weekStart, 6),
    midWeek: addDays(weekStart, 1),
  }
}

export function set(exerciseId: ExerciseId, reps = 10, weight?: number): LoggedSet {
  return weight === undefined ? { exerciseId, reps } : { exerciseId, reps, weight }
}

export function session(
  performedAt: string,
  sets: readonly LoggedSet[],
  trust: TrustLevel = 'friend',
  id = `s-${performedAt}`,
): Session {
  return { id, performedAt, trust, sets }
}

/** One session holding `count` identical sets, the usual shape of a test week. */
export function setsSession(
  performedAt: string,
  exerciseId: ExerciseId,
  count: number,
  options: { reps?: number; weight?: number; trust?: TrustLevel } = {},
): Session {
  const sets = Array.from({ length: count }, () =>
    set(exerciseId, options.reps ?? 10, options.weight),
  )
  return session(performedAt, sets, options.trust ?? 'friend')
}

export const EXPERIENCES: readonly Experience[] = ['beginner', 'intermediate', 'advanced']

/** A region state with sensible defaults, for rule-level tests. */
export function regionState(overrides: Partial<RegionState> = {}): RegionState {
  return {
    size: 10,
    definition: 0,
    startingSize: 10,
    peakSize: 10,
    lastTrainedAt: null,
    ...overrides,
  }
}

/**
 * Deep clone of plain avatar state, for checking the engine does not mutate
 * what it is handed. State is JSON-shaped by design, so this is enough.
 */
export function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}
