/**
 * Public surface of the avatar kit. Screens and games import from here and
 * nowhere deeper. The kit shows the scores it is handed; it never works one
 * out, because only the growth engine may do that.
 */
import type { AvatarBody } from './body.js'
import { createStandInBody } from './standInBody.js'

export type { AvatarBody } from './body.js'

export type { RegionScore, RegionScores } from './scores.js'
export { scoreToStrength } from './scores.js'

export { DEFAULT_SKIN_TONE, createStandInBody } from './standInBody.js'

export type { AvatarViewer, AvatarViewerOptions, ViewName } from './viewer.js'
export { mountAvatarViewer } from './viewer.js'

/**
 * Loads the body that every screen and game shows. Today that is the stand-in
 * built in code. The real body file will load behind this same call, which is
 * why it is already asynchronous: nothing that uses it will need to change.
 */
export async function loadAvatarBody(): Promise<AvatarBody> {
  return createStandInBody()
}
