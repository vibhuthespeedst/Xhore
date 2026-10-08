import { useReducer, useState } from 'react'
import { createAvatar } from '@xhore/engine'
import type { AvatarState, ExerciseId, Experience, RegionId } from '@xhore/engine'
import { AvatarView } from './features/avatar-view/AvatarView'
import { MuscleReadout } from './features/muscle-readout/MuscleReadout'
import { QuickSim } from './features/quick-sim/QuickSim'
import { simulateWeeks } from './features/quick-sim/simulate'
import type { Routine } from './features/quick-sim/simulate'

/** Calf raises alone, so the first skip shows one muscle growing and nothing else. */
const FIRST_ROUTINE: readonly ExerciseId[] = ['calf_raise']
const FIRST_EXPERIENCE: Experience = 'beginner'

interface Progress {
  readonly experience: Experience
  readonly avatar: AvatarState
  /** The avatar as it was before the last skip, so the readout can show what changed. */
  readonly before: AvatarState | null
  readonly week: number
}

type ProgressAction =
  | { readonly type: 'skip'; readonly weeks: number; readonly routine: Routine }
  | { readonly type: 'startOver'; readonly experience: Experience }

function freshProgress(experience: Experience): Progress {
  return { experience, avatar: createAvatar({ experience }), before: null, week: 0 }
}

/**
 * Every skip builds on the result of the one before it, so two skips in quick
 * succession count as two.
 */
function progressReducer(progress: Progress, action: ProgressAction): Progress {
  switch (action.type) {
    case 'skip':
      return {
        ...progress,
        before: progress.avatar,
        avatar: simulateWeeks(progress.avatar, progress.week, action.weeks, action.routine),
        week: progress.week + action.weeks,
      }
    case 'startOver':
      return freshProgress(action.experience)
  }
}

/**
 * The page. It holds the avatar and hands it to the features, which never talk
 * to each other directly: each one reads what it is given and reports back here.
 */
export function App() {
  const [progress, dispatch] = useReducer(progressReducer, FIRST_EXPERIENCE, freshProgress)
  const [exercises, setExercises] = useState<readonly ExerciseId[]>(FIRST_ROUTINE)
  const [friendConfirmed, setFriendConfirmed] = useState(true)
  const [highlight, setHighlight] = useState<RegionId | null>(null)

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Xhore</h1>
        <span className="app-tag">Prototype</span>
      </header>

      <main className="layout">
        <AvatarView scores={progress.avatar.regions} highlight={highlight} />

        <div className="side">
          <QuickSim
            experience={progress.experience}
            week={progress.week}
            exercises={exercises}
            friendConfirmed={friendConfirmed}
            onExperienceChange={(experience) => dispatch({ type: 'startOver', experience })}
            onExercisesChange={setExercises}
            onFriendConfirmedChange={setFriendConfirmed}
            onSkip={(weeks) =>
              dispatch({
                type: 'skip',
                weeks,
                routine: { exercises, trust: friendConfirmed ? 'friend' : 'self' },
              })
            }
            onStartOver={() => dispatch({ type: 'startOver', experience: progress.experience })}
          />
          <MuscleReadout
            regions={progress.avatar.regions}
            before={progress.before?.regions ?? null}
            highlight={highlight}
            onHighlight={setHighlight}
          />
        </div>
      </main>
    </div>
  )
}
