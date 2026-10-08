import { useEffect, useRef, useState } from 'react'
import { DEFAULT_SKIN_TONE, loadAvatarBody, mountAvatarViewer } from '@xhore/avatar-kit'
import type { AvatarBody, AvatarViewer, RegionScores, ViewName } from '@xhore/avatar-kit'
import type { RegionId } from '@xhore/engine'
import './avatar-view.css'

interface AvatarViewProps {
  /** The regions of any avatar from the growth engine fit here as they are. */
  readonly scores: RegionScores
  /** A region to light up on the body, or null for none. */
  readonly highlight: RegionId | null
}

const VIEWS: readonly { readonly id: ViewName; readonly label: string }[] = [
  { id: 'front', label: 'Front' },
  { id: 'left', label: 'Side' },
  { id: 'back', label: 'Back' },
]

const SKIN_TONES: readonly { readonly label: string; readonly colour: string }[] = [
  { label: 'Light', colour: '#f1c9a5' },
  { label: 'Fair', colour: '#e0ac7e' },
  { label: 'Medium', colour: DEFAULT_SKIN_TONE },
  { label: 'Brown', colour: '#8d5a36' },
  { label: 'Deep', colour: '#5c3a21' },
]

/**
 * Shows an avatar in 3D. It only displays the scores it is given: the growth
 * engine is the one place those are worked out.
 */
export function AvatarView({ scores, highlight }: AvatarViewProps) {
  const stageRef = useRef<HTMLDivElement>(null)
  const [viewer, setViewer] = useState<AvatarViewer | null>(null)
  const [failed, setFailed] = useState(false)
  const [skinTone, setSkinTone] = useState(DEFAULT_SKIN_TONE)
  /** The viewer that has already been given its first scores, which appear without easing. */
  const primedViewer = useRef<AvatarViewer | null>(null)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    let cancelled = false
    let body: AvatarBody | null = null
    let mounted: AvatarViewer | null = null

    loadAvatarBody()
      .then((loaded) => {
        if (cancelled) {
          loaded.dispose()
          return
        }
        body = loaded
        mounted = mountAvatarViewer(stage, { body: loaded })
        setViewer(mounted)
      })
      .catch(() => {
        // Usually a browser or device that cannot start 3D graphics.
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
      mounted?.dispose()
      body?.dispose()
      setViewer(null)
    }
  }, [])

  useEffect(() => {
    if (!viewer) return
    viewer.setScores(scores, { immediate: primedViewer.current !== viewer })
    primedViewer.current = viewer
  }, [viewer, scores])

  useEffect(() => {
    viewer?.highlightRegion(highlight)
  }, [viewer, highlight])

  useEffect(() => {
    viewer?.setSkinTone(skinTone)
  }, [viewer, skinTone])

  return (
    <section className="avatar-view" aria-label="Avatar">
      <div ref={stageRef} className="avatar-stage" />

      {failed && (
        <p className="avatar-message" role="alert">
          This browser could not start 3D graphics, so the avatar cannot be shown here.
        </p>
      )}

      <div className="avatar-toolbar">
        <div className="button-row" role="group" aria-label="Turn the avatar">
          {VIEWS.map((view) => (
            <button
              key={view.id}
              type="button"
              className="chip"
              disabled={!viewer}
              onClick={() => viewer?.setView(view.id)}
            >
              {view.label}
            </button>
          ))}
        </div>

        <div className="swatch-row" role="group" aria-label="Skin tone">
          {SKIN_TONES.map((tone) => (
            <button
              key={tone.colour}
              type="button"
              className={tone.colour === skinTone ? 'swatch swatch-on' : 'swatch'}
              style={{ background: tone.colour }}
              aria-label={`${tone.label} skin tone`}
              aria-pressed={tone.colour === skinTone}
              title={tone.label}
              onClick={() => setSkinTone(tone.colour)}
            />
          ))}
        </div>
      </div>

      <p className="avatar-note">
        Stand-in body made of simple shapes. Drag to turn it, scroll to zoom.
      </p>
    </section>
  )
}
