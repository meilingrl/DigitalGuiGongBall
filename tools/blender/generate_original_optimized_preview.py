"""Generate the original-optimized preview guigong ball.

Approach:
- Concentric ivory shells (UV sphere + Solidify for true wall thickness).
- Holes are TRUE CIRCLES carved by radial cylinder cutters via Boolean DIFFERENCE.
- Hole centers use a Fibonacci / golden-angle distribution for even coverage
  over the whole sphere (no latitude bands, no pole gaps).
- Each shell gets a slight twist so nested holes do not align radially.
"""

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(bpy.path.abspath("//")).resolve()
MODEL_DIR = ROOT / "src" / "assets" / "materials" / "models"
BLEND_PATH = MODEL_DIR / "museum-model-guigong-original-optimized-preview-v1.0.blend"


SHELL_RADII = [1.72, 1.48, 1.24, 1.0, 0.76, 0.52]
SHELL_THICKNESS = 0.1

# Hole layout: vertices of an icosphere subdivision = nearly perfectly
# uniform points on S², with very low variance in nearest-neighbor distance.
# Subdivision 1 -> 42 verts (12 pentagonal + 30 hexagonal sites, soccer-ball
# style).  Subdivision 2 -> 162 verts.
HOLE_ICOSPHERE_SUBDIV = 1
HOLE_RADIUS_RATIO = 0.22


def ensure_dirs() -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)


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
    bg.inputs[0].default_value = (0.05, 0.048, 0.044, 1.0)
    bg.inputs[1].default_value = 0.7


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    direction = target - obj.location
    quat = direction.to_track_quat("-Z", "Y")
    obj.rotation_euler = quat.to_euler()


def add_lights() -> None:
    bpy.ops.object.light_add(type="AREA", location=(4.3, -3.8, 3.5))
    key = bpy.context.object
    key.name = "key_light"
    key.data.energy = 3500
    key.data.shape = "RECTANGLE"
    key.data.size = 6.0
    key.data.size_y = 3.8
    look_at(key, Vector((0.0, 0.0, 0.0)))

    bpy.ops.object.light_add(type="AREA", location=(-3.0, 3.0, 1.4))
    fill = bpy.context.object
    fill.name = "fill_light"
    fill.data.energy = 1600
    fill.data.shape = "RECTANGLE"
    fill.data.size = 5.6
    fill.data.size_y = 3.0
    fill.data.color = (0.98, 0.985, 1.0)
    look_at(fill, Vector((0.0, 0.0, 0.0)))

    bpy.ops.object.light_add(type="POINT", location=(0.0, 0.0, -2.2))
    rim = bpy.context.object
    rim.name = "rim_light"
    rim.data.energy = 380
    rim.data.color = (1.0, 0.95, 0.9)


def create_material() -> bpy.types.Material:
    mat = bpy.data.materials.new("prototype_ivory")
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    for node in list(nodes):
        nodes.remove(node)

    output = nodes.new("ShaderNodeOutputMaterial")
    output.location = (280, 0)

    bsdf = nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.location = (0, 0)
    bsdf.inputs["Base Color"].default_value = (0.89, 0.84, 0.71, 1.0)
    bsdf.inputs["Roughness"].default_value = 0.34
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.42
    if "Coat Weight" in bsdf.inputs:
        bsdf.inputs["Coat Weight"].default_value = 0.08
    if "Coat Roughness" in bsdf.inputs:
        bsdf.inputs["Coat Roughness"].default_value = 0.38

    noise = nodes.new("ShaderNodeTexNoise")
    noise.location = (-560, 100)
    noise.inputs["Scale"].default_value = 6.5
    noise.inputs["Detail"].default_value = 3.5
    noise.inputs["Roughness"].default_value = 0.52

    detail = nodes.new("ShaderNodeTexNoise")
    detail.location = (-560, -90)
    detail.inputs["Scale"].default_value = 22.0
    detail.inputs["Detail"].default_value = 5.0
    detail.inputs["Roughness"].default_value = 0.35

    bump = nodes.new("ShaderNodeBump")
    bump.location = (-210, -110)
    bump.inputs["Strength"].default_value = 0.012
    bump.inputs["Distance"].default_value = 0.08

    mix = nodes.new("ShaderNodeMix")
    mix.location = (-300, 20)
    mix.data_type = "FLOAT"
    mix.inputs["Factor"].default_value = 0.22

    links.new(noise.outputs["Fac"], mix.inputs["A"])
    links.new(detail.outputs["Fac"], mix.inputs["B"])
    links.new(mix.outputs["Result"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    links.new(bsdf.outputs["BSDF"], output.inputs["Surface"])
    return mat


_DIRECTION_CACHE: dict[int, list[Vector]] = {}


def icosphere_directions(subdivisions: int) -> list[Vector]:
    """Unit directions = vertices of an icosphere subdivision.

    Provides near-perfect uniform coverage of S²: minimum nearest-neighbor
    distance variance is much lower than a Fibonacci spiral, so holes never
    cluster or leave large gaps.
    """
    if subdivisions in _DIRECTION_CACHE:
        return _DIRECTION_CACHE[subdivisions]

    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=subdivisions,
        radius=1.0,
        location=(0.0, 0.0, 0.0),
    )
    helper = bpy.context.object
    directions = [v.co.normalized().copy() for v in helper.data.vertices]
    bpy.data.objects.remove(helper, do_unlink=True)
    _DIRECTION_CACHE[subdivisions] = directions
    return directions


def directions_for_all_layers() -> list[Vector]:
    """Same direction set is used for every shell so holes align radially
    across layers (the hallmark concentric-tunnel look of a guigong ball)."""
    return icosphere_directions(HOLE_ICOSPHERE_SUBDIV)


def apply_modifier(obj: bpy.types.Object, modifier_name: str) -> None:
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.modifier_apply(modifier=modifier_name)


def add_radial_cylinder_cutter(
    cutters: list[bpy.types.Object],
    direction: Vector,
    radius: float,
    hole_radius: float,
    thickness: float,
) -> None:
    """Short cylinder placed AT the shell wall, oriented along `direction`.

    Cylinders no longer pass through the origin -- so 42 of them never intersect
    each other in the centre and the joined cutter mesh stays clean.
    """
    pierce_depth = max(thickness * 4.0, hole_radius * 2.0 + thickness * 2.0)
    center = direction * (radius - thickness * 0.5)
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=48,
        radius=hole_radius,
        depth=pierce_depth,
        location=center,
    )
    cutter = bpy.context.object
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


def carve_circular_holes(
    shell: bpy.types.Object,
    radius: float,
    layer_index: int,
) -> None:
    directions = directions_for_all_layers()

    hole_radius = radius * HOLE_RADIUS_RATIO

    cutters: list[bpy.types.Object] = []
    for direction in directions:
        add_radial_cylinder_cutter(cutters, direction, radius, hole_radius, SHELL_THICKNESS)

    cutter_obj = join_cutters(cutters, f"shell_{layer_index + 1:02d}_cutters")

    boolean = shell.modifiers.new(name="circle_holes", type="BOOLEAN")
    boolean.operation = "DIFFERENCE"
    boolean.solver = "MANIFOLD"
    boolean.object = cutter_obj
    apply_modifier(shell, boolean.name)

    bpy.data.objects.remove(cutter_obj, do_unlink=True)


def create_shell(
    radius: float,
    layer_index: int,
    name: str,
    material: bpy.types.Material,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=128,
        ring_count=80,
        radius=radius,
        location=(0.0, 0.0, 0.0),
    )
    shell = bpy.context.object
    shell.name = name
    bpy.ops.object.shade_smooth()

    solid = shell.modifiers.new(name="shell_thickness", type="SOLIDIFY")
    solid.thickness = SHELL_THICKNESS
    solid.offset = -1.0
    solid.use_even_offset = True
    solid.use_quality_normals = True
    apply_modifier(shell, solid.name)

    carve_circular_holes(shell, radius, layer_index)

    bevel = shell.modifiers.new(name="edge_round", type="BEVEL")
    bevel.width = 0.008
    bevel.segments = 3
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = math.radians(28)
    apply_modifier(shell, bevel.name)

    weighted = shell.modifiers.new(name="weighted_normals", type="WEIGHTED_NORMAL")
    weighted.keep_sharp = True
    apply_modifier(shell, weighted.name)

    shell.data.materials.clear()
    shell.data.materials.append(material)
    return shell


def create_preview_ball() -> bpy.types.Object:
    bpy.ops.object.empty_add(type="PLAIN_AXES", location=(0.0, 0.0, 0.0))
    root = bpy.context.object
    root.name = "original_preview_root"

    base_mat = create_material()
    for index, radius in enumerate(SHELL_RADII, start=1):
        tint = 1.0 + (index - 1) * 0.018
        local_mat = base_mat.copy()
        bsdf = next(
            node for node in local_mat.node_tree.nodes
            if node.bl_idname == "ShaderNodeBsdfPrincipled"
        )
        base = bsdf.inputs["Base Color"].default_value
        bsdf.inputs["Base Color"].default_value = (
            min(base[0] * tint, 1.0),
            min(base[1] * tint, 1.0),
            min(base[2] * tint, 1.0),
            1.0,
        )
        shell = create_shell(radius, index - 1, f"shell_{index:02d}", local_mat)
        shell.parent = root
        print(
            f"  shell_{index:02d}: r={radius:.2f}, "
            f"verts={len(shell.data.vertices)}, polys={len(shell.data.polygons)}"
        )
    return root


def add_camera() -> None:
    bpy.ops.object.camera_add(location=(4.9, -4.5, 2.6))
    cam = bpy.context.object
    cam.name = "preview_camera"
    cam.data.lens = 48
    look_at(cam, Vector((0.0, 0.0, 0.0)))
    bpy.context.scene.camera = cam


def save_blend() -> None:
    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))


def main() -> None:
    ensure_dirs()
    clean_scene()
    setup_scene()
    add_lights()
    create_preview_ball()
    add_camera()
    save_blend()
    print(f"Saved preview model to {BLEND_PATH}")


if __name__ == "__main__":
    main()
