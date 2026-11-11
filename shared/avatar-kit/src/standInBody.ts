import { Color, Group, Mesh, MeshStandardMaterial, SphereGeometry } from 'three'
import type { ColorRepresentation } from 'three'
import type { RegionId } from '@xhore/engine'
import type { AvatarBody } from './body.js'
import { lerp, scoreToStrength } from './scores.js'
import type { RegionScores } from './scores.js'
import { PARTS, PART_ORDER, STAND_IN_HEIGHT, STAND_IN_SHAPES } from './standInLayout.js'
import type { PartId, ShapeSpec } from './standInLayout.js'

export const DEFAULT_SKIN_TONE = '#c68863'

/** Fixed parts sit a touch darker than the muscles, so the muscles read as separate shapes. */
const FRAME_SHADE = 0.9
/** Definition shows as a surface that goes from soft and matte to tight and glossy. */
const SOFT_ROUGHNESS = 0.78
const CUT_ROUGHNESS = 0.34
const CUT_SHADE = 0.86
const HIGHLIGHT_COLOUR = '#ff6b35'
const HIGHLIGHT_STRENGTH = 0.65

/** +1 is the body's left (towards +x), -1 its right. */
type Side = 1 | -1
const BOTH: readonly Side[] = [1, -1]
const ONE: readonly Side[] = [1]

interface Limb {
  readonly group: Group
  readonly part: PartId
  readonly side: Side
}

interface Piece {
  readonly mesh: Mesh<SphereGeometry, MeshStandardMaterial>
  readonly spec: ShapeSpec
  readonly side: Side
  /** Last shown definition strength, kept so the skin tone can change without new scores. */
  definition: number
}

function partKey(part: PartId, side: Side): string {
  return PARTS[part].sided ? `${part}:${side}` : part
}

/** Sets a limb's resting rotation, plus however far it leans at this strength. */
function pose(limb: Limb, lean: number): void {
  const spec = PARTS[limb.part]
  const extra = spec.leanWith?.tilt ?? [0, 0, 0]
  // Mirroring a rotation across the body's midline flips its y and z turns.
  limb.group.rotation.set(
    spec.tilt[0] + extra[0] * lean,
    (spec.tilt[1] + extra[1] * lean) * limb.side,
    (spec.tilt[2] + extra[2] * lean) * limb.side,
  )
}

function buildLimbs(root: Group): Map<string, Limb> {
  const limbs = new Map<string, Limb>()

  for (const part of PART_ORDER) {
    const spec = PARTS[part]
    for (const side of spec.sided ? BOTH : ONE) {
      const group = new Group()
      group.name = partKey(part, side)
      group.position.set(spec.origin[0] * side, spec.origin[1], spec.origin[2])

      const parent = spec.parent === null ? root : limbs.get(partKey(spec.parent, side))?.group
      if (!parent) throw new Error(`Stand-in part "${part}" is listed before its parent`)
      parent.add(group)

      const limb: Limb = { group, part, side }
      pose(limb, 0)
      limbs.set(group.name, limb)
    }
  }

  return limbs
}

/**
 * A body made of simple shapes, one or more per muscle region. Each shape
 * swells with its region's size and tightens with its definition.
 */
export function createStandInBody(): AvatarBody {
  const root = new Group()
  root.name = 'stand-in-body'

  // One unit ball, stretched per shape, so the whole body shares a single geometry.
  const ball = new SphereGeometry(1, 32, 20)
  const skin = new Color(DEFAULT_SKIN_TONE)
  const pieces: Piece[] = []
  let highlighted: RegionId | null = null

  const limbs = buildLimbs(root)

  for (const spec of STAND_IN_SHAPES) {
    const onBothSides = PARTS[spec.part].sided || spec.mirrored
    for (const side of onBothSides ? BOTH : ONE) {
      const limb = limbs.get(partKey(spec.part, side))
      if (!limb) throw new Error(`Stand-in shape uses unknown part "${spec.part}"`)

      const mesh = new Mesh(ball, new MeshStandardMaterial({ roughness: SOFT_ROUGHNESS, metalness: 0 }))
      mesh.castShadow = true
      mesh.rotation.set(spec.tilt[0], spec.tilt[1] * side, spec.tilt[2] * side)
      mesh.userData = { regionId: spec.region, side }
      limb.group.add(mesh)
      pieces.push({ mesh, spec, side, definition: 0 })
    }
  }

  function paint(piece: Piece): void {
    const material = piece.mesh.material
    if (piece.spec.region === null) {
      material.color.copy(skin).multiplyScalar(FRAME_SHADE)
      return
    }
    material.color.copy(skin).multiplyScalar(lerp(1, CUT_SHADE, piece.definition))
    material.roughness = lerp(SOFT_ROUGHNESS, CUT_ROUGHNESS, piece.definition)

    const lit = piece.spec.region === highlighted
    material.emissive.set(lit ? HIGHLIGHT_COLOUR : '#000000')
    material.emissiveIntensity = lit ? HIGHLIGHT_STRENGTH : 0
  }

  function show(piece: Piece, size: number, definition: number): void {
    const { mesh, spec, side } = piece
    mesh.scale.set(
      lerp(spec.small[0], spec.large[0], size),
      lerp(spec.small[1], spec.large[1], size),
      lerp(spec.small[2], spec.large[2], size),
    )
    mesh.position.set(
      (spec.centre[0] + spec.push[0] * size) * side,
      spec.centre[1] + spec.push[1] * size,
      spec.centre[2] + spec.push[2] * size,
    )
    piece.definition = definition
    paint(piece)
  }

  for (const piece of pieces) show(piece, 0, 0)

  return {
    object: root,
    height: STAND_IN_HEIGHT,
    kind: 'stand-in',

    applyScores(scores: RegionScores): void {
      for (const piece of pieces) {
        const region = piece.spec.region
        if (region === null) continue
        const score = scores[region]
        show(piece, scoreToStrength(score.size), scoreToStrength(score.definition))
      }
      for (const limb of limbs.values()) {
        const leanWith = PARTS[limb.part].leanWith
        if (leanWith) pose(limb, scoreToStrength(scores[leanWith.region].size))
      }
    },

    setSkinTone(colour: ColorRepresentation): void {
      skin.set(colour)
      for (const piece of pieces) paint(piece)
    },

    highlightRegion(regionId: RegionId | null): void {
      highlighted = regionId
      for (const piece of pieces) paint(piece)
    },

    breathe(): void {
      // The stand-in has no skeleton to move, so it stands still.
    },

    dispose(): void {
      root.removeFromParent()
      ball.dispose()
      for (const piece of pieces) piece.mesh.material.dispose()
    },
  }
}
