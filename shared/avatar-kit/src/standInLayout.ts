import type { RegionId } from '@xhore/engine'

/**
 * The stand-in body as plain data: a list of stretched balls, one or more per
 * muscle region, plus fixed ones for the head, hands, feet, joints and frame.
 * It exists so the whole loop can be seen before the real body file does.
 *
 * Everything is in metres, y is up and the body faces +z. Shapes are described
 * for the body's left side (+x) and mirrored for the right.
 *
 * The frame is sized like a slim untrained adult, so a score of 0 looks like an
 * ordinary person. Each muscle shape sits about a centimetre proud of the frame
 * at 0 and several centimetres proud at 100.
 */
export type Vec3 = readonly [x: number, y: number, z: number]

/** The moving parts the body is assembled from. */
export type PartId = 'torso' | 'arm' | 'forearm' | 'leg' | 'shin'

export interface PartSpec {
  /** The part this one hangs from, or null for the root. */
  readonly parent: PartId | null
  /** Where the part's joint sits in its parent's space. */
  readonly origin: Vec3
  /** Resting rotation in radians. */
  readonly tilt: Vec3
  /** True for a part that exists once on each side of the body. */
  readonly sided: boolean
  /** Extra rotation added as one region grows, reaching `tilt` at a score of 100. */
  readonly leanWith?: { readonly region: RegionId; readonly tilt: Vec3 }
}

export interface ShapeSpec {
  /** The muscle region this shape shows, or null for a fixed part such as the head. */
  readonly region: RegionId | null
  readonly part: PartId
  /** Centre in the part's own space, at a size score of 0. */
  readonly centre: Vec3
  /** Half-widths at a size score of 0. Fixed parts only ever use these. */
  readonly small: Vec3
  /** Half-widths at a size score of 100. */
  readonly large: Vec3
  /** How far the centre moves by a score of 100, so a muscle bulges outward as it grows. */
  readonly push: Vec3
  readonly tilt: Vec3
  /** For torso shapes: build one on each side. Shapes on arms and legs always are. */
  readonly mirrored: boolean
}

/** Top of the head, in metres. */
export const STAND_IN_HEIGHT = 1.79

/** Listed parents first, which is the order they have to be built in. */
export const PART_ORDER: readonly PartId[] = ['torso', 'arm', 'forearm', 'leg', 'shin']

export const PARTS: Readonly<Record<PartId, PartSpec>> = {
  torso: { parent: null, origin: [0, 0, 0], tilt: [0, 0, 0], sided: false },
  // Arms hang a little away from the body, and wider as the lats grow under
  // them, the way a broad back pushes real arms out.
  arm: {
    parent: 'torso',
    origin: [0.19, 1.445, 0],
    tilt: [0, 0, 0.12],
    sided: true,
    leanWith: { region: 'lats', tilt: [0, 0, 0.17] },
  },
  // A slight bend at the elbow reads as relaxed rather than stiff.
  forearm: { parent: 'arm', origin: [0, -0.3, 0], tilt: [-0.14, 0, 0], sided: true },
  leg: { parent: 'torso', origin: [0.09, 0.95, 0], tilt: [0, 0, 0.03], sided: true },
  shin: { parent: 'leg', origin: [0, -0.445, 0], tilt: [0, 0, 0], sided: true },
}

const NONE: Vec3 = [0, 0, 0]

interface ShapeOptions {
  readonly tilt?: Vec3
  readonly push?: Vec3
  readonly mirrored?: boolean
}

function fixed(part: PartId, centre: Vec3, radii: Vec3, options: ShapeOptions = {}): ShapeSpec {
  return {
    region: null,
    part,
    centre,
    small: radii,
    large: radii,
    push: NONE,
    tilt: options.tilt ?? NONE,
    mirrored: options.mirrored ?? false,
  }
}

function muscle(
  region: RegionId,
  part: PartId,
  centre: Vec3,
  small: Vec3,
  large: Vec3,
  options: ShapeOptions = {},
): ShapeSpec {
  return {
    region,
    part,
    centre,
    small,
    large,
    push: options.push ?? NONE,
    tilt: options.tilt ?? NONE,
    mirrored: options.mirrored ?? false,
  }
}

const BOTH_SIDES = { mirrored: true } as const

export const STAND_IN_SHAPES: readonly ShapeSpec[] = [
  // Torso frame: pelvis, waist, ribcage, shoulder line, neck, head.
  fixed('torso', [0, 0.975, 0], [0.158, 0.105, 0.108]),
  fixed('torso', [0, 1.12, 0.002], [0.138, 0.14, 0.098]),
  fixed('torso', [0, 1.32, -0.004], [0.158, 0.185, 0.112]),
  fixed('torso', [0, 1.44, -0.008], [0.185, 0.045, 0.07]),
  fixed('torso', [0, 1.535, -0.006], [0.055, 0.08, 0.057]),
  fixed('torso', [0, 1.675, 0.004], [0.079, 0.115, 0.098]),

  // Front of the torso.
  muscle('chest_upper', 'torso', [0.07, 1.405, 0.072], [0.068, 0.034, 0.022], [0.086, 0.046, 0.052], {
    ...BOTH_SIDES,
    tilt: [0, 0, 0.2],
    push: [0, 0, 0.01],
  }),
  muscle('chest_mid', 'torso', [0.075, 1.35, 0.082], [0.072, 0.038, 0.024], [0.092, 0.052, 0.06], {
    ...BOTH_SIDES,
    push: [0, 0, 0.012],
  }),
  muscle('chest_lower', 'torso', [0.072, 1.298, 0.084], [0.066, 0.03, 0.02], [0.086, 0.042, 0.05], {
    ...BOTH_SIDES,
    push: [0, 0, 0.008],
  }),
  // Abs are three rows of two, which is what makes a six-pack readable.
  muscle('abs', 'torso', [0.036, 1.21, 0.08], [0.031, 0.03, 0.012], [0.036, 0.033, 0.032], BOTH_SIDES),
  muscle('abs', 'torso', [0.036, 1.148, 0.092], [0.031, 0.03, 0.012], [0.036, 0.033, 0.032], BOTH_SIDES),
  muscle('abs', 'torso', [0.036, 1.086, 0.09], [0.031, 0.03, 0.012], [0.036, 0.033, 0.032], BOTH_SIDES),
  muscle('obliques', 'torso', [0.118, 1.125, 0.015], [0.028, 0.1, 0.065], [0.05, 0.115, 0.09], {
    ...BOTH_SIDES,
    push: [0.006, 0, 0],
  }),

  // Back of the torso.
  muscle('traps', 'torso', [0.068, 1.49, -0.03], [0.07, 0.03, 0.045], [0.094, 0.062, 0.066], {
    ...BOTH_SIDES,
    tilt: [0, 0, -0.42],
  }),
  // Lats widen outward as they grow, which gives the back its V shape.
  muscle('lats', 'torso', [0.125, 1.275, -0.045], [0.034, 0.13, 0.05], [0.082, 0.165, 0.08], {
    ...BOTH_SIDES,
    tilt: [0, 0, -0.18],
    push: [0.012, 0, 0],
  }),
  muscle('mid_back', 'torso', [0.05, 1.36, -0.094], [0.05, 0.09, 0.022], [0.066, 0.1, 0.05], {
    ...BOTH_SIDES,
    push: [0, 0, -0.008],
  }),
  muscle('lower_back', 'torso', [0.04, 1.105, -0.082], [0.03, 0.095, 0.018], [0.042, 0.105, 0.044], {
    ...BOTH_SIDES,
    push: [0, 0, -0.006],
  }),
  muscle('glutes', 'torso', [0.078, 0.95, -0.058], [0.072, 0.082, 0.052], [0.1, 0.108, 0.1], {
    ...BOTH_SIDES,
    push: [0, 0, -0.014],
  }),

  // Upper arm: the bone and elbow, three shoulder heads, then front and back of the arm.
  fixed('arm', [0, -0.145, 0], [0.043, 0.175, 0.045]),
  fixed('arm', [0, -0.3, -0.004], [0.037, 0.042, 0.04]),
  muscle('delt_side', 'arm', [0.02, -0.015, 0], [0.038, 0.058, 0.05], [0.074, 0.088, 0.08], {
    push: [0.006, 0, 0],
  }),
  muscle('delt_front', 'arm', [0, -0.03, 0.036], [0.036, 0.05, 0.03], [0.058, 0.076, 0.058], {
    push: [0, 0, 0.006],
  }),
  muscle('delt_rear', 'arm', [0, -0.03, -0.036], [0.036, 0.05, 0.03], [0.058, 0.076, 0.058], {
    push: [0, 0, -0.006],
  }),
  muscle('biceps', 'arm', [0, -0.165, 0.024], [0.032, 0.095, 0.028], [0.052, 0.11, 0.058], {
    push: [0, 0, 0.014],
  }),
  muscle('triceps', 'arm', [0.003, -0.15, -0.024], [0.034, 0.11, 0.028], [0.056, 0.124, 0.058], {
    push: [0, 0, -0.014],
  }),

  // Forearm, wrist and hand.
  fixed('forearm', [0, -0.115, 0], [0.035, 0.145, 0.034]),
  fixed('forearm', [0, -0.225, 0], [0.025, 0.06, 0.021]),
  muscle('forearms', 'forearm', [0, -0.09, 0.002], [0.039, 0.1, 0.037], [0.058, 0.118, 0.052]),
  fixed('forearm', [0.002, -0.315, 0.006], [0.022, 0.058, 0.04]),

  // Thigh and knee, then front and back of the thigh.
  fixed('leg', [0, -0.18, 0], [0.082, 0.265, 0.086]),
  fixed('leg', [0, -0.445, 0.006], [0.052, 0.058, 0.056]),
  muscle('quads', 'leg', [0.004, -0.2, 0.046], [0.058, 0.19, 0.046], [0.09, 0.21, 0.088], {
    push: [0, 0, 0.012],
  }),
  muscle('hamstrings', 'leg', [0, -0.22, -0.044], [0.055, 0.175, 0.046], [0.082, 0.195, 0.08], {
    push: [0, 0, -0.01],
  }),

  // Lower leg, ankle and foot.
  fixed('shin', [0, -0.16, -0.002], [0.05, 0.185, 0.052]),
  fixed('shin', [0, -0.33, 0], [0.035, 0.1, 0.038]),
  muscle('calves', 'shin', [0, -0.13, -0.034], [0.04, 0.115, 0.03], [0.066, 0.135, 0.066], {
    push: [0, 0, -0.01],
  }),
  fixed('shin', [0, -0.467, 0.05], [0.044, 0.038, 0.108]),
]
