"""Build the experimental TARO character in Blender and export a glTF binary.

Run with Blender 4.2:

    blender --background --python experiments/taro/blender/build_taro.py

TARO_STAGE=lookdev renders turnaround and joint-calibration frames.
TARO_STAGE=final also renders expressions and exports taro.glb.
"""

from __future__ import annotations

import json
import math
import os
import sys
from dataclasses import dataclass
from pathlib import Path

import bmesh
import bpy
from mathutils import Euler, Vector

ROOT = Path(__file__).resolve().parents[1]
RENDER_DIR = ROOT / "renders"
EXPORT_DIR = ROOT / "export"
SOURCE_DIR = ROOT / "source"

NAVY = (0.043, 0.118, 0.227)
WHITE = (0.961, 0.965, 0.973)
ORANGE = (1.0, 0.478, 0.239)
CYAN = (0.0, 0.898, 1.0)
METAL = (0.788, 0.820, 0.851)
BLACK = (0.067, 0.075, 0.094)
SKIN = (0.957, 0.761, 0.643)
IRIS = (0.494, 0.816, 0.918)
LIP = (0.769, 0.478, 0.455)
MOUTH = (0.35, 0.16, 0.18)
LIMBAL = (0.102, 0.435, 0.545)


@dataclass(frozen=True)
class Measures:
    """Canonical meters. Character faces -Y. Character left is +X."""

    head_center: tuple[float, float, float] = (0.0, 0.0, 1.32)
    head_radius: float = 0.150
    eye_x: float = 0.055
    eye_y: float = -0.154
    eye_z: float = 1.318
    shoulder_x: float = 0.18
    shoulder_z: float = 1.12
    elbow_x: float = 0.27
    elbow_z: float = 0.94
    wrist_x: float = 0.31
    wrist_z: float = 0.78
    hip_x: float = 0.09
    hip_z: float = 0.74
    knee_z: float = 0.46
    ankle_z: float = 0.16
    boot_center_z: float = 0.18


M = Measures()
Vec3 = tuple[float, float, float]


def link_object(obj: bpy.types.Object) -> bpy.types.Object:
    bpy.context.scene.collection.objects.link(obj)
    return obj


def activate(obj: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def apply_modifier(obj: bpy.types.Object, name: str) -> None:
    activate(obj)
    try:
        bpy.ops.object.modifier_apply(modifier=name)
    except RuntimeError as exc:
        raise RuntimeError(f"Could not apply modifier {name} on {obj.name}") from exc


def shade_smooth(obj: bpy.types.Object) -> None:
    for poly in obj.data.polygons:
        poly.use_smooth = True
    activate(obj)
    bpy.ops.object.shade_smooth()


def finish_mesh(obj: bpy.types.Object) -> None:
    activate(obj)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.02)
    bpy.ops.object.mode_set(mode="OBJECT")
    shade_smooth(obj)


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for mesh in list(bpy.data.meshes):
        if mesh.users == 0:
            bpy.data.meshes.remove(mesh)


def make_material(
    name: str,
    base: Vec3,
    roughness: float,
    metallic: float = 0.0,
    emission: Vec3 | None = None,
    emission_strength: float = 0.0,
    specular: float = 0.35,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.use_backface_culling = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    if principled is None:
        raise RuntimeError(f"Principled BSDF missing for {name}")
    principled.inputs["Base Color"].default_value = (*base, 1.0)
    principled.inputs["Roughness"].default_value = roughness
    principled.inputs["Metallic"].default_value = metallic
    principled.inputs["Specular IOR Level"].default_value = specular
    if emission is not None:
        principled.inputs["Emission Color"].default_value = (*emission, 1.0)
        principled.inputs["Emission Strength"].default_value = emission_strength
    return material


def assign_material(obj: bpy.types.Object, material: bpy.types.Material, slot: int = 0) -> None:
    if len(obj.data.materials) <= slot:
        obj.data.materials.append(material)
    else:
        obj.data.materials[slot] = material


def new_mesh_object(name: str, mesh: bpy.types.Mesh, location: Vec3 = (0.0, 0.0, 0.0)) -> bpy.types.Object:
    obj = bpy.data.objects.new(name, mesh)
    obj.location = location
    return link_object(obj)


def rounded_box(name: str, location: Vec3, dimensions: Vec3, bevel: float, subsurf: int = 0) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.active_object
    if obj is None:
        raise RuntimeError(f"Cube operator did not create {name}")
    obj.name = name
    obj.scale = dimensions
    activate(obj)
    bpy.ops.object.transform_apply(scale=True)
    width = min(bevel, min(dimensions) * 0.22)
    modifier = obj.modifiers.new("Bevel", "BEVEL")
    modifier.width = width
    modifier.segments = 2
    modifier.limit_method = "ANGLE"
    modifier.angle_limit = math.radians(50)
    apply_modifier(obj, "Bevel")
    if subsurf > 0:
        subdivision = obj.modifiers.new("Subsurf", "SUBSURF")
        subdivision.levels = subsurf
        apply_modifier(obj, "Subsurf")
    return obj


def cylinder_between(name: str, start: Vec3, end: Vec3, radius: float, vertices: int = 16) -> bpy.types.Object:
    a = Vector(start)
    b = Vector(end)
    direction = b - a
    length = direction.length
    if length < 1e-5:
        raise ValueError(f"{name} has zero length")
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=length, location=(a + b) * 0.5)
    obj = bpy.context.active_object
    if obj is None:
        raise RuntimeError(f"Cylinder operator did not create {name}")
    obj.name = name
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction.to_track_quat("Z", "Y")
    activate(obj)
    bpy.ops.object.transform_apply(rotation=True)
    return obj


def cone_along(name: str, origin: Vec3, direction: Vec3, length: float, base_r: float, tip_r: float) -> bpy.types.Object:
    direction_v = Vector(direction).normalized()
    bpy.ops.mesh.primitive_cone_add(vertices=12, radius1=base_r, radius2=tip_r, depth=length)
    obj = bpy.context.active_object
    if obj is None:
        raise RuntimeError(f"Cone operator did not create {name}")
    obj.name = name
    obj.location = Vector(origin) + direction_v * (length * 0.5)
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = direction_v.to_track_quat("Z", "Y")
    activate(obj)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    return obj


def uv_sphere(name: str, location: Vec3, radius: float, scale: Vec3, segments: int = 24, rings: int = 16) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=radius, location=location)
    obj = bpy.context.active_object
    if obj is None:
        raise RuntimeError(f"Sphere operator did not create {name}")
    obj.name = name
    obj.scale = scale
    activate(obj)
    bpy.ops.object.transform_apply(scale=True)
    return obj


def torus(name: str, location: Vec3, major: float, minor: float, rotation: Vec3 = (0.0, 0.0, 0.0)) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major,
        minor_radius=minor,
        major_segments=24,
        minor_segments=8,
        location=location,
    )
    obj = bpy.context.active_object
    if obj is None:
        raise RuntimeError(f"Torus operator did not create {name}")
    obj.name = name
    obj.rotation_euler = rotation
    activate(obj)
    bpy.ops.object.transform_apply(rotation=True)
    return obj


def build_head(skin: bpy.types.Material) -> bpy.types.Object:
    mesh = bpy.data.meshes.new("Head")
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=24, radius=M.head_radius)
    center = Vector(M.head_center)
    for vert in bm.verts:
        x, y, z = vert.co
        z *= 1.06
        x *= 1.02
        y *= 0.94
        if z < -0.02:
            tighten = min(1.0, (-z) / M.head_radius)
            x *= 1.0 - 0.32 * tighten
            y *= 1.0 - 0.08 * tighten
        vert.co = Vector((x, y, z)) + center
    bm.to_mesh(mesh)
    bm.free()
    obj = new_mesh_object("Head", mesh)
    assign_material(obj, skin)
    return obj


def build_hair_cap() -> bpy.types.Object:
    mesh = bpy.data.meshes.new("HairCap")
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=28, v_segments=16, radius=1.0)
    stale: list[bmesh.types.BMVert] = []
    for vert in bm.verts:
        x = vert.co.x * 0.175
        y = vert.co.y * 0.162
        z = vert.co.z * 0.145 + 0.045
        world = Vector((x, y, z)) + Vector((0.0, 0.012, 1.355))
        vert.co = world
        covers_face = world.y < -0.05 and world.z < 1.38
        if world.z < 1.30 or covers_face:
            stale.append(vert)
    bmesh.ops.delete(bm, geom=stale, context="VERTS")
    bm.to_mesh(mesh)
    bm.free()
    return new_mesh_object("HairCap", mesh)


def build_hair(material: bpy.types.Material) -> bpy.types.Object:
    pieces = [
        build_hair_cap(),
        cone_along("HairSpikeL", (-0.08, -0.03, 1.43), (-0.55, -0.05, 1.0), 0.26, 0.07, 0.012),
        cone_along("HairSpikeR", (0.08, -0.03, 1.43), (0.55, -0.05, 1.0), 0.26, 0.07, 0.012),
        cone_along("HairPeak", (0.0, -0.06, 1.42), (0.0, -0.2, 1.0), 0.11, 0.036, 0.008),
        rounded_box("HairBang", (0.0, -0.108, 1.40), (0.22, 0.055, 0.07), 0.012, 1),
        uv_sphere("HairCrown", (0.0, 0.0, 1.47), 0.055, (1.3, 1.05, 0.75)),
        uv_sphere("HairBack", (0.0, 0.075, 1.36), 0.12, (1.2, 0.78, 0.95)),
        uv_sphere("HairSideL", (0.132, -0.02, 1.27), 0.038, (0.6, 0.65, 1.7)),
        uv_sphere("HairSideR", (-0.132, -0.02, 1.27), 0.038, (0.6, 0.65, 1.7)),
    ]
    for piece in pieces:
        assign_material(piece, material)
    activate(pieces[0])
    for piece in pieces:
        piece.select_set(True)
    bpy.ops.object.join()
    hair = pieces[0]
    hair.name = "Hair"
    remesh = hair.modifiers.new("Remesh", "REMESH")
    remesh.mode = "VOXEL"
    remesh.voxel_size = 0.012
    remesh.use_smooth_shade = True
    apply_modifier(hair, "Remesh")
    smooth = hair.modifiers.new("Smooth", "SMOOTH")
    smooth.factor = 0.4
    smooth.iterations = 5
    apply_modifier(hair, "Smooth")
    hair.data.materials.clear()
    assign_material(hair, material)
    return hair


def build_star() -> bpy.types.Object:
    mesh = bpy.data.meshes.new("ChestStar")
    bm = bmesh.new()
    verts: list[bmesh.types.BMVert] = []
    for i in range(8):
        angle = i * math.pi / 4 - math.pi / 2
        radius = 0.034 if i % 2 == 0 else 0.013
        verts.append(bm.verts.new((math.cos(angle) * radius, 0.0, math.sin(angle) * radius)))
    bm.faces.new(verts)
    extruded = bmesh.ops.extrude_face_region(bm, geom=bm.faces[:])
    moved = [item for item in extruded["geom"] if isinstance(item, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, verts=moved, vec=(0.0, -0.006, 0.0))
    bm.to_mesh(mesh)
    bm.free()
    return new_mesh_object("ChestStar", mesh, (0.0, -0.104, 1.03))


def build_face_mesh(skin: bpy.types.Material, black: bpy.types.Material, lip: bpy.types.Material) -> bpy.types.Object:
    bm = bmesh.new()
    stored: dict[str, list[bmesh.types.BMVert]] = {}

    def strip(name: str, points: list[Vector], offset: Vector, material_index: int) -> None:
        row_a = [bm.verts.new(point) for point in points]
        row_b = [bm.verts.new(point + offset) for point in points]
        for i in range(len(points) - 1):
            face = bm.faces.new((row_a[i], row_a[i + 1], row_b[i + 1], row_b[i]))
            face.material_index = material_index
        stored[name] = row_a + row_b

    offset = Vector((0.0, -0.007, 0.012))
    for side, x_sign, label in ((1.0, 1.0, "L"), (-1.0, -1.0, "R")):
        del side
        brow = []
        lid = []
        for i in range(7):
            t = i / 6
            x = x_sign * (0.028 + t * 0.055)
            arch = math.sin(t * math.pi) * 0.008
            brow.append(Vector((x, -0.150, 1.362 + arch)))
        eye_x = x_sign * M.eye_x
        for i in range(8):
            t = i / 7
            angle = math.pi * (1.0 - t)
            lid.append(
                Vector((eye_x + math.cos(angle) * 0.040, -0.158, M.eye_z + 0.012 + math.sin(angle) * 0.030))
            )
        strip(f"brow_{label}", brow, offset, 1)
        strip(f"lid_{label}", lid, Vector((0.0, -0.006, 0.008)), 0)

    upper: list[Vector] = []
    lower: list[Vector] = []
    for i in range(10):
        u = (i / 9) * 2.0 - 1.0
        smile = 0.010 * u * u
        x = u * 0.040
        upper.append(Vector((x, -0.160, 1.252 + smile)))
        lower.append(Vector((x, -0.158, 1.242 + smile * 0.35)))
    strip("mouth_upper", upper, Vector((0.0, -0.006, 0.007)), 2)
    strip("mouth_lower", lower, Vector((0.0, -0.006, -0.007)), 2)

    bm.verts.index_update()
    groups = {name: [vert.index for vert in verts] for name, verts in stored.items()}
    mesh = bpy.data.meshes.new("Face")
    bm.to_mesh(mesh)
    bm.free()
    obj = new_mesh_object("Face", mesh)
    assign_material(obj, skin, 0)
    assign_material(obj, black, 1)
    assign_material(obj, lip, 2)
    add_face_keys(obj, groups)
    return obj


def add_face_keys(obj: bpy.types.Object, groups: dict[str, list[int]]) -> None:
    basis = obj.shape_key_add(name="Basis")
    rest = [vert.co.copy() for vert in basis.data]

    def begin(name: str) -> bpy.types.ShapeKey:
        key = obj.shape_key_add(name=name)
        for index, co in enumerate(rest):
            key.data[index].co = co.copy()
        return key

    def move(key: bpy.types.ShapeKey, indices: list[int], delta: Vec3) -> None:
        offset = Vector(delta)
        for index in indices:
            key.data[index].co = key.data[index].co + offset

    blink = begin("blink")
    move(blink, groups["lid_L"] + groups["lid_R"], (0.0, 0.004, -0.024))

    happy = begin("happy")
    move(happy, groups["mouth_upper"], (0.0, -0.004, 0.004))
    move(happy, groups["mouth_lower"], (0.0, -0.008, -0.022))
    move(happy, groups["brow_L"] + groups["brow_R"], (0.0, 0.0, 0.006))

    curious = begin("curious")
    move(curious, groups["brow_L"], (0.0, 0.0, 0.014))
    move(curious, groups["brow_R"], (0.0, 0.0, 0.004))
    move(curious, groups["mouth_lower"], (0.0, -0.004, -0.008))

    thinking = begin("thinking")
    move(thinking, groups["brow_L"][:4] + groups["brow_R"][:4], (0.0, 0.0, -0.008))
    move(thinking, groups["mouth_upper"], (0.0, 0.0, -0.004))

    surprised = begin("surprised")
    move(surprised, groups["brow_L"] + groups["brow_R"], (0.0, 0.0, 0.016))
    move(surprised, groups["mouth_upper"], (0.0, -0.006, 0.010))
    move(surprised, groups["mouth_lower"], (0.0, -0.008, -0.016))

    confident = begin("confident")
    move(confident, groups["mouth_upper"], (0.0, -0.002, 0.006))
    move(confident, groups["mouth_lower"], (0.0, -0.002, -0.004))
    move(confident, groups["brow_L"] + groups["brow_R"], (0.0, 0.0, -0.004))

    concerned = begin("concerned")
    move(concerned, groups["brow_L"][:4] + groups["brow_R"][:4], (0.0, 0.0, 0.012))
    move(concerned, groups["mouth_lower"][:3] + groups["mouth_lower"][-3:], (0.0, 0.0, -0.008))

    keys = obj.data.shape_keys
    if keys is None:
        raise RuntimeError("Face shape keys were not created")
    for key in keys.key_blocks:
        key.slider_min = 0.0
        key.slider_max = 1.0


def build_eyes(white: bpy.types.Material, iris: bpy.types.Material, black: bpy.types.Material, limbal: bpy.types.Material) -> dict[str, bpy.types.Object]:
    objects: dict[str, bpy.types.Object] = {}
    for label, x_sign in (("L", 1.0), ("R", -1.0)):
        center = (x_sign * M.eye_x, M.eye_y, M.eye_z)
        sclera = uv_sphere(f"Sclera{label}", center, 0.040, (1.08, 0.70, 1.18), 24, 16)
        iris_obj = uv_sphere(f"Iris{label}", (center[0], center[1] - 0.018, center[2]), 0.026, (1.0, 0.42, 1.0), 20, 12)
        pupil = uv_sphere(f"Pupil{label}", (center[0], center[1] - 0.026, center[2]), 0.012, (1.0, 0.35, 1.0), 16, 10)
        catch = uv_sphere(
            f"Catchlight{label}",
            (center[0] - x_sign * 0.008, center[1] - 0.032, center[2] + 0.010),
            0.006,
            (1.0, 0.45, 1.0),
            12,
            8,
        )
        ring = torus(f"EyeRing{label}", (center[0], center[1] - 0.012, center[2]), 0.039, 0.0028, (math.pi / 2, 0.0, 0.0))
        limb = torus(f"Limbus{label}", (center[0], center[1] - 0.016, center[2]), 0.025, 0.0026, (math.pi / 2, 0.0, 0.0))
        assign_material(sclera, white)
        assign_material(iris_obj, iris)
        assign_material(pupil, black)
        assign_material(catch, white)
        assign_material(ring, black)
        assign_material(limb, limbal)
        objects[label] = sclera
        objects[f"iris_{label}"] = iris_obj
        objects[f"pupil_{label}"] = pupil
        objects[f"catch_{label}"] = catch
        objects[f"ring_{label}"] = ring
        objects[f"limb_{label}"] = limb
    return objects


def build_body(materials: dict[str, bpy.types.Material]) -> dict[str, bpy.types.Object]:
    objects: dict[str, bpy.types.Object] = {}
    objects["neck"] = cylinder_between("Neck", (0.0, 0.0, 1.16), (0.0, 0.0, 1.28), 0.048)
    objects["torso"] = rounded_box("Torso", (0.0, 0.0, 1.00), (0.30, 0.17, 0.38), 0.028, 1)
    objects["pelvis"] = rounded_box("Pelvis", (0.0, 0.0, 0.76), (0.26, 0.16, 0.18), 0.02, 1)
    objects["chest"] = rounded_box("ChestPlate", (0.0, -0.078, 1.03), (0.16, 0.04, 0.16), 0.012, 1)
    objects["collar"] = torus("Collar", (0.0, 0.0, 1.175), 0.058, 0.011)
    objects["star"] = build_star()
    objects["belt"] = torus("Belt", (0.0, 0.0, 0.88), 0.115, 0.012)
    objects["core"] = torus("EnergyCore", (0.0, -0.108, 0.88), 0.030, 0.007, (math.pi / 2, 0.0, 0.0))
    objects["core_ring"] = torus("EnergyRing", (0.0, -0.112, 0.88), 0.042, 0.004, (math.pi / 2, 0.0, 0.0))
    assign_material(objects["neck"], materials["navy"])
    assign_material(objects["torso"], materials["navy"])
    assign_material(objects["pelvis"], materials["navy"])
    assign_material(objects["chest"], materials["white"])
    assign_material(objects["collar"], materials["white"])
    assign_material(objects["star"], materials["navy"])
    assign_material(objects["belt"], materials["navy"])
    assign_material(objects["core"], materials["cyan"])
    assign_material(objects["core_ring"], materials["metal"])

    for label, sign in (("L", 1.0), ("R", -1.0)):
        shoulder = (sign * M.shoulder_x, 0.0, M.shoulder_z)
        elbow = (sign * M.elbow_x, 0.02, M.elbow_z)
        wrist = (sign * M.wrist_x, 0.03, M.wrist_z)
        hip = (sign * M.hip_x, 0.0, M.hip_z)
        knee = (sign * M.hip_x, 0.01, M.knee_z)
        objects[f"upper_{label}"] = cylinder_between(f"UpperArm{label}", shoulder, elbow, 0.046)
        objects[f"fore_{label}"] = cylinder_between(f"Forearm{label}", elbow, wrist, 0.038)
        objects[f"thigh_{label}"] = cylinder_between(f"Thigh{label}", hip, knee, 0.058)
        ring = torus(f"ShoulderRing{label}", shoulder, 0.052, 0.014)
        objects[f"glove_{label}"] = rounded_box(f"Glove{label}", (sign * 0.32, 0.025, 0.74), (0.14, 0.11, 0.15), 0.02, 1)
        thumb = uv_sphere(f"Thumb{label}", (sign * 0.27, -0.01, 0.74), 0.035, (0.7, 0.8, 1.0))
        boot_loc = (sign * 0.115, -0.02, 0.24)
        objects[f"boot_{label}"] = rounded_box(f"Boot{label}", boot_loc, (0.16, 0.26, 0.48), 0.022, 1)
        cuff = torus(f"BootCuff{label}", (sign * 0.115, -0.02, 0.46), 0.078, 0.011)
        nozzle = cylinder_between(
            f"Nozzle{label}",
            (sign * 0.10, -0.08, 0.07),
            (sign * 0.10, -0.15, 0.05),
            0.028,
            12,
        )
        objects[f"ring_{label}"] = ring
        objects[f"thumb_{label}"] = thumb
        objects[f"cuff_{label}"] = cuff
        objects[f"nozzle_{label}"] = nozzle
        assign_material(objects[f"upper_{label}"], materials["navy"])
        assign_material(objects[f"fore_{label}"], materials["navy"])
        assign_material(objects[f"thigh_{label}"], materials["navy"])
        assign_material(ring, materials["orange"])
        assign_material(objects[f"glove_{label}"], materials["white"])
        assign_material(thumb, materials["white"])
        assign_material(objects[f"boot_{label}"], materials["white"])
        assign_material(cuff, materials["metal"])
        assign_material(nozzle, materials["orange_glow"])
    return objects


def create_bone(
    arm: bpy.types.Armature,
    name: str,
    head: Vec3,
    tail: Vec3,
    parent: str | None,
    outward: Vec3,
    roll_vector: Vec3 = (0.0, -1.0, 0.0),
) -> None:
    bone = arm.edit_bones.new(name)
    bone.head = head
    bone.tail = tail
    if parent is not None:
        bone.parent = arm.edit_bones[parent]
        bone.use_connect = False
    direction = Vector(tail) - Vector(head)
    roll = Vector(roll_vector)
    if direction.length > 1e-6 and abs(direction.normalized().dot(roll.normalized())) > 0.98:
        roll = Vector((0.0, 0.0, 1.0))
    bone.align_roll(roll)
    if bone.x_axis.dot(Vector(outward)) < 0.0:
        bone.roll += math.pi


def build_rig() -> bpy.types.Object:
    arm = bpy.data.armatures.new("TaroRig")
    rig = bpy.data.objects.new("TaroRig", arm)
    link_object(rig)
    activate(rig)
    bpy.ops.object.mode_set(mode="EDIT")
    outward_l = (1.0, 0.0, 0.0)
    outward_r = (-1.0, 0.0, 0.0)
    front = (0.0, -1.0, 0.0)
    create_bone(arm, "root", (0.0, 0.0, 0.02), (0.0, 0.0, 0.12), None, front)
    create_bone(arm, "pelvis", (0.0, 0.0, 0.72), (0.0, 0.0, 0.84), "root", front)
    create_bone(arm, "spine", (0.0, 0.0, 0.84), (0.0, 0.0, 1.02), "pelvis", front)
    create_bone(arm, "chest", (0.0, 0.0, 1.02), (0.0, 0.0, 1.16), "spine", front)
    create_bone(arm, "neck", (0.0, 0.0, 1.16), (0.0, 0.0, 1.26), "chest", front)
    create_bone(arm, "head", (0.0, 0.0, 1.26), (0.0, 0.0, 1.50), "neck", front)
    for label, sign, outward in (("L", 1.0, outward_l), ("R", -1.0, outward_r)):
        shoulder = (sign * 0.08, 0.0, M.shoulder_z)
        create_bone(arm, f"shoulder_{label}", (sign * 0.04, 0.0, M.shoulder_z), shoulder, "chest", outward)
        create_bone(
            arm,
            f"upper_arm_{label}",
            (sign * M.shoulder_x, 0.0, M.shoulder_z),
            (sign * M.elbow_x, 0.02, M.elbow_z),
            f"shoulder_{label}",
            outward,
        )
        create_bone(
            arm,
            f"forearm_{label}",
            (sign * M.elbow_x, 0.02, M.elbow_z),
            (sign * M.wrist_x, 0.03, M.wrist_z),
            f"upper_arm_{label}",
            outward,
        )
        create_bone(
            arm,
            f"hand_{label}",
            (sign * M.wrist_x, 0.03, M.wrist_z),
            (sign * 0.34, 0.04, 0.64),
            f"forearm_{label}",
            outward,
        )
        create_bone(arm, f"thigh_{label}", (sign * M.hip_x, 0.0, M.hip_z), (sign * M.hip_x, 0.01, M.knee_z), "pelvis", outward)
        create_bone(arm, f"shin_{label}", (sign * M.hip_x, 0.01, M.knee_z), (sign * M.hip_x, 0.0, M.ankle_z), f"thigh_{label}", outward)
        create_bone(arm, f"foot_{label}", (sign * M.hip_x, 0.0, M.ankle_z), (sign * M.hip_x, -0.08, 0.04), f"shin_{label}", front)
        create_bone(
            arm,
            f"eye_{label}",
            (sign * M.eye_x, M.eye_y, M.eye_z),
            (sign * M.eye_x, M.eye_y - 0.04, M.eye_z),
            "head",
            (1.0, 0.0, 0.0),
            (0.0, 0.0, 1.0),
        )
    bpy.ops.object.mode_set(mode="OBJECT")
    rig["taro_experimental"] = True
    return rig


def bind_rigid(obj: bpy.types.Object, rig: bpy.types.Object, bone_name: str) -> None:
    if bone_name not in rig.data.bones:
        raise KeyError(f"Missing bone {bone_name} for {obj.name}")
    group = obj.vertex_groups.new(name=bone_name)
    group.add([vert.index for vert in obj.data.vertices], 1.0, "REPLACE")
    modifier = obj.modifiers.new("Armature", "ARMATURE")
    modifier.object = rig
    world = obj.matrix_world.copy()
    obj.parent = rig
    obj.matrix_world = world


def bind_all(objects: dict[str, bpy.types.Object], eyes: dict[str, bpy.types.Object], rig: bpy.types.Object) -> None:
    pairs = {
        "Head": "head",
        "Hair": "head",
        "Face": "head",
        "Nose": "head",
        "EarL": "head",
        "EarR": "head",
        "MouthInterior": "head",
        "Neck": "neck",
        "Collar": "neck",
        "Torso": "chest",
        "Pelvis": "pelvis",
        "ChestPlate": "chest",
        "ChestStar": "chest",
        "Belt": "spine",
        "EnergyCore": "spine",
        "EnergyRing": "spine",
    }
    for label in ("L", "R"):
        pairs[f"Sclera{label}"] = f"eye_{label}"
        pairs[f"Iris{label}"] = f"eye_{label}"
        pairs[f"Pupil{label}"] = f"eye_{label}"
        pairs[f"Catchlight{label}"] = f"eye_{label}"
        pairs[f"EyeRing{label}"] = f"eye_{label}"
        pairs[f"Limbus{label}"] = f"eye_{label}"
        pairs[f"UpperArm{label}"] = f"upper_arm_{label}"
        pairs[f"Forearm{label}"] = f"forearm_{label}"
        pairs[f"Thigh{label}"] = f"thigh_{label}"
        pairs[f"ShoulderRing{label}"] = f"upper_arm_{label}"
        pairs[f"Glove{label}"] = f"hand_{label}"
        pairs[f"Thumb{label}"] = f"hand_{label}"
        pairs[f"Boot{label}"] = f"shin_{label}"
        pairs[f"BootCuff{label}"] = f"shin_{label}"
        pairs[f"Nozzle{label}"] = f"shin_{label}"
    named = {obj.name: obj for obj in bpy.context.scene.objects if obj.type == "MESH"}
    missing = sorted(set(pairs) - set(named))
    if missing:
        raise RuntimeError(f"Meshes missing before bind: {missing}")
    for name, bone in pairs.items():
        bind_rigid(named[name], rig, bone)
    del objects, eyes


def look_at(obj: bpy.types.Object, target: Vec3) -> None:
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def configure_render(scene: bpy.types.Scene) -> None:
    engines = {item.identifier for item in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items}
    for candidate in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE", "BLENDER_WORKBENCH"):
        if candidate in engines:
            scene.render.engine = candidate
            break
    scene.render.resolution_x = 720
    scene.render.resolution_y = 960
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    scene.render.fps = 24
    scene.render.image_settings.file_format = "PNG"
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    if scene.render.engine == "BLENDER_EEVEE_NEXT" and hasattr(scene.eevee, "taa_render_samples"):
        scene.eevee.taa_render_samples = 16


def set_world(color: Vec3) -> None:
    world = bpy.context.scene.world
    if world is None:
        world = bpy.data.worlds.new("World")
        bpy.context.scene.world = world
    world.use_nodes = True
    background = world.node_tree.nodes.get("Background")
    if background is None:
        raise RuntimeError("World background node is missing")
    background.inputs["Color"].default_value = (*color, 1.0)
    background.inputs["Strength"].default_value = 1.0


def add_lights() -> None:
    specs = (
        ("Key", (-1.2, -2.4, 2.2), 42.0, 3.4),
        ("Fill", (1.8, -1.6, 1.3), 16.0, 3.6),
        ("Rim", (0.3, 2.3, 1.8), 28.0, 2.4),
    )
    for name, location, energy, size in specs:
        light = bpy.data.lights.new(name, "AREA")
        light.energy = energy
        light.size = size
        light.color = (1.0, 0.98, 0.95)
        obj = bpy.data.objects.new(name, light)
        obj.location = location
        link_object(obj)
        look_at(obj, (0.0, 0.0, 0.9))


def add_camera(name: str, location: Vec3, ortho: float) -> bpy.types.Object:
    camera = bpy.data.cameras.new(name)
    camera.type = "ORTHO"
    camera.ortho_scale = ortho
    camera.clip_start = 0.01
    camera.clip_end = 50.0
    obj = bpy.data.objects.new(name, camera)
    obj.location = location
    link_object(obj)
    look_at(obj, (0.0, 0.0, 0.86))
    return obj


def render_to(scene: bpy.types.Scene, camera: bpy.types.Object, filename: str, size: tuple[int, int] | None = None) -> None:
    scene.camera = camera
    if size is not None:
        scene.render.resolution_x, scene.render.resolution_y = size
    scene.render.filepath = str(RENDER_DIR / filename)
    bpy.ops.render.render(write_still=True)


def rest_pose(rig: bpy.types.Object, face: bpy.types.Object) -> None:
    if rig.animation_data is not None:
        rig.animation_data.action = None
    for pose_bone in rig.pose.bones:
        pose_bone.rotation_mode = "XYZ"
        pose_bone.rotation_euler = (0.0, 0.0, 0.0)
        pose_bone.location = (0.0, 0.0, 0.0)
        pose_bone.scale = (1.0, 1.0, 1.0)
    set_emotion(face, None, 0.0)
    bpy.context.view_layer.update()


def render_turnaround(scene: bpy.types.Scene) -> None:
    views = (
        ("front.png", (0.0, -3.4, 0.88), 2.05, (720, 960)),
        ("left.png", (3.4, 0.0, 0.88), 2.05, (720, 960)),
        ("right.png", (-3.4, 0.0, 0.88), 2.05, (720, 960)),
        ("back.png", (0.0, 3.4, 0.88), 2.05, (720, 960)),
        ("three_quarter.png", (-2.1, -2.5, 1.05), 2.15, (860, 960)),
        ("front_small.png", (0.0, -3.4, 0.88), 2.05, (160, 210)),
    )
    set_world((0.91, 0.89, 0.84))
    for filename, location, scale, size in views:
        camera = add_camera(filename, location, scale)
        render_to(scene, camera, filename, size)
    set_world((0.08, 0.09, 0.11))
    dark_camera = add_camera("dark", (0.0, -3.4, 0.88), 2.05)
    render_to(scene, dark_camera, "front_dark.png", (720, 960))
    set_world((0.91, 0.89, 0.84))


def render_face(scene: bpy.types.Scene, filename: str) -> None:
    camera = add_camera(filename, (0.0, -1.15, 1.33), 0.52)
    look_at(camera, (0.0, 0.0, 1.32))
    render_to(scene, camera, filename, (640, 640))


def set_emotion(face: bpy.types.Object, emotion: str | None, blink: float) -> None:
    keys = face.data.shape_keys
    if keys is None:
        raise RuntimeError("Face has no shape keys")
    for name in ("happy", "curious", "thinking", "surprised", "confident", "concerned"):
        keys.key_blocks[name].value = 1.0 if name == emotion else 0.0
    keys.key_blocks["blink"].value = blink


def push_action(datablock: bpy.types.ID) -> None:
    animation = datablock.animation_data
    if animation is None or animation.action is None:
        return
    action = animation.action
    track = animation.nla_tracks.new()
    track.name = action.name
    track.strips.new(action.name, int(action.frame_range[0]), action)
    animation.action = None


def ensure_action(datablock: bpy.types.ID, name: str) -> bpy.types.Action:
    if datablock.animation_data is None:
        datablock.animation_data_create()
    animation = datablock.animation_data
    if animation is None:
        raise RuntimeError(f"No animation data on {datablock}")
    push_action(datablock)
    action = bpy.data.actions.new(name)
    animation.action = action
    return action


def key_clip(rig: bpy.types.Object, face: bpy.types.Object, name: str, samples: list[dict[str, object]]) -> None:
    scene = bpy.context.scene
    rig_action = ensure_action(rig, name)
    shape_keys = face.data.shape_keys
    if shape_keys is None:
        raise RuntimeError("Cannot key a face without shape keys")
    face_action = ensure_action(shape_keys, name)
    emotions = ("happy", "curious", "thinking", "surprised", "confident", "concerned", "blink")
    for sample in samples:
        frame = int(sample["frame"])
        scene.frame_set(frame)
        rotations = sample["rot"]
        locations = sample["loc"]
        if not isinstance(rotations, dict) or not isinstance(locations, dict):
            raise TypeError(f"Bad sample in {name}")
        for pose_bone in rig.pose.bones:
            pose_bone.rotation_mode = "XYZ"
            degrees = rotations.get(pose_bone.name, (0.0, 0.0, 0.0))
            if not isinstance(degrees, tuple):
                raise TypeError(f"Rotation for {pose_bone.name} is not a tuple")
            pose_bone.rotation_euler = tuple(math.radians(float(axis)) for axis in degrees)
            location = locations.get(pose_bone.name, (0.0, 0.0, 0.0))
            if not isinstance(location, tuple):
                raise TypeError(f"Location for {pose_bone.name} is not a tuple")
            pose_bone.location = location
            pose_bone.keyframe_insert(data_path="rotation_euler", frame=frame)
            pose_bone.keyframe_insert(data_path="location", frame=frame)
        emotion = sample["emotion"]
        blink = float(sample["blink"])
        set_emotion(face, emotion if isinstance(emotion, str) else None, blink)
        for key_name in emotions:
            shape_keys.key_blocks[key_name].keyframe_insert(data_path="value", frame=frame)
    rig_action.use_fake_user = True
    face_action.use_fake_user = True


def sample(frame: int, rot: dict[str, Vec3] | None = None, loc: dict[str, Vec3] | None = None, emotion: str | None = None, blink: float = 0.0) -> dict[str, object]:
    return {"frame": frame, "rot": rot or {}, "loc": loc or {}, "emotion": emotion, "blink": blink}


def mute_nla() -> None:
    datablocks: list[bpy.types.ID] = list(bpy.data.objects)
    datablocks.extend(bpy.data.shape_keys)
    for datablock in datablocks:
        animation = datablock.animation_data
        if animation is None:
            continue
        animation.use_nla = False
        for track in animation.nla_tracks:
            track.mute = True


def build_clips(rig: bpy.types.Object, face: bpy.types.Object) -> None:
    """Pose values are placeholders until lookdev calibration confirms bend axes."""
    pose_a = {"spine": (4.0, 0.0, 0.0), "head": (2.0, 6.0, 0.0)}
    pose_b = {"spine": (1.0, 0.0, 0.0), "head": (1.0, -6.0, 0.0)}
    idle = [
        sample(1),
        sample(24, pose_a),
        sample(40, pose_a, blink=1.0),
        sample(46, pose_a),
        sample(72, pose_b),
        sample(88, pose_b, blink=1.0),
        sample(94, pose_b),
        sample(96),
    ]
    wave_up = {"upper_arm_R": (78.0, 0.0, -12.0)}
    greeting = [
        sample(1),
        sample(16, {**wave_up, "forearm_R": (30.0, 0.0, 0.0)}, emotion="happy"),
        sample(28, {**wave_up, "forearm_R": (75.0, 0.0, 0.0)}, emotion="happy"),
        sample(40, {**wave_up, "forearm_R": (28.0, 0.0, 0.0)}, emotion="happy"),
        sample(52, {**wave_up, "forearm_R": (72.0, 0.0, 0.0)}, emotion="happy"),
        sample(72, emotion="happy"),
    ]
    listening = [
        sample(1, {"head": (4.0, 0.0, 8.0)}, emotion="curious"),
        sample(48, {"head": (6.0, 4.0, 8.0)}, emotion="curious"),
        sample(96, {"head": (4.0, 0.0, 8.0)}, emotion="curious"),
    ]
    thinking = [
        sample(1, {"upper_arm_L": (68.0, 0.0, 8.0), "forearm_L": (95.0, 0.0, 0.0), "head": (10.0, -4.0, 0.0)}, emotion="thinking"),
        sample(48, {"upper_arm_L": (72.0, 0.0, 8.0), "forearm_L": (95.0, 0.0, 0.0), "head": (12.0, 4.0, 0.0)}, emotion="thinking"),
        sample(96, {"upper_arm_L": (68.0, 0.0, 8.0), "forearm_L": (95.0, 0.0, 0.0), "head": (10.0, -4.0, 0.0)}, emotion="thinking"),
    ]
    open_arms = {
        "upper_arm_L": (52.0, 0.0, 10.0),
        "upper_arm_R": (52.0, 0.0, -10.0),
        "forearm_L": (22.0, 0.0, 0.0),
        "forearm_R": (22.0, 0.0, 0.0),
    }
    explaining = [
        sample(1),
        sample(28, open_arms, emotion="confident"),
        sample(64, open_arms, emotion="confident"),
    ]
    discovery = [
        sample(1, emotion="happy"),
        sample(12, {"root": (0.0, 0.0, 0.0)}, {"root": (0.0, 0.0, 0.10)}, "surprised"),
        sample(28, loc={"root": (0.0, 0.0, 0.04)}, emotion="happy"),
        sample(42, emotion="happy"),
    ]
    insufficient = [
        sample(1),
        sample(24, {"head": (10.0, 0.0, 0.0)}, emotion="concerned"),
        sample(64, {"head": (10.0, 0.0, 0.0)}, emotion="concerned"),
    ]
    error = [
        sample(1, emotion="concerned"),
        sample(12, {"head": (6.0, 10.0, 0.0)}, emotion="concerned"),
        sample(24, {"head": (6.0, -10.0, 0.0)}, emotion="concerned"),
        sample(36, {"head": (6.0, 6.0, 0.0)}, emotion="concerned"),
        sample(48, {"head": (4.0, 0.0, 0.0)}, emotion="concerned"),
    ]
    guiding = [
        sample(1, loc={"root": (0.0, 0.0, 0.16)}),
        sample(
            24,
            {"spine": (10.0, 0.0, 0.0), "upper_arm_L": (88.0, 0.0, -18.0), "head": (8.0, 0.0, 0.0)},
            {"root": (0.0, 0.0, 0.14)},
            "confident",
        ),
        sample(
            56,
            {"spine": (10.0, 0.0, 0.0), "upper_arm_L": (88.0, 0.0, -18.0), "head": (8.0, 0.0, 0.0)},
            {"root": (0.0, 0.0, 0.12)},
            "confident",
        ),
    ]
    clips = {
        "idle": idle,
        "greeting": greeting,
        "listening": listening,
        "thinking": thinking,
        "explaining": explaining,
        "discovery": discovery,
        "insufficient": insufficient,
        "error": error,
        "guiding": guiding,
    }
    for name, samples in clips.items():
        key_clip(rig, face, name, samples)
        still = samples[len(samples) // 2]
        held = dict(still)
        held["frame"] = 1
        end = dict(still)
        end["frame"] = 2
        end["blink"] = 0.0
        key_clip(rig, face, f"{name}_reduced", [held, end])
    push_action(rig)
    shape_keys = face.data.shape_keys
    if shape_keys is not None:
        push_action(shape_keys)
    mute_nla()


def render_calibration(scene: bpy.types.Scene, rig: bpy.types.Object) -> None:
    camera = add_camera("calib", (0.0, -3.2, 0.9), 1.7)
    for bone_name in ("upper_arm_R", "forearm_R"):
        for axis in range(3):
            for pose_bone in rig.pose.bones:
                pose_bone.rotation_mode = "XYZ"
                pose_bone.rotation_euler = (0.0, 0.0, 0.0)
                pose_bone.location = (0.0, 0.0, 0.0)
            pose_bone = rig.pose.bones[bone_name]
            pose_bone.rotation_euler[axis] = math.radians(65.0)
            bpy.context.view_layer.update()
            axis_name = "xyz"[axis]
            render_to(scene, camera, f"calib_{bone_name}_{axis_name}.png", (480, 640))
    for pose_bone in rig.pose.bones:
        pose_bone.rotation_euler = (0.0, 0.0, 0.0)


def render_pose_proofs(scene: bpy.types.Scene, rig: bpy.types.Object, face: bpy.types.Object) -> None:
    camera = add_camera("poses", (0.0, -3.4, 0.88), 2.05)
    shape_keys = face.data.shape_keys
    proofs = ("greeting", "listening", "thinking", "explaining", "discovery", "insufficient", "guiding", "error")
    for name in proofs:
        action = bpy.data.actions.get(name)
        if action is None or rig.animation_data is None or shape_keys is None or shape_keys.animation_data is None:
            raise RuntimeError(f"Missing posed action {name}")
        rig.animation_data.action = action
        shape_keys.animation_data.action = action
        scene.frame_set(int((action.frame_range[0] + action.frame_range[1]) / 2))
        bpy.context.view_layer.update()
        render_to(scene, camera, f"pose_{name}.png", (480, 640))
    rig.animation_data.action = None
    shape_keys.animation_data.action = None


def render_expressions(scene: bpy.types.Scene, face: bpy.types.Object) -> None:
    for emotion in (None, "happy", "curious", "thinking", "surprised", "confident", "concerned"):
        set_emotion(face, emotion, 0.0)
        bpy.context.view_layer.update()
        label = "neutral" if emotion is None else emotion
        render_face(scene, f"expr_{label}.png")
    set_emotion(face, None, 1.0)
    bpy.context.view_layer.update()
    render_face(scene, "expr_blink.png")
    set_emotion(face, None, 0.0)


def triangle_count() -> int:
    total = 0
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        total += sum(len(poly.vertices) - 2 for poly in obj.data.polygons)
    return total


def export_glb(rig: bpy.types.Object) -> Path:
    path = EXPORT_DIR / "taro.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(path),
        export_format="GLB",
        use_selection=False,
        export_apply=False,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_nla_strips=True,
        export_morph=True,
        export_skins=True,
        export_yup=True,
        export_materials="EXPORT",
        export_cameras=False,
        export_lights=False,
        export_extras=True,
    )
    del rig
    return path


def read_glb(path: Path) -> tuple[dict[str, object], bytes]:
    data = path.read_bytes()
    if data[:4] != b"glTF":
        raise RuntimeError("Exported file is not a GLB")
    chunk_length = int.from_bytes(data[12:16], "little")
    chunk_type = data[16:20]
    if chunk_type != b"JSON":
        raise RuntimeError("GLB JSON chunk missing")
    document = json.loads(data[20 : 20 + chunk_length])
    bin_start = 20 + chunk_length
    bin_length = int.from_bytes(data[bin_start : bin_start + 4], "little")
    bin_type = data[bin_start + 4 : bin_start + 8]
    if bin_type != b"BIN\x00":
        raise RuntimeError("GLB binary chunk missing")
    binary = data[bin_start + 8 : bin_start + 8 + bin_length]
    return document, binary


def write_glb(path: Path, document: dict[str, object], binary: bytes) -> None:
    payload = json.dumps(document, separators=(",", ":")).encode("utf-8")
    payload += b" " * ((4 - len(payload) % 4) % 4)
    binary += b"\x00" * ((4 - len(binary) % 4) % 4)
    total = 12 + 8 + len(payload) + 8 + len(binary)
    header = b"glTF" + (2).to_bytes(4, "little") + total.to_bytes(4, "little")
    json_chunk = len(payload).to_bytes(4, "little") + b"JSON" + payload
    bin_chunk = len(binary).to_bytes(4, "little") + b"BIN\x00" + binary
    path.write_bytes(header + json_chunk + bin_chunk)


def merge_shape_key_clips(path: Path) -> None:
    """Blender uniquifies action names, so morph clips export as name.001."""
    document, binary = read_glb(path)
    animations = document.get("animations", [])
    if not isinstance(animations, list):
        raise RuntimeError("GLB animations are not a list")
    by_name = {str(item.get("name", "")): item for item in animations}
    removed: list[dict[str, object]] = []
    for animation in animations:
        if not isinstance(animation, dict):
            continue
        name = str(animation.get("name", ""))
        if not name.endswith(".001"):
            continue
        host = by_name.get(name[:-4])
        if not isinstance(host, dict):
            animation["name"] = name[:-4]
            continue
        host_samplers = host.setdefault("samplers", [])
        extra_samplers = animation.get("samplers", [])
        if not isinstance(host_samplers, list) or not isinstance(extra_samplers, list):
            continue
        offset = len(host_samplers)
        host_samplers.extend(extra_samplers)
        host_channels = host.setdefault("channels", [])
        extra_channels = animation.get("channels", [])
        if not isinstance(host_channels, list) or not isinstance(extra_channels, list):
            continue
        for channel in extra_channels:
            if isinstance(channel, dict) and isinstance(channel.get("sampler"), int):
                channel["sampler"] = int(channel["sampler"]) + offset
            host_channels.append(channel)
        removed.append(animation)
    document["animations"] = [item for item in animations if item not in removed]
    write_glb(path, document, binary)


def glb_summary(path: Path) -> dict[str, object]:
    document, _binary = read_glb(path)
    triangles = 0
    for mesh in document.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            indices = primitive.get("indices")
            if indices is None:
                continue
            count = document["accessors"][indices]["count"]
            triangles += count // 3
    animations = [item.get("name", "") for item in document.get("animations", [])]
    return {
        "bytes": path.stat().st_size,
        "triangles": triangles,
        "animations": animations,
        "meshes": len(document.get("meshes", [])),
        "materials": len(document.get("materials", [])),
        "skins": len(document.get("skins", [])),
        "nodes": len(document.get("nodes", [])),
    }


def write_report(stage: str, glb_path: Path | None) -> None:
    rig = bpy.data.objects["TaroRig"]
    face = bpy.data.objects["Face"]
    keys = face.data.shape_keys
    report: dict[str, object] = {
        "stage": stage,
        "blender": bpy.app.version_string,
        "triangles_blender": triangle_count(),
        "bones": [bone.name for bone in rig.data.bones],
        "shape_keys": list(keys.key_blocks.keys()) if keys is not None else [],
        "actions": sorted({action.name for action in bpy.data.actions}),
        "materials": sorted({material.name for material in bpy.data.materials}),
        "experimental": True,
        "mounted_in_explore": False,
    }
    if glb_path is not None:
        report["glb"] = glb_summary(glb_path)
    (EXPORT_DIR / "report.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    print(json.dumps(report, indent=2))


def build_materials() -> dict[str, bpy.types.Material]:
    return {
        "navy": make_material("NavySuit", NAVY, 0.55, specular=0.3),
        "white": make_material("WhiteArmor", WHITE, 0.48, metallic=0.02, specular=0.32),
        "orange": make_material("EnergyOrange", ORANGE, 0.42, specular=0.28),
        "orange_glow": make_material("NozzleGlow", ORANGE, 0.35, emission=ORANGE, emission_strength=1.1, specular=0.28),
        "cyan": make_material("ElectricCyan", CYAN, 0.25, emission=CYAN, emission_strength=2.5, specular=0.4),
        "metal": make_material("SoftMetal", METAL, 0.35, metallic=0.65, specular=0.45),
        "hair": make_material("HairBlack", BLACK, 0.32, specular=0.55),
        "skin": make_material("Skin", (0.86, 0.62, 0.50), 0.62, specular=0.25),
        "iris": make_material("Iris", IRIS, 0.22, emission=IRIS, emission_strength=0.45, specular=0.4),
        "black": make_material("Black", BLACK, 0.45, specular=0.2),
        "lip": make_material("Lip", LIP, 0.55, specular=0.25),
        "mouth": make_material("MouthInterior", MOUTH, 0.7, specular=0.1),
        "limbal": make_material("Limbus", LIMBAL, 0.4),
        "eye_white": make_material("Sclera", WHITE, 0.28, specular=0.45),
    }


def main() -> None:
    stage = os.environ.get("TARO_STAGE", "lookdev")
    if stage not in {"lookdev", "final"}:
        raise SystemExit(f"Unknown TARO_STAGE {stage}")
    RENDER_DIR.mkdir(parents=True, exist_ok=True)
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    reset_scene()
    scene = bpy.context.scene
    configure_render(scene)
    set_world((0.91, 0.89, 0.84))
    add_lights()
    materials = build_materials()
    head = build_head(materials["skin"])
    hair = build_hair(materials["hair"])
    face = build_face_mesh(materials["skin"], materials["black"], materials["lip"])
    eyes = build_eyes(materials["eye_white"], materials["iris"], materials["black"], materials["limbal"])
    body = build_body(materials)
    nose = uv_sphere("Nose", (0.0, -0.162, 1.275), 0.014, (0.8, 0.7, 0.75), 12, 8)
    assign_material(nose, materials["skin"])
    ear_l = uv_sphere("EarL", (0.145, 0.0, 1.30), 0.04, (0.45, 0.7, 0.9), 16, 12)
    ear_r = uv_sphere("EarR", (-0.145, 0.0, 1.30), 0.04, (0.45, 0.7, 0.9), 16, 12)
    assign_material(ear_l, materials["skin"])
    assign_material(ear_r, materials["skin"])
    mouth = uv_sphere("MouthInterior", (0.0, -0.142, 1.244), 0.016, (1.15, 0.28, 0.55), 16, 10)
    assign_material(mouth, materials["mouth"])
    rig = build_rig()
    for obj in (*body.values(), head, hair, face, nose, ear_l, ear_r, mouth, *eyes.values()):
        finish_mesh(obj)
    bind_all(body, eyes, rig)
    build_clips(rig, face)
    scene.frame_set(1)
    rest_pose(rig, face)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE_DIR / "taro.blend"))
    render_turnaround(scene)
    render_face(scene, "face_neutral.png")
    if stage == "lookdev":
        render_calibration(scene, rig)
        write_report(stage, None)
        return
    render_expressions(scene, face)
    render_pose_proofs(scene, rig, face)
    for material in list(bpy.data.materials):
        if material.users == 0:
            bpy.data.materials.remove(material)
    glb_path = export_glb(rig)
    merge_shape_key_clips(glb_path)
    bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE_DIR / "taro.blend"))
    write_report(stage, glb_path)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"TARO build failed: {exc}", file=sys.stderr)
        raise
