import { useMemo, useState } from 'react'
import { REGION_IDS, createAvatar, type Experience } from '@xhore/engine'

const EXPERIENCES: readonly Experience[] = ['beginner', 'intermediate', 'advanced']

export function App() {
  const [experience, setExperience] = useState<Experience>('beginner')
  const avatar = useMemo(() => createAvatar({ experience }), [experience])

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">Xhore</h1>
        <span className="app-tag">Prototype</span>
      </header>

      <main className="app-main">
        <section className="panel">
          <h2 className="panel-title">Growth engine connected</h2>
          <p className="panel-text">
            These starting sizes come straight from the growth engine. Pick an experience level to
            see them change.
          </p>

          <div className="button-row" role="group" aria-label="Experience level">
            {EXPERIENCES.map((level) => (
              <button
                key={level}
                type="button"
                className={level === experience ? 'chip chip-on' : 'chip'}
                aria-pressed={level === experience}
                onClick={() => setExperience(level)}
              >
                {level}
              </button>
            ))}
          </div>

          <ul className="region-grid">
            {REGION_IDS.map((regionId) => (
              <li key={regionId} className="region-cell">
                <span className="region-name">{regionId}</span>
                <span className="region-value">{avatar.regions[regionId].size}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  )
}
