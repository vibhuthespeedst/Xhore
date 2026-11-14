"""Where each muscle's bellies and lines sit on the body.

Everything here is plain arithmetic on arrays of points, with no Blender in
it. `height` answers "how far above the smooth skin does this point sit once
the muscle under it is fully defined?", in metres. The body builder asks it
twice: at the mesh's own points, to raise the big muscle bellies as real
shape, and at every texel of the skin, to bake the finer lines into a picture
that the page shades the skin with.

Torso features are drawn on the front and back views in metres, measured on
the reference body below and re-fitted to whatever skeleton is handed in. Limb
features are placed by how far along the bone they sit (0 at its head, 1 at
its tail) and by their angle round it (0 at the front, 90 on the outside, 180
at the back, -90 on the inside).

Blender's axes are used: z is up, the body faces -y, its left is +x. The body
is symmetric, so everything is written for its left side and mirrored.
"""

import numpy as np

# The big bellies become real shape. Everything else is baked into the picture.
SHAPE = "shape"
MAP = "map"

# The body the torso numbers were measured on.
REFERENCE_HIPS_Z = 0.965
REFERENCE_NECK_Z = 1.482
REFERENCE_SHOULDER_X = 0.186

# ---- the features -----------------------------------------------------------
#
# ("line", points, width, depth): a groove along the points, `depth` metres deep
# and fading out about two widths either side. A negative depth raises a ridge.
# A point may carry a third number, how strong the line is there (default 1).
#
# ("belly", centre, radii, height, SHAPE or MAP): a smooth dome. A negative
# height presses a hollow in instead.

TORSO_FRONT = [
    # Chest.
    ("line", [(0.0, 1.405, 0.5), (0.0, 1.33), (0.0, 1.25)], 0.008, 0.0035),  # between the pecs
    ("line", [(0.012, 1.246, 0.6), (0.045, 1.229), (0.085, 1.224), (0.125, 1.237),
              (0.158, 1.266, 0.9), (0.186, 1.308, 0.6)], 0.008, 0.004),  # under the pec
    ("belly", (0.095, 1.305), (0.1, 0.092), 0.0035, MAP),
    ("line", [(0.018, 1.383, 0.5), (0.08, 1.363), (0.155, 1.333, 0.6)], 0.008, 0.0015),  # upper from mid chest
    ("line", [(0.118, 1.418, 0.6), (0.15, 1.388), (0.176, 1.35), (0.193, 1.318, 0.7)], 0.008, 0.003),  # pec from shoulder
    ("line", [(0.022, 1.433, 0.7), (0.09, 1.428), (0.165, 1.432, 0.6)], 0.009, -0.002),  # collarbone
    # Abs.
    ("line", [(0.0, 1.243, 0.7), (0.0, 1.2), (0.0, 1.06), (0.0, 0.93, 0.5)], 0.007, 0.004),
    ("line", [(0.0, 1.190), (0.035, 1.193), (0.068, 1.189, 0.8)], 0.0055, 0.003),
    ("line", [(0.0, 1.135), (0.037, 1.139), (0.074, 1.134, 0.8)], 0.0055, 0.003),
    ("line", [(0.0, 1.076), (0.037, 1.080), (0.074, 1.076, 0.8)], 0.0055, 0.003),
    ("line", [(0.058, 1.238, 0.5), (0.071, 1.19), (0.078, 1.135), (0.077, 1.075),
              (0.07, 1.0, 0.8), (0.052, 0.93, 0.5)], 0.008, 0.003),  # outer edge of the abs
    ("belly", (0.036, 1.217), (0.034, 0.026), 0.003, MAP),
    ("belly", (0.038, 1.165), (0.036, 0.028), 0.003, MAP),
    ("belly", (0.039, 1.108), (0.037, 0.03), 0.003, MAP),
    ("belly", (0.037, 1.02), (0.036, 0.05), 0.003, MAP),
    # Ribs and obliques.
    ("line", [(0.160, 1.262), (0.128, 1.243, 0.4)], 0.009, -0.0028),
    ("line", [(0.162, 1.236), (0.127, 1.214, 0.4)], 0.009, -0.0028),
    ("line", [(0.160, 1.208), (0.125, 1.186, 0.4)], 0.009, -0.0028),
    ("line", [(0.156, 1.180), (0.123, 1.160, 0.4)], 0.009, -0.0028),
    ("belly", (0.128, 1.1), (0.04, 0.07), 0.003, MAP),
    ("line", [(0.158, 1.045, 0.7), (0.12, 1.0), (0.07, 0.93, 0.8)], 0.008, 0.003),
]

TORSO_BACK = [
    ("line", [(0.0, 1.46, 0.5), (0.0, 1.38, 0.8), (0.0, 1.2), (0.0, 1.05), (0.0, 0.99, 0.6)], 0.011, 0.0045),  # spine
    ("line", [(0.034, 1.0, 0.8), (0.036, 1.1), (0.036, 1.2, 0.8), (0.034, 1.27, 0.3)], 0.02, -0.0035),
    # Traps.
    ("line", [(0.005, 1.21, 0.6), (0.05, 1.275), (0.1, 1.345), (0.148, 1.392, 0.7)], 0.008, 0.0018),
    ("belly", (0.05, 1.385), (0.06, 0.075), 0.004, MAP),
    # Round the shoulder blade.
    ("line", [(0.075, 1.405, 0.5), (0.12, 1.398), (0.165, 1.39, 0.8)], 0.008, 0.002),
    ("belly", (0.115, 1.34), (0.045, 0.04), 0.0035, MAP),
    ("belly", (0.155, 1.295), (0.034, 0.026), 0.003, MAP),
    ("line", [(0.105, 1.3, 0.6), (0.14, 1.318), (0.172, 1.34, 0.6)], 0.007, 0.0015),
    # Lats.
    ("line", [(0.02, 1.238, 0.4), (0.07, 1.262, 0.8), (0.125, 1.285), (0.165, 1.297, 0.6)], 0.008, 0.0014),
    ("belly", (0.12, 1.2), (0.055, 0.085), 0.0045, MAP),
    ("line", [(0.172, 1.262, 0.5), (0.152, 1.19), (0.118, 1.12), (0.078, 1.066, 0.9),
              (0.042, 1.03, 0.5)], 0.009, 0.0025),
]

UPPER_ARM = [
    # Shoulder: its lower edge, the splits between its three heads, and the heads.
    ("line", [(-25, 0.0, 0.5), (0, 0.18), (42, 0.36), (84, 0.46)], 0.007, 0.003),
    ("line", [(205, 0.04, 0.5), (172, 0.22), (128, 0.38), (86, 0.46)], 0.007, 0.003),
    ("line", [(38, -0.16, 0.4), (47, 0.04), (64, 0.26), (80, 0.42, 0.6)], 0.006, 0.002),
    ("line", [(142, -0.14, 0.4), (133, 0.05), (110, 0.27), (90, 0.42, 0.6)], 0.006, 0.002),
    ("belly", (8, 0.1), (34, 0.22), 0.004, SHAPE),
    ("belly", (90, 0.08), (30, 0.26), 0.005, SHAPE),
    ("belly", (165, 0.1), (34, 0.22), 0.004, SHAPE),
    # Biceps.
    ("belly", (-12, 0.62), (52, 0.27), 0.007, SHAPE),
    ("line", [(64, 0.48, 0.6), (66, 0.65), (62, 0.85, 0.8), (58, 0.95, 0.3)], 0.007, 0.003),
    ("line", [(-82, 0.28, 0.5), (-84, 0.5), (-80, 0.75), (-74, 0.93, 0.4)], 0.007, 0.003),
    ("line", [(-10, 0.42, 0.3), (-12, 0.6), (-12, 0.78, 0.3)], 0.005, 0.0012),
    # Triceps: two heads above a flat tendon.
    ("belly", (132, 0.42), (30, 0.2), 0.005, SHAPE),
    ("belly", (-152, 0.4), (34, 0.24), 0.005, SHAPE),
    ("line", [(180, 0.2, 0.5), (180, 0.4), (178, 0.58, 0.8)], 0.006, 0.002),
    ("belly", (176, 0.78), (26, 0.16), -0.0025, MAP),
]

FOREARM = [
    ("belly", (60, 0.2), (40, 0.24), 0.004, SHAPE),
    ("belly", (-70, 0.22), (45, 0.26), 0.004, SHAPE),
    ("line", [(20, 0.08, 0.5), (15, 0.35), (8, 0.7, 0.4)], 0.006, 0.0018),
    ("line", [(105, 0.08, 0.5), (110, 0.4), (118, 0.75, 0.4)], 0.006, 0.0018),
    ("line", [(195, 0.1, 0.5), (190, 0.4), (185, 0.75, 0.4)], 0.006, 0.0018),
    ("line", [(-25, 0.12, 0.5), (-30, 0.4), (-32, 0.75, 0.4)], 0.006, 0.0018),
]

THIGH = [
    # Quads: the middle, the outer sweep and the teardrop above the knee.
    ("belly", (4, 0.45), (26, 0.36), 0.004, SHAPE),
    ("belly", (62, 0.52), (30, 0.32), 0.005, SHAPE),
    ("belly", (-50, 0.8), (30, 0.14), 0.006, SHAPE),
    ("line", [(30, 0.16, 0.4), (33, 0.5), (26, 0.8, 0.8), (20, 0.88, 0.3)], 0.008, 0.0028),
    ("line", [(-24, 0.3, 0.4), (-25, 0.6), (-14, 0.84, 0.6)], 0.008, 0.0028),
    ("belly", (4, 0.9), (22, 0.07), -0.002, MAP),
    ("line", [(100, 0.2, 0.4), (103, 0.5), (100, 0.88, 0.6)], 0.008, 0.0025),
    ("line", [(-82, 0.4, 0.4), (-84, 0.62), (-80, 0.85, 0.5)], 0.008, 0.0018),
    # Hamstrings: two bellies and the hollow behind the knee.
    ("belly", (150, 0.52), (27, 0.3), 0.004, SHAPE),
    ("belly", (-150, 0.52), (27, 0.3), 0.004, SHAPE),
    ("line", [(180, 0.3, 0.4), (180, 0.55), (180, 0.8, 0.8)], 0.008, 0.0025),
    ("belly", (180, 0.96), (26, 0.09), -0.003, MAP),
]

SHIN = [
    # Calf: two heads, the line between them and their lower edge.
    ("belly", (-150, 0.27), (34, 0.2), 0.006, SHAPE),
    ("belly", (150, 0.24), (30, 0.17), 0.005, SHAPE),
    ("line", [(180, 0.07, 0.4), (180, 0.25), (180, 0.43, 0.7)], 0.007, 0.0025),
    ("line", [(-104, 0.36, 0.4), (-150, 0.49), (180, 0.445), (150, 0.44), (106, 0.35, 0.4)], 0.007, 0.0025),
    ("line", [(-104, 0.42, 0.3), (-108, 0.58), (-112, 0.72, 0.3)], 0.007, 0.0015),
    ("line", [(106, 0.4, 0.3), (110, 0.56), (114, 0.7, 0.3)], 0.007, 0.0015),
    # Front of the shin.
    ("belly", (38, 0.3), (20, 0.26), 0.003, SHAPE),
    ("line", [(76, 0.14, 0.4), (78, 0.4), (80, 0.62, 0.4)], 0.007, 0.0018),
]

# Which skin each set of features may touch, as a gate name from `gates_from_masks`.
LIMBS = [("arm", UPPER_ARM), ("forearm", FOREARM), ("thigh", THIGH), ("shin", SHIN)]

# ---- arithmetic -------------------------------------------------------------


def smoothstep(low, high, value):
    amount = np.clip((value - low) / (high - low), 0.0, 1.0)
    return amount * amount * (3.0 - 2.0 * amount)


def _turn(degrees):
    """An angle difference brought into -180..180."""
    return (degrees + 180.0) % 360.0 - 180.0


def _features(features, across, along, across_scale, along_scale, part, round_limb):
    """Adds up the features of one view or limb at points given by (across, along).

    The two scales turn a step in each coordinate into metres, so widths and
    falloffs come out the same size however the coordinates are measured.
    """
    total = np.zeros(len(across))
    difference = _turn if round_limb else (lambda value: value)
    for feature in features:
        if feature[0] == "belly":
            _, centre, radii, height, belongs = feature
            if belongs != part:
                continue
            dx = difference(across - centre[0]) / radii[0]
            dy = (along - centre[1]) / radii[1]
            total += height * np.clip(1.0 - dx * dx - dy * dy, 0.0, 1.0) ** 2
            continue

        _, points, width, depth = feature
        if part != MAP:
            continue
        nearest = np.full(len(across), np.inf)
        strength = np.ones(len(across))
        for start, end in zip(points[:-1], points[1:]):
            start_strength = start[2] if len(start) > 2 else 1.0
            end_strength = end[2] if len(end) > 2 else 1.0
            x = difference(across - start[0]) * across_scale
            y = (along - start[1]) * along_scale
            edge_x = difference(end[0] - start[0]) * across_scale
            edge_y = (end[1] - start[1]) * along_scale
            reach = np.clip((x * edge_x + y * edge_y) / np.maximum(edge_x * edge_x + edge_y * edge_y, 1e-12), 0.0, 1.0)
            distance = np.hypot(x - reach * edge_x, y - reach * edge_y)
            closer = distance < nearest
            nearest = np.where(closer, distance, nearest)
            strength = np.where(closer, start_strength + reach * (end_strength - start_strength), strength)
        total -= depth * strength * np.exp(-((nearest / width) ** 2))
    return total


def gates_from_masks(masks):
    """Which stretch of the body each point's skin is on, from the 19 region masks."""
    arm = np.clip(masks["delt_front"] + masks["delt_side"] + masks["delt_rear"] + masks["biceps"] + masks["triceps"], 0, 1)
    forearm = np.clip(masks["forearms"], 0, 1)
    thigh = np.clip(masks["quads"] + masks["hamstrings"], 0, 1)
    shin = np.clip(masks["calves"], 0, 1)
    limbs = masks["biceps"] + masks["triceps"] + forearm + thigh + shin
    return {"arm": arm, "forearm": forearm, "thigh": thigh, "shin": shin, "torso": np.clip(1.0 - limbs, 0, 1)}


def height(points, normals, gates, landmarks, part):
    """Metres above the smooth skin at each point, for the big bellies (SHAPE) or the fine lines (MAP).

    `landmarks` holds the skeleton's left side: "hips_z", "neck_z" and
    "shoulder_x", and a (head, tail) pair of positions for each of "arm",
    "forearm", "thigh" and "shin".
    """
    points = np.asarray(points, dtype=np.float64)
    mirrored = points.copy()
    mirrored[:, 0] = np.abs(points[:, 0])
    total = np.zeros(len(points))

    # Torso: the front and back views, each fading out as the skin turns away from it.
    across = mirrored[:, 0] * (REFERENCE_SHOULDER_X / landmarks["shoulder_x"])
    span = (REFERENCE_NECK_Z - REFERENCE_HIPS_Z) / (landmarks["neck_z"] - landmarks["hips_z"])
    up = REFERENCE_HIPS_Z + (points[:, 2] - landmarks["hips_z"]) * span
    facing_front = -np.asarray(normals, dtype=np.float64)[:, 1]
    for features, facing in ((TORSO_FRONT, facing_front), (TORSO_BACK, -facing_front)):
        weight = gates["torso"] * smoothstep(-0.05, 0.4, facing)
        chosen = weight > 0.01
        if chosen.any():
            total[chosen] += weight[chosen] * _features(features, across[chosen], up[chosen], 1.0, 1.0, part, False)

    # Limbs: along the bone and round it.
    for name, features in LIMBS:
        chosen = gates[name] > 0.01
        if not chosen.any():
            continue
        head, tail = (np.asarray(end, dtype=np.float64) for end in landmarks[name])
        length = np.linalg.norm(tail - head)
        axis = (tail - head) / length
        front = np.array([0.0, -1.0, 0.0])
        front = front - axis * front.dot(axis)
        front /= np.linalg.norm(front)
        outside = np.cross(front, axis)

        offset = mirrored[chosen] - head
        along = offset @ axis
        radial = offset - along[:, None] * axis
        radius = np.linalg.norm(radial, axis=1)
        angle = np.degrees(np.arctan2(radial @ outside, radial @ front))
        total[chosen] += gates[name][chosen] * _features(
            features, angle, along / length, np.radians(1.0) * radius, length, part, True
        )
    return total


# ---- baking the lines into a picture ---------------------------------------


def rasterize(uv, size):
    """Which triangle covers each texel, and where in it the texel's centre falls.

    `uv` holds each triangle's three corners, 0 to 1. Returns the triangle's
    index per texel (-1 where the picture is empty) and the weights of its
    second and third corners. Row 0 is the bottom of the picture.
    """
    triangle = np.full((size, size), -1, dtype=np.int32)
    weights = np.zeros((size, size, 2), dtype=np.float32)
    corners = np.asarray(uv, dtype=np.float64) * size - 0.5
    lows = np.clip(np.floor(corners.min(axis=1)).astype(int), 0, size - 1)
    highs = np.clip(np.ceil(corners.max(axis=1)).astype(int), 0, size - 1)
    for index in range(len(corners)):
        (x0, y0), (x1, y1), (x2, y2) = corners[index]
        area = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0)
        if abs(area) < 1e-9:
            continue
        left, bottom = lows[index]
        right, top = highs[index]
        xs = np.arange(left, right + 1)[None, :]
        ys = np.arange(bottom, top + 1)[:, None]
        second = ((xs - x0) * (y2 - y0) - (x2 - x0) * (ys - y0)) / area
        third = ((x1 - x0) * (ys - y0) - (xs - x0) * (y1 - y0)) / area
        inside = (second >= -1e-6) & (third >= -1e-6) & (second + third <= 1.0 + 1e-6)
        if not inside.any():
            continue
        rows, columns = np.nonzero(inside)
        triangle[rows + bottom, columns + left] = index
        weights[rows + bottom, columns + left, 0] = second[inside]
        weights[rows + bottom, columns + left, 1] = third[inside]
    return triangle, weights


def _slope(heights, filled, axis):
    """How fast the height changes per texel along one axis, using only filled texels."""
    ahead = np.roll(heights, -1, axis=axis)
    behind = np.roll(heights, 1, axis=axis)
    has_ahead = np.roll(filled, -1, axis=axis) & filled
    has_behind = np.roll(filled, 1, axis=axis) & filled
    # The picture does not wrap round, so the last row and column have nothing beyond them.
    edge = [slice(None)] * 2
    edge[axis] = -1
    has_ahead[tuple(edge)] = False
    edge[axis] = 0
    has_behind[tuple(edge)] = False
    both = has_ahead & has_behind
    return np.where(
        both, (ahead - behind) / 2.0,
        np.where(has_ahead, ahead - heights, np.where(has_behind, heights - behind, 0.0)),
    )


def normal_map(positions, normals, gates, corner_points, uv, landmarks, size, spread=4):
    """Bakes the fine lines into a tangent-space normal map, as (size, size, 3) values from 0 to 1.

    `corner_points` holds the three point indices of every triangle and `uv`
    its three corners in the picture. Row 0 is the bottom of the picture, and
    green points up it, which is how Blender and glTF both read such a map.
    """
    triangle, weights = rasterize(uv, size)
    filled = triangle >= 0
    index = triangle[filled]
    second = weights[filled][:, 0].astype(np.float64)
    third = weights[filled][:, 1].astype(np.float64)
    first = 1.0 - second - third
    corners = corner_points[index]

    def at_texels(values):
        values = np.asarray(values, dtype=np.float64)
        if values.ndim == 1:
            return first * values[corners[:, 0]] + second * values[corners[:, 1]] + third * values[corners[:, 2]]
        return (
            first[:, None] * values[corners[:, 0]]
            + second[:, None] * values[corners[:, 1]]
            + third[:, None] * values[corners[:, 2]]
        )

    texel_gates = {name: at_texels(values) for name, values in gates.items()}
    heights = np.zeros((size, size))
    heights[filled] = height(at_texels(positions), at_texels(normals), texel_gates, landmarks, MAP)

    # How many metres one texel covers, per triangle, in the form the page's shader expects:
    # it tilts the normal by the height's slope times the steeper of the picture's two directions.
    texel = np.asarray(uv, dtype=np.float64) * size
    edge_1 = positions[corner_points[:, 1]] - positions[corner_points[:, 0]]
    edge_2 = positions[corner_points[:, 2]] - positions[corner_points[:, 0]]
    d1 = texel[:, 1] - texel[:, 0]
    d2 = texel[:, 2] - texel[:, 0]
    det = d1[:, 0] * d2[:, 1] - d2[:, 0] * d1[:, 1]
    det = np.where(np.abs(det) < 1e-12, 1e-12, det)
    along_u = (edge_1 * d2[:, 1:2] - edge_2 * d1[:, 1:2]) / det[:, None]
    along_v = (edge_2 * d1[:, 0:1] - edge_1 * d2[:, 0:1]) / det[:, None]
    patch = np.maximum(np.linalg.norm(np.cross(along_u, along_v), axis=1), 1e-12)
    steepness = np.maximum(np.linalg.norm(along_u, axis=1), np.linalg.norm(along_v, axis=1)) / patch

    per_metre = np.zeros((size, size))
    per_metre[filled] = steepness[index]
    tilt = np.zeros((size, size, 3))
    tilt[..., 0] = -_slope(heights, filled, 1) * per_metre
    tilt[..., 1] = -_slope(heights, filled, 0) * per_metre
    tilt[..., 2] = 1.0
    tilt /= np.linalg.norm(tilt, axis=2, keepdims=True)

    # Spread the edge texels outward a little, so the page never blends skin with empty picture.
    known = filled.copy()
    for _ in range(spread):
        total = np.zeros_like(tilt)
        count = np.zeros((size, size))
        for axis, shift in ((0, 1), (0, -1), (1, 1), (1, -1)):
            total += np.roll(np.where(known[..., None], tilt, 0.0), shift, axis=axis)
            count += np.roll(known, shift, axis=axis)
        grow = ~known & (count > 0)
        tilt[grow] = total[grow] / count[grow][:, None]
        known |= grow
    tilt[~known] = (0.0, 0.0, 1.0)
    tilt /= np.linalg.norm(tilt, axis=2, keepdims=True)
    return tilt * 0.5 + 0.5, filled
