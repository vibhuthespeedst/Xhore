import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Box3, Mesh, MeshStandardMaterial, Scene } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { REGION_IDS, regionRecord } from '@xhore/engine'
import type { RegionId } from '@xhore/engine'
import type { AvatarBody, RegionScores } from '../src/index.js'
import { createModelBody } from '../src/modelBody.js'

/**
 * These run against the real body file, so they also catch the file and the
 * engine drifting apart, for example a region added to one and not the other.
 */
const file = readFileSync(new URL('../assets/body-male.glb', import.meta.url))

async function loadBody(): Promise<AvatarBody> {
  const bytes = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength) as ArrayBuffer
  const parsed = await new GLTFLoader().parseAsync(bytes, '')
  return createModelBody(parsed.scene)
}

function meshesOf(body: AvatarBody): Mesh[] {
  const meshes: Mesh[] = []
  body.object.traverse((child) => {
    if (child instanceof Mesh && child.morphTargetInfluences) meshes.push(child)
  })
  return meshes
}

function scores(
  size: number,
  definition = 0,
  overrides: Partial<Record<RegionId, { size: number; definition: number }>> = {},
): RegionScores {
  return regionRecord((regionId) => overrides[regionId] ?? { size, definition })
}

/** How strongly a mesh is showing one region's shape, 0 to 1. */
function shown(mesh: Mesh, regionId: RegionId): number {
  const index = mesh.morphTargetDictionary?.[`${regionId}_size`]
  if (index === undefined) throw new Error(`mesh has no shape for ${regionId}`)
  return mesh.morphTargetInfluences?.[index] ?? Number.NaN
}

function skinOf(body: AvatarBody): MeshStandardMaterial[] {
  return meshesOf(body)
    .map((mesh) => mesh.material)
    .filter((material): material is MeshStandardMaterial => material instanceof MeshStandardMaterial)
    .filter((material) => material.name === 'skin')
}

describe('the body file', () => {
  it('holds a shape for every region the growth engine knows', async () => {
    const body = await loadBody()
    expect(body.kind).toBe('model')
    for (const mesh of meshesOf(body)) {
      for (const regionId of REGION_IDS) {
        expect(mesh.morphTargetDictionary).toHaveProperty(`${regionId}_size`)
      }
    }
    expect(meshesOf(body).length).toBeGreaterThan(0)
  })

  it('stands on the ground and is the height of a person', async () => {
    const body = await loadBody()
    const box = new Box3().setFromObject(body.object)
    expect(body.height).toBeGreaterThan(1.5)
    expect(body.height).toBeLessThan(2)
    expect(Math.abs(box.min.y)).toBeLessThan(0.02)
  })

  it('shows each region at its own score', async () => {
    const body = await loadBody()
    body.applyScores(scores(10, 0, { calves: { size: 60, definition: 0 } }))

    for (const mesh of meshesOf(body)) {
      for (const regionId of REGION_IDS) {
        expect(shown(mesh, regionId)).toBeCloseTo(regionId === 'calves' ? 0.6 : 0.1, 5)
      }
    }
  })

  it('treats a score outside 0 to 100 as the nearest end', async () => {
    const body = await loadBody()
    body.applyScores(scores(250))
    for (const mesh of meshesOf(body)) expect(shown(mesh, 'biceps')).toBe(1)
    body.applyScores(scores(-40))
    for (const mesh of meshesOf(body)) expect(shown(mesh, 'biceps')).toBe(0)
  })

  it('shows definition as glossier skin without changing any shape', async () => {
    const body = await loadBody()
    body.applyScores(scores(50, 0))
    const softRoughness = skinOf(body).map((material) => material.roughness)

    body.applyScores(scores(50, 100))
    skinOf(body).forEach((material, index) => {
      expect(material.roughness).toBeLessThan(softRoughness[index] ?? 0)
    })
    for (const mesh of meshesOf(body)) expect(shown(mesh, 'abs')).toBeCloseTo(0.5, 5)
  })

  it('lights up only the highlighted region, and clears', async () => {
    const body = await loadBody()
    const kneeHeight = body.height * 0.32

    body.highlightRegion('calves')
    let litPoints = 0
    for (const mesh of meshesOf(body)) {
      const glow = mesh.geometry.getAttribute('highlight')
      const position = mesh.geometry.getAttribute('position')
      for (let point = 0; point < glow.count; point += 1) {
        if (glow.getX(point) > 0.3) {
          litPoints += 1
          // Calves sit below the knee, so nothing above it may be lit.
          expect(position.getY(point)).toBeLessThan(kneeHeight)
        }
      }
    }
    expect(litPoints).toBeGreaterThan(50)

    body.highlightRegion(null)
    for (const mesh of meshesOf(body)) {
      const glow = mesh.geometry.getAttribute('highlight')
      for (let point = 0; point < glow.count; point += 1) expect(glow.getX(point)).toBe(0)
    }
  })

  it('recolours the skin and leaves the trunks alone', async () => {
    const body = await loadBody()
    const trunks = meshesOf(body)
      .map((mesh) => mesh.material)
      .filter((material): material is MeshStandardMaterial => material instanceof MeshStandardMaterial)
      .filter((material) => material.name === 'shorts')
    const trunksBefore = trunks.map((material) => material.color.getHexString())
    const skinBefore = skinOf(body).map((material) => material.color.getHexString())

    body.setSkinTone('#5c3a21')

    expect(skinOf(body).length).toBeGreaterThan(0)
    skinOf(body).forEach((material, index) => {
      expect(material.color.getHexString()).toBe('5c3a21')
      expect(material.color.getHexString()).not.toBe(skinBefore[index])
    })
    expect(trunks.map((material) => material.color.getHexString())).toEqual(trunksBefore)
  })

  it('removes itself from the scene when disposed', async () => {
    const scene = new Scene()
    const body = await loadBody()
    scene.add(body.object)
    body.dispose()
    expect(scene.children).toHaveLength(0)
  })
})
