import type { ColorRepresentation, Object3D } from 'three'
import type { RegionId } from '@xhore/engine'
import type { RegionScores } from './scores.js'

/**
 * A body that can be shown at any set of scores. Screens and games hold one of
 * these and never need to know whether it is the stand-in or the real model,
 * which is what lets the real body file replace the stand-in without any of
 * them changing.
 */
export interface AvatarBody {
  /** Add this to a scene. Feet rest on y = 0, the body faces +z, and one unit is one metre. */
  readonly object: Object3D
  /** Standing height in metres, for framing a camera. */
  readonly height: number
  /** Shows each region at its score, at once. Easing between scores is the viewer's job. */
  applyScores(scores: RegionScores): void
  setSkinTone(colour: ColorRepresentation): void
  /** Lights up one region so a person can see where it is on the body. Null clears it. */
  highlightRegion(regionId: RegionId | null): void
  /** Frees the body's graphics resources. The body must not be used afterwards. */
  dispose(): void
}
