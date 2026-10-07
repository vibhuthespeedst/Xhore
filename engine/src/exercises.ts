import type { RegionId } from './regions.js'

/**
 * The exercise catalogue from the project spec. Each exercise names one main region
 * at weight 1.0 plus any helper regions at a fraction of that. The weight is
 * how much of a set's intensity that region receives.
 */
export interface Exercise {
  readonly id: ExerciseId
  readonly name: string
  /**
   * Bodyweight exercises are scored on reps rather than load, because the
   * weight on the bar is not what got harder.
   */
  readonly bodyweight: boolean
  readonly regions: Readonly<Partial<Record<RegionId, number>>>
}

export const EXERCISE_IDS = [
  'curl',
  'bench_press',
  'incline_bench_press',
  'dips',
  'overhead_press',
  'lateral_raise',
  'pull_up',
  'barbell_row',
  'squat',
  'romanian_deadlift',
  'hip_thrust',
  'tricep_pushdown',
  'calf_raise',
  'cable_crunch',
] as const

export type ExerciseId = (typeof EXERCISE_IDS)[number]

export const EXERCISES: Readonly<Record<ExerciseId, Exercise>> = {
  curl: {
    id: 'curl',
    name: 'Curl',
    bodyweight: false,
    regions: { biceps: 1.0, forearms: 0.3 },
  },
  bench_press: {
    id: 'bench_press',
    name: 'Bench press',
    bodyweight: false,
    regions: { chest_mid: 1.0, delt_front: 0.5, triceps: 0.5 },
  },
  incline_bench_press: {
    id: 'incline_bench_press',
    name: 'Incline bench press',
    bodyweight: false,
    regions: { chest_upper: 1.0, delt_front: 0.6, triceps: 0.4 },
  },
  dips: {
    id: 'dips',
    name: 'Dips',
    bodyweight: true,
    regions: { chest_lower: 1.0, triceps: 0.6, delt_front: 0.3 },
  },
  overhead_press: {
    id: 'overhead_press',
    name: 'Overhead press',
    bodyweight: false,
    regions: { delt_front: 1.0, delt_side: 0.5, triceps: 0.6 },
  },
  lateral_raise: {
    id: 'lateral_raise',
    name: 'Lateral raise',
    bodyweight: false,
    regions: { delt_side: 1.0, traps: 0.2 },
  },
  pull_up: {
    id: 'pull_up',
    name: 'Pull-up or lat pulldown',
    bodyweight: true,
    regions: { lats: 1.0, biceps: 0.5, mid_back: 0.4, delt_rear: 0.3 },
  },
  barbell_row: {
    id: 'barbell_row',
    name: 'Barbell row',
    bodyweight: false,
    regions: { mid_back: 1.0, lats: 0.7, delt_rear: 0.5, biceps: 0.4 },
  },
  squat: {
    id: 'squat',
    name: 'Squat',
    bodyweight: false,
    regions: { quads: 1.0, glutes: 0.7, hamstrings: 0.3, lower_back: 0.3 },
  },
  romanian_deadlift: {
    id: 'romanian_deadlift',
    name: 'Romanian deadlift',
    bodyweight: false,
    regions: { hamstrings: 1.0, glutes: 0.8, lower_back: 0.6, forearms: 0.3 },
  },
  hip_thrust: {
    id: 'hip_thrust',
    name: 'Hip thrust',
    bodyweight: false,
    regions: { glutes: 1.0, hamstrings: 0.4 },
  },
  tricep_pushdown: {
    id: 'tricep_pushdown',
    name: 'Tricep pushdown',
    bodyweight: false,
    regions: { triceps: 1.0 },
  },
  calf_raise: {
    id: 'calf_raise',
    name: 'Calf raise',
    bodyweight: false,
    regions: { calves: 1.0 },
  },
  cable_crunch: {
    id: 'cable_crunch',
    name: 'Cable crunch',
    bodyweight: false,
    regions: { abs: 1.0, obliques: 0.3 },
  },
}

export function isExerciseId(value: string): value is ExerciseId {
  return Object.prototype.hasOwnProperty.call(EXERCISES, value)
}

export function getExercise(id: ExerciseId): Exercise {
  return EXERCISES[id]
}
