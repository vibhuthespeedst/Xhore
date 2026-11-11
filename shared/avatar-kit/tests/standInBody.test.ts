import { describe, expect, it, vi } from 'vitest'
import { Box3, Color, Mesh, MeshStandardMaterial, Scene, Vector3 } from 'three'
import { REGION_IDS, createAvatar, regionRecord } from '@xhore/engine'
import type { RegionId } from '@xhore/engine'
import { loadAvatarBody } from '../src/index.js'
import type { AvatarBody, RegionScores } from '../src/index.js'
import { createStandInBody } from '../src/standInBody.js'

type BodyMesh = Mesh<Mesh['geometry'], MeshStandardMaterial>

function meshesOf(body: AvatarBody): BodyMesh[] {
  const meshes: BodyMesh[] = []
  body.object.traverse((child) => {
    if (child instanceof Mesh) meshes.push(child as BodyMesh)
  })
  return meshes
}

function regionOf(mesh: BodyMesh): RegionId | null {
  return mesh.userData.regionId as RegionId | null
}

function sideOf(mesh: BodyMesh): number {
  return mesh.userData.side as number
}

function musclesOf(body: AvatarBody, regionId?: RegionId): BodyMesh[] {
  return meshesOf(body).filter((mesh) =>
    regionId === undefined ? regionOf(mesh) !== null : regionOf(mesh) === regionId,
  )
}

/** Every region at the same size and definition, with optional exceptions. */
function scores(
  size: number,
  definition = 0,
  overrides: Partial<Record<RegionId, { size: number; definition: number }>> = {},
): RegionScores {
  return regionRecord((regionId) => overrides[regionId] ?? { size, definition })
}

/** Position and stretch of every mesh, for checking what a change did and did not touch. */
function snapshot(body: AvatarBody): string[] {
  return meshesOf(body).map((mesh) =>
    [...mesh.position.toArray(), ...mesh.scale.toArray()].map((value) => value.toFixed(6)).join(','),
  )
}

function volume(mesh: BodyMesh): number {
  return mesh.scale.x * mesh.scale.y * mesh.scale.z
}

describe('stand-in body', () => {
  it.each(REGION_IDS)('shows %s on both sides of the body', (regionId) => {
    const meshes = musclesOf(createStandInBody(), regionId)
    const left = meshes.filter((mesh) => sideOf(mesh) === 1)
    const right = meshes.filter((mesh) => sideOf(mesh) === -1)
    expect(left.length).toBeGreaterThan(0)
    expect(right).toHaveLength(left.length)
  })

  it('is a mirror image left to right', () => {
    const body = createStandInBody()
    body.applyScores(scores(40))
    body.object.updateMatrixWorld(true)

    const centres = (side: number): string[] =>
      meshesOf(body)
        .filter((mesh) => sideOf(mesh) === side)
        .map((mesh) => {
          const centre = mesh.getWorldPosition(new Vector3())
          // Flip the right side over, after which it should land exactly on the left.
          return [centre.x * side, centre.y, centre.z].map((value) => value.toFixed(5)).join(',')
        })
        .sort()

    const left = centres(1)
    const mirroredRight = centres(-1)
    // Single shapes on the midline, such as the head, count on the left only.
    for (const centre of mirroredRight) expect(left).toContain(centre)
  })

  it('stands on the ground and is as tall as it says', () => {
    const body = createStandInBody()
    body.applyScores(scores(50))
    body.object.updateMatrixWorld(true)
    const box = new Box3().setFromObject(body.object, true)

    expect(box.min.y).toBeGreaterThan(-0.01)
    expect(box.min.y).toBeLessThan(0.02)
    expect(box.max.y).toBeCloseTo(body.height, 1)
  })

  it('grows the trained region and nothing else', () => {
    const body = createStandInBody()
    body.applyScores(scores(10))
    const before = snapshot(body)

    body.applyScores(scores(10, 0, { calves: { size: 60, definition: 0 } }))
    const after = snapshot(body)

    meshesOf(body).forEach((mesh, index) => {
      if (regionOf(mesh) === 'calves') {
        expect(after[index]).not.toBe(before[index])
      } else {
        expect(after[index]).toBe(before[index])
      }
    })
  })

  it('hangs the arms further out as the lats grow under them', () => {
    const body = createStandInBody()
    const leftHandReach = (latSize: number): number => {
      body.applyScores(scores(10, 0, { lats: { size: latSize, definition: 0 } }))
      body.object.updateMatrixWorld(true)
      const leftForearm = musclesOf(body, 'forearms').find((mesh) => sideOf(mesh) === 1)
      if (!leftForearm) throw new Error('no left forearm shape')
      return leftForearm.getWorldPosition(new Vector3()).x
    }
    expect(leftHandReach(100)).toBeGreaterThan(leftHandReach(0))
  })

  it.each(REGION_IDS)('makes %s bigger as its size score rises', (regionId) => {
    const body = createStandInBody()
    const volumeAt = (size: number): number => {
      body.applyScores(scores(size))
      return musclesOf(body, regionId).reduce((total, mesh) => total + volume(mesh), 0)
    }
    const small = volumeAt(0)
    const medium = volumeAt(50)
    const large = volumeAt(100)
    expect(medium).toBeGreaterThan(small)
    expect(large).toBeGreaterThan(medium)
  })

  it('treats a score outside 0 to 100 as the nearest end', () => {
    const body = createStandInBody()
    body.applyScores(scores(100))
    const atHundred = snapshot(body)
    body.applyScores(scores(250))
    expect(snapshot(body)).toEqual(atHundred)

    body.applyScores(scores(0))
    const atZero = snapshot(body)
    body.applyScores(scores(-40))
    expect(snapshot(body)).toEqual(atZero)
  })

  it('shows definition on the surface without changing size', () => {
    const body = createStandInBody()
    body.applyScores(scores(50, 0))
    const soft = snapshot(body)
    const softRoughness = musclesOf(body, 'abs').map((mesh) => mesh.material.roughness)

    body.applyScores(scores(50, 100))
    expect(snapshot(body)).toEqual(soft)
    musclesOf(body, 'abs').forEach((mesh, index) => {
      expect(mesh.material.roughness).toBeLessThan(softRoughness[index] ?? 0)
    })
  })

  it('accepts the regions of an engine avatar as they are', () => {
    const body = createStandInBody()
    const avatar = createAvatar({ experience: 'advanced' })
    body.applyScores(avatar.regions)
    const fromAvatar = snapshot(body)

    body.applyScores(scores(50))
    expect(snapshot(body)).toEqual(fromAvatar)
  })

  it('lights up one region at a time and can clear it', () => {
    const body = createStandInBody()
    // Glow is the emissive colour times its strength, so black at any strength is unlit.
    const glow = (mesh: BodyMesh): number => {
      const { emissive, emissiveIntensity } = mesh.material
      return (emissive.r + emissive.g + emissive.b) * emissiveIntensity
    }
    const lit = (): BodyMesh[] => meshesOf(body).filter((mesh) => glow(mesh) > 0)

    body.highlightRegion('biceps')
    expect(lit().length).toBeGreaterThan(0)
    expect(lit().every((mesh) => regionOf(mesh) === 'biceps')).toBe(true)

    body.highlightRegion('quads')
    expect(lit().every((mesh) => regionOf(mesh) === 'quads')).toBe(true)

    body.highlightRegion(null)
    expect(lit()).toHaveLength(0)
  })

  it('recolours every shape when the skin tone changes', () => {
    const body = createStandInBody()
    body.applyScores(scores(50, 50))
    const before = meshesOf(body).map((mesh) => mesh.material.color.getHexString())

    body.setSkinTone('#5c3a21')
    const after = meshesOf(body).map((mesh) => mesh.material.color.getHexString())

    after.forEach((colour, index) => expect(colour).not.toBe(before[index]))
    // A defined muscle stays a shade deeper than the tone itself.
    const tone = new Color('#5c3a21')
    for (const mesh of musclesOf(body)) {
      expect(mesh.material.color.r).toBeLessThan(tone.r)
    }
  })

  it('removes itself from the scene when disposed', () => {
    const scene = new Scene()
    const body = createStandInBody()
    scene.add(body.object)
    body.dispose()
    expect(scene.children).toHaveLength(0)
  })

  it('stands still when asked to breathe, having no skeleton', () => {
    const body = createStandInBody()
    body.applyScores(scores(40))
    body.object.updateMatrixWorld(true)
    const before = meshesOf(body).map((mesh) => [...mesh.matrixWorld.elements])
    body.breathe(2.25)
    body.object.updateMatrixWorld(true)
    expect(meshesOf(body).map((mesh) => [...mesh.matrixWorld.elements])).toEqual(before)
  })
})

describe('loadAvatarBody', () => {
  it('hands back the stand-in, ready to show scores, when given no body file', async () => {
    const body = await loadAvatarBody()
    expect(body.kind).toBe('stand-in')
    expect(body.height).toBeGreaterThan(1.5)
    expect(() => body.applyScores(scores(30, 30))).not.toThrow()
    expect(musclesOf(body).length).toBeGreaterThan(REGION_IDS.length)
  })

  it('falls back to the stand-in when the body file cannot be loaded', async () => {
    const warned = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const body = await loadAvatarBody({ modelUrl: 'no-such-body.glb' })

    expect(body.kind).toBe('stand-in')
    expect(() => body.applyScores(scores(30, 30))).not.toThrow()
    expect(warned).toHaveBeenCalledOnce()
    warned.mockRestore()
  })
})
