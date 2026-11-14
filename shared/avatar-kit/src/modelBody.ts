import { Box3, BufferAttribute, Color, Mesh, MeshStandardMaterial, Quaternion, Vector3 } from 'three'
import type { ColorRepresentation, Object3D } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { REGION_IDS, regionRecord } from '@xhore/engine'
import type { RegionId } from '@xhore/engine'
import type { AvatarBody } from './body.js'
import { breathingPose } from './breathing.js'
import { definitionStrength, scoreToStrength } from './scores.js'
import type { RegionScores } from './scores.js'

/** The body file names each region's shapes and mask like this. The pipeline that builds the file uses the same rules. */
function sizeShapeName(regionId: RegionId): string {
  return `${regionId}_size`
}

function definitionShapeName(regionId: RegionId): string {
  return `${regionId}_definition`
}

function maskName(regionId: RegionId): string {
  return `_mask_${regionId}`
}

const SKIN_MATERIAL = 'skin'
const EYES_MATERIAL = 'eyes'
/**
 * Skin over a defined muscle goes from soft and matte to tight with a slight
 * sheen. Much glossier than this and the skin reflects the room like plastic.
 */
const SOFT_ROUGHNESS = 0.7
const CUT_ROUGHNESS = 0.52
/** How hard the muscle lines tilt the light at full definition. 1 is as the body file drew them. */
const LINE_STRENGTH = 1
/** How much darker the walls of a muscle line are drawn than the skin round them. */
const LINE_SHADE = 0.24
const DEFINITION_ATTRIBUTE = 'definition'
/** Eyes are wet, so they catch a sharp glint of light. */
const EYE_ROUGHNESS = 0.12
/** Hair, eyebrows and eyelashes are flat cards. Texels more see-through than this are not drawn. */
const CUT_OUT_THRESHOLD = 0.45
const HIGHLIGHT_COLOUR = '#ff6b35'
const HIGHLIGHT_STRENGTH = 0.9
const HIGHLIGHT_ATTRIBUTE = 'highlight'
/** A point glows fully once it moves this share of the region's furthest move. */
const HIGHLIGHT_FULL_AT = 0.5

interface Part {
  readonly mesh: Mesh
  /** Where each region's size shape sits in this mesh's list of shapes. */
  readonly shapeIndex: Readonly<Record<RegionId, number>>
  /** Where each region's definition shape sits in the same list. */
  readonly definitionIndex: Readonly<Record<RegionId, number>>
  /** One number per point for each region: how much of that point's skin is the region's, 0 to 1. */
  readonly masks: Readonly<Record<RegionId, Float32Array>>
  /** One number per point: how strongly it glows while a region is lit up. */
  readonly highlight: BufferAttribute
  /** One number per point: how strongly the muscle lines show there. */
  readonly definition: BufferAttribute
}

/** The skeleton's bones are named like "mixamorig:Spine2" in the file. three.js drops the colon when loading. */
const BONE_PREFIX = 'mixamorig'
/** The body's own directions: x runs towards its left side, z the way it faces. */
const BODY_X = new Vector3(1, 0, 0)
const BODY_Z = new Vector3(0, 0, 1)

interface RestingBone {
  readonly bone: Object3D
  /** The bone's turn relative to its parent, as the file stores it. */
  readonly rest: Quaternion
  /** The bone's turn relative to the whole body, as the file stores it. */
  readonly restInBody: Quaternion
}

/** Finds a bone and remembers how it rests. Null if the file has no such bone. */
function findBone(root: Object3D, name: string): RestingBone | null {
  const bone = root.getObjectByName(BONE_PREFIX + name)
  if (!bone) return null
  const intoBody = root.getWorldQuaternion(new Quaternion()).invert()
  return {
    bone,
    rest: bone.quaternion.clone(),
    restInBody: bone.getWorldQuaternion(new Quaternion()).premultiply(intoBody).normalize(),
  }
}

const bodyTurn = new Quaternion()
const ownTurn = new Quaternion()

/**
 * Turns a bone away from how it rests, by `forward` radians tipping it the way
 * the body faces and `anticlockwise` radians as seen from in front of the body.
 * Both are measured in the body's own directions, so every bone in the chain
 * can be posed the same way however the file has oriented it.
 */
function poseBone(resting: RestingBone | null, forward: number, anticlockwise: number): void {
  if (!resting) return
  bodyTurn.setFromAxisAngle(BODY_X, forward).multiply(ownTurn.setFromAxisAngle(BODY_Z, anticlockwise))
  // The same turn, expressed in the bone's own directions instead of the body's.
  ownTurn.copy(resting.restInBody).invert().multiply(bodyTurn).multiply(resting.restInBody)
  resting.bone.quaternion.copy(resting.rest).multiply(ownTurn)
}

/**
 * The body file's normal map holds every muscle's lines at full strength. This
 * shows them only as far as the mesh's `definition` value says at each spot:
 * the lines tilt the light, their walls are drawn a little darker, and the
 * skin there takes on a slight sheen.
 */
const MUSCLE_LINES = `
#ifdef USE_NORMALMAP_TANGENTSPACE
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	diffuseColor.rgb *= 1.0 - ${LINE_SHADE.toFixed(3)} * min( 1.0, length( mapN.xy ) * 2.0 ) * vDefinition;
	mapN.xy *= normalScale * vDefinition * ${LINE_STRENGTH.toFixed(3)};
	normal = normalize( tbn * mapN );
#endif
roughnessFactor *= mix( 1.0, ${(CUT_ROUGHNESS / SOFT_ROUGHNESS).toFixed(4)}, vDefinition );
`

/**
 * Teaches a standard material to glow wherever the mesh's `highlight` value is
 * above zero and, for skin, to show the muscle lines wherever its `definition`
 * value is. Everything else about the material is left alone.
 */
function teachShader(material: MeshStandardMaterial, withMuscleLines: boolean): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.highlightColour = {
      value: new Color(HIGHLIGHT_COLOUR).multiplyScalar(HIGHLIGHT_STRENGTH),
    }
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>\nattribute float ${HIGHLIGHT_ATTRIBUTE};\nvarying float vHighlight;\nattribute float ${DEFINITION_ATTRIBUTE};\nvarying float vDefinition;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\nvHighlight = ${HIGHLIGHT_ATTRIBUTE};\nvDefinition = ${DEFINITION_ATTRIBUTE};`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying float vHighlight;\nvarying float vDefinition;\nuniform vec3 highlightColour;',
      )
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\ntotalEmissiveRadiance += highlightColour * vHighlight;',
      )
    if (withMuscleLines) {
      shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', MUSCLE_LINES)
    }
  }
  // Keeps each altered program apart from the unaltered one in three.js's cache.
  material.customProgramCacheKey = () => (withMuscleLines ? 'avatar-muscle-lines' : 'avatar-highlight-glow')
}

/**
 * Sets up a material that came out of the body file for drawing in real time.
 * The file marks eyes, hair, eyebrows and eyelashes as see-through, which is
 * right for a slow offline render and wrong here: see-through surfaces are
 * drawn without depth, so hair would show through itself and the head.
 */
function prepareMaterial(material: MeshStandardMaterial): void {
  if (material.name === EYES_MATERIAL) {
    material.transparent = false
    material.alphaTest = 0
    material.depthWrite = true
    material.roughness = EYE_ROUGHNESS
  } else if (material.transparent || material.alphaTest > 0) {
    // Draw the card solid and cut away its empty parts instead. Coverage
    // blending softens the cut edge where the screen supports it.
    material.transparent = false
    material.alphaTest = CUT_OUT_THRESHOLD
    material.alphaToCoverage = true
    material.depthWrite = true
  }
}

function materialsOf(mesh: Mesh): MeshStandardMaterial[] {
  const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
  return materials.filter(
    (material): material is MeshStandardMaterial => material instanceof MeshStandardMaterial,
  )
}

/**
 * Wraps a loaded body file as a body. On every mesh that grows, the file must
 * hold two shapes per region, named "<region>_size" and "<region>_definition",
 * and a mask per region named "_mask_<region>". Anything else about it
 * (skeleton, materials, hair and eyes, how many meshes it is split into) is
 * free to change.
 */
export function createModelBody(root: Object3D): AvatarBody {
  const parts: Part[] = []
  const skinMaterials = new Set<MeshStandardMaterial>()
  const glowMaterials = new Set<MeshStandardMaterial>()
  const allMaterials = new Set<MeshStandardMaterial>()
  const meshes: Mesh[] = []

  root.traverse((child) => {
    if (!(child instanceof Mesh)) return
    meshes.push(child)
    // The body also shades itself, under the chest and the arms for example.
    child.castShadow = true
    child.receiveShadow = true
    // The shapes and the skeleton move points beyond the box three.js measures at rest.
    child.frustumCulled = false

    for (const material of materialsOf(child)) {
      if (!allMaterials.has(material)) prepareMaterial(material)
      allMaterials.add(material)
    }

    // Only the meshes that carry muscle shapes grow, glow and take a skin tone.
    // Eyes and hair are along for the ride.
    const names = child.morphTargetDictionary
    if (!names || !child.morphTargetInfluences) return

    const shapeNamed = (name: string): number => {
      const index = names[name]
      if (index === undefined) throw new Error(`The body file has no shape named "${name}"`)
      return index
    }
    const shapeIndex = regionRecord((regionId) => shapeNamed(sizeShapeName(regionId)))
    const definitionIndex = regionRecord((regionId) => shapeNamed(definitionShapeName(regionId)))

    const pointCount = child.geometry.getAttribute('position').count
    const masks = regionRecord((regionId) => {
      const stored = child.geometry.getAttribute(maskName(regionId))
      if (!stored) throw new Error(`The body file has no mask named "${maskName(regionId)}"`)
      const mask = new Float32Array(pointCount)
      for (let point = 0; point < pointCount; point += 1) mask[point] = stored.getX(point)
      return mask
    })

    const highlight = new BufferAttribute(new Float32Array(pointCount), 1)
    child.geometry.setAttribute(HIGHLIGHT_ATTRIBUTE, highlight)
    const definition = new BufferAttribute(new Float32Array(pointCount), 1)
    child.geometry.setAttribute(DEFINITION_ATTRIBUTE, definition)

    for (const material of materialsOf(child)) {
      const isSkin = material.name === SKIN_MATERIAL
      if (!glowMaterials.has(material)) {
        teachShader(material, isSkin)
        // The shader lowers this where a muscle is defined.
        if (isSkin) material.roughness = SOFT_ROUGHNESS
      }
      glowMaterials.add(material)
      if (isSkin) skinMaterials.add(material)
    }

    parts.push({ mesh: child, shapeIndex, definitionIndex, masks, highlight, definition })
  })

  if (parts.length === 0) throw new Error('The body file holds no mesh with muscle shapes')

  root.updateMatrixWorld(true)
  const height = new Box3().setFromObject(root).max.y

  // The bones that move while the body breathes. The hips, legs and feet are
  // left alone, so the feet never slide on the floor.
  const spine = [findBone(root, 'Spine1'), findBone(root, 'Spine2')]
  const neck = findBone(root, 'Neck')
  const leftShoulder = findBone(root, 'LeftShoulder')
  const rightShoulder = findBone(root, 'RightShoulder')
  const leftArm = findBone(root, 'LeftArm')
  const rightArm = findBone(root, 'RightArm')

  return {
    object: root,
    height,
    kind: 'model',

    applyScores(scores: RegionScores): void {
      for (const part of parts) {
        const influences = part.mesh.morphTargetInfluences
        const lines = part.definition.array
        lines.fill(0)
        for (const regionId of REGION_IDS) {
          const defined = definitionStrength(scores[regionId].size, scores[regionId].definition)
          if (influences) {
            influences[part.shapeIndex[regionId]] = scoreToStrength(scores[regionId].size)
            influences[part.definitionIndex[regionId]] = defined
          }
          if (defined === 0) continue
          // Each point shows the lines as far as the muscles that share its skin are defined.
          const mask = part.masks[regionId]
          for (let point = 0; point < lines.length; point += 1) {
            lines[point] = Math.min(1, (lines[point] ?? 0) + (mask[point] ?? 0) * defined)
          }
        }
        part.definition.needsUpdate = true
      }
    },

    setSkinTone(colour: ColorRepresentation): void {
      const tone = new Color(colour)
      for (const material of skinMaterials) {
        // The skin is a photograph with a colour of its own. The file records
        // that picture's average colour, so dividing by it gives the tint that
        // makes the skin come out, on average, the colour that was asked for.
        const average = material.userData.skin_average as readonly number[] | undefined
        if (average?.length === 3 && average.every((channel) => channel > 0)) {
          material.color.setRGB(
            tone.r / (average[0] ?? 1),
            tone.g / (average[1] ?? 1),
            tone.b / (average[2] ?? 1),
          )
        } else {
          material.color.copy(tone)
        }
      }
    },

    highlightRegion(regionId: RegionId | null): void {
      // A region's shape only moves the points that belong to it, so how far
      // each point moves marks out the region. The furthest move is measured
      // across the whole body: measured per mesh, rounding noise in a mesh the
      // region never touches would be scaled up into a false glow.
      let furthest = 0
      for (const part of parts) {
        const glow = part.highlight.array
        glow.fill(0)
        const shape =
          regionId === null
            ? undefined
            : part.mesh.geometry.morphAttributes.position?.[part.shapeIndex[regionId]]
        if (!shape) continue
        for (let point = 0; point < shape.count; point += 1) {
          const moved = Math.hypot(shape.getX(point), shape.getY(point), shape.getZ(point))
          glow[point] = moved
          furthest = Math.max(furthest, moved)
        }
      }

      for (const part of parts) {
        if (furthest > 0) {
          const glow = part.highlight.array
          for (let point = 0; point < glow.length; point += 1) {
            glow[point] = Math.min(1, (glow[point] ?? 0) / (furthest * HIGHLIGHT_FULL_AT))
          }
        }
        part.highlight.needsUpdate = true
      }
    },

    breathe(seconds: number): void {
      const { chestLift, shoulderLift, sway } = breathingPose(seconds)
      // The two spine bones share the lean back and the sway.
      for (const bone of spine) poseBone(bone, -chestLift / 2, sway / 2)
      // The neck undoes them, so the head stays level and the eyes look ahead.
      poseBone(neck, chestLift, -sway)
      // Raising the left shoulder turns it anticlockwise as seen from the front; the right one turns the other way.
      poseBone(leftShoulder, 0, shoulderLift)
      poseBone(rightShoulder, 0, -shoulderLift)
      // The arms undo the shoulders' turn, so they rise with them but still hang straight down.
      poseBone(leftArm, 0, -shoulderLift)
      poseBone(rightArm, 0, shoulderLift)
    },

    dispose(): void {
      root.removeFromParent()
      for (const mesh of meshes) mesh.geometry.dispose()
      for (const material of allMaterials) {
        material.map?.dispose()
        material.normalMap?.dispose()
        material.dispose()
      }
    },
  }
}

/** Fetches a body file and wraps it as a body. Rejects if the file is missing or not a usable body. */
export async function loadModelBody(url: string): Promise<AvatarBody> {
  const file = await new GLTFLoader().loadAsync(url)
  return createModelBody(file.scene)
}
