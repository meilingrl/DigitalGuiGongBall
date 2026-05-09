"""Procedural guigong ball (鬼工球) generator for Blender >= 4.0.

Produces a 5-layer concentric openwork ivory ball + solid core, exported as
.blend and .glb for the Atelier 3D viewer.

Approach (v2): smooth radial cutters + exact boolean on high-segment shells.
This avoids the staircase artifacts from face-threshold deletion.
"""

import math
from pathlib import Path

import bpy
from mathutils import Vector

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

ROOT = Path(bpy.path.abspath("//")).resolve()
MODEL_DIR = ROOT / "src" / "assets" / "materials" / "models"
DOC_DIR = ROOT / "src" / "assets" / "materials" / "documents"
BLEND_PATH = MODEL_DIR / "museum-model-guigong-flagship-main-v1.0.blend"
GLB_PATH = MODEL_DIR / "museum-model-guigong-flagship-main-v1.0.glb"

# ---------------------------------------------------------------------------
# Shell parameters  (outer -> inner)
# ---------------------------------------------------------------------------

SHELL_CONFIGS = [
    # (radius, thickness, seg, rings, profile_id)
    (1.58, 0.095, 144, 92, "outer_petal"),
    (1.31, 0.085, 128, 82, "mid_hex"),
    (1.07, 0.075, 116, 74, "mid_diamond"),
    (0.86, 0.068, 104, 66, "inner_dense"),
    (0.67, 0.058, 92, 58, "inner_fine"),
]

CORE_RADIUS = 0.36

CUTTER_DEPTH_FACTOR = 4.6


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  Scene setup                                                             ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

def ensure_dirs() -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    DOC_DIR.mkdir(parents=True, exist_ok=True)


def clean_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablock in (
        bpy.data.meshes,
        bpy.data.materials,
        bpy.data.images,
        bpy.data.curves,
        bpy.data.collections,
    ):
        for item in list(datablock):
            if item.users == 0:
                datablock.remove(item)


def setup_scene() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.unit_settings.system = "METRIC"
    scene.eevee.taa_render_samples = 64
    scene.eevee.taa_samples = 32
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.038, 0.051, 0.072, 1.0)
    bg.inputs[1].default_value = 0.65


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    direction = target - obj.location
    quat = direction.to_track_quat("-Z", "Y")
    obj.rotation_euler = quat.to_euler()


def add_lights() -> None:
    bpy.ops.object.light_add(type="AREA", location=(3.8, -3.6, 2.9))
    key = bpy.context.object
    key.name = "key_light"
    key.data.energy = 3200
    key.data.shape = "RECTANGLE"
    key.data.size = 5.4
    key.data.size_y = 3.2
    look_at(key, Vector((0.0, 0.0, 0.0)))

    bpy.ops.object.light_add(type="AREA", location=(-3.9, 2.6, 1.5))
    fill = bpy.context.object
    fill.name = "fill_light"
    fill.data.energy = 1500
    fill.data.shape = "RECTANGLE"
    fill.data.size = 6.2
    fill.data.size_y = 3.0
    fill.data.color = (0.95, 0.97, 1.0)
    look_at(fill, Vector((0.0, 0.0, 0.0)))

    bpy.ops.object.light_add(type="POINT", location=(0.0, 0.0, -2.2))
    rim = bpy.context.object
    rim.name = "rim_light"
    rim.data.energy = 500
    rim.data.color = (1.0, 0.92, 0.88)


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  Material                                                                ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

def create_material() -> bpy.types.Material:
    mat = bpy.data.materials.new("ivory_flagship")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links

    for node in list(nodes):
        nodes.remove(node)

    output = nodes.new("ShaderNodeOutputMaterial")
    output.location = (220, 0)
    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (-50, 0)
    bsdf.inputs["Base Color"].default_value = (0.946, 0.914, 0.836, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.34
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.48
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = 0.12
    if "Coat Roughness" in bsdf.inputs:
        bsdf.inputs["Coat Roughness"].default_value = 0.4
    if "Subsurface Weight" in bsdf.inputs:
        bsdf.inputs["Subsurface Weight"].default_value = 0.03
    if "Subsurface Radius" in bsdf.inputs:
        bsdf.inputs["Subsurface Radius"].default_value = (1.0, 0.65, 0.38)

    noise = nodes.new("ShaderNodeTexNoise")
    noise.location = (-750, 80)
    noise.inputs["Scale"].default_value = 7.2
    noise.inputs["Detail"].default_value = 4.0
    noise.inputs["Roughness"].default_value = 0.55

    detail_noise = nodes.new("ShaderNodeTexNoise")
    detail_noise.location = (-760, -130)
    detail_noise.inputs["Scale"].default_value = 24.0
    detail_noise.inputs["Detail"].default_value = 8.0
    detail_noise.inputs["Roughness"].default_value = 0.38

    color_ramp = nodes.new("ShaderNodeValToRGB")
    color_ramp.location = (-510, 50)
    color_ramp.color_ramp.elements[0].position = 0.42
    color_ramp.color_ramp.elements[0].color = (0.925, 0.89, 0.808, 1.0)
    color_ramp.color_ramp.elements[1].position = 0.78
    color_ramp.color_ramp.elements[1].color = (0.99, 0.97, 0.925, 1.0)

    bump = nodes.new("ShaderNodeBump")
    bump.location = (-250, -150)
    bump.inputs["Strength"].default_value = 0.035
    bump.inputs["Distance"].default_value = 0.12

    mix = nodes.new("ShaderNodeMix")
    mix.location = (-300, 55)
    mix.data_type = "FLOAT"
    mix.inputs["Factor"].default_value = 0.4

    links.new(noise.outputs["Fac"], color_ramp.inputs["Fac"])
    links.new(noise.outputs["Fac"], mix.inputs["A"])
    links.new(detail_noise.outputs["Fac"], mix.inputs["B"])
    links.new(mix.outputs["Result"], bump.inputs["Height"])
    links.new(color_ramp.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    return mat


def apply_material(obj: bpy.types.Object, mat: bpy.types.Material, tint: float) -> None:
    local = mat.copy()
    nodes = local.node_tree.nodes
    bsdf = next(n for n in nodes if n.bl_idname == "ShaderNodeBsdfPrincipled")
    base = bsdf.inputs["Base Color"].default_value
    bsdf.inputs["Base Color"].default_value = (
        min(base[0] * tint, 1.0),
        min(base[1] * tint, 1.0),
        min(base[2] * tint, 1.0),
        1.0,
    )
    obj.data.materials.clear()
    obj.data.materials.append(local)


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  Cutter-based carving                                                    ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

def direction_from_angles(theta_deg: float, phi_deg: float) -> Vector:
    theta = math.radians(theta_deg)
    phi = math.radians(phi_deg)
    return Vector(
        (
            math.sin(theta) * math.cos(phi),
            math.sin(theta) * math.sin(phi),
            math.cos(theta),
        )
    ).normalized()


def add_radial_ellipse_cutter(
    cutters: list[bpy.types.Object],
    radius: float,
    theta_deg: float,
    phi_deg: float,
    size_x: float,
    size_y: float,
) -> None:
    direction = direction_from_angles(theta_deg, phi_deg)
    length = radius * CUTTER_DEPTH_FACTOR
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=40,
        radius=1.0,
        depth=length,
        location=direction * 0.02,
    )
    cutter = bpy.context.object
    cutter.scale = (size_x, size_y, length / 2.0)
    cutter.rotation_mode = "QUATERNION"
    cutter.rotation_quaternion = Vector((0.0, 0.0, 1.0)).rotation_difference(direction)
    cutters.append(cutter)


def join_cutters(cutters: list[bpy.types.Object], name: str) -> bpy.types.Object:
    bpy.ops.object.select_all(action="DESELECT")
    for cutter in cutters:
        cutter.select_set(True)
    bpy.context.view_layer.objects.active = cutters[0]
    bpy.ops.object.join()
    joined = bpy.context.object
    joined.name = name
    joined.hide_viewport = True
    joined.hide_render = True
    return joined


def build_cutters_for_shell(profile_id: str, radius: float) -> bpy.types.Object:
    cutters: list[bpy.types.Object] = []

    if profile_id == "outer_petal":
        # 8 large oval windows around equator
        for phi in range(0, 360, 60):
            add_radial_ellipse_cutter(cutters, radius, 90, phi, radius * 0.12, radius * 0.19)
        # upper/lower crown windows
        for phi in range(30, 360, 60):
            add_radial_ellipse_cutter(cutters, radius, 56, phi, radius * 0.08, radius * 0.12)
            add_radial_ellipse_cutter(cutters, radius, 124, phi, radius * 0.08, radius * 0.12)
    elif profile_id == "mid_hex":
        for phi in range(0, 360, 45):
            add_radial_ellipse_cutter(cutters, radius, 90, phi, radius * 0.07, radius * 0.1)
        for phi in range(22, 360, 45):
            add_radial_ellipse_cutter(cutters, radius, 62, phi, radius * 0.05, radius * 0.075)
            add_radial_ellipse_cutter(cutters, radius, 118, phi, radius * 0.05, radius * 0.075)
    elif profile_id == "mid_diamond":
        for phi in range(0, 360, 45):
            add_radial_ellipse_cutter(cutters, radius, 90, phi, radius * 0.055, radius * 0.082)
        for phi in range(22, 360, 45):
            add_radial_ellipse_cutter(cutters, radius, 70, phi, radius * 0.045, radius * 0.066)
            add_radial_ellipse_cutter(cutters, radius, 110, phi, radius * 0.045, radius * 0.066)
    elif profile_id == "inner_dense":
        for phi in range(0, 360, 60):
            add_radial_ellipse_cutter(cutters, radius, 90, phi, radius * 0.042, radius * 0.06)
        for phi in range(30, 360, 60):
            add_radial_ellipse_cutter(cutters, radius, 72, phi, radius * 0.036, radius * 0.052)
            add_radial_ellipse_cutter(cutters, radius, 108, phi, radius * 0.036, radius * 0.052)
    else:  # inner_fine
        for phi in range(0, 360, 60):
            add_radial_ellipse_cutter(cutters, radius, 90, phi, radius * 0.033, radius * 0.047)
        for phi in range(30, 360, 60):
            add_radial_ellipse_cutter(cutters, radius, 74, phi, radius * 0.028, radius * 0.039)
            add_radial_ellipse_cutter(cutters, radius, 106, phi, radius * 0.028, radius * 0.039)

    return join_cutters(cutters, f"{profile_id}_cutters")


def apply_modifier(obj: bpy.types.Object, modifier_name: str) -> None:
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=modifier_name)


def create_shell(
    index: int,
    radius: float,
    thickness: float,
    segments: int,
    rings: int,
    profile_id: str,
    material: bpy.types.Material,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=rings,
        radius=radius,
        location=(0.0, 0.0, 0.0),
    )
    shell = bpy.context.object
    shell.name = f"shell_{index:02d}"
    shell.data.name = f"shell_{index:02d}_mesh"
    bpy.ops.object.shade_smooth()

    # Solidify first so we carve through a true-thickness wall.
    solid = shell.modifiers.new(name="shell_thickness", type="SOLIDIFY")
    solid.thickness = thickness
    solid.offset = -1.0
    solid.use_even_offset = True
    solid.use_quality_normals = True
    apply_modifier(shell, solid.name)

    cutters = build_cutters_for_shell(profile_id, radius)
    boolean = shell.modifiers.new(name="openwork_cut", type="BOOLEAN")
    boolean.operation = "DIFFERENCE"
    boolean.solver = "MANIFOLD"
    boolean.object = cutters
    apply_modifier(shell, boolean.name)
    bpy.data.objects.remove(cutters, do_unlink=True)

    # Round exposed edges for a smooth carved look
    bevel = shell.modifiers.new(name="edge_round", type="BEVEL")
    bevel.width = 0.009
    bevel.segments = 4
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = math.radians(30)
    apply_modifier(shell, bevel.name)

    weighted = shell.modifiers.new(name="weighted_normals", type="WEIGHTED_NORMAL")
    weighted.keep_sharp = True
    apply_modifier(shell, weighted.name)

    tint = 1.0 - (index - 1) * 0.025
    apply_material(shell, material, tint)

    print(
        f"  shell_{index:02d}: {len(shell.data.vertices)} verts, "
        f"{len(shell.data.polygons)} polys, profile={profile_id}"
    )
    return shell


def create_core(material: bpy.types.Material) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=96,
        ring_count=64,
        radius=CORE_RADIUS,
        location=(0.0, 0.0, 0.0),
    )
    core = bpy.context.object
    core.name = "core"
    bpy.ops.object.shade_smooth()
    apply_material(core, material, 0.97)
    return core


# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║  Assembly & export                                                       ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

def move_object_to_collection(obj: bpy.types.Object, collection: bpy.types.Collection) -> None:
    if obj.name not in collection.objects:
        collection.objects.link(obj)
    for existing in list(obj.users_collection):
        if existing != collection:
            existing.objects.unlink(obj)


def build_model() -> bpy.types.Object:
    collection = bpy.data.collections.new("guigong_flagship")
    bpy.context.scene.collection.children.link(collection)

    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 0.0, 0.0))
    root = bpy.context.object
    root.name = "guigong_flagship_root"
    move_object_to_collection(root, collection)

    base_material = create_material()

    print("Building shells...")
    for index, (radius, thickness, seg, rings, profile_id) in enumerate(SHELL_CONFIGS, start=1):
        shell = create_shell(index, radius, thickness, seg, rings, profile_id, base_material)
        move_object_to_collection(shell, collection)
        shell.parent = root

    print("Building core...")
    core = create_core(base_material)
    move_object_to_collection(core, collection)
    core.parent = root

    return root


def export_assets(root: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    root.select_set(True)
    for child in root.children_recursive:
        child.select_set(True)
    bpy.context.view_layer.objects.active = root

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.export_scene.gltf(
        filepath=str(GLB_PATH),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_materials="EXPORT",
        export_normals=True,
        export_tangents=True,
        export_texcoords=True,
    )


def main() -> None:
    ensure_dirs()
    clean_scene()
    setup_scene()
    add_lights()
    root = build_model()
    export_assets(root)
    print(f"Exported flagship model to {GLB_PATH}")


if __name__ == "__main__":
    main()
