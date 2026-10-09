import { Box3, BufferAttribute, Color, Mesh, MeshStandardMaterial } from 'three'
import type { ColorRepresentation, Object3D } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { REGION_IDS, regionRecord } from '@xhore/engine'
import type { RegionId } from '@xhore/engine'
import type { AvatarBody } from './body.js'
import { lerp, scoreToStrength } from './scores.js'
import type { RegionScores } from './scores.js'

/** The body file names each region's shape like this. The pipeline that builds the file uses the same rule. */
function sizeShapeName(regionId: RegionId): string {
  return `${regionId}_size`
}

const SKIN_MATERIAL = 'skin'
/** Definition shows as skin that goes from soft and matte to tight and glossy. */
const SOFT_ROUGHNESS = 0.72
const CUT_ROUGHNESS = 0.4
const HIGHLIGHT_COLOUR = '#ff6b35'
const HIGHLIGHT_STRENGTH = 0.9
const HIGHLIGHT_ATTRIBUTE = 'highlight'
/** A point glows fully once it moves this share of the region's furthest move. */
const HIGHLIGHT_FULL_AT = 0.5

interface Part {
  readonly mesh: Mesh
  /** Where each region's size shape sits in this mesh's list of shapes. */
  readonly shapeIndex: Readonly<Record<RegionId, number>>
  /** One number per point: how strongly it glows while a region is lit up. */
  readonly highlight: BufferAttribute
}

/**
 * Teaches a standard material to glow wherever the mesh's `highlight` value is
 * above zero, leaving everything else about the material alone.
 */
function addHighlightGlow(material: MeshStandardMaterial): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.highlightColour = {
      value: new Color(HIGHLIGHT_COLOUR).multiplyScalar(HIGHLIGHT_STRENGTH),
    }
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>\nattribute float ${HIGHLIGHT_ATTRIBUTE};\nvarying float vHighlight;`,
      )
      .replace('#include <begin_vertex>', `#include <begin_vertex>\nvHighlight = ${HIGHLIGHT_ATTRIBUTE};`)
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying float vHighlight;\nuniform vec3 highlightColour;',
      )
      .replace(
        '#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\ntotalEmissiveRadiance += highlightColour * vHighlight;',
      )
  }
  // Keeps this altered program apart from the unaltered one in three.js's cache.
  material.customProgramCacheKey = () => 'avatar-highlight-glow'
}

/**
 * Wraps a loaded body file as a body. The file must hold one shape per region,
 * named "<region>_size"; anything else about it (skeleton, materials, how many
 * meshes it is split into) is free to change.
 */
export function createModelBody(root: Object3D): AvatarBody {
  const parts: Part[] = []
  const skinMaterials = new Set<MeshStandardMaterial>()
  const allMaterials = new Set<MeshStandardMaterial>()

  root.traverse((child) => {
    if (!(child instanceof Mesh)) return
    const names = child.morphTargetDictionary
    if (!names || !child.morphTargetInfluences) return

    const shapeIndex = regionRecord((regionId) => {
      const index = names[sizeShapeName(regionId)]
      if (index === undefined) {
        throw new Error(`The body file has no shape named "${sizeShapeName(regionId)}"`)
      }
      return index
    })

    const pointCount = child.geometry.getAttribute('position').count
    const highlight = new BufferAttribute(new Float32Array(pointCount), 1)
    child.geometry.setAttribute(HIGHLIGHT_ATTRIBUTE, highlight)

    for (const material of Array.isArray(child.material) ? child.material : [child.material]) {
      if (!(material instanceof MeshStandardMaterial)) continue
      if (!allMaterials.has(material)) addHighlightGlow(material)
      allMaterials.add(material)
      if (material.name === SKIN_MATERIAL) skinMaterials.add(material)
    }

    child.castShadow = true
    // The shapes and the skeleton move points beyond the box three.js measures at rest.
    child.frustumCulled = false
    parts.push({ mesh: child, shapeIndex, highlight })
  })

  if (parts.length === 0) throw new Error('The body file holds no mesh with muscle shapes')

  root.updateMatrixWorld(true)
  const height = new Box3().setFromObject(root).max.y

  return {
    object: root,
    height,
    kind: 'model',

    applyScores(scores: RegionScores): void {
      let definitionTotal = 0
      for (const regionId of REGION_IDS) {
        const size = scoreToStrength(scores[regionId].size)
        definitionTotal += scoreToStrength(scores[regionId].definition)
        for (const part of parts) {
          const influences = part.mesh.morphTargetInfluences
          if (influences) influences[part.shapeIndex[regionId]] = size
        }
      }
      // Until the body has a detailed skin, definition is shown for the body as
      // a whole rather than muscle by muscle.
      const definition = definitionTotal / REGION_IDS.length
      for (const material of skinMaterials) {
        material.roughness = lerp(SOFT_ROUGHNESS, CUT_ROUGHNESS, definition)
      }
    },

    setSkinTone(colour: ColorRepresentation): void {
      for (const material of skinMaterials) material.color.set(colour)
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

    dispose(): void {
      root.removeFromParent()
      for (const part of parts) part.mesh.geometry.dispose()
      for (const material of allMaterials) material.dispose()
    },
  }
}

/** Fetches a body file and wraps it as a body. Rejects if the file is missing or not a usable body. */
export async function loadModelBody(url: string): Promise<AvatarBody> {
  const file = await new GLTFLoader().loadAsync(url)
  return createModelBody(file.scene)
}
