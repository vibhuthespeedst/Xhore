import { addDays, advanceWeek } from '@xhore/engine'
import type { AvatarState, ExerciseId, Session, TrustLevel } from '@xhore/engine'

/**
 * The simulated calendar starts on a fixed Monday. The engine reads no clock,
 * so the page has to supply every date, and a fixed start keeps runs repeatable.
 */
const SIM_START = '2026-01-05T00:00:00.000Z'

/** Monday, Wednesday and Friday, as days after the start of the week. */
const TRAINING_DAYS = [0, 2, 4] as const
const SETS_PER_SESSION = 3
const REPS_PER_SET = 10

/** Hard sets each chosen exercise gets in a simulated week. */
export const SETS_PER_WEEK = TRAINING_DAYS.length * SETS_PER_SESSION

export interface Routine {
  /** Exercises done in every simulated week. Empty means a week off. */
  readonly exercises: readonly ExerciseId[]
  readonly trust: TrustLevel
}

function sessionsFor(weekIndex: number, weekStart: string, routine: Routine): Session[] {
  if (routine.exercises.length === 0) return []

  return TRAINING_DAYS.map((day) => ({
    id: `sim-week${weekIndex}-day${day}`,
    performedAt: addDays(weekStart, day),
    trust: routine.trust,
    // No weight is given, so the engine scores every set at normal intensity.
    sets: routine.exercises.flatMap((exerciseId) =>
      Array.from({ length: SETS_PER_SESSION }, () => ({ exerciseId, reps: REPS_PER_SET })),
    ),
  }))
}

/**
 * Runs the growth engine forward by `weeks`, training the same routine every
 * week. All the maths happens in the engine; this only invents the sessions.
 */
export function simulateWeeks(
  avatar: AvatarState,
  firstWeekIndex: number,
  weeks: number,
  routine: Routine,
): AvatarState {
  let state = avatar
  for (let offset = 0; offset < weeks; offset += 1) {
    const weekIndex = firstWeekIndex + offset
    const weekStart = addDays(SIM_START, weekIndex * 7)
    state = advanceWeek(state, {
      sessions: sessionsFor(weekIndex, weekStart, routine),
      weekStart,
      weekEnd: addDays(weekStart, 6),
    }).state
  }
  return state
}
