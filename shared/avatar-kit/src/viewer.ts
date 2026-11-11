import {
  CircleGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  NeutralToneMapping,
  PerspectiveCamera,
  PMREMGenerator,
  RingGeometry,
  Scene,
  ShadowMaterial,
  Spherical,
  Vector3,
  WebGLRenderer,
} from 'three'
import type { ColorRepresentation } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { REGION_IDS, regionRecord } from '@xhore/engine'
import type { RegionId } from '@xhore/engine'
import type { AvatarBody } from './body.js'
import type { RegionScores } from './scores.js'

/** Which side of the body faces the viewer. "left" shows the body's own left side. */
export type ViewName = 'front' | 'back' | 'left' | 'right'

export interface AvatarViewerOptions {
  readonly body: AvatarBody
  /** Scores to show first. They appear at once, without easing. */
  readonly scores?: RegionScores
  /** Colour of the ring the body stands in. */
  readonly ringColour?: ColorRepresentation
}

export interface AvatarViewer {
  /** Shows new scores, easing from the old ones so that growth can be seen happening. */
  setScores(scores: RegionScores, options?: { readonly immediate?: boolean }): void
  setSkinTone(colour: ColorRepresentation): void
  highlightRegion(regionId: RegionId | null): void
  /** Turns the camera to a side of the body. Dragging still works afterwards. */
  setView(view: ViewName): void
  /** Stops drawing and frees the viewer's resources. The body is left for its owner to dispose. */
  dispose(): void
}

/** Degrees. Narrow, so the body is not distorted the way a wide lens would distort it. */
const FIELD_OF_VIEW = 30
/** How much taller than the body the picture is. */
const FRAME_MARGIN = 1.34
/** Where the camera looks, as a share of the body's height. A little below the middle leaves room for the floor ring. */
const FOCUS_HEIGHT = 0.47
/** The floor ring's radius, as a share of the body's height, so it stays in the picture for any body. */
const RING_RADIUS = 0.43
/** Metres across with arms and grown lats, used to fit the body on a narrow screen. */
const BODY_WIDTH = 0.95
const MAX_PIXEL_RATIO = 2
/** Easing speeds, per second. */
const SCORE_EASE = 4
const VIEW_EASE = 6
/** Longest step in seconds, so a tab coming back from sleep does not jump. */
const MAX_STEP = 0.1
const HOME_POLAR = Math.PI / 2 - 0.06
const DEFAULT_RING_COLOUR = '#ff6b35'
/** How strongly the soft light from all round shows, next to the lights aimed at the body. */
const ROOM_LIGHT = 0.25
/** Overall brightness. Below 1 because the room light adds to the lights aimed at the body. */
const EXPOSURE = 0.8
/** How far shadow edges are blurred, in shadow-map texels. */
const SHADOW_SOFTNESS = 4

const VIEW_AZIMUTH: Readonly<Record<ViewName, number>> = {
  front: 0,
  left: Math.PI / 2,
  back: Math.PI,
  right: -Math.PI / 2,
}

interface MutableScore {
  size: number
  definition: number
}

interface ViewGoal {
  readonly azimuth: number
  readonly polar: number
  readonly distance: number
}

/**
 * Puts a body on screen inside `container`: a lit scene, a camera that can be
 * dragged around the body, and a draw loop that only works when something has
 * changed. The container decides the size; the viewer fills it.
 */
export function mountAvatarViewer(
  container: HTMLElement,
  options: AvatarViewerOptions,
): AvatarViewer {
  const { body } = options

  const renderer = new WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO))
  // Of the colour settings compared side by side, this gave the most natural skin (D-054).
  renderer.toneMapping = NeutralToneMapping
  renderer.toneMappingExposure = EXPOSURE
  renderer.shadowMap.enabled = true

  const canvas = renderer.domElement
  canvas.style.display = 'block'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.touchAction = 'none'
  canvas.setAttribute('role', 'img')
  canvas.setAttribute('aria-label', 'Your avatar in 3D. Drag to turn it.')
  container.appendChild(canvas)

  const scene = new Scene()
  scene.add(body.object)

  // Soft light from all round, as in a photo studio, made in code rather than
  // loaded from a file. Skin and eyes reflect it, which keeps them from looking flat.
  const pmrem = new PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const roomLight = pmrem.fromScene(room, 0.04).texture
  room.dispose()
  pmrem.dispose()
  scene.environment = roomLight
  scene.environmentIntensity = ROOM_LIGHT

  // A warm key light from high in front, which lights the top of each muscle
  // and shades the underside, the way gym lights do; a cool rim light from
  // behind that picks out the outline; and a weak fill so shadows are not
  // black. The lights, and the room, turn with the camera, so whichever side of
  // the body is being looked at is the side that is lit.
  const ambient = new HemisphereLight('#dfe8ff', '#1c2028', 0.5)
  const lightRig = new Group()
  const key = new DirectionalLight('#fff1e0', 2.8)
  key.position.set(1.5, 4.4, 2.6)
  key.target.position.set(0, body.height / 2, 0)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.left = -1.5
  key.shadow.camera.right = 1.5
  key.shadow.camera.top = 1.6
  key.shadow.camera.bottom = -1.6
  key.shadow.camera.near = 0.5
  key.shadow.camera.far = 10
  key.shadow.bias = -0.0004
  key.shadow.normalBias = 0.01
  key.shadow.radius = SHADOW_SOFTNESS
  const rim = new DirectionalLight('#6fa8ff', 1.9)
  rim.position.set(-2.6, 2.4, -3)
  const fill = new DirectionalLight('#ffffff', 0.3)
  fill.position.set(-2, 1.2, 2.5)
  lightRig.add(key, key.target, rim, fill)
  scene.add(ambient, lightRig)

  const ringRadius = body.height * RING_RADIUS
  const floorGeometry = new CircleGeometry(ringRadius * 1.5, 64)
  const floorMaterial = new ShadowMaterial({ opacity: 0.38 })
  const floor = new Mesh(floorGeometry, floorMaterial)
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true

  const ringGeometry = new RingGeometry(ringRadius - 0.02, ringRadius, 96)
  const ringMaterial = new MeshBasicMaterial({
    color: options.ringColour ?? DEFAULT_RING_COLOUR,
    transparent: true,
    opacity: 0.55,
  })
  const ring = new Mesh(ringGeometry, ringMaterial)
  ring.rotation.x = -Math.PI / 2
  ring.position.y = 0.002
  scene.add(floor, ring)

  const focus = new Vector3(0, body.height * FOCUS_HEIGHT, 0)
  const camera = new PerspectiveCamera(FIELD_OF_VIEW, 1, 0.1, 50)
  const spherical = new Spherical()
  const offset = new Vector3()

  function homeDistance(): number {
    const halfHeight = Math.tan(MathUtils.degToRad(FIELD_OF_VIEW) / 2)
    const fitHeight = (body.height * FRAME_MARGIN) / (2 * halfHeight)
    const fitWidth = (BODY_WIDTH * FRAME_MARGIN) / (2 * halfHeight * camera.aspect)
    return Math.max(fitHeight, fitWidth)
  }

  function placeCamera(azimuth: number, polar: number, distance: number): void {
    offset.setFromSpherical(spherical.set(distance, polar, azimuth))
    camera.position.copy(focus).add(offset)
    camera.lookAt(focus)
  }

  const controls = new OrbitControls(camera, canvas)
  controls.target.copy(focus)
  controls.enablePan = false
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minDistance = 1.4
  controls.maxDistance = 9
  controls.minPolarAngle = Math.PI * 0.12
  // Stop just above floor level, so the camera never looks up from under the ground.
  controls.maxPolarAngle = Math.PI / 2 - 0.02

  let dirty = true
  let viewGoal: ViewGoal | null = null
  const cancelViewGoal = (): void => {
    viewGoal = null
  }
  controls.addEventListener('start', cancelViewGoal)

  const target: Record<RegionId, MutableScore> = regionRecord((regionId) => ({
    size: options.scores?.[regionId].size ?? 0,
    definition: options.scores?.[regionId].definition ?? 0,
  }))
  const shown: Record<RegionId, MutableScore> = regionRecord((regionId) => ({
    ...target[regionId],
  }))
  let easingScores = false
  body.applyScores(shown)

  function stepScores(seconds: number): boolean {
    if (!easingScores) return false
    const amount = 1 - Math.exp(-seconds * SCORE_EASE)
    let widestGap = 0
    for (const regionId of REGION_IDS) {
      const from = shown[regionId]
      const to = target[regionId]
      from.size += (to.size - from.size) * amount
      from.definition += (to.definition - from.definition) * amount
      widestGap = Math.max(
        widestGap,
        Math.abs(to.size - from.size),
        Math.abs(to.definition - from.definition),
      )
    }
    if (widestGap < 0.05) {
      for (const regionId of REGION_IDS) Object.assign(shown[regionId], target[regionId])
      easingScores = false
    }
    body.applyScores(shown)
    return true
  }

  function stepView(seconds: number): boolean {
    if (viewGoal === null) return false
    spherical.setFromVector3(offset.copy(camera.position).sub(focus))
    const amount = 1 - Math.exp(-seconds * VIEW_EASE)

    // Turn the short way round.
    const turn = Math.atan2(
      Math.sin(viewGoal.azimuth - spherical.theta),
      Math.cos(viewGoal.azimuth - spherical.theta),
    )
    const tilt = viewGoal.polar - spherical.phi
    const zoom = viewGoal.distance - spherical.radius
    const arrived = Math.abs(turn) < 0.003 && Math.abs(tilt) < 0.003 && Math.abs(zoom) < 0.005

    if (arrived) {
      placeCamera(viewGoal.azimuth, viewGoal.polar, viewGoal.distance)
      viewGoal = null
    } else {
      placeCamera(
        spherical.theta + turn * amount,
        spherical.phi + tilt * amount,
        spherical.radius + zoom * amount,
      )
    }
    return true
  }

  function resize(): void {
    const width = container.clientWidth
    const height = container.clientHeight
    if (width === 0 || height === 0) return
    renderer.setSize(width, height, false)
    camera.aspect = width / height
    camera.updateProjectionMatrix()
    dirty = true
  }

  resize()
  placeCamera(VIEW_AZIMUTH.front, HOME_POLAR, homeDistance())
  controls.update()

  const observer = new ResizeObserver(resize)
  observer.observe(container)

  let frame = 0
  let previous = performance.now()

  function draw(now: number): void {
    frame = requestAnimationFrame(draw)
    const seconds = Math.min((now - previous) / 1000, MAX_STEP)
    previous = now

    const scoresMoved = stepScores(seconds)
    const viewMoved = stepView(seconds)
    const cameraMoved = controls.update()
    if (!dirty && !scoresMoved && !viewMoved && !cameraMoved) return

    lightRig.rotation.y = Math.atan2(camera.position.x - focus.x, camera.position.z - focus.z)
    scene.environmentRotation.y = lightRig.rotation.y
    renderer.render(scene, camera)
    dirty = false
  }
  frame = requestAnimationFrame(draw)

  return {
    setScores(scores, setOptions = {}): void {
      for (const regionId of REGION_IDS) {
        target[regionId].size = scores[regionId].size
        target[regionId].definition = scores[regionId].definition
      }
      if (setOptions.immediate) {
        for (const regionId of REGION_IDS) Object.assign(shown[regionId], target[regionId])
        easingScores = false
        body.applyScores(shown)
        dirty = true
      } else {
        easingScores = true
      }
    },

    setSkinTone(colour): void {
      body.setSkinTone(colour)
      dirty = true
    },

    highlightRegion(regionId): void {
      body.highlightRegion(regionId)
      dirty = true
    },

    setView(view): void {
      viewGoal = { azimuth: VIEW_AZIMUTH[view], polar: HOME_POLAR, distance: homeDistance() }
    },

    dispose(): void {
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.removeEventListener('start', cancelViewGoal)
      controls.dispose()
      scene.remove(body.object)
      floorGeometry.dispose()
      floorMaterial.dispose()
      ringGeometry.dispose()
      ringMaterial.dispose()
      roomLight.dispose()
      key.shadow.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
      canvas.remove()
    },
  }
}
