import { REGION_IDS, REGION_LABELS } from '@xhore/engine'
import type { RegionId } from '@xhore/engine'
import './muscle-readout.css'

interface RegionNumbers {
  readonly size: number
  readonly definition: number
}

type Regions = Readonly<Record<RegionId, RegionNumbers>>

interface MuscleReadoutProps {
  /** The regions of any avatar from the growth engine fit here as they are. */
  readonly regions: Regions
  /** The same regions before the last change, or null when there is nothing to compare with. */
  readonly before: Regions | null
  readonly highlight: RegionId | null
  onHighlight(regionId: RegionId | null): void
}

/** Changes smaller than this are rounding noise, not something to show. */
const SMALLEST_CHANGE = 0.05

function formatChange(change: number): string {
  return `${change > 0 ? '+' : '−'}${Math.abs(change).toFixed(1)}`
}

/** Lists every muscle region with its size and definition, and what the last change did. */
export function MuscleReadout({ regions, before, highlight, onHighlight }: MuscleReadoutProps) {
  return (
    <section className="panel muscle-readout" aria-label="Muscle scores">
      <div className="readout-head">
        <h2 className="panel-title">Muscles</h2>
        <div className="legend">
          <span className="legend-item">
            <span className="legend-dot legend-size" />
            Size
          </span>
          <span className="legend-item">
            <span className="legend-dot legend-definition" />
            Definition
          </span>
        </div>
      </div>
      <p className="panel-text">Point at a muscle to see where it is on the body.</p>

      <ul className="muscle-list">
        {REGION_IDS.map((regionId) => {
          const { size, definition } = regions[regionId]
          const change = before ? size - before[regionId].size : 0
          const changed = Math.abs(change) >= SMALLEST_CHANGE

          return (
            <li
              key={regionId}
              className={regionId === highlight ? 'muscle-row muscle-row-on' : 'muscle-row'}
              tabIndex={0}
              aria-label={`${REGION_LABELS[regionId]}: size ${size.toFixed(1)}, definition ${definition.toFixed(0)}`}
              onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') onHighlight(regionId)
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === 'mouse') onHighlight(null)
              }}
              onFocus={() => onHighlight(regionId)}
              onBlur={() => onHighlight(null)}
            >
              <span className="muscle-name">{REGION_LABELS[regionId]}</span>

              <span className="muscle-bars" aria-hidden="true">
                <span className="bar">
                  <span className="bar-fill bar-size" style={{ width: `${size}%` }} />
                </span>
                <span className="bar bar-thin">
                  <span className="bar-fill bar-definition" style={{ width: `${definition}%` }} />
                </span>
              </span>

              <span className="muscle-numbers" aria-hidden="true">
                <span className="muscle-size">{size.toFixed(1)}</span>
                {changed && (
                  <span className={change > 0 ? 'change change-up' : 'change change-down'}>
                    {formatChange(change)}
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
