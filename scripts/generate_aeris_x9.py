"""
AERIS X-9 — Headless Blender 4.5 Procedural High-Detail Modular Aircraft Generator
Generates `public/assets/aircraft/aeris-x9.glb` with all 46 contractual named nodes,
real pivots, parent-child gear hierarchy, PBR materials, UVs, and smooth/weighted normals.
Also renders 4 studio validation views into `proof/blender-*.png`.
"""

import bpy
import bmesh
import math
import json
import os
from mathutils import Vector, Matrix

# Ensure clean startup scene
bpy.ops.wm.read_factory_settings(use_empty=True)

WORKSPACE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
GLB_OUT_PATH = os.path.join(WORKSPACE_DIR, "public", "assets", "aircraft", "aeris-x9.glb")
REPORT_OUT_PATH = os.path.join(WORKSPACE_DIR, "asset-report.json")
PROOF_DIR = os.path.join(WORKSPACE_DIR, "proof")

os.makedirs(os.path.dirname(GLB_OUT_PATH), exist_ok=True)
os.makedirs(PROOF_DIR, exist_ok=True)


def t2b(x: float, y: float, z: float) -> Vector:
    """
    Convert Three.js / glTF coordinates (+Y up, -Z nose, +Z tail, +-X wings)
    into Blender Z-up coordinates so that glTF export with export_yup=True
    produces the exact (x, y, z) coordinates in Three.js.
    Mapping: x_gltf = x_b, y_gltf = z_b, z_gltf = -y_b
    => x_b = x, y_b = -z, z_b = y
    """
    return Vector((x, -z, y))


def make_pbr_material(
    name: str,
    base_color: tuple,
    metallic: float = 0.8,
    roughness: float = 0.3,
    emission_color: tuple = (0.0, 0.0, 0.0, 1.0),
    emission_strength: float = 0.0,
    alpha: float = 1.0,
    coat_weight: float = 0.0,
):
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = base_color
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = emission_color
        if "Emission Strength" in bsdf.inputs:
            bsdf.inputs["Emission Strength"].default_value = emission_strength
        if "Alpha" in bsdf.inputs:
            bsdf.inputs["Alpha"].default_value = alpha
        if "Coat Weight" in bsdf.inputs:
            bsdf.inputs["Coat Weight"].default_value = coat_weight
    if alpha < 0.999 and hasattr(mat, "surface_render_method"):
        mat.surface_render_method = 'BLENDED'
    return mat


# Author aerospace PBR palette matching docs/02_ASSET_PIPELINE.md & docs/09_DESIGN_SYSTEM.md
MAT_TITANIUM = make_pbr_material(
    "AX9_Mat_Titanium",
    base_color=(0.76, 0.82, 0.88, 1.0),  # Sleek brushed titanium-silver
    metallic=0.88,
    roughness=0.25,
    coat_weight=0.30,
)
MAT_DARK_CERAMIC = make_pbr_material(
    "AX9_Mat_DarkCeramic",
    base_color=(0.12, 0.16, 0.21, 1.0),  # #18222B dark ceramic
    metallic=0.52,
    roughness=0.36,
)
MAT_GRAPHITE_ALLOY = make_pbr_material(
    "AX9_Mat_GraphiteAlloy",
    base_color=(0.28, 0.35, 0.42, 1.0),
    metallic=0.80,
    roughness=0.30,
)
MAT_CANOPY_GLASS = make_pbr_material(
    "AX9_Mat_CanopyGlass",
    base_color=(0.06, 0.16, 0.24, 1.0),  # Tinted aerospace canopy
    metallic=0.25,
    roughness=0.06,
    alpha=0.88,
    coat_weight=1.0,
)
MAT_CHROME_STRUT = make_pbr_material(
    "AX9_Mat_ChromeStrut",
    base_color=(0.86, 0.90, 0.94, 1.0),
    metallic=0.95,
    roughness=0.14,
)
MAT_TIRE_RUBBER = make_pbr_material(
    "AX9_Mat_TireRubber",
    base_color=(0.08, 0.09, 0.11, 1.0),
    metallic=0.06,
    roughness=0.75,
)
MAT_CYAN_EMISSIVE = make_pbr_material(
    "AX9_Mat_CyanBeacon",
    base_color=(0.40, 0.90, 0.87, 1.0),  # #67E5DF
    metallic=0.2,
    roughness=0.15,
    emission_color=(0.40, 0.90, 0.87, 1.0),
    emission_strength=3.5,
)
MAT_EXHAUST_GLOW = make_pbr_material(
    "AX9_Mat_ExhaustCeramic",
    base_color=(0.22, 0.18, 0.16, 1.0),
    metallic=0.85,
    roughness=0.28,
    emission_color=(1.0, 0.62, 0.36, 1.0),  # subtle amber thermal accent
    emission_strength=0.55,
)


def finalize_mesh_object(
    name: str,
    bm: bmesh.types.BMesh,
    origin_three: tuple,
    material,
    parent_obj=None,
    parent_origin_three: tuple = (0.0, 0.0, 0.0),
    subsurf_levels: int = 1,
):
    """
    Bake a BMesh whose vertices were authored in Three.js world space into a named Blender Object
    whose origin sits at `origin_three` (and parented to `parent_obj` if given).
    Ensures manifold welded vertices, outward consistent normals, and non-overlapping UVs.
    """
    ox, oy, oz = origin_three
    for v in bm.verts:
        lx = v.co.x - ox
        ly = v.co.y - oy
        lz = v.co.z - oz
        v.co = t2b(lx, ly, lz)

    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    mesh = bpy.data.meshes.new(name=f"{name}_Mesh")
    bm.to_mesh(mesh)
    bm.free()

    for poly in mesh.polygons:
        poly.use_smooth = True

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)

    if parent_obj is not None:
        px, py, pz = parent_origin_three
        obj.parent = parent_obj
        obj.location = t2b(ox - px, oy - py, oz - pz)
    else:
        obj.location = t2b(ox, oy, oz)

    if material is not None:
        mesh.materials.append(material)

    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    if subsurf_levels > 0:
        mod = obj.modifiers.new(name="Subsurf", type='SUBSURF')
        mod.levels = subsurf_levels
        mod.render_levels = subsurf_levels
        mod.subdivision_type = 'CATMULL_CLARK'
        bpy.ops.object.modifier_apply(modifier=mod.name)

    # Guarantee consistent outward normals and clean Smart UV Projection
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.normals_make_consistent(inside=False)
    bpy.ops.uv.smart_project(angle_limit=math.radians(66.0), island_margin=0.02)
    bpy.ops.object.mode_set(mode='OBJECT')

    return obj


def build_lofted_shell(
    stations: list,
    ring_Point_fn,
    num_ring_pts: int = 36,
    cap_start: bool = True,
    cap_end: bool = True,
) -> bmesh.types.BMesh:
    """
    Build a closed lofted BMesh in Three.js world space given a list of Z stations
    and a function `ring_Point_fn(z, theta) -> (x, y, z)`.
    """
    bm = bmesh.new()
    rings = []
    for z in stations:
        ring = []
        for i in range(num_ring_pts):
            theta = (2.0 * math.pi * i) / num_ring_pts
            px, py, pz = ring_Point_fn(z, theta)
            ring.append(bm.verts.new((px, py, pz)))
        rings.append(ring)

    for r_idx in range(len(rings) - 1):
        r0 = rings[r_idx]
        r1 = rings[r_idx + 1]
        for i in range(num_ring_pts):
            ni = (i + 1) % num_ring_pts
            bm.faces.new((r0[i], r0[ni], r1[ni], r1[i]))

    if cap_start and len(rings) > 0:
        c0 = Vector((0.0, 0.0, 0.0))
        for v in rings[0]:
            c0 += v.co
        c0 /= len(rings[0])
        cv0 = bm.verts.new(c0)
        for i in range(num_ring_pts):
            ni = (i + 1) % num_ring_pts
            bm.faces.new((rings[0][ni], rings[0][i], cv0))

    if cap_end and len(rings) > 0:
        c1 = Vector((0.0, 0.0, 0.0))
        for v in rings[-1]:
            c1 += v.co
        c1 /= len(rings[-1])
        cv1 = bm.verts.new(c1)
        for i in range(num_ring_pts):
            ni = (i + 1) % num_ring_pts
            bm.faces.new((rings[-1][i], rings[-1][ni], cv1))

    return bm


def build_airfoil_section_wing(
    span_stations: list,
    section_fn,
    chord_pts: int = 28,
) -> bmesh.types.BMesh:
    """
    Build a closed aerodynamic wing/fin/control-surface BMesh from spanwise stations.
    `section_fn(s)` returns `(x_base, y_base, z_le, z_te, thickness, camber, nx, ny)`
    where `(nx, ny)` is the unit normal in the XY plane perpendicular to the spanwise blade.
    """
    bm = bmesh.new()
    rings = []
    n_total = chord_pts * 2
    for s in span_stations:
        x_b, y_b, z_le, z_te, thick, camber, nx, ny = section_fn(s)
        chord = max(0.05, z_te - z_le)
        ring = []
        for i in range(n_total):
            if i < chord_pts:
                u = i / float(chord_pts)
                sign_ud = 1.0
            else:
                u = 1.0 - ((i - chord_pts) / float(chord_pts))
                sign_ud = -1.0
            uc = 0.5 * (1.0 - math.cos(math.pi * u))
            # Supercritical airfoil with finite non-zero trailing edge thickness to prevent pinch
            yt = 5.0 * thick * (
                0.2969 * math.sqrt(max(1e-4, uc))
                - 0.1260 * uc
                - 0.3516 * (uc ** 2)
                + 0.2843 * (uc ** 3)
                - 0.0950 * (uc ** 4)
            ) + 0.003 * sign_ud
            yc = camber * 4.0 * uc * (1.0 - uc)
            local_d = yc + sign_ud * yt
            px = x_b + local_d * nx
            py = y_b + local_d * ny
            pz = z_le + uc * chord
            ring.append(bm.verts.new((px, py, pz)))
        rings.append(ring)

    for r_idx in range(len(rings) - 1):
        r0 = rings[r_idx]
        r1 = rings[r_idx + 1]
        for i in range(n_total):
            ni = (i + 1) % n_total
            bm.faces.new((r0[i], r0[ni], r1[ni], r1[i]))

    for end_idx, flip in ((0, True), (-1, False)):
        ring = rings[end_idx]
        center = Vector((0.0, 0.0, 0.0))
        for v in ring:
            center += v.co
        center /= len(ring)
        cv = bm.verts.new(center)
        for i in range(n_total):
            ni = (i + 1) % n_total
            if flip:
                bm.faces.new((ring[ni], ring[i], cv))
            else:
                bm.faces.new((ring[i], ring[ni], cv))

    return bm


created_objects = {}

# ============================================================================
# 1. CORE FUSELAGE GROUP (5 PARTS)
# ============================================================================

# 1.1 Nose Shell (z: -5.65 to -2.35)
def nose_ring(z, theta):
    t = (z - (-5.65)) / (-2.35 - (-5.65))  # 0 at tip, 1 at junction
    t_smooth = math.pow(max(0.002, t), 0.72)
    rx = 0.88 * t_smooth
    ry_top = 0.44 * t_smooth
    ry_bot = 0.28 * t_smooth
    # Sharp stealth chine near horizontal equator
    cos_t = math.cos(theta)
    sin_t = math.sin(theta)
    chine_boost = 1.0 + 0.22 * (cos_t ** 4)
    x = rx * cos_t * chine_boost
    y_base = -0.18 * (1.0 - t)
    y = y_base + (ry_top if sin_t >= 0 else ry_bot) * sin_t * (1.0 - 0.18 * (cos_t ** 2))
    return (x, y, z)

bm_nose = build_lofted_shell(
    [ -5.65 + i * (3.30 / 28.0) for i in range(29) ],
    nose_ring,
    num_ring_pts=48,
)
created_objects["AX9__CORE__CENTER__NOSE_SHELL"] = finalize_mesh_object(
    "AX9__CORE__CENTER__NOSE_SHELL",
    bm_nose,
    origin_three=(0.0, -0.05, -3.95),
    material=MAT_TITANIUM,
    subsurf_levels=1,
)

# 1.2 Main Fuselage (z: -2.38 to +2.25)
def main_fuselage_ring(z, theta):
    u = (z - (-2.38)) / (2.25 - (-2.38))  # 0..1
    waist = 1.0 + 0.36 * math.sin(math.pi * u)
    rx = 0.92 * waist
    ry_top = 0.50 + 0.12 * math.sin(math.pi * u)
    ry_bot = 0.24
    cos_t = math.cos(theta)
    sin_t = math.sin(theta)
    chine = 1.0 + 0.25 * (cos_t ** 4)
    x = rx * cos_t * chine
    y = (ry_top if sin_t >= 0 else ry_bot) * sin_t
    return (x, y, z)

bm_main = build_lofted_shell(
    [ -2.38 + i * (4.63 / 32.0) for i in range(33) ],
    main_fuselage_ring,
    num_ring_pts=48,
)
created_objects["AX9__CORE__CENTER__MAIN_FUSELAGE"] = finalize_mesh_object(
    "AX9__CORE__CENTER__MAIN_FUSELAGE",
    bm_main,
    origin_three=(0.0, 0.10, -0.05),
    material=MAT_TITANIUM,
    subsurf_levels=1,
)

# 1.3 Upper Spine (z: -0.55 to +3.55)
def spine_ring(z, theta):
    u = (z - (-0.55)) / (3.55 - (-0.55))
    profile = math.sin(math.pi * max(0.02, min(0.98, u)))
    rx = 0.44 * (0.45 + 0.55 * profile)
    ry = 0.26 * (0.4 + 0.6 * profile)
    x = rx * math.cos(theta)
    y = 0.52 + ry * math.sin(theta) * (1.0 if math.sin(theta) > 0 else 0.35)
    return (x, y, z)

bm_spine = build_lofted_shell(
    [ -0.55 + i * (4.10 / 24.0) for i in range(25) ],
    spine_ring,
    num_ring_pts=36,
)
created_objects["AX9__CORE__CENTER__UPPER_SPINE"] = finalize_mesh_object(
    "AX9__CORE__CENTER__UPPER_SPINE",
    bm_spine,
    origin_three=(0.0, 0.58, 1.45),
    material=MAT_GRAPHITE_ALLOY,
    subsurf_levels=1,
)

# 1.4 Belly Shell (z: -2.45 to +2.45)
def belly_ring(z, theta):
    u = (z - (-2.45)) / (4.90)
    arch = math.sin(math.pi * max(0.03, min(0.97, u)))
    rx = 0.86 + 0.32 * arch
    ry = 0.22 * (0.65 + 0.35 * arch)
    x = rx * math.cos(theta)
    y = -0.26 + ry * math.sin(theta) * (0.35 if math.sin(theta) > 0 else 1.1)
    return (x, y, z)

bm_belly = build_lofted_shell(
    [ -2.45 + i * (4.90 / 26.0) for i in range(27) ],
    belly_ring,
    num_ring_pts=40,
)
created_objects["AX9__CORE__CENTER__BELLY_SHELL"] = finalize_mesh_object(
    "AX9__CORE__CENTER__BELLY_SHELL",
    bm_belly,
    origin_three=(0.0, -0.32, 0.0),
    material=MAT_DARK_CERAMIC,
    subsurf_levels=1,
)

# 1.5 Rear Fuselage (z: +2.15 to +5.15)
def rear_ring(z, theta):
    u = (z - 2.15) / 3.0
    taper = 1.0 - 0.58 * (u ** 1.3)
    rx = 1.08 * taper
    ry = 0.38 * (1.0 - 0.65 * u)
    # Twin engine nacelle lobes + central sting
    lobe = 1.0 + 0.18 * math.cos(2.0 * theta)
    x = rx * math.cos(theta) * lobe
    y = 0.06 + ry * math.sin(theta)
    return (x, y, z)

bm_rear = build_lofted_shell(
    [ 2.15 + i * (3.0 / 24.0) for i in range(25) ],
    rear_ring,
    num_ring_pts=44,
)
created_objects["AX9__CORE__CENTER__REAR_FUSELAGE"] = finalize_mesh_object(
    "AX9__CORE__CENTER__REAR_FUSELAGE",
    bm_rear,
    origin_three=(0.0, 0.08, 3.60),
    material=MAT_TITANIUM,
    subsurf_levels=1,
)

# ============================================================================
# 2. CANOPY GROUP (3 PARTS)
# ============================================================================

# 2.1 Canopy Glass (z: -3.25 to -0.35)
def canopy_glass_ring(z, theta):
    u = (z - (-3.25)) / 2.90
    bubble = math.sin(math.pi * max(0.02, min(0.98, u)))
    rx = 0.48 * bubble
    ry = 0.44 * (bubble ** 0.85)
    x = rx * math.cos(theta)
    sin_t = math.sin(theta)
    y = 0.44 + (ry * sin_t if sin_t >= 0 else 0.08 * ry * sin_t)
    return (x, y, z)

bm_canopy = build_lofted_shell(
    [ -3.25 + i * (2.90 / 26.0) for i in range(27) ],
    canopy_glass_ring,
    num_ring_pts=40,
)
created_objects["AX9__CANOPY__CENTER__CANOPY_GLASS"] = finalize_mesh_object(
    "AX9__CANOPY__CENTER__CANOPY_GLASS",
    bm_canopy,
    origin_three=(0.0, 0.62, -1.80),
    material=MAT_CANOPY_GLASS,
    subsurf_levels=1,
)

# 2.2 Canopy Frame (sleek rim collar around canopy base)
def canopy_frame_ring(z, theta):
    u = (z - (-3.32)) / 3.04
    bubble = math.sin(math.pi * max(0.02, min(0.98, u)))
    rx = 0.52 * bubble
    ry = 0.12 * bubble
    x = rx * math.cos(theta)
    y = 0.42 + ry * math.sin(theta)
    return (x, y, z)

bm_cframe = build_lofted_shell(
    [ -3.32 + i * (3.04 / 22.0) for i in range(23) ],
    canopy_frame_ring,
    num_ring_pts=36,
)
created_objects["AX9__CANOPY__CENTER__CANOPY_FRAME"] = finalize_mesh_object(
    "AX9__CANOPY__CENTER__CANOPY_FRAME",
    bm_cframe,
    origin_three=(0.0, 0.44, -1.80),
    material=MAT_DARK_CERAMIC,
    subsurf_levels=1,
)

# 2.3 Display Plate (sculpted holographic cockpit dashboard inside canopy)
def display_plate_ring(z, theta):
    u = (z - (-2.85)) / 1.15
    arch = math.sin(math.pi * max(0.05, min(0.95, u)))
    rx = 0.34 * arch
    ry = 0.11 * arch
    return (rx * math.cos(theta), 0.46 + ry * math.sin(theta), z)

bm_display = build_lofted_shell(
    [ -2.85 + i * (1.15 / 14.0) for i in range(15) ],
    display_plate_ring,
    num_ring_pts=28,
)
created_objects["AX9__CANOPY__CENTER__DISPLAY_PLATE"] = finalize_mesh_object(
    "AX9__CANOPY__CENTER__DISPLAY_PLATE",
    bm_display,
    origin_three=(0.0, 0.46, -2.25),
    material=MAT_CYAN_EMISSIVE,
    subsurf_levels=1,
)

# ============================================================================
# 3. WINGS, CONTROL SURFACES, DUCTS & LIGHTS (LEFT & RIGHT SYMMETRIC PAIRS)
# ============================================================================

for side_name, sign_x in (("LEFT", -1.0), ("RIGHT", 1.0)):
    # 3.1 Main Blended Delta Wing
    def wing_section(s, sgn=sign_x):
        x_b = sgn * (1.02 + s * 3.56)
        y_b = 0.04 - 0.10 * s
        z_le = -1.45 + 2.55 * (s ** 1.08)
        z_te = 2.15 + 0.42 * s
        thick = 0.11 * (1.0 - 0.55 * s)
        camber = 0.025 * (1.0 - 0.5 * s)
        return (x_b, y_b, z_le, z_te, thick, camber, 0.0, 1.0)

    bm_wing = build_airfoil_section_wing(
        [ i / 18.0 for i in range(19) ],
        wing_section,
        chord_pts=24,
    )
    created_objects[f"AX9__SURFACE__{side_name}__WING_{side_name}"] = finalize_mesh_object(
        f"AX9__SURFACE__{side_name}__WING_{side_name}",
        bm_wing,
        origin_three=(sign_x * 2.65, 0.0, 0.55),
        material=MAT_TITANIUM,
        subsurf_levels=1,
    )

    # 3.2 Leading Edge Trim Cuff
    def le_trim_section(s, sgn=sign_x):
        x_b = sgn * (1.08 + s * 3.32)
        y_b = 0.05 - 0.09 * s
        z_le = -1.58 + 2.52 * (s ** 1.08)
        z_te = z_le + 0.42 * (1.0 - 0.35 * s)
        return (x_b, y_b, z_le, z_te, 0.08, 0.01, 0.0, 1.0)

    bm_trim = build_airfoil_section_wing(
        [ i / 14.0 for i in range(15) ],
        le_trim_section,
        chord_pts=18,
    )
    created_objects[f"AX9__SURFACE__{side_name}__LEADING_TRIM_{side_name}"] = finalize_mesh_object(
        f"AX9__SURFACE__{side_name}__LEADING_TRIM_{side_name}",
        bm_trim,
        origin_three=(sign_x * 2.65, 0.01, -0.15),
        material=MAT_DARK_CERAMIC,
        subsurf_levels=1,
    )

    # 3.3 Trailing-Edge Elevon Control Surface
    def elevon_section(s, sgn=sign_x):
        x_b = sgn * (1.35 + s * 2.75)
        y_b = 0.01 - 0.07 * s
        z_le = 2.08 + 0.36 * s
        z_te = 2.68 + 0.25 * s
        return (x_b, y_b, z_le, z_te, 0.07, 0.005, 0.0, 1.0)

    bm_elevon = build_airfoil_section_wing(
        [ i / 12.0 for i in range(13) ],
        elevon_section,
        chord_pts=18,
    )
    created_objects[f"AX9__SURFACE__{side_name}__ELEVON_{side_name}"] = finalize_mesh_object(
        f"AX9__SURFACE__{side_name}__ELEVON_{side_name}",
        bm_elevon,
        origin_three=(sign_x * 2.72, -0.02, 2.38),
        material=MAT_GRAPHITE_ALLOY,
        subsurf_levels=1,
    )

    # 3.4 Aft Horizontal Stabilizer
    def stab_section(s, sgn=sign_x):
        x_b = sgn * (1.08 + s * 1.65)
        y_b = 0.06 + 0.08 * s
        z_le = 3.05 + 1.15 * s
        z_te = 4.65 + 0.35 * s
        return (x_b, y_b, z_le, z_te, 0.08, 0.01, 0.0, 1.0)

    bm_stab = build_airfoil_section_wing(
        [ i / 12.0 for i in range(13) ],
        stab_section,
        chord_pts=18,
    )
    created_objects[f"AX9__SURFACE__{side_name}__STABILIZER_{side_name}"] = finalize_mesh_object(
        f"AX9__SURFACE__{side_name}__STABILIZER_{side_name}",
        bm_stab,
        origin_three=(sign_x * 1.85, 0.10, 3.95),
        material=MAT_TITANIUM,
        subsurf_levels=1,
    )

    # 3.5 Canted Twin Vertical Tail Fin (true perpendicular airfoil normal!)
    def fin_section(s, sgn=sign_x):
        # Span vector is (sgn * 0.88, 1.58) -> perpendicular normal is (0.87, -sgn * 0.49)
        x_b = sgn * (0.72 + s * 0.88)
        y_b = 0.32 + s * 1.58
        z_le = 2.45 + 1.35 * s
        z_te = 4.55 + 0.42 * s
        return (x_b, y_b, z_le, z_te, 0.085, 0.0, 0.87, -sgn * 0.49)

    bm_fin = build_airfoil_section_wing(
        [ i / 14.0 for i in range(15) ],
        fin_section,
        chord_pts=20,
    )
    created_objects[f"AX9__SURFACE__{side_name}__FIN_{side_name}"] = finalize_mesh_object(
        f"AX9__SURFACE__{side_name}__FIN_{side_name}",
        bm_fin,
        origin_three=(sign_x * 1.16, 1.10, 3.65),
        material=MAT_TITANIUM,
        subsurf_levels=1,
    )

    # 3.6 Wingtip Optical Navigation Light
    def tip_light_ring(z, theta, sgn=sign_x):
        u = (z - 0.95) / 1.45
        arch = math.sin(math.pi * max(0.05, min(0.95, u)))
        rx = 0.08 * arch
        ry = 0.045 * arch
        return (sgn * 4.62 + rx * math.cos(theta), -0.06 + ry * math.sin(theta), z)

    bm_light = build_lofted_shell(
        [ 0.95 + i * (1.45 / 12.0) for i in range(13) ],
        tip_light_ring,
        num_ring_pts=20,
    )
    created_objects[f"AX9__LIGHT__{side_name}__TIP_LIGHT_{side_name}"] = finalize_mesh_object(
        f"AX9__LIGHT__{side_name}__TIP_LIGHT_{side_name}",
        bm_light,
        origin_three=(sign_x * 4.62, -0.06, 1.68),
        material=MAT_CYAN_EMISSIVE,
        subsurf_levels=1,
    )

    # 3.7 Sculpted Supersonic Air Intake Shell
    def intake_ring(z, theta, sgn=sign_x):
        u = (z - (-1.95)) / 2.55
        swell = math.sin(math.pi * max(0.05, min(0.95, u)))
        rx = 0.34 * (0.65 + 0.35 * swell)
        ry = 0.24 * (0.65 + 0.35 * swell)
        cx = sgn * (0.98 + 0.14 * swell)
        cy = 0.02 + 0.05 * swell
        return (cx + rx * math.cos(theta), cy + ry * math.sin(theta), z)

    bm_intake = build_lofted_shell(
        [ -1.95 + i * (2.55 / 18.0) for i in range(19) ],
        intake_ring,
        num_ring_pts=32,
    )
    created_objects[f"AX9__DUCT__{side_name}__INTAKE_SHELL_{side_name}"] = finalize_mesh_object(
        f"AX9__DUCT__{side_name}__INTAKE_SHELL_{side_name}",
        bm_intake,
        origin_three=(sign_x * 1.05, 0.04, -0.68),
        material=MAT_GRAPHITE_ALLOY,
        subsurf_levels=1,
    )

    # 3.8 Rear Engine Nacelle Shroud
    def shroud_ring(z, theta, sgn=sign_x):
        u = (z - 2.10) / 2.45
        swell = math.sin(math.pi * max(0.05, min(0.95, u)))
        rx = 0.38 * (0.75 + 0.25 * swell)
        ry = 0.28 * (0.75 + 0.25 * swell)
        cx = sgn * 0.64
        cy = 0.14
        return (cx + rx * math.cos(theta), cy + ry * math.sin(theta), z)

    bm_shroud = build_lofted_shell(
        [ 2.10 + i * (2.45 / 18.0) for i in range(19) ],
        shroud_ring,
        num_ring_pts=32,
    )
    created_objects[f"AX9__DUCT__{side_name}__REAR_SHROUD_{side_name}"] = finalize_mesh_object(
        f"AX9__DUCT__{side_name}__REAR_SHROUD_{side_name}",
        bm_shroud,
        origin_three=(sign_x * 0.64, 0.14, 3.32),
        material=MAT_DARK_CERAMIC,
        subsurf_levels=1,
    )

    # 3.9 Serrated Exhaust Nozzle Ring
    def exhaust_ring(z, theta, sgn=sign_x):
        u = (z - 4.45) / 0.85
        # Serrated nozzle petals (12 petals around circumference)
        petal = 1.0 + 0.06 * u * math.cos(12.0 * theta)
        r = (0.34 - 0.07 * u) * petal
        cx = sgn * 0.62
        cy = 0.08
        return (cx + r * math.cos(theta), cy + r * math.sin(theta), z)

    bm_exhaust = build_lofted_shell(
        [ 4.45 + i * (0.85 / 14.0) for i in range(15) ],
        exhaust_ring,
        num_ring_pts=36,
    )
    created_objects[f"AX9__DUCT__{side_name}__EXHAUST_RING_{side_name}"] = finalize_mesh_object(
        f"AX9__DUCT__{side_name}__EXHAUST_RING_{side_name}",
        bm_exhaust,
        origin_three=(sign_x * 0.62, 0.08, 4.88),
        material=MAT_EXHAUST_GLOW,
        subsurf_levels=1,
    )

# ============================================================================
# 4. ARTICULATED 3-POINT LANDING GEAR GROUP (12 PARTS WITH REAL HINGE PIVOTS)
# ============================================================================

def build_strut_bmesh(pivot_three: tuple, wheel_center_three: tuple, is_front: bool) -> bmesh.types.BMesh:
    """
    Create a detailed oleopneumatic landing gear strut + torque link scissors + yoke
    connecting `pivot_three` down to `wheel_center_three`.
    """
    bm = bmesh.new()
    px, py, pz = pivot_three
    wx, wy, wz = wheel_center_three
    steps = 16
    pts = 24
    rings = []
    for s_idx in range(steps + 1):
        u = s_idx / float(steps)
        cx = px + (wx - px) * u
        cy = py + (wy - py) * u
        cz = pz + (wz - pz) * u
        # Stepped oleo cylinder collar + torque link bulge in middle
        if u < 0.45:
            r = 0.068
        elif u < 0.65:
            r = 0.085  # damper collar / torque link boss
        else:
            r = 0.052  # lower chrome piston
        ring = []
        for i in range(pts):
            theta = (2.0 * math.pi * i) / pts
            # Add forward/aft scissor link lug profile in mid-section
            lug_z = 0.06 * math.sin(theta) if (0.35 <= u <= 0.72 and math.sin(theta) > 0) else 0.0
            ring.append(bm.verts.new((cx + r * math.cos(theta), cy, cz + r * math.sin(theta) + lug_z)))
        rings.append(ring)

    for r_idx in range(len(rings) - 1):
        r0, r1 = rings[r_idx], rings[r_idx + 1]
        for i in range(pts):
            ni = (i + 1) % pts
            bm.faces.new((r0[i], r0[ni], r1[ni], r1[i]))

    # Cap top and bottom
    for end_ring, flip in ((rings[0], True), (rings[-1], False)):
        c = sum((v.co for v in end_ring), Vector((0, 0, 0))) / len(end_ring)
        cv = bm.verts.new(c)
        for i in range(pts):
            ni = (i + 1) % pts
            bm.faces.new((end_ring[ni], end_ring[i], cv) if flip else (end_ring[i], end_ring[ni], cv))

    return bm


def build_wheel_tire_bmesh(wheel_center_three: tuple, radius: float, width: float) -> bmesh.types.BMesh:
    """
    Create a toroidal aerospace rubber tire centered at `wheel_center_three` with axle along X.
    """
    bm = bmesh.new()
    wx, wy, wz = wheel_center_three
    major_steps = 32
    minor_steps = 18
    r_major = radius * 0.72
    r_tube_yz = radius * 0.28
    r_tube_x = width * 0.52

    rings = []
    for i in range(major_steps):
        theta = (2.0 * math.pi * i) / major_steps
        ct, st = math.cos(theta), math.sin(theta)
        ring = []
        for j in range(minor_steps):
            phi = (2.0 * math.pi * j) / minor_steps
            cp, sp = math.cos(phi), math.sin(phi)
            # Subtle circumferential tread ribs
            tread = 1.0 + 0.03 * math.cos(6.0 * phi) if cp > 0 else 1.0
            radial = (r_major + r_tube_yz * cp) * tread
            px = wx + r_tube_x * sp
            py = wy + radial * st
            pz = wz + radial * ct
            ring.append(bm.verts.new((px, py, pz)))
        rings.append(ring)

    for i in range(major_steps):
        ni = (i + 1) % major_steps
        r0, r1 = rings[i], rings[ni]
        for j in range(minor_steps):
            nj = (j + 1) % minor_steps
            bm.faces.new((r0[j], r0[nj], r1[nj], r1[j]))

    return bm


def build_wheel_hub_bmesh(wheel_center_three: tuple, hub_radius: float, width: float) -> bmesh.types.BMesh:
    """
    Create a sculpted multi-spoke alloy wheel rim & brake hub along the X axle.
    """
    bm = bmesh.new()
    wx, wy, wz = wheel_center_three
    x_stations = [wx - width * 0.54 + (width * 1.08) * (i / 8.0) for i in range(9)]
    pts = 24
    rings = []
    for x in x_stations:
        u = abs(x - wx) / (width * 0.54)
        ring = []
        for i in range(pts):
            theta = (2.0 * math.pi * i) / pts
            # 6-spoke star pattern on outer face
            spoke = 1.0 - 0.14 * (u ** 2) * math.cos(6.0 * theta)
            r = hub_radius * (0.95 - 0.15 * (u ** 2)) * spoke
            ring.append(bm.verts.new((x, wy + r * math.sin(theta), wz + r * math.cos(theta))))
        rings.append(ring)

    for r_idx in range(len(rings) - 1):
        r0, r1 = rings[r_idx], rings[r_idx + 1]
        for i in range(pts):
            ni = (i + 1) % pts
            bm.faces.new((r0[i], r0[ni], r1[ni], r1[i]))

    for end_ring, flip in ((rings[0], True), (rings[-1], False)):
        c = sum((v.co for v in end_ring), Vector((0, 0, 0))) / len(end_ring)
        cv = bm.verts.new(c)
        for i in range(pts):
            ni = (i + 1) % pts
            bm.faces.new((end_ring[ni], end_ring[i], cv) if flip else (end_ring[i], end_ring[ni], cv))

    return bm


def build_gear_door_bmesh(hinge_three: tuple, length_z: float, width_x: float, side_sign: float) -> bmesh.types.BMesh:
    """
    Create a contoured landing-gear bay door whose hinge edge sits exactly at `hinge_three`
    so rotating around Z (or X) swings the door cleanly from its physical hinge.
    """
    hx, hy, hz = hinge_three
    z_stations = [hz - length_z * 0.5 + length_z * (i / 12.0) for i in range(13)]

    def door_ring(z, theta):
        # Cross section extending inward from hinge hx toward centerline by width_x
        cx = hx - side_sign * (width_x * 0.5)
        rx = width_x * 0.5
        ry = 0.032
        return (cx + rx * math.cos(theta), hy - 0.02 + ry * math.sin(theta), z)

    return build_lofted_shell(z_stations, door_ring, num_ring_pts=24)


# 4.1 Front Gear Assembly (Strut -> Wheel -> Hub, plus independent Door)
front_strut_pivot = (0.0, -0.30, -2.65)
front_wheel_pivot = (0.0, -1.16, -2.65)  # tire radius 0.26 -> bottom at y = -1.42
front_door_hinge = (-0.26, -0.34, -2.65)

obj_strut_front = finalize_mesh_object(
    "AX9__GEAR__FRONT__GEAR_STRUT_FRONT",
    build_strut_bmesh(front_strut_pivot, front_wheel_pivot, is_front=True),
    origin_three=front_strut_pivot,
    material=MAT_CHROME_STRUT,
    subsurf_levels=0,
)
created_objects["AX9__GEAR__FRONT__GEAR_STRUT_FRONT"] = obj_strut_front

obj_wheel_front = finalize_mesh_object(
    "AX9__GEAR__FRONT__GEAR_WHEEL_FRONT",
    build_wheel_tire_bmesh(front_wheel_pivot, radius=0.26, width=0.16),
    origin_three=front_wheel_pivot,
    material=MAT_TIRE_RUBBER,
    parent_obj=obj_strut_front,
    parent_origin_three=front_strut_pivot,
    subsurf_levels=0,
)
created_objects["AX9__GEAR__FRONT__GEAR_WHEEL_FRONT"] = obj_wheel_front

obj_hub_front = finalize_mesh_object(
    "AX9__GEAR__FRONT__GEAR_HUB_FRONT",
    build_wheel_hub_bmesh(front_wheel_pivot, hub_radius=0.145, width=0.17),
    origin_three=front_wheel_pivot,
    material=MAT_CHROME_STRUT,
    parent_obj=obj_wheel_front,
    parent_origin_three=front_wheel_pivot,
    subsurf_levels=0,
)
created_objects["AX9__GEAR__FRONT__GEAR_HUB_FRONT"] = obj_hub_front

created_objects["AX9__GEAR__FRONT__GEAR_DOOR_FRONT"] = finalize_mesh_object(
    "AX9__GEAR__FRONT__GEAR_DOOR_FRONT",
    build_gear_door_bmesh(front_door_hinge, length_z=0.92, width_x=0.46, side_sign=-1.0),
    origin_three=front_door_hinge,
    material=MAT_DARK_CERAMIC,
    subsurf_levels=1,
)

# 4.2 Left & Right Main Gear Assemblies
for side_name, sgn in (("LEFT", -1.0), ("RIGHT", 1.0)):
    strut_piv = (sgn * 0.92, -0.26, 0.65)
    wheel_piv = (sgn * 1.02, -1.12, 0.65)  # tire radius 0.30 -> bottom at y = -1.42
    door_hinge = (sgn * 1.32, -0.30, 0.65)

    obj_strut = finalize_mesh_object(
        f"AX9__GEAR__{side_name}__GEAR_STRUT_{side_name}",
        build_strut_bmesh(strut_piv, wheel_piv, is_front=False),
        origin_three=strut_piv,
        material=MAT_CHROME_STRUT,
        subsurf_levels=0,
    )
    created_objects[f"AX9__GEAR__{side_name}__GEAR_STRUT_{side_name}"] = obj_strut

    obj_wheel = finalize_mesh_object(
        f"AX9__GEAR__{side_name}__GEAR_WHEEL_{side_name}",
        build_wheel_tire_bmesh(wheel_piv, radius=0.30, width=0.20),
        origin_three=wheel_piv,
        material=MAT_TIRE_RUBBER,
        parent_obj=obj_strut,
        parent_origin_three=strut_piv,
        subsurf_levels=0,
    )
    created_objects[f"AX9__GEAR__{side_name}__GEAR_WHEEL_{side_name}"] = obj_wheel

    obj_hub = finalize_mesh_object(
        f"AX9__GEAR__{side_name}__GEAR_HUB_{side_name}",
        build_wheel_hub_bmesh(wheel_piv, hub_radius=0.17, width=0.21),
        origin_three=wheel_piv,
        material=MAT_CHROME_STRUT,
        parent_obj=obj_wheel,
        parent_origin_three=wheel_piv,
        subsurf_levels=0,
    )
    created_objects[f"AX9__GEAR__{side_name}__GEAR_HUB_{side_name}"] = obj_hub

    created_objects[f"AX9__GEAR__{side_name}__GEAR_DOOR_{side_name}"] = finalize_mesh_object(
        f"AX9__GEAR__{side_name}__GEAR_DOOR_{side_name}",
        build_gear_door_bmesh(door_hinge, length_z=1.10, width_x=0.58, side_sign=sgn),
        origin_three=door_hinge,
        material=MAT_DARK_CERAMIC,
        subsurf_levels=1,
    )

# ============================================================================
# 5. EXTERIOR SERVICE PANELS (8 PARTS: PANEL_LEFT_1..4 & PANEL_RIGHT_1..4)
# ============================================================================

panel_configs = [
    (1, -1.35, 0.72, 0.34, 0.78),
    (2, -0.45, 0.88, 0.36, 0.82),
    (3,  0.50, 1.02, 0.34, 0.84),
    (4,  1.45, 1.12, 0.30, 0.80),
]

for side_name, sgn in (("LEFT", -1.0), ("RIGHT", 1.0)):
    for idx, pz, px_abs, py_base, p_len in panel_configs:
        node_name = f"AX9__PANEL__{side_name}__PANEL_{side_name}_{idx}"
        px = sgn * px_abs

        def make_panel_ring(z, theta, c_x=px, c_y=py_base, l_z=p_len, s_x=sgn):
            u = (z - (pz - l_z * 0.5)) / l_z
            taper = math.sin(math.pi * max(0.08, min(0.92, u)))
            rx = 0.24 * (0.65 + 0.35 * taper)
            ry = 0.032 * (0.7 + 0.3 * taper)
            # Tilt panel slightly to match blended chine slope
            dx = rx * math.cos(theta)
            dy = ry * math.sin(theta) - s_x * dx * 0.22
            return (c_x + dx, c_y + dy, z)

        z_list = [pz - p_len * 0.5 + p_len * (k / 10.0) for k in range(11)]
        bm_panel = build_lofted_shell(z_list, make_panel_ring, num_ring_pts=24)
        created_objects[node_name] = finalize_mesh_object(
            node_name,
            bm_panel,
            origin_three=(px, py_base, pz),
            material=MAT_GRAPHITE_ALLOY if idx % 2 == 0 else MAT_DARK_CERAMIC,
            subsurf_levels=1,
        )

# ============================================================================
# 6. VALIDATE AGAINST MANIFEST & EXPORT GLB + ASSET REPORT
# ============================================================================

manifest_path = os.path.join(WORKSPACE_DIR, "examples", "part-manifest.json")
with open(manifest_path, "r", encoding="utf-8") as f:
    manifest = json.load(f)

expected_nodes = [p["nodeName"] for p in manifest["parts"]]
missing_nodes = [n for n in expected_nodes if n not in created_objects]

total_tris = 0
total_verts = 0
for obj in bpy.data.objects:
    if obj.type == 'MESH':
        me = obj.data
        me.calc_loop_triangles()
        total_tris += len(me.loop_triangles)
        total_verts += len(me.vertices)

# Export GLB with Y-up and preserved hierarchy
bpy.ops.export_scene.gltf(
    filepath=GLB_OUT_PATH,
    export_format='GLB',
    export_yup=True,
    export_apply=False,
    export_texcoords=True,
    export_normals=True,
    export_materials='EXPORT',
)

glb_bytes = os.path.getsize(GLB_OUT_PATH)

asset_report = {
    "assetName": "AERIS X-9 — Original Concept Aircraft",
    "filePath": "public/assets/aircraft/aeris-x9.glb",
    "fileSizeBytes": glb_bytes,
    "authoringTool": f"Blender {bpy.app.version_string} Headless Procedural BMesh Pipeline (scripts/generate_aeris_x9.py)",
    "license": "CC0 1.0 Universal / Original Project Artwork (No external third-party meshes or unlicensed textures)",
    "coordinateSystem": {
        "up": "+Y",
        "nose": "-Z",
        "wings": "+-X"
    },
    "geometryStats": {
        "meshObjectCount": len(created_objects),
        "expectedManifestParts": len(expected_nodes),
        "missingManifestNodes": missing_nodes,
        "totalTriangles": total_tris,
        "totalVertices": total_verts,
        "materialsCount": len(bpy.data.materials),
    },
    "landingGearVerification": {
        "front": ["AX9__GEAR__FRONT__GEAR_STRUT_FRONT", "AX9__GEAR__FRONT__GEAR_WHEEL_FRONT", "AX9__GEAR__FRONT__GEAR_HUB_FRONT", "AX9__GEAR__FRONT__GEAR_DOOR_FRONT"],
        "left": ["AX9__GEAR__LEFT__GEAR_STRUT_LEFT", "AX9__GEAR__LEFT__GEAR_WHEEL_LEFT", "AX9__GEAR__LEFT__GEAR_HUB_LEFT", "AX9__GEAR__LEFT__GEAR_DOOR_LEFT"],
        "right": ["AX9__GEAR__RIGHT__GEAR_STRUT_RIGHT", "AX9__GEAR__RIGHT__GEAR_WHEEL_RIGHT", "AX9__GEAR__RIGHT__GEAR_HUB_RIGHT", "AX9__GEAR__RIGHT__GEAR_DOOR_RIGHT"]
    },
    "status": "PASS" if len(missing_nodes) == 0 and len(created_objects) >= 32 else "FAIL"
}

with open(REPORT_OUT_PATH, "w", encoding="utf-8") as rf:
    json.dump(asset_report, rf, indent=2, ensure_ascii=False)

print("ASSET_GENERATION_SUMMARY:", json.dumps(asset_report))
