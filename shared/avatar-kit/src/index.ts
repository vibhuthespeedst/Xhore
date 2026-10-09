/**
 * Public surface of the avatar kit. Screens and games import from here and
 * nowhere deeper. The kit shows the scores it is handed; it never works one
 * out, because only the growth engine may do that.
 */
import type { AvatarBody } from './body.js'
import { loadModelBody } from './modelBody.js'
import { createStandInBody } from './standInBody.js'

export type { AvatarBody } from './body.js'

export type { RegionScore, RegionScores } from './scores.js'
export { scoreToStrength } from './scores.js'

export { DEFAULT_SKIN_TONE, createStandInBody } from './standInBody.js'
export { createModelBody } from './modelBody.js'

export type { AvatarViewer, AvatarViewerOptions, ViewName } from './viewer.js'
export { mountAvatarViewer } from './viewer.js'

export interface LoadAvatarBodyOptions {
  /**
   * Address of the body file, `assets/body-male.glb` in this package. How a
   * shell turns that file into an address depends on how the shell is built,
   * which is why the shell passes it in.
   */
  readonly modelUrl?: string
}

/**
 * Loads the body that every screen and game shows. With no address, or if the
 * file cannot be loaded, it falls back to the stand-in built from simple
 * shapes, so the avatar is never simply missing.
 */
export async function loadAvatarBody(options: LoadAvatarBodyOptions = {}): Promise<AvatarBody> {
  if (options.modelUrl) {
    try {
      return await loadModelBody(options.modelUrl)
    } catch (error) {
      console.warn('The avatar body file could not be loaded, so the stand-in body is shown.', error)
    }
  }
  return createStandInBody()
}
