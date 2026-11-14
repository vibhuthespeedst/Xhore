"""Builds the avatar's 3D body file with Blender and the MPFB add-on.

Run it through the wrapper, which finds Blender for you:

    npm run build:body

What it makes:
  * a .glb file holding one body with a photographic skin, eyes, eyebrows,
    eyelashes and hair, a standard (Mixamo-named) skeleton, and for each
    muscle region a shape named "<region>_size", a shape named
    "<region>_definition" and a mask named "_mask_<region>" saying which skin
    is that muscle's;
  * a picture of the fine muscle lines, carried by the skin as its normal map;
  * contact sheets of every region, and finished-look pictures, so the result
    can be checked by eye.

The skin, eyes and hair come from MPFB's free "makehuman_system_assets" pack,
which has to be unpacked into MPFB's data folder first.

How the shapes are made: MPFB can build the same body slim and heavily
muscled. The difference between those two is split into the 19 regions with
soft masks, so each shape grows one muscle and all of them together give the
muscled body back.

How definition is made: the big muscle bellies and the fine lines between
muscles are placed by muscle_lines.py. The bellies are raised as shape, the
waist is drawn in the way MPFB's leaner body is, and the lines are baked into
the normal map. The page fades all three in muscle by muscle.

Blender's axes are used throughout: z is up, the body faces -y, its left is +x.
"""

import argparse
import math
import os
import sys

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

from bl_ext.blender_org.mpfb.entities.objectproperties import HumanObjectProperties
from bl_ext.blender_org.mpfb.services.assetservice import AssetService
from bl_ext.blender_org.mpfb.services.humanservice import HumanService
from bl_ext.blender_org.mpfb.services.targetservice import TargetService

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import muscle_lines  # noqa: E402

# The region ids, in the growth engine's order. Keep in step with engine/src/regions.ts.
REGIONS = [
    "biceps", "triceps", "forearms",
    "delt_front", "delt_side", "delt_rear",
    "chest_upper", "chest_mid", "chest_lower",
    "lats", "traps", "mid_back", "lower_back",
    "abs", "obliques",
    "quads", "hamstrings", "glutes", "calves",
]

# ---- tuning ---------------------------------------------------------------

# MPFB's own sliders, each 0 to 1. The body at a score of 0 is slim and untrained.
BASE_MACRO = {"gender": 1.0, "muscle": 0.3, "weight": 0.45}
# MPFB's most muscular body. A score of 100 goes GROWTH_GAIN times as far as this.
FULL_MACRO = {"gender": 1.0, "muscle": 1.0, "weight": 0.5}

# MPFB's per-body-part muscle shapes, added on top of the muscled body.
DETAIL_TARGETS = {
    "upperarm": ["l-upperarm-muscle-incr", "r-upperarm-muscle-incr"],
    "lowerarm": ["l-lowerarm-muscle-incr", "r-lowerarm-muscle-incr"],
    "shoulder": ["l-upperarm-shoulder-muscle-incr", "r-upperarm-shoulder-muscle-incr"],
    "pectoral": ["torso-muscle-pectoral-incr"],
    "dorsi": ["torso-muscle-dorsi-incr"],
    "stomach": ["stomach-tone-incr"],
    "upperleg": ["l-upperleg-muscle-incr", "r-upperleg-muscle-incr"],
    "lowerleg": ["l-lowerleg-muscle-incr", "r-lowerleg-muscle-incr"],
    "buttocks": ["buttocks-volume-incr"],
}
DETAIL_WEIGHT = 1.3
GROWTH_GAIN = 1.2

# The muscled body with less fat over it. Full definition draws the waist in this far.
LEAN_MACRO = {"gender": 1.0, "muscle": 1.0, "weight": 0.2}
WAIST_REGIONS = ("abs", "obliques", "lower_back")
# The picture of the fine muscle lines, in texels along each edge.
MUSCLE_MAP_SIZE = 2048
MUSCLE_LINES_NODE = "muscle-lines"

# A detail shape counts as fully "inside" its region once a point moves this
# fraction of the shape's largest movement.
SUPPORT_SPREAD = 0.22
MASK_SMOOTHING_PASSES = 3
# How many edges outward each region may spread into skin that no region owns.
CLAIM_PASSES = 6

RIG = "mixamo"
BONE_PREFIX = "mixamorig:"

# Trunks, measured from the hip joint and the top of the thigh bone, in metres.
WAISTBAND_ABOVE_HIPS = 0.075
HEM_BELOW_THIGH_TOP = 0.17
# In the A-pose the hands hang at hip height, so anything on these bones is kept out of the trunks.
NOT_TRUNKS = ("Arm", "Hand")

# How far each upper arm is lowered from MPFB's A-pose for the exported stance, in degrees.
ARM_LOWERING = 24.0

SHORTS_COLOUR = (0.02, 0.02, 0.025, 1.0)

# The look, all from MPFB's free asset pack. Texture sizes are the longest edge in pixels.
SKIN = "young_caucasian_male"
SKIN_TEXTURE_SIZE = 2048
SKIN_ROUGHNESS = 0.55
# Each entry: name in the body file, MPFB's folder, the asset inside it, MPFB's type name, texture size.
ASSETS = [
    ("eyes", "eyes", "low-poly/low-poly.mhclo", "Eyes", 512),
    ("eyebrows", "eyebrows", "eyebrow001/eyebrow001.mhclo", "Eyebrows", 512),
    ("eyelashes", "eyelashes", "eyelashes01/eyelashes01.mhclo", "Eyelashes", 512),
    ("hair", "hair", "short04/short04.mhclo", "Hair", 1024),
]
IMAGE_QUALITY = 88

# ---- small helpers --------------------------------------------------------


def smoothstep(low, high, value):
    amount = np.clip((value - low) / (high - low), 0.0, 1.0)
    return amount * amount * (3.0 - 2.0 * amount)


def band(value, rise_start, rise_end, fall_start, fall_end):
    """1 between rise_end and fall_start, fading to 0 outside rise_start..fall_end."""
    return smoothstep(rise_start, rise_end, value) * (1.0 - smoothstep(fall_start, fall_end, value))


def read_coords(key_or_vertices, count):
    flat = np.empty(count * 3, dtype=np.float32)
    key_or_vertices.foreach_get("co", flat)
    return flat.reshape(count, 3).astype(np.float64)


def mix_coords(obj):
    """Where every point sits with the current shape key values applied."""
    key = obj.shape_key_add(name="__mix", from_mix=True)
    coords = read_coords(key.data, len(obj.data.vertices))
    obj.shape_key_remove(key)
    return coords


def set_macro(obj, macro):
    for name, value in macro.items():
        HumanObjectProperties.set_value(name, value, entity_reference=obj)
    TargetService.reapply_macro_details(obj)


def bone_weights(obj):
    """Each bone's share of every point's skin weight, as arrays keyed by the bone's short name.

    MPFB's weights do not always add up to 1 on a point, so they are turned
    into shares here. Blender and the exported file do the same when they move the skin.
    """
    count = len(obj.data.vertices)
    names = {
        group.index: group.name[len(BONE_PREFIX):]
        for group in obj.vertex_groups
        if group.name.startswith(BONE_PREFIX)
    }
    weights = {name: np.zeros(count) for name in names.values()}
    for vertex in obj.data.vertices:
        for membership in vertex.groups:
            name = names.get(membership.group)
            if name is not None:
                weights[name][vertex.index] = membership.weight
    total = np.maximum(sum(weights.values()), 1e-9)
    return {name: values / total for name, values in weights.items()}


def mesh_edges(mesh):
    edges = np.empty(len(mesh.edges) * 2, dtype=np.int32)
    mesh.edges.foreach_get("vertices", edges)
    return edges.reshape(len(mesh.edges), 2)


def smooth_over_mesh(edges, values, passes):
    """Blurs a per-point value along the mesh's edges, so masks fade instead of stepping."""
    neighbours = np.zeros(len(values))
    np.add.at(neighbours, edges[:, 0], 1.0)
    np.add.at(neighbours, edges[:, 1], 1.0)
    neighbours = np.maximum(neighbours, 1.0)

    result = values.copy()
    for _ in range(passes):
        total = np.zeros(len(values))
        np.add.at(total, edges[:, 0], result[edges[:, 1]])
        np.add.at(total, edges[:, 1], result[edges[:, 0]])
        result = 0.5 * result + 0.5 * total / neighbours
    return result


# ---- building the body ----------------------------------------------------


def create_body():
    """Makes the slim body and measures how every point moves to reach the muscled one."""
    for obj in list(bpy.data.objects):
        bpy.data.objects.remove(obj, do_unlink=True)

    macro = TargetService.get_default_macro_info_dict()
    macro.update(BASE_MACRO)
    body = HumanService.create_human(
        mask_helpers=True,
        detailed_helpers=True,  # the rig needs these to find the joints
        extra_vertex_groups=True,
        feet_on_ground=True,
        scale=0.1,
        macro_detail_dict=macro,
    )
    count = len(body.data.vertices)
    base = mix_coords(body)

    # How far each detail shape moves each point, used later to find each muscle's area.
    basis = read_coords(body.data.shape_keys.key_blocks["Basis"].data, count)
    detail_keys = []
    support = {}
    for part, target_names in DETAIL_TARGETS.items():
        movement = np.zeros(count)
        for target_name in target_names:
            path = TargetService.target_full_path(target_name)
            if path is None:
                raise RuntimeError(f"MPFB has no target named {target_name}")
            key = TargetService.load_target(body, path, weight=0.0, name=target_name)
            detail_keys.append(key)
            movement += np.linalg.norm(read_coords(key.data, count) - basis, axis=1)
        support[part] = np.clip(movement / (SUPPORT_SPREAD * movement.max()), 0.0, 1.0)

    set_macro(body, FULL_MACRO)
    for key in detail_keys:
        key.value = DETAIL_WEIGHT
    full = mix_coords(body)
    growth = (full - base) * GROWTH_GAIN
    # The same muscled body carrying less fat: what getting defined does to the waist.
    set_macro(body, LEAN_MACRO)
    lean = mix_coords(body) - full

    # Back to the slim body, which becomes the mesh itself with no MPFB shape keys left.
    for key in detail_keys:
        body.shape_key_remove(key)
    set_macro(body, BASE_MACRO)
    TargetService.bake_targets(body)
    drift = np.abs(read_coords(body.data.vertices, count) - base).max()
    if drift > 1e-4:
        raise RuntimeError(f"Baking moved the slim body by {drift:.5f} m")

    return body, base, growth, lean, support


def delete_helpers(body):
    """Removes MPFB's invisible helper geometry and reports which points were kept."""
    mesh = body.data
    body_group = body.vertex_groups["body"].index
    keep = np.zeros(len(mesh.vertices), dtype=bool)
    for vertex in mesh.vertices:
        for membership in vertex.groups:
            if membership.group == body_group and membership.weight > 0.5:
                keep[vertex.index] = True
                break

    edit = bmesh.new()
    edit.from_mesh(mesh)
    edit.verts.ensure_lookup_table()
    doomed = [vertex for vertex in edit.verts if not keep[vertex.index]]
    bmesh.ops.delete(edit, geom=doomed, context="VERTS")
    edit.to_mesh(mesh)
    edit.free()
    mesh.update()

    for modifier in list(body.modifiers):
        if modifier.type == "MASK":
            body.modifiers.remove(modifier)
    for group in list(body.vertex_groups):
        if not group.name.startswith(BONE_PREFIX):
            body.vertex_groups.remove(group)
    return keep


# ---- the 19 masks ---------------------------------------------------------


def region_masks(body, rig, coords, support):
    """How much each point belongs to each region, 0 to 1. A point's masks never total more than 1."""
    mesh = body.data
    count = len(mesh.vertices)
    edges = mesh_edges(mesh)
    normals = np.empty(count * 3, dtype=np.float32)
    mesh.vertices.foreach_get("normal", normals)
    normals = normals.reshape(count, 3).astype(np.float64)

    x, z = coords[:, 0], coords[:, 2]
    across = np.abs(x)
    facing_front = -normals[:, 1]
    facing_up = normals[:, 2]
    front = smoothstep(-0.1, 0.4, facing_front)
    back = smoothstep(-0.1, 0.4, -facing_front)

    def bone(name):
        return rig.data.bones[BONE_PREFIX + name]

    hips = bone("Hips").head_local.z
    chest = bone("Spine2").head_local.z
    shoulder = bone("LeftArm").head_local.z
    neck = bone("Neck").head_local.z

    weights = bone_weights(body)

    def weight(*names):
        return sum(weights[name] for name in names)

    def weight_where(accept):
        return sum((values for name, values in weights.items() if accept(name)), np.zeros(count))

    torso = np.clip(weight("Hips", "Spine", "Spine1", "Spine2", "Neck", "LeftShoulder", "RightShoulder"), 0, 1)
    on_arm = smoothstep(0.35, 0.75, weight("LeftArm", "RightArm"))
    # Head, hands and feet belong to no muscle region.
    off_limits = np.clip(
        weight_where(lambda name: name == "Head" or "Hand" in name or "Foot" in name or "Toe" in name), 0, 1
    )

    masks = {}

    # Chest: MPFB's pectoral area, cut into three bands by height.
    pectoral = support["pectoral"] * (1.0 - on_arm) * smoothstep(-0.3, 0.1, facing_front)
    height_in_chest = (z - (chest - 0.045)) / ((shoulder + 0.045) - (chest - 0.045))
    masks["chest_upper"] = pectoral * smoothstep(0.56, 0.78, height_in_chest)
    masks["chest_lower"] = pectoral * (1.0 - smoothstep(0.2, 0.42, height_in_chest))
    masks["chest_mid"] = pectoral - masks["chest_upper"] - masks["chest_lower"]

    masks["lats"] = support["dorsi"] * (1.0 - on_arm)
    masks["glutes"] = support["buttocks"] * smoothstep(-0.25, 0.15, -facing_front)

    # Shoulders: MPFB's shoulder area, cut into front, side and rear by which way the skin faces.
    side_ways = np.where(x >= 0, 1.0, -1.0)
    arm = bone("LeftArm")
    arm_axis = (arm.tail_local - arm.head_local).normalized()
    outward = Vector((0.0, -1.0, 0.0)).cross(arm_axis).normalized()  # up and out, for the left arm
    facing_out = normals[:, 0] * side_ways * outward.x + normals[:, 2] * outward.z
    front_share = np.maximum(facing_front, 0.0) ** 1.5
    rear_share = np.maximum(-facing_front, 0.0) ** 1.5
    side_share = np.maximum(facing_out, 0.0) ** 1.5
    share_total = front_share + rear_share + side_share + 1e-6
    shoulders = support["shoulder"]
    masks["delt_front"] = shoulders * front_share / share_total
    masks["delt_rear"] = shoulders * rear_share / share_total
    masks["delt_side"] = shoulders * side_share / share_total

    # Upper arm and thigh: front and back halves.
    arm_front = smoothstep(-0.3, 0.3, facing_front)
    upper_arm = support["upperarm"] * (1.0 - shoulders)
    masks["biceps"] = upper_arm * arm_front
    masks["triceps"] = upper_arm * (1.0 - arm_front)
    masks["forearms"] = support["lowerarm"]

    thigh_front = smoothstep(-0.25, 0.35, facing_front)
    thigh = support["upperleg"] * (1.0 - masks["glutes"])
    masks["quads"] = thigh * thigh_front
    masks["hamstrings"] = thigh * (1.0 - thigh_front)
    masks["calves"] = support["lowerleg"]

    # The regions MPFB has no ready-made shape for are found by where they sit on the torso.
    taken = np.clip(pectoral + masks["lats"] + masks["glutes"] + shoulders, 0.0, 1.0)
    free = torso * (1.0 - taken)

    waist = band(z, hips - 0.01, hips + 0.05, chest - 0.07, chest - 0.01)
    masks["abs"] = free * front * waist * (1.0 - smoothstep(0.06, 0.1, across))
    masks["obliques"] = (
        free * waist * smoothstep(0.06, 0.1, across) * (1.0 - smoothstep(0.15, 0.6, -facing_front))
    )
    masks["lower_back"] = free * back * waist * (1.0 - smoothstep(0.09, 0.15, across))
    masks["mid_back"] = (
        free * back
        * band(z, chest - 0.07, chest - 0.01, shoulder + 0.02, shoulder + 0.07)
        * (1.0 - smoothstep(0.11, 0.17, across))
    )
    masks["traps"] = (
        free
        * band(z, shoulder + 0.0, shoulder + 0.05, neck + 0.03, neck + 0.08)
        * (1.0 - smoothstep(0.13, 0.2, across))
        * smoothstep(-0.2, 0.3, np.maximum(facing_up, -facing_front))
    )

    def settle():
        """Keeps every mask off the head, hands and feet, and a point's masks from totalling over 1."""
        for region in REGIONS:
            masks[region] = np.clip(masks[region], 0.0, 1.0) * (1.0 - off_limits)
        overlap = np.maximum(sum(masks[region] for region in REGIONS), 1.0)
        for region in REGIONS:
            masks[region] = masks[region] / overlap

    for region in REGIONS:
        masks[region] = smooth_over_mesh(edges, np.clip(masks[region], 0.0, 1.0), MASK_SMOOTHING_PASSES)
    settle()

    # Skin between muscles would otherwise never grow. Each region spreads a few
    # edges outward into skin nobody owns, sharing it with its neighbours.
    for _ in range(CLAIM_PASSES):
        unowned = np.clip(1.0 - sum(masks[region] for region in REGIONS), 0.0, 1.0)
        for region in REGIONS:
            spread = smooth_over_mesh(edges, masks[region], 1)
            masks[region] = masks[region] + np.maximum(spread - masks[region], 0.0) * unowned
        settle()

    return masks


def point_normals(mesh):
    normals = np.empty(len(mesh.vertices) * 3, dtype=np.float32)
    mesh.vertices.foreach_get("normal", normals)
    return normals.reshape(-1, 3).astype(np.float64)


def landmarks(rig):
    """The joints muscle_lines.py places its features by, from the skeleton's left side."""

    def bone(name):
        return rig.data.bones[BONE_PREFIX + name]

    def ends(name):
        return np.array(bone(name).head_local), np.array(bone(name).tail_local)

    return {
        "hips_z": bone("Hips").head_local.z,
        "neck_z": bone("Neck").head_local.z,
        "shoulder_x": bone("LeftArm").head_local.x,
        "arm": ends("LeftArm"),
        "forearm": ends("LeftForeArm"),
        "thigh": ends("LeftUpLeg"),
        "shin": ends("LeftLeg"),
    }


def muscle_bellies(body, rig, coords, masks):
    """How each point moves when the muscle under it is fully defined: out along its normal."""
    normals = point_normals(body.data)
    gates = muscle_lines.gates_from_masks(masks)
    rise = muscle_lines.height(coords, normals, gates, landmarks(rig), muscle_lines.SHAPE)
    return normals * rise[:, None]


def add_region_shapes(body, coords, growth, bellies, lean, masks):
    """Two shape keys per region, plus the masks stored on the mesh, where they survive later cuts and are exported."""
    mesh = body.data
    body.shape_key_add(name="Basis", from_mix=False)
    for region in REGIONS:
        mask = masks[region][:, None]
        key = body.shape_key_add(name=f"{region}_size", from_mix=False)
        key.data.foreach_set("co", (coords + growth * mask).astype(np.float32).ravel())
        key.value = 0.0
        defined = bellies + lean if region in WAIST_REGIONS else bellies
        key = body.shape_key_add(name=f"{region}_definition", from_mix=False)
        key.data.foreach_set("co", (coords + defined * mask).astype(np.float32).ravel())
        key.value = 0.0
        # The exporter only writes attributes whose names start with an underscore.
        layer = mesh.attributes.new(f"_mask_{region}", "FLOAT", "POINT")
        layer.data.foreach_set("value", masks[region].astype(np.float32))
    mesh.update()


def read_masks(body):
    """Reads the stored masks back, in the mesh's current point order."""
    mesh = body.data
    masks = {}
    for region in REGIONS:
        values = np.empty(len(mesh.vertices), dtype=np.float32)
        mesh.attributes[f"_mask_{region}"].data.foreach_get("value", values)
        masks[region] = values.astype(np.float64)
    return masks


def add_muscle_lines(body, rig, masks, size, previews_dir):
    """Bakes the fine muscle lines into a picture and hangs it on the skin as its normal map."""
    mesh = body.data
    positions = read_coords(mesh.vertices, len(mesh.vertices))
    mesh.calc_loop_triangles()
    triangles = len(mesh.loop_triangles)
    corner_points = np.empty(triangles * 3, dtype=np.int32)
    mesh.loop_triangles.foreach_get("vertices", corner_points)
    corner_loops = np.empty(triangles * 3, dtype=np.int32)
    mesh.loop_triangles.foreach_get("loops", corner_loops)
    uv = np.empty(len(mesh.loops) * 2, dtype=np.float32)
    mesh.uv_layers.active.data.foreach_get("uv", uv)
    uv = uv.reshape(-1, 2)[corner_loops].reshape(triangles, 3, 2)

    pixels, filled = muscle_lines.normal_map(
        positions, point_normals(mesh), muscle_lines.gates_from_masks(masks),
        corner_points.reshape(triangles, 3), uv, landmarks(rig), size,
    )
    image = bpy.data.images.new("muscle_lines", size, size, alpha=False)
    image.colorspace_settings.name = "Non-Color"
    image.pixels.foreach_set(np.concatenate([pixels, np.ones((size, size, 1))], axis=2).astype(np.float32).ravel())
    image.filepath_raw = os.path.join(previews_dir, "muscle-lines.png")
    image.file_format = "PNG"
    image.save()

    tree = mesh.materials["skin"].node_tree
    texture = tree.nodes.new("ShaderNodeTexImage")
    texture.image = image
    lines = tree.nodes.new("ShaderNodeNormalMap")
    lines.name = MUSCLE_LINES_NODE
    tree.links.new(texture.outputs["Color"], lines.inputs["Color"])
    tree.links.new(lines.outputs["Normal"], tree.nodes["Principled BSDF"].inputs["Normal"])
    return float(filled.mean())


# ---- skin, eyes, hair and trunks ------------------------------------------


def shrink_image(image, longest_edge):
    if max(image.size) > longest_edge:
        image.scale(longest_edge, longest_edge)


def add_assets(body):
    """Eyes, eyebrows, eyelashes and hair, fitted to the head and bound to the skeleton by MPFB.

    This has to happen while the body still has its helper geometry, which is
    what MPFB fits these to.
    """
    assets = []
    for name, folder, fragment, asset_type, texture_size in ASSETS:
        path = AssetService.find_asset_absolute_path(fragment, folder)
        if path is None:
            raise RuntimeError(
                f"MPFB's asset pack has no {folder}/{fragment}. "
                "Unpack makehuman_system_assets_cc0.zip into MPFB's data folder."
            )
        asset = HumanService.add_mhclo_asset(
            path, body, asset_type=asset_type, subdiv_levels=0, material_type="GAMEENGINE"
        )
        asset.name = asset.data.name = name
        for material in asset.data.materials:
            material.name = name
            for node in material.node_tree.nodes:
                if node.type == "TEX_IMAGE" and node.image:
                    shrink_image(node.image, texture_size)
        assets.append(asset)
    return assets


def average_linear_colour(image):
    """The image's average colour in linear light, which is what a renderer multiplies by."""
    width, height = image.size
    pixels = np.empty(width * height * 4, dtype=np.float32)
    image.pixels.foreach_get(pixels)
    encoded = pixels.reshape(-1, 4)[::16, :3].astype(np.float64)
    linear = np.where(encoded <= 0.04045, encoded / 12.92, ((encoded + 0.055) / 1.055) ** 2.4)
    return [float(value) for value in linear.mean(axis=0)]


def skin_material():
    """MPFB's photographic skin as a plain textured material that any engine can read."""
    description = AssetService.find_asset_absolute_path(f"{SKIN}/{SKIN}.mhmat", "skins")
    if description is None:
        raise RuntimeError(f"MPFB's asset pack has no skin named {SKIN}")
    with open(description, encoding="utf-8", errors="replace") as lines:
        texture_file = next(line.split()[1] for line in lines if line.startswith("diffuseTexture"))
    image = bpy.data.images.load(os.path.join(os.path.dirname(description), texture_file))
    shrink_image(image, SKIN_TEXTURE_SIZE)

    material = bpy.data.materials.new("skin")
    material.use_nodes = True
    shader = material.node_tree.nodes["Principled BSDF"]
    texture = material.node_tree.nodes.new("ShaderNodeTexImage")
    texture.image = image
    material.node_tree.links.new(texture.outputs["Color"], shader.inputs["Base Color"])
    shader.inputs["Roughness"].default_value = SKIN_ROUGHNESS
    # Stored in the file so a renderer can turn "make the skin this colour" into
    # the right tint for this particular picture of skin.
    material["skin_average"] = average_linear_colour(image)
    return material


def plain_material(name, colour, roughness):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    shader = material.node_tree.nodes["Principled BSDF"]
    shader.inputs["Base Color"].default_value = colour
    shader.inputs["Roughness"].default_value = roughness
    material.diffuse_color = colour
    return material


def add_trunks(body, rig):
    """Colours trunks onto the body itself, so they grow with the muscles under them.

    The mesh is cut along the waistband and the hem first, which gives the trunks
    straight edges wherever the mesh's own lines happen to run.
    """
    mesh = body.data
    mesh.materials.clear()
    mesh.materials.append(skin_material())
    mesh.materials.append(plain_material("shorts", SHORTS_COLOUR, 0.85))

    waistband = rig.data.bones[BONE_PREFIX + "Hips"].head_local.z + WAISTBAND_ABOVE_HIPS
    hem = rig.data.bones[BONE_PREFIX + "LeftUpLeg"].head_local.z - HEM_BELOW_THIGH_TOP
    arm_groups = {
        group.index for group in body.vertex_groups if any(part in group.name for part in NOT_TRUNKS)
    }

    edit = bmesh.new()
    edit.from_mesh(mesh)
    skin_weights = edit.verts.layers.deform.verify()

    def on_trunk(vertex):
        memberships = vertex[skin_weights].items()
        total = sum(weight for _, weight in memberships)
        on_arm = sum(weight for group, weight in memberships if group in arm_groups)
        return total <= 0.0 or on_arm / total < 0.5

    def trunk_faces():
        return [face for face in edit.faces if all(on_trunk(vertex) for vertex in face.verts)]

    for height in (waistband, hem):
        faces = trunk_faces()
        geometry = set(faces)
        for face in faces:
            geometry.update(face.edges)
            geometry.update(face.verts)
        bmesh.ops.bisect_plane(
            edit, geom=list(geometry), dist=1e-5, plane_co=(0.0, 0.0, height), plane_no=(0.0, 0.0, 1.0)
        )

    shorts_faces = 0
    for face in edit.faces:
        face.material_index = 0
    for face in trunk_faces():
        if hem < face.calc_center_median().z < waistband:
            face.material_index = 1
            shorts_faces += 1

    edit.to_mesh(mesh)
    edit.free()
    mesh.update()
    return shorts_faces


# ---- checking pictures ----------------------------------------------------


def setup_render(scene, width, height):
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = width
    scene.render.resolution_y = height
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.compression = 100  # smallest files; these are kept in the project history
    scene.view_settings.view_transform = "Standard"  # show the colours as painted
    scene.display.shading.light = "STUDIO"
    scene.display.shading.color_type = "VERTEX"
    scene.display.shading.show_cavity = True
    scene.display.shading.cavity_type = "BOTH"
    scene.display.shading.show_shadows = False
    scene.world = bpy.data.worlds.new("backdrop")
    scene.world.color = (0.05, 0.06, 0.08)

    camera_data = bpy.data.cameras.new("check-camera")
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 1.95
    camera = bpy.data.objects.new("check-camera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    return camera


def aim(camera, degrees, look_at):
    angle = math.radians(degrees)
    camera.location = look_at + Vector((math.sin(angle) * 5.0, -math.cos(angle) * 5.0, 0.0))
    camera.rotation_euler = (look_at - camera.location).to_track_quat("-Z", "Y").to_euler()


CHECK_LAYER = "check"


def paint(body, heat):
    """Colours the body skin tone, the trunks dark, and `heat` (0 to 1 per point) red."""
    mesh = body.data
    layer = mesh.color_attributes.get(CHECK_LAYER) or mesh.color_attributes.new(CHECK_LAYER, "FLOAT_COLOR", "CORNER")
    mesh.color_attributes.active_color = layer

    corner_point = np.empty(len(mesh.loops), dtype=np.int32)
    mesh.loops.foreach_get("vertex_index", corner_point)
    face_material = np.empty(len(mesh.polygons), dtype=np.int32)
    mesh.polygons.foreach_get("material_index", face_material)
    face_corners = np.empty(len(mesh.polygons), dtype=np.int32)
    mesh.polygons.foreach_get("loop_total", face_corners)
    corner_is_trunks = np.repeat(face_material, face_corners) == 1

    skin = np.array([0.78, 0.55, 0.42])
    hot = np.array([0.95, 0.12, 0.08])
    dark = np.array([0.08, 0.08, 0.1])
    colours = skin + (hot - skin) * heat[corner_point][:, None]
    colours[corner_is_trunks] = dark
    rgba = np.concatenate([colours, np.ones((len(colours), 1))], axis=1)
    layer.data.foreach_set("color", rgba.astype(np.float32).ravel())
    mesh.update()


def contact_sheet(tile_paths, columns, out_path):
    tiles = []
    for path in tile_paths:
        image = bpy.data.images.load(path)
        width, height = image.size
        pixels = np.empty(width * height * 4, dtype=np.float32)
        image.pixels.foreach_get(pixels)
        tiles.append(pixels.reshape(height, width, 4))
        bpy.data.images.remove(image)

    tile_height, tile_width = tiles[0].shape[:2]
    rows = math.ceil(len(tiles) / columns)
    sheet = np.zeros((rows * tile_height, columns * tile_width, 4), dtype=np.float32)
    sheet[:, :, 3] = 1.0
    for index, tile in enumerate(tiles):
        row, column = divmod(index, columns)
        top = (rows - 1 - row) * tile_height  # image rows run bottom to top
        sheet[top:top + tile_height, column * tile_width:(column + 1) * tile_width] = tile

    image = bpy.data.images.new("sheet", sheet.shape[1], sheet.shape[0], alpha=False)
    image.pixels.foreach_set(sheet.ravel())
    # Saved through the scene's settings, so it gets the same compression as the tiles.
    image.save_render(out_path, scene=bpy.context.scene)
    bpy.data.images.remove(image)


def render_checks(body, assets, masks, camera, previews_dir):
    """One tile per region, grown to 100 with its area in red, from the front, back and side.

    The tiles run: the slim body, the 19 regions in the engine's order, then every region at 100.
    Hair and eyes are left out: these pictures are about where each muscle is.
    """
    scene = bpy.context.scene
    for asset in assets:
        asset.hide_render = True
    look_at = Vector((0.0, 0.0, body.dimensions.z / 2.0))
    keys = body.data.shape_keys.key_blocks
    tiles_dir = os.path.join(previews_dir, "tiles")
    os.makedirs(tiles_dir, exist_ok=True)

    count = len(body.data.vertices)
    shots = [("00-slim", None, np.zeros(count))]
    shots += [(region, region, masks[region]) for region in REGIONS]
    shots.append(("all-100", "all", np.zeros(count)))

    for view, degrees in (("front", 0), ("back", 180), ("side", 90)):
        aim(camera, degrees, look_at)
        tiles = []
        for label, grown, heat in shots:
            for region in REGIONS:
                keys[f"{region}_size"].value = 1.0 if grown in (region, "all") else 0.0
            paint(body, heat)
            scene.render.filepath = os.path.join(tiles_dir, f"{view}-{label}.png")
            bpy.ops.render.render(write_still=True)
            tiles.append(scene.render.filepath)
        contact_sheet(tiles, 7, os.path.join(previews_dir, f"regions-{view}.png"))

    for region in REGIONS:
        keys[f"{region}_size"].value = 0.0
    for asset in assets:
        asset.hide_render = False


def render_look(body, camera, previews_dir):
    """The finished character as it is exported: skin, eyes and hair, in the relaxed stance.

    Rendered with Blender's own real-time engine, so it shows the materials the
    file carries. The page lights it differently, so this is a check of the
    character, not of how the page looks.
    """
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    world = bpy.data.worlds.new("studio")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.09, 0.1, 0.13, 1.0)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.2
    scene.world = world
    for name, tilt, turn, energy in (("key", 55, -35, 3.2), ("fill", 70, 60, 1.0), ("rim", 110, 170, 2.0)):
        light = bpy.data.objects.new(name, bpy.data.lights.new(name, "SUN"))
        light.data.energy = energy
        light.rotation_euler = (math.radians(tilt), 0.0, math.radians(turn))
        scene.collection.objects.link(light)

    camera.data.type = "PERSP"
    camera.data.lens = 85
    keys = body.data.shape_keys.key_blocks
    height = body.dimensions.z

    def shoot(name, look_at, distance, degrees, width, height_px):
        scene.render.resolution_x = width
        scene.render.resolution_y = height_px
        angle = math.radians(degrees)
        camera.location = look_at + Vector((math.sin(angle) * distance, -math.cos(angle) * distance, 0.0))
        camera.rotation_euler = (look_at - camera.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = os.path.join(previews_dir, f"look-{name}.png")
        bpy.ops.render.render(write_still=True)

    lines = body.data.materials["skin"].node_tree.nodes[MUSCLE_LINES_NODE]

    def show(size, definition):
        for region in REGIONS:
            keys[f"{region}_size"].value = size
            keys[f"{region}_definition"].value = definition
        # Blender can only show the lines on the whole body at once. The page fades them in muscle by muscle.
        lines.inputs["Strength"].default_value = definition

    middle = Vector((0.0, 0.0, height / 2.0))
    head = Vector((0.0, 0.0, height - 0.13))
    show(0.0, 0.0)
    shoot("face", head, 1.1, 0, 640, 640)
    shoot("face-side", head, 1.1, 55, 640, 640)
    shoot("slim-front", middle, 5.2, 0, 560, 820)
    show(1.0, 0.0)
    shoot("grown-front", middle, 5.2, 0, 560, 820)
    shoot("grown-back", middle, 5.2, 180, 560, 820)
    show(0.15, 1.0)
    shoot("toned-front", middle, 5.2, 0, 840, 1230)
    show(0.6, 1.0)
    shoot("defined-front", middle, 5.2, 0, 840, 1230)
    shoot("defined-back", middle, 5.2, 180, 840, 1230)
    shoot("defined-side", middle, 5.2, 90, 840, 1230)
    show(0.0, 0.0)
    lines.inputs["Strength"].default_value = 1.0  # the file carries the lines at full strength


# ---- stance and export ----------------------------------------------------


def turn_bone(rig, bone_name, axis, degrees):
    """Turns a bone about an axis through its own joint, in the body's space."""
    pose_bone = rig.pose.bones[BONE_PREFIX + bone_name]
    pivot = Matrix.Translation(pose_bone.head)
    turn = pivot @ Matrix.Rotation(math.radians(degrees), 4, axis) @ pivot.inverted()
    pose_bone.matrix = turn @ pose_bone.matrix
    bpy.context.view_layer.update()


def relax_stance(rig):
    """Lowers the arms from MPFB's A-pose to hang more naturally."""
    turn_bone(rig, "LeftArm", "Y", ARM_LOWERING)
    turn_bone(rig, "RightArm", "Y", -ARM_LOWERING)


def export_glb(body, assets, rig, out_path):
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    mesh = body.data
    check_layer = mesh.color_attributes.get(CHECK_LAYER)
    if check_layer is not None:
        mesh.color_attributes.remove(check_layer)  # the checking colours must not ship in the file

    # Custom properties are exported below, for the skin's average colour. MPFB
    # leaves its own bookkeeping on the objects, which has no business in the file.
    for obj in (body, rig, *assets):
        for holder in (obj, obj.data):
            for key in list(holder.keys()):
                del holder[key]

    bpy.ops.object.select_all(action="DESELECT")
    for obj in (body, rig, *assets):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = rig
    bpy.ops.export_scene.gltf(
        filepath=out_path,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=False,  # modifiers cannot be applied to a mesh with shape keys
        export_skins=True,
        export_rest_position_armature=False,  # save the relaxed stance, not the A-pose
        export_morph=True,
        export_morph_normal=True,
        export_morph_tangent=False,
        export_attributes=True,  # the region masks
        export_animations=False,
        export_materials="EXPORT",
        export_image_format="WEBP",  # small, and keeps the see-through parts of hair and lashes
        export_image_quality=IMAGE_QUALITY,
        export_cameras=False,
        export_lights=False,
        export_extras=True,
    )


# ---- main -----------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--out", required=True, help="where to write the .glb")
    parser.add_argument("--previews", required=True, help="folder for the checking pictures")
    parser.add_argument("--fast", action="store_true", help="skip the region-by-region checking sheets")
    parser.add_argument("--map-size", type=int, default=MUSCLE_MAP_SIZE, help="texels along each edge of the muscle lines picture")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    os.makedirs(args.previews, exist_ok=True)

    body, base, growth, lean, support = create_body()
    rig = HumanService.add_builtin_rig(body, RIG, import_weights=True)
    assets = add_assets(body)

    keep = delete_helpers(body)
    coords = base[keep]
    growth = growth[keep]
    lean = lean[keep]
    support = {part: values[keep] for part, values in support.items()}
    drift = np.abs(read_coords(body.data.vertices, len(body.data.vertices)) - coords).max()
    if drift > 1e-4:
        raise RuntimeError(f"Deleting helpers reordered the body's points (off by {drift:.5f} m)")

    masks = region_masks(body, rig, coords, support)
    moved = np.linalg.norm(growth, axis=1)
    covered = sum(masks[region] for region in REGIONS)
    print(f"REPORT growth: largest {moved.max() * 100:.2f} cm, kept {np.sum(moved * covered) / np.sum(moved) * 100:.1f}%")
    for region in REGIONS:
        mask = masks[region]
        reach = np.linalg.norm(growth * mask[:, None], axis=1).max() * 100
        print(f"REPORT {region:12s} points {int(np.sum(mask > 0.05)):5d}  largest growth {reach:5.2f} cm")

    bellies = muscle_bellies(body, rig, coords, masks)
    waist = sum(masks[region] for region in WAIST_REGIONS)
    print(
        f"REPORT definition: bellies rise up to {np.linalg.norm(bellies, axis=1).max() * 1000:.1f} mm, "
        f"the waist draws in up to {np.linalg.norm(lean * waist[:, None], axis=1).max() * 100:.2f} cm"
    )

    add_region_shapes(body, coords, growth, bellies, lean, masks)
    shorts_faces = add_trunks(body, rig)
    masks = read_masks(body)
    covered = add_muscle_lines(body, rig, masks, args.map_size, args.previews)

    print(f"REPORT points {len(body.data.vertices)}, faces {len(body.data.polygons)}, bones {len(rig.data.bones)}")
    print(f"REPORT height {body.dimensions.z:.3f} m, trunks faces {shorts_faces}")
    print(f"REPORT muscle lines picture {args.map_size} px, {covered * 100:.0f}% of it is skin")

    camera = setup_render(bpy.context.scene, 300, 440)
    if not args.fast:
        render_checks(body, assets, masks, camera, args.previews)
    relax_stance(rig)
    render_look(body, camera, args.previews)

    export_glb(body, assets, rig, args.out)
    print(f"REPORT wrote {args.out} ({os.path.getsize(args.out) / 1024:.0f} kB)")
    print("DONE")


if __name__ == "__main__":
    main()
