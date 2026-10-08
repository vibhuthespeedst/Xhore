import { EXERCISES, EXERCISE_IDS } from '@xhore/engine'
import type { ExerciseId, Experience } from '@xhore/engine'
import { SETS_PER_WEEK } from './simulate'
import './quick-sim.css'

interface QuickSimProps {
  readonly experience: Experience
  readonly week: number
  readonly exercises: readonly ExerciseId[]
  readonly friendConfirmed: boolean
  onExperienceChange(experience: Experience): void
  onExercisesChange(exercises: readonly ExerciseId[]): void
  onFriendConfirmedChange(friendConfirmed: boolean): void
  onSkip(weeks: number): void
  onStartOver(): void
}

const EXPERIENCES: readonly { readonly id: Experience; readonly label: string }[] = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
]
const SKIPS: readonly number[] = [1, 4, 12]

/**
 * A stand-in for real set logging: choose a weekly routine and skip ahead, so
 * the avatar can be watched growing before logging exists.
 */
export function QuickSim({
  experience,
  week,
  exercises,
  friendConfirmed,
  onExperienceChange,
  onExercisesChange,
  onFriendConfirmedChange,
  onSkip,
  onStartOver,
}: QuickSimProps) {
  const toggle = (exerciseId: ExerciseId): void => {
    onExercisesChange(
      exercises.includes(exerciseId)
        ? exercises.filter((id) => id !== exerciseId)
        : [...exercises, exerciseId],
    )
  }

  return (
    <section className="panel quick-sim" aria-label="Simulate training">
      <div className="quick-sim-head">
        <h2 className="panel-title">Simulate training</h2>
        <span className="week-badge">Week {week}</span>
      </div>
      <p className="panel-text">
        Pick what you would train every week, then skip ahead and watch the body change. Each
        exercise counts as {SETS_PER_WEEK} hard sets a week.
      </p>

      <h3 className="field-label">Starting level</h3>
      <div className="button-row" role="group" aria-label="Starting level">
        {EXPERIENCES.map((level) => (
          <button
            key={level.id}
            type="button"
            className={level.id === experience ? 'chip chip-on' : 'chip'}
            aria-pressed={level.id === experience}
            onClick={() => onExperienceChange(level.id)}
          >
            {level.label}
          </button>
        ))}
      </div>

      <div className="field-head">
        <h3 className="field-label">Weekly routine</h3>
        <div className="link-row">
          <button type="button" className="link" onClick={() => onExercisesChange(EXERCISE_IDS)}>
            All
          </button>
          <button type="button" className="link" onClick={() => onExercisesChange([])}>
            None
          </button>
        </div>
      </div>
      <div className="button-row" role="group" aria-label="Weekly routine">
        {EXERCISE_IDS.map((exerciseId) => {
          const chosen = exercises.includes(exerciseId)
          return (
            <button
              key={exerciseId}
              type="button"
              className={chosen ? 'chip chip-on' : 'chip'}
              aria-pressed={chosen}
              onClick={() => toggle(exerciseId)}
            >
              {EXERCISES[exerciseId].name}
            </button>
          )
        })}
      </div>

      <label className="check">
        <input
          type="checkbox"
          checked={friendConfirmed}
          onChange={(event) => onFriendConfirmedChange(event.target.checked)}
        />
        <span>
          Sessions confirmed by a friend
          <small>Confirmed sessions earn full credit. Self-reported ones earn half.</small>
        </span>
      </label>

      <div className="skip-row">
        {SKIPS.map((weeks) => (
          <button key={weeks} type="button" className="button" onClick={() => onSkip(weeks)}>
            +{weeks} {weeks === 1 ? 'week' : 'weeks'}
          </button>
        ))}
        <button type="button" className="button button-quiet" onClick={onStartOver}>
          Start over
        </button>
      </div>
    </section>
  )
}
