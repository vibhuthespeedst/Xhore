import { readFileSync } from 'node:fs'
import { describe, expect, it, vi } from 'vitest'
import { Box3, Color, MathUtils, Mesh, MeshStandardMaterial, Quaternion, Scene, ShaderLib, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { REGION_IDS, regionRecord } from '@xhore/engine'
import type { RegionId } from '@xhore/engine'
import type { AvatarBody, RegionScores } from '../src/index.js'
import { BREATH_SECONDS } from '../src/breathing.js'
import { createModelBody } from '../src/modelBody.js'

/**
 * These run against the real body file, so they also catch the file and the
 * engine drifting apart, for example a region added to one and not the other.
 */
const file = readFileSync(new URL('../assets/body-male.glb', import.meta.url))

// The file carries pictures for the skin, eyes and hair, and loading them
// leans on two things only a browser has. Node cannot decode pictures and
// these tests never look at one, so a decoder that hands back an empty picture
// is enough, along with the browser's name for the global object.
vi.stubGlobal('self', globalThis)
vi.stubGlobal('createImageBitmap', async () => ({ width: 1, height: 1, close: () => {} }))

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

/** How strongly a mesh is showing one region's definition shape, 0 to 1. */
function shownDefinition(mesh: Mesh, regionId: RegionId): number {
  const index = mesh.morphTargetDictionary?.[`${regionId}_definition`]
  if (index === undefined) throw new Error(`mesh has no definition shape for ${regionId}`)
  return mesh.morphTargetInfluences?.[index] ?? Number.NaN
}

function skinOf(body: AvatarBody): MeshStandardMaterial[] {
  return meshesOf(body)
    .map((mesh) => mesh.material)
    .filter((material): material is MeshStandardMaterial => material instanceof MeshStandardMaterial)
    .filter((material) => material.name === 'skin')
}

/** Every material in the body, by name: skin, trunks, eyes, hair and so on. */
function materialsByName(body: AvatarBody): Map<string, MeshStandardMaterial> {
  const found = new Map<string, MeshStandardMaterial>()
  body.object.traverse((child) => {
    if (child instanceof Mesh && child.material instanceof MeshStandardMaterial) {
      found.set(child.material.name, child.material)
    }
  })
  return found
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

  it('holds a definition shape and a mask for every region', async () => {
    const body = await loadBody()
    for (const mesh of meshesOf(body)) {
      for (const regionId of REGION_IDS) {
        expect(mesh.morphTargetDictionary).toHaveProperty(`${regionId}_definition`)
        expect(mesh.geometry.getAttribute(`_mask_${regionId}`)).toBeTruthy()
      }
    }
  })

  it('carries the muscle lines on the skin and nowhere else', async () => {
    const materials = materialsByName(await loadBody())
    expect(materials.get('skin')?.normalMap).toBeTruthy()
    expect(materials.get('shorts')?.normalMap).toBeNull()
  })

  it('has a photographic skin, eyes, eyebrows, eyelashes and hair', async () => {
    const materials = materialsByName(await loadBody())
    for (const name of ['skin', 'shorts', 'eyes', 'eyebrows', 'eyelashes', 'hair']) {
      expect([...materials.keys()]).toContain(name)
    }
    expect(materials.get('skin')?.map).toBeTruthy()
    expect(materials.get('shorts')?.map).toBeNull()
  })

  it('draws hair, eyebrows and eyelashes as solid cut-outs, and the eyes solid and glossy', async () => {
    const materials = materialsByName(await loadBody())
    for (const name of ['eyebrows', 'eyelashes', 'hair']) {
      const material = materials.get(name)
      // See-through surfaces are drawn without depth, so hair would show through the head.
      expect(material?.transparent).toBe(false)
      expect(material?.alphaTest).toBeGreaterThan(0)
      expect(material?.depthWrite).toBe(true)
    }
    const eyes = materials.get('eyes')
    expect(eyes?.transparent).toBe(false)
    expect(eyes?.alphaTest).toBe(0)
    expect(eyes?.roughness).toBeLessThan(0.3)
  })

  it('casts shadows and shades itself', async () => {
    const body = await loadBody()
    body.object.traverse((child) => {
      if (!(child instanceof Mesh)) return
      expect(child.castShadow).toBe(true)
      expect(child.receiveShadow).toBe(true)
    })
  })

  it('breathes by lifting its chest and shoulders, with its feet still and its head level', async () => {
    const body = await loadBody()
    const bone = (name: string) => {
      const found = body.object.getObjectByName(`mixamorig${name}`)
      if (!found) throw new Error(`the body file has no bone named ${name}`)
      return found
    }
    const where = (name: string) => bone(name).getWorldPosition(new Vector3())
    const facing = (name: string) => bone(name).getWorldQuaternion(new Quaternion())
    const leftFoot = where('LeftFoot')
    const rightFoot = where('RightFoot')
    const leftShoulder = where('LeftArm')
    const rightShoulder = where('RightArm')
    const neck = where('Neck')
    const head = facing('Head')

    // Lungs full, and swayed most of the way to one side.
    body.breathe(BREATH_SECONDS / 2)

    expect(where('LeftFoot').distanceTo(leftFoot)).toBeLessThan(1e-6)
    expect(where('RightFoot').distanceTo(rightFoot)).toBeLessThan(1e-6)
    for (const rise of [where('LeftArm').y - leftShoulder.y, where('RightArm').y - rightShoulder.y]) {
      expect(rise).toBeGreaterThan(0.002)
      expect(rise).toBeLessThan(0.03)
    }
    expect(where('Neck').distanceTo(neck)).toBeGreaterThan(0.002)
    expect(MathUtils.radToDeg(facing('Head').angleTo(head))).toBeLessThan(0.5)
  })

  it('is back in its resting stance at the start of every breath', async () => {
    const body = await loadBody()
    const resting = new Map<string, Quaternion>()
    body.object.traverse((child) => resting.set(child.uuid, child.quaternion.clone()))

    body.breathe(1.3)
    body.breathe(0)
    body.object.traverse((child) => {
      const rest = resting.get(child.uuid)?.toArray() ?? []
      child.quaternion.toArray().forEach((part, index) => expect(part).toBeCloseTo(rest[index] ?? Number.NaN, 6))
    })
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

  it('shows a region’s definition on that region only, and more of it on a bigger muscle', async () => {
    const body = await loadBody()
    body.applyScores(scores(50, 0, { biceps: { size: 50, definition: 100 } }))
    for (const mesh of meshesOf(body)) {
      expect(shownDefinition(mesh, 'biceps')).toBeCloseTo(0.75, 5)
      expect(shownDefinition(mesh, 'abs')).toBe(0)
      // Definition never changes how big a muscle is shown.
      expect(shown(mesh, 'biceps')).toBeCloseTo(0.5, 5)
    }

    body.applyScores(scores(100, 100))
    for (const mesh of meshesOf(body)) expect(shownDefinition(mesh, 'biceps')).toBe(1)
  })

  it('draws the muscle lines over the defined muscle and nowhere else', async () => {
    const body = await loadBody()
    const kneeHeight = body.height * 0.32

    body.applyScores(scores(100, 0, { calves: { size: 100, definition: 100 } }))
    let linedPoints = 0
    for (const mesh of meshesOf(body)) {
      const lines = mesh.geometry.getAttribute('definition')
      const position = mesh.geometry.getAttribute('position')
      for (let point = 0; point < lines.count; point += 1) {
        expect(lines.getX(point)).toBeLessThanOrEqual(1)
        if (lines.getX(point) > 0.3) {
          linedPoints += 1
          expect(position.getY(point)).toBeLessThan(kneeHeight)
        }
      }
    }
    expect(linedPoints).toBeGreaterThan(50)

    body.applyScores(scores(100, 0))
    for (const mesh of meshesOf(body)) {
      const lines = mesh.geometry.getAttribute('definition')
      for (let point = 0; point < lines.count; point += 1) expect(lines.getX(point)).toBe(0)
    }
  })

  it('teaches the skin’s shader to fade the lines in, and leaves the skin’s own roughness alone', async () => {
    const body = await loadBody()
    const roughness = skinOf(body).map((material) => material.roughness)
    body.applyScores(scores(50, 100))
    expect(skinOf(body).map((material) => material.roughness)).toEqual(roughness)

    expect(skinOf(body).length).toBeGreaterThan(0)
    for (const material of skinOf(body)) {
      const shader = {
        uniforms: {},
        vertexShader: ShaderLib.standard.vertexShader,
        fragmentShader: ShaderLib.standard.fragmentShader,
      }
      material.onBeforeCompile(shader as never, null as never)
      expect(shader.vertexShader).toContain('vDefinition = definition;')
      expect(shader.fragmentShader).toContain('normalScale * vDefinition')
      expect(shader.fragmentShader).not.toContain('#include <normal_fragment_maps>')
    }
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

  it('tints the skin so that it averages the tone asked for, and leaves everything else alone', async () => {
    const body = await loadBody()
    const others = [...materialsByName(body).values()].filter((material) => material.name !== 'skin')
    const othersBefore = others.map((material) => material.color.getHexString())
    const skinBefore = skinOf(body).map((material) => material.color.getHexString())

    body.setSkinTone('#5c3a21')

    const tone = new Color('#5c3a21')
    expect(skinOf(body).length).toBeGreaterThan(0)
    skinOf(body).forEach((material, index) => {
      // The skin is a picture with its own colour. Tint times the picture's
      // average colour should come out as the tone that was asked for.
      const average = material.userData.skin_average as number[]
      expect(average).toHaveLength(3)
      expect(material.color.r * (average[0] ?? 0)).toBeCloseTo(tone.r, 5)
      expect(material.color.g * (average[1] ?? 0)).toBeCloseTo(tone.g, 5)
      expect(material.color.b * (average[2] ?? 0)).toBeCloseTo(tone.b, 5)
      expect(material.color.getHexString()).not.toBe(skinBefore[index])
    })
    expect(others.map((material) => material.color.getHexString())).toEqual(othersBefore)
  })

  it('removes itself from the scene when disposed', async () => {
    const scene = new Scene()
    const body = await loadBody()
    scene.add(body.object)
    body.dispose()
    expect(scene.children).toHaveLength(0)
  })
})
