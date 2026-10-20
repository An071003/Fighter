"""
AERIS X-9 — Precision Aerospace CAD & Conformal Stealth Generator (v4 Multi-Angle Verified OML)
Run via Headless Blender 4.5+:
  "C:\\Program Files\\Blender Foundation\\Blender 4.5\\blender.exe" --background --factory-startup --python scripts/generate_aeris_x9.py

Key Engineering Fixes in v4 (Addressing Front & Top View Inspection):
  1. EXACT BILATERAL MIRROR SYMMETRY (`chine_ring`):
     Fixes the sin/cos swap bug in v3 where the left (-X) and right (+X) fuselage halves had
     different curvature. Left half is now constructed as an exact mathematical mirror (-x, y, z)
     of the right half, with true superelliptical upper/lower arcs.
  2. EXACT FUSELAGE-DECK INTERSECTION FOR CANOPY & UPPER SPINE (`fuselage_surface_y`):
     Previously, `CANOPY_GLASS`, `CANOPY_FRAME`, and `UPPER_SPINE` used a flat horizontal `base_y`
     while the fuselage deck curved downward at `|x| > 0`, leaving an overhanging shelf in Front
     and Top views. Now every station computes `y_deck(x, z)` directly on the fuselage surface,
     and `UPPER_SPINE` tapers to a razor point at `z = +3.35`.
  3. UNBROKEN SUPERSONIC DELTA WING + CONFORMAL SLATS & ELEVONS:
     Eliminates the wing-root notch and cylindrical rod look on `LEADING_TRIM` and `ELEVON`.
     Both control surfaces now wrap the exact biconvex airfoil upper/lower surface of the wing.
  4. CONFORMAL INTERNAL BULKHEAD RIBS (`scale_inset = 0.72`):
     Internal fuselage ribs use inset conformal cross-sections instead of rectangular boxes so
     their corners never poke through the outer fuselage skin in Top view.
  5. TAPERED NACELLE FAIRINGS (`REAR_SHROUD` & `INTAKE_SHELL`):
     Smoothly faired into the fuselage envelope so no blunt cylinder faces stick out in Top view.
"""

import bpy
import bmesh
import json
import math
import os
from mathutils import Vector, Matrix

WORKSPACE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
MANIFEST_PATH = os.path.join(WORKSPACE_DIR, "examples", "part-manifest.json")
OUTPUT_GLB_PATH = os.path.join(WORKSPACE_DIR, "public", "assets", "aircraft", "aeris-x9.glb")
REPORT_JSON_PATH = os.path.join(WORKSPACE_DIR, "asset-report.json")


def t2b(x: float, y: float, z: float) -> Vector:
    """Map Three.js (X=right, Y=up, Z=aft) -> Blender (X=right, Y=-Z, Z=Y)."""
    return Vector((float(x), float(-z), float(y)))


def clamp01(v: float) -> float:
    return max(0.0, min(1.0, v))


def smoothstep(edge0: float, edge1: float, x: float) -> float:
    t = clamp01((x - edge0) / (edge1 - edge0)) if edge1 != edge0 else 0.0
    return t * t * (3.0 - 2.0 * t)


def clear_scene() -> None:
    bpy.ops.wm.read_factory_settings(use_empty=True)


def make_pbr_material(
    name: str,
    base_color: tuple[float, float, float, float],
    metallic: float,
    roughness: float,
    emission_color: tuple[float, float, float] | None = None,
    emission_strength: float = 0.0,
    alpha: float = 1.0,
) -> bpy.types.Material:
    mat = bpy.data.materials.new(name=name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = base_color
        bsdf.inputs["Metallic"].default_value = metallic
        bsdf.inputs["Roughness"].default_value = roughness
        if "Coat Weight" in bsdf.inputs and metallic > 0.35:
            bsdf.inputs["Coat Weight"].default_value = 0.25
            bsdf.inputs["Coat Roughness"].default_value = 0.26
        if emission_color and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = (*emission_color, 1.0)
            bsdf.inputs["Emission Strength"].default_value = emission_strength
        if alpha < 1.0:
            bsdf.inputs["Alpha"].default_value = alpha
            mat.blend_method = "BLEND"
    return mat


def create_materials() -> dict[str, bpy.types.Material]:
    # v5 reference palette: matte obsidian-black shell, graphite trims, machined alloy mechanics.
    return {
        "skin_primary": make_pbr_material(
            "AX9_Mat_MatteObsidian", (0.020, 0.021, 0.024, 1.0), metallic=0.35, roughness=0.50
        ),
        "skin_trim": make_pbr_material(
            "AX9_Mat_GraphiteTrim", (0.034, 0.036, 0.040, 1.0), metallic=0.40, roughness=0.44
        ),
        "carbon_stealth": make_pbr_material(
            "AX9_Mat_CarbonComposite", (0.013, 0.014, 0.016, 1.0), metallic=0.20, roughness=0.60
        ),
        "canopy_glass": make_pbr_material(
            "AX9_Mat_CanopySmoked",
            (0.020, 0.026, 0.032, 1.0),
            metallic=0.30,
            roughness=0.05,
            alpha=0.55,
        ),
        "alloy_mech": make_pbr_material(
            "AX9_Mat_MachinedAlloy", (0.30, 0.31, 0.33, 1.0), metallic=0.85, roughness=0.32
        ),
        "chrome": make_pbr_material(
            "AX9_Mat_OleoChrome", (0.78, 0.79, 0.81, 1.0), metallic=1.0, roughness=0.12
        ),
        "nozzle_ceramic": make_pbr_material(
            "AX9_Mat_NozzleInconel",
            (0.10, 0.095, 0.09, 1.0),
            metallic=0.82,
            roughness=0.30,
            emission_color=(0.95, 0.48, 0.14),
            emission_strength=0.15,
        ),
        "tire_rubber": make_pbr_material(
            "AX9_Mat_TireRubber", (0.020, 0.020, 0.022, 1.0), metallic=0.05, roughness=0.86
        ),
        "cockpit_dark": make_pbr_material(
            "AX9_Mat_CockpitTub", (0.030, 0.032, 0.035, 1.0), metallic=0.15, roughness=0.72
        ),
        "seat_cushion": make_pbr_material(
            "AX9_Mat_SeatCushion", (0.055, 0.057, 0.060, 1.0), metallic=0.0, roughness=0.92
        ),
        "hazard": make_pbr_material(
            "AX9_Mat_HazardAmber", (0.90, 0.55, 0.08, 1.0), metallic=0.1, roughness=0.5
        ),
        "emitter_cyan": make_pbr_material(
            "AX9_Mat_DisplayScreen",
            (0.70, 0.82, 0.92, 1.0),
            metallic=0.0,
            roughness=0.2,
            emission_color=(0.70, 0.82, 0.92),
            emission_strength=1.6,
        ),
        "emitter_amber": make_pbr_material(
            "AX9_Mat_EmitterAmber",
            (1.0, 0.62, 0.18, 1.0),
            metallic=0.2,
            roughness=0.16,
            emission_color=(1.0, 0.62, 0.18),
            emission_strength=2.6,
        ),
        "nav_red": make_pbr_material(
            "AX9_Mat_NavRed", (1.0, 0.12, 0.10, 1.0), metallic=0.0, roughness=0.2,
            emission_color=(1.0, 0.12, 0.10), emission_strength=3.0,
        ),
        "nav_green": make_pbr_material(
            "AX9_Mat_NavGreen", (0.15, 1.0, 0.35, 1.0), metallic=0.0, roughness=0.2,
            emission_color=(0.15, 1.0, 0.35), emission_strength=3.0,
        ),
    }


def finalize_mesh_obj(
    name: str,
    bm: bmesh.types.BMesh,
    pivot_three: tuple[float, float, float],
    mat: "bpy.types.Material | list[bpy.types.Material]",
    bevel_width: float = 0.005,
    smooth_polys: bool = True,
) -> bpy.types.Object:
    pivot_b = t2b(*pivot_three)
    bmesh.ops.translate(bm, vec=-pivot_b, verts=bm.verts)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)

    # Split sharp edges (> 36 deg) so smooth shading keeps razor-sharp chine & airfoil creases
    if smooth_polys:
        sharp_edges = [
            e for e in bm.edges
            if len(e.link_faces) == 2 and e.calc_face_angle(0.0) > math.radians(36.0)
        ]
        if sharp_edges:
            bmesh.ops.split_edges(bm, edges=sharp_edges)

    mesh = bpy.data.meshes.new(name + "_Mesh")
    bm.to_mesh(mesh)
    bm.free()

    for poly in mesh.polygons:
        poly.use_smooth = smooth_polys

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location = pivot_b

    if bevel_width > 0 and not smooth_polys:
        bev = obj.modifiers.new(name="HardBevel", type="BEVEL")
        bev.width = bevel_width
        bev.segments = 2
        bev.limit_method = "ANGLE"
        bev.angle_limit = math.radians(32.0)
        bpy.context.view_layer.objects.active = obj
        obj.select_set(True)
        bpy.ops.object.modifier_apply(modifier=bev.name)
        obj.select_set(False)

    mat_list = mat if isinstance(mat, list) else [mat]
    obj.data.materials.clear()
    for m in mat_list:
        obj.data.materials.append(m)

    return obj


def add_lofted_sections(
    bm: bmesh.types.BMesh,
    stations: list[list[tuple[float, float, float]]],
    cap_start: bool = True,
    cap_end: bool = True,
    mat_index: int = 0,
    closed_loop: bool = False,
) -> list[list[bmesh.types.BMVert]]:
    rings: list[list[bmesh.types.BMVert]] = []
    for st in stations:
        ring = [bm.verts.new(t2b(*pt)) for pt in st]
        rings.append(ring)

    faces = []
    n_pts = len(stations[0])
    pairs = [(i, i + 1) for i in range(len(rings) - 1)]
    if closed_loop:
        pairs.append((len(rings) - 1, 0))
    for i0, i1 in pairs:
        r0 = rings[i0]
        r1 = rings[i1]
        for j in range(n_pts):
            jn = (j + 1) % n_pts
            faces.append(bm.faces.new((r0[j], r0[jn], r1[jn], r1[j])))

    if not closed_loop:
        if cap_start and len(rings[0]) >= 3:
            faces.append(bm.faces.new(list(reversed(rings[0]))))
        if cap_end and len(rings[-1]) >= 3:
            faces.append(bm.faces.new(rings[-1]))
    for f in faces:
        f.material_index = mat_index
    return rings


def add_box_strip(
    bm: bmesh.types.BMesh,
    x0: float,
    x1: float,
    y0: float,
    y1: float,
    z0: float,
    z1: float,
    mat_index: int = 0,
) -> None:
    xa, xb = min(x0, x1), max(x0, x1)
    ya, yb = min(y0, y1), max(y0, y1)
    za, zb = min(z0, z1), max(z0, z1)
    corners = [
        (xa, ya, za), (xb, ya, za), (xb, yb, za), (xa, yb, za),
        (xa, ya, zb), (xb, ya, zb), (xb, yb, zb), (xa, yb, zb),
    ]
    v = [bm.verts.new(t2b(*c)) for c in corners]
    for f in [
        (v[0], v[3], v[2], v[1]), (v[4], v[5], v[6], v[7]),
        (v[0], v[1], v[5], v[4]), (v[2], v[3], v[7], v[6]),
        (v[1], v[2], v[6], v[5]), (v[3], v[0], v[4], v[7]),
    ]:
        bm.faces.new(f).material_index = mat_index


def _axis_basis(d: Vector, width_hint: "Vector | None" = None) -> tuple[Vector, Vector]:
    """Orthonormal (u, v) perpendicular to axis d (Three.js space). u follows width_hint if given."""
    if width_hint is None:
        width_hint = Vector((0.0, 1.0, 0.0)) if abs(d.y) < 0.9 else Vector((1.0, 0.0, 0.0))
    u = (width_hint - d * width_hint.dot(d)).normalized()
    v = d.cross(u).normalized()
    return u, v


def add_tube(
    bm: bmesh.types.BMesh,
    p0: tuple[float, float, float],
    p1: tuple[float, float, float],
    r0: float,
    r1: "float | None" = None,
    seg: int = 16,
    cap: bool = True,
    mat_index: int = 0,
) -> list[list[bmesh.types.BMVert]]:
    """Round tube / truncated cone between two points (Three.js coords)."""
    a = Vector(p0)
    b = Vector(p1)
    d = (b - a).normalized()
    u, v = _axis_basis(d)
    rings = []
    for c, r in ((a, r0), (b, r1 if r1 is not None else r0)):
        ring = []
        for k in range(seg):
            t = k * (2.0 * math.pi / seg)
            q = c + (u * math.cos(t) + v * math.sin(t)) * r
            ring.append((q.x, q.y, q.z))
        rings.append(ring)
    return add_lofted_sections(bm, rings, cap, cap, mat_index)


def chamfer_rect(hw: float, hh: float, ch: float) -> list[tuple[float, float]]:
    ch = min(ch, hw * 0.45, hh * 0.45)
    return [
        (hw - ch, hh), (-hw + ch, hh), (-hw, hh - ch), (-hw, -hh + ch),
        (-hw + ch, -hh), (hw - ch, -hh), (hw, -hh + ch), (hw, hh - ch),
    ]


def add_chamfer_prism(
    bm: bmesh.types.BMesh,
    p0: tuple[float, float, float],
    p1: tuple[float, float, float],
    hw: float,
    hh: float,
    ch: float = 0.01,
    mat_index: int = 0,
    width_axis: tuple[float, float, float] = (1.0, 0.0, 0.0),
    hw_end: "float | None" = None,
    hh_end: "float | None" = None,
) -> None:
    """Machined block with chamfered edges extruded from p0 to p1; width measured along width_axis."""
    a = Vector(p0)
    b = Vector(p1)
    d = (b - a).normalized()
    u, v = _axis_basis(d, Vector(width_axis))
    rings = []
    for c, w, h in ((a, hw, hh), (b, hw_end or hw, hh_end or hh)):
        ring = []
        for px, py in chamfer_rect(w, h, ch):
            q = c + u * px + v * py
            ring.append((q.x, q.y, q.z))
        rings.append(ring)
    add_lofted_sections(bm, rings, True, True, mat_index)


def add_revolve(
    bm: bmesh.types.BMesh,
    center: tuple[float, float, float],
    axis: tuple[float, float, float],
    profile: list[tuple[float, float]],
    seg: int = 32,
    closed_profile: bool = True,
    mat_index: int = 0,
) -> None:
    """Revolve a (radius, axial offset) profile around an axis through center."""
    c = Vector(center)
    d = Vector(axis).normalized()
    u, v = _axis_basis(d)
    stations = []
    for r, ax in profile:
        ring = []
        for k in range(seg):
            t = k * (2.0 * math.pi / seg)
            q = c + d * ax + (u * math.cos(t) + v * math.sin(t)) * r
            ring.append((q.x, q.y, q.z))
        stations.append(ring)
    add_lofted_sections(bm, stations, not closed_profile, not closed_profile, mat_index, closed_profile)


# ==============================================================================
# 100% SYMMETRICAL C2-CONTINUOUS FUSELAGE & AIRFOIL MATHEMATICS
# ==============================================================================

def fuselage_envelope(z: float) -> tuple[float, float, float, float]:
    """
    Smooth C2-continuous Outer Mold Line (OML) for the AERIS X-9 fuselage
    from z = -6.50 (nose tip) to z = +4.75 (tail beaver sting).
    Returns (half_width, deck_top_y, bot_y, chine_y).
    """
    if z < -3.30:
        u = clamp01((z + 6.50) / 3.20)
        ogive = (u ** 0.85) * (0.70 + 0.30 * smoothstep(0.0, 1.0, u))
        hw = 0.008 + 0.992 * ogive
        deck_top_y = -0.05 + 0.43 * ogive
        bot_y = -0.06 - 0.26 * ogive
        chine_y = -0.055 + 0.085 * ogive
    elif z < 2.20:
        u = clamp01((z + 3.30) / 5.50)
        mid_swell = math.sin(math.pi * u)
        hw = 1.00 + 0.22 * mid_swell - 0.08 * smoothstep(0.65, 1.0, u)
        deck_top_y = 0.38 + 0.04 * mid_swell - 0.05 * smoothstep(0.65, 1.0, u)
        bot_y = -0.32 - 0.03 * mid_swell + 0.04 * smoothstep(0.70, 1.0, u)
        chine_y = 0.03 + 0.015 * mid_swell
    else:
        u = clamp01((z - 2.20) / 2.55)
        taper = 1.0 - smoothstep(0.0, 1.0, u) * 0.76
        hw = 0.92 * taper
        deck_top_y = 0.33 * taper + 0.03 * (1.0 - taper)
        bot_y = -0.28 * taper - 0.02 * (1.0 - taper)
        chine_y = 0.03 * taper + 0.015 * (1.0 - taper)
    return (hw, deck_top_y, bot_y, chine_y)


def fuselage_upper_y_at_x(abs_x: float, z: float) -> float:
    """
    Exact Y coordinate on the upper fuselage surface at lateral distance `abs_x` and station `z`.
    Ensures anything mounted on the dorsal deck (canopy, frame, upper spine) meets the curved
    fuselage skin with ZERO overhang or gap!
    """
    hw, top_y, _, chine_y = fuselage_envelope(z)
    if hw <= 1e-5:
        return top_y
    ratio = clamp01(abs_x / hw)
    # Since x = hw * sin(theta), cos(theta) = sqrt(1 - ratio^2)
    cos_t = math.sqrt(max(0.0, 1.0 - ratio * ratio))
    return chine_y + (top_y - chine_y) * (cos_t ** 0.90)


def chine_ring(z: float, scale_inset: float = 1.0) -> list[tuple[float, float, float]]:
    """
    24-point strictly bilaterally symmetrical stealth chine cross-section.
    Constructs the right side (x >= 0) from top-center -> right chine -> bottom-center,
    then mirrors the interior points (-x, y, z) for the left side so Left and Right
    are 100.000% identical!
    """
    hw, top_y, bot_y, chine_y = fuselage_envelope(z)
    hw *= scale_inset
    mid_y = (top_y + bot_y) * 0.5
    top_y = mid_y + (top_y - mid_y) * scale_inset
    bot_y = mid_y + (bot_y - mid_y) * scale_inset

    n_half = 12  # 12 segments top->chine, 12 segments chine->bottom => 48 points total
    right_pts: list[tuple[float, float, float]] = []

    # 1. Top center (k=0) -> Right chine (k=n_half)
    for k in range(n_half + 1):
        u = k / float(n_half)
        theta = u * math.pi * 0.5
        x = hw * math.sin(theta)
        y = chine_y + (top_y - chine_y) * (math.cos(theta) ** 0.90)
        right_pts.append((x, y, z))

    # 2. Right chine (k=1) -> Bottom center (k=n_half)
    for k in range(1, n_half + 1):
        u = k / float(n_half)
        theta = u * math.pi * 0.5
        x = hw * math.cos(theta)
        # True elliptical lower belly curve using sin(theta) (NOT cos(theta)!)
        y = chine_y + (bot_y - chine_y) * (math.sin(theta) ** 0.88)
        right_pts.append((x, y, z))

    # 3. Mirror interior points (excluding top-center idx 0 and bottom-center idx -1) for Left side (-X)
    left_pts: list[tuple[float, float, float]] = []
    for k in range(len(right_pts) - 2, 0, -1):
        rx, ry, rz = right_pts[k]
        left_pts.append((-rx, ry, rz))

    return right_pts + left_pts


def dorsal_canopy_spine_profile(z: float) -> tuple[float, float]:
    """
    Unified dorsal profile from windshield (z = -3.30) over cockpit apex (z = -2.10, height +0.44)
    tapering smoothly to a razor point at z = +3.30 (width -> 0.02, height -> 0.0).
    Returns (half_width, ridge_height_above_deck).
    """
    hw_body, _, _, _ = fuselage_envelope(z)
    if z < -2.10:
        u = clamp01((z + 3.30) / 1.20)
        rise = smoothstep(0.0, 1.0, u) ** 0.85
        dh = 0.01 + 0.43 * rise
        w = 0.08 + 0.36 * (smoothstep(0.0, 1.0, u) ** 0.70)
    else:
        u = clamp01((z + 2.10) / 5.40)
        taper = (1.0 - smoothstep(0.0, 1.0, u)) ** 1.05
        dh = 0.005 + 0.435 * taper
        w = 0.03 + 0.41 * taper
    return (min(w, hw_body * 0.52), dh)


def build_dorsal_arch_ring(z: float, extra_w: float = 0.0, extra_y: float = 0.0) -> list[tuple[float, float, float]]:
    """
    16-point bilaterally symmetrical dorsal arch cross-section whose base sits 100% flush
    on the curved fuselage upper deck `fuselage_upper_y_at_x(|x|, z)`.
    """
    w, dh = dorsal_canopy_spine_profile(z)
    w = max(0.02, w + extra_w)
    _, deck_center_y, _, _ = fuselage_envelope(z)
    peak_y = deck_center_y + dh + extra_y

    # Right side of arch from top-center (k=0) to right sill (k=5)
    n_arch = 10
    right_arch: list[tuple[float, float, float]] = []
    for k in range(n_arch + 1):
        u = k / float(n_arch)
        theta = u * math.pi * 0.5
        x = w * math.sin(theta)
        base_y_at_x = fuselage_upper_y_at_x(abs(x), z) + extra_y
        y = base_y_at_x + (peak_y - base_y_at_x) * (math.cos(theta) ** 0.85)
        right_arch.append((x, y, z))

    # Mirror for left side of arch (k = n_arch down to 1)
    left_arch: list[tuple[float, float, float]] = []
    for k in range(n_arch, 0, -1):
        rx, ry, rz = right_arch[k]
        left_arch.append((-rx, ry, rz))

    # Bottom closure tucked slightly inside the fuselage deck so there is zero gap
    sill_y = fuselage_upper_y_at_x(w, z) - 0.025
    bottom_pts = [
        (w * 0.85, sill_y, z),
        (0.0, deck_center_y - 0.03, z),
        (-w * 0.85, sill_y, z),
    ]
    return right_arch + bottom_pts + left_arch


def wing_planform(abs_x: float) -> tuple[float, float, float, float]:
    """
    Continuous supersonic swept wing planform for |x| in [0.88, 4.65].
    Returns (y_center, z_le, z_te, thickness).
    """
    u = clamp01((abs_x - 0.88) / (4.65 - 0.88))
    y_c = 0.03 - 0.015 * u
    z_le = -1.55 + 2.98 * u
    z_te = 2.10 + 0.18 * u
    thick = 0.14 * (1.0 - 0.65 * u)
    return (y_c, z_le, z_te, thick)


def wing_half_thickness_at_chord_frac(f: float, max_thick: float) -> float:
    """
    Razor-sharp supersonic biconvex airfoil thickness distribution for chord fraction f in [0, 1].
    Equals 0.003m at leading edge (f=0) and trailing edge (f=1), peaking at f=0.38.
    """
    fc = clamp01(f)
    # Smooth biconvex parabola peaking around f=0.40
    envelope = math.sin(math.pi * (fc ** 0.86))
    return max(0.0025, 0.5 * max_thick * envelope)


def build_wing_slice_ring(
    side: int,
    abs_x: float,
    f_start: float,
    f_end: float,
    y_override: float | None = None,
    z_le_override: float | None = None,
    z_te_override: float | None = None,
    thick_override: float | None = None,
) -> list[tuple[float, float, float]]:
    """
    Builds a 10-point airfoil section for chord fraction range [f_start, f_end] at span `abs_x`.
    Because WING, LEADING_TRIM, and ELEVON all sample this exact same mathematical airfoil,
    they fit together like precision CNC blocks with ZERO steps, ZERO notches, and ZERO cylindrical pipes!
    """
    s = float(side)
    yc, z_le, z_te, thick = wing_planform(abs_x)
    if y_override is not None:
        yc = y_override
    if z_le_override is not None:
        z_le = z_le_override
    if z_te_override is not None:
        z_te = z_te_override
    if thick_override is not None:
        thick = thick_override

    chord = max(0.05, z_te - z_le)
    fracs = [f_start + (f_end - f_start) * (k / 4.0) for k in range(5)]

    upper_pts: list[tuple[float, float, float]] = []
    lower_pts: list[tuple[float, float, float]] = []
    for f in fracs:
        z = z_le + chord * f
        ht = wing_half_thickness_at_chord_frac(f, thick)
        upper_pts.append((s * abs_x, yc + ht, z))
        lower_pts.append((s * abs_x, yc - ht, z))

    return upper_pts + list(reversed(lower_pts))


# ==============================================================================
# BUILDERS FOR ALL 46 CONTRACTUAL NODES
# ==============================================================================

def build_nose_shell(mats: dict) -> bpy.types.Object:
    bm = bmesh.new()
    z_list = [-6.50 + 3.20 * (i / 21.0) for i in range(22)]
    stations = [chine_ring(z) for z in z_list]
    add_lofted_sections(bm, stations)
    # Conformal internal AESA radar bulkhead tucked strictly inside at scale_inset=0.68
    radar_st = [chine_ring(-3.42, 0.68), chine_ring(-3.32, 0.68)]
    add_lofted_sections(bm, radar_st)
    return finalize_mesh_obj("AX9__CORE__CENTER__NOSE_SHELL", bm, (0.0, 0.04, -4.90), mats["skin_primary"], 0.0, True)


def build_main_fuselage(mats: dict) -> bpy.types.Object:
    bm = bmesh.new()
    z_list = [-3.30 + 5.50 * (i / 25.0) for i in range(26)]
    stations = [chine_ring(z) for z in z_list]
    add_lofted_sections(bm, stations)

    # Conformal internal structural bulkhead rings (scale_inset=0.72) so NOTHING ever pokes through the skin!
    for z_rib in (-1.50, -0.75, 0.0, 0.75, 1.50):
        rib_st = [chine_ring(z_rib - 0.03, 0.72), chine_ring(z_rib + 0.03, 0.72)]
        add_lofted_sections(bm, rib_st)
    return finalize_mesh_obj("AX9__CORE__CENTER__MAIN_FUSELAGE", bm, (0.0, 0.05, -0.55), mats["skin_primary"], 0.0, True)


def build_upper_spine(mats: dict) -> bpy.types.Object:
    bm = bmesh.new()
    # Continuous dorsal spine (-0.98m to +3.30m) sitting 100% flush on the curved fuselage deck
    z_list = [-0.98 + 4.28 * (i / 22.0) for i in range(23)]
    stations = [build_dorsal_arch_ring(z) for z in z_list]
    add_lofted_sections(bm, stations)
    return finalize_mesh_obj("AX9__CORE__CENTER__UPPER_SPINE", bm, (0.0, 0.56, 0.95), mats["skin_trim"], 0.0, True)


def build_belly_shell(mats: dict) -> bpy.types.Object:
    bm = bmesh.new()
    # Conformal ventral belly fairing (-2.20m to +2.40m) hugging the exact lower fuselage curve
    z_list = [-2.20 + 4.60 * (i / 18.0) for i in range(19)]
    stations = []
    for z in z_list:
        hw, _, bot_y, chine_y = fuselage_envelope(z)
        u = (z + 2.20) / 4.60
        span_frac = 0.25 + 0.30 * math.sin(math.pi * u)
        # Sample 5 points across the bottom belly arc
        top_pts = []
        bot_pts = []
        for k in range(-2, 3):
            theta = (k / 2.0) * span_frac * (math.pi * 0.5)
            x = hw * math.sin(theta)
            y_surf = chine_y + (bot_y - chine_y) * (math.cos(theta) ** 0.88)
            top_pts.append((x, y_surf + 0.015, z))
            bot_pts.append((x, y_surf - 0.002, z))
        stations.append(top_pts + list(reversed(bot_pts)))
    add_lofted_sections(bm, stations)
    return finalize_mesh_obj("AX9__CORE__CENTER__BELLY_SHELL", bm, (0.0, -0.32, 0.10), mats["carbon_stealth"], 0.0, True)


def build_rear_fuselage(mats: dict) -> bpy.types.Object:
    bm = bmesh.new()
    z_list = [2.18 + 2.57 * (i / 16.0) for i in range(17)]
    stations = [chine_ring(z) for z in z_list]
    add_lofted_sections(bm, stations)
    return finalize_mesh_obj("AX9__CORE__CENTER__REAR_FUSELAGE", bm, (0.0, 0.05, 3.40), mats["skin_primary"], 0.0, True)


def build_canopy_glass(mats: dict) -> bpy.types.Object:
    bm = bmesh.new()
    # Forward portion of the unified dorsal arch (-3.30m to -0.98m) flush with fuselage deck
    z_list = [-3.30 + 2.32 * (i / 20.0) for i in range(21)]
    stations = [build_dorsal_arch_ring(z) for z in z_list]
    add_lofted_sections(bm, stations)
    return finalize_mesh_obj("AX9__CANOPY__CENTER__CANOPY_GLASS", bm, (0.0, 0.64, -2.14), mats["canopy_glass"], 0.0, True)


def build_canopy_frame(mats: dict) -> bpy.types.Object:
    bm = bmesh.new()
    # Thin conformal canopy sill trim hugging the exact base of the canopy on the curved fuselage deck
    z_list = [-3.30 + 2.32 * (i / 18.0) for i in range(19)]
    for side in (-1.0, 1.0):
        sill_st = []
        for z in z_list:
            w, _ = dorsal_canopy_spine_profile(z)
            w = max(0.02, w)
            y_in = fuselage_upper_y_at_x(max(0.0, w - 0.015), z)
            y_out = fuselage_upper_y_at_x(w + 0.018, z)
            sill_st.append([
                (side * (w - 0.015), y_in + 0.018, z),
                (side * (w + 0.018), y_out + 0.008, z),
                (side * (w + 0.018), y_out - 0.012, z),
                (side * (w - 0.015), y_in - 0.012, z),
            ])
        if side < 0:
            sill_st = [list(reversed(st)) for st in sill_st]
        add_lofted_sections(bm, sill_st)
    return finalize_mesh_obj("AX9__CANOPY__CENTER__CANOPY_FRAME", bm, (0.0, 0.42, -2.14), mats["carbon_stealth"], 0.0, True)


def build_display_plate(mats: dict) -> bpy.types.Object:
    """
    Cockpit interior: ejection seat (bucket, cushions, headbox, side rails, firing handle),
    angled instrument panel with 3 MFD screens, glare-shield coaming, HUD combiner,
    side consoles with backlit strips, centre stick and throttle.
    Material slots: 0 tub/structure, 1 screens, 2 cushions, 3 alloy, 4 hazard amber.
    """
    bm = bmesh.new()
    TUB, SCREEN, CUSHION, ALLOY, HAZARD = 0, 1, 2, 3, 4

    # --- Ejection seat ---
    add_chamfer_prism(bm, (0.0, 0.26, -2.26), (0.0, 0.26, -1.84), 0.150, 0.040, 0.018, TUB)  # seat bucket
    add_chamfer_prism(bm, (0.0, 0.315, -2.22), (0.0, 0.315, -1.88), 0.122, 0.016, 0.012, CUSHION)  # seat cushion
    # Reclined backrest (leans aft ~18 deg) with separate back cushion
    add_chamfer_prism(bm, (0.0, 0.30, -1.80), (0.0, 0.66, -1.69), 0.140, 0.032, 0.016, TUB,
                      hw_end=0.125)
    add_chamfer_prism(bm, (0.0, 0.33, -1.835), (0.0, 0.62, -1.745), 0.112, 0.012, 0.010, CUSHION,
                      hw_end=0.100)
    # Headbox with parachute pack bulge
    add_chamfer_prism(bm, (0.0, 0.64, -1.71), (0.0, 0.76, -1.67), 0.120, 0.045, 0.020, TUB, hw_end=0.105)
    add_chamfer_prism(bm, (0.0, 0.655, -1.755), (0.0, 0.735, -1.735), 0.085, 0.012, 0.008, CUSHION)
    # Side rails & firing handle loop
    for sx in (-1.0, 1.0):
        add_tube(bm, (sx * 0.158, 0.30, -2.20), (sx * 0.150, 0.70, -1.70), 0.011, seg=10, mat_index=ALLOY)
        add_tube(bm, (sx * 0.055, 0.30, -2.27), (sx * 0.055, 0.345, -2.30), 0.008, seg=8, mat_index=HAZARD)
    add_tube(bm, (-0.058, 0.345, -2.30), (0.058, 0.345, -2.30), 0.009, seg=8, mat_index=HAZARD)

    # --- Instrument panel tilted toward the pilot ---
    add_chamfer_prism(bm, (0.0, 0.24, -2.58), (0.0, 0.43, -2.66), 0.215, 0.022, 0.012, TUB)
    panel_dir = (Vector((0.0, 0.43, -2.66)) - Vector((0.0, 0.24, -2.58))).normalized()
    pilot_n = panel_dir.cross(Vector((1.0, 0.0, 0.0))).normalized()
    if pilot_n.z < 0:
        pilot_n = -pilot_n
    for sx in (-0.128, 0.0, 0.128):
        c0 = Vector((sx, 0.265, -2.589)) + pilot_n * 0.024
        c1 = Vector((sx, 0.395, -2.644)) + pilot_n * 0.024
        add_chamfer_prism(bm, tuple(c0), tuple(c1), 0.052, 0.004, 0.003, SCREEN)
    # Glare-shield coaming hood
    add_chamfer_prism(bm, (0.0, 0.445, -2.80), (0.0, 0.445, -2.55), 0.205, 0.016, 0.012, TUB, hw_end=0.185)
    # HUD combiner: frame posts + glass plate
    for sx in (-0.07, 0.07):
        add_tube(bm, (sx, 0.46, -2.66), (sx, 0.58, -2.62), 0.006, seg=8, mat_index=ALLOY)
    add_chamfer_prism(bm, (0.0, 0.47, -2.655), (0.0, 0.575, -2.62), 0.064, 0.002, 0.001, SCREEN)

    # --- Side consoles with backlit strips, throttle & centre stick ---
    for sx in (-1.0, 1.0):
        add_chamfer_prism(bm, (sx * 0.215, 0.27, -2.48), (sx * 0.215, 0.27, -1.90), 0.042, 0.030, 0.010, TUB)
        for kz in (-2.40, -2.26, -2.12):
            add_box_strip(bm, sx * 0.19, sx * 0.24, 0.301, 0.306, kz, kz + 0.07, SCREEN)
    add_tube(bm, (-0.215, 0.30, -2.18), (-0.215, 0.37, -2.13), 0.010, seg=8, mat_index=ALLOY)  # throttle arm
    add_chamfer_prism(bm, (-0.215, 0.37, -2.14), (-0.215, 0.37, -2.10), 0.020, 0.022, 0.008, TUB)  # throttle grip
    add_tube(bm, (0.0, 0.23, -2.16), (0.0, 0.40, -2.19), 0.010, seg=10, mat_index=ALLOY)  # stick
    add_tube(bm, (0.0, 0.38, -2.19), (0.0, 0.44, -2.20), 0.017, 0.014, seg=10, mat_index=TUB)  # grip
    add_revolve(bm, (0.0, 0.235, -2.16), (0.0, 1.0, 0.0),
                [(0.0, 0.0), (0.045, 0.0), (0.035, 0.03), (0.012, 0.035), (0.0, 0.035)],
                seg=16, closed_profile=False, mat_index=TUB)  # stick boot

    return finalize_mesh_obj(
        "AX9__CANOPY__CENTER__DISPLAY_PLATE",
        bm,
        (0.0, 0.48, -2.30),
        [mats["cockpit_dark"], mats["emitter_cyan"], mats["seat_cushion"], mats["alloy_mech"], mats["hazard"]],
        0.0,
        True,
    )


def _intake_section(side: int, z: float, scale: float) -> list[tuple[float, float, float]]:
    """24-point superelliptical intake section that follows the chine envelope at station z."""
    s = float(side)
    hw_env, _, bot_y, chine_y = fuselage_envelope(z)
    u = clamp01((z + 2.10) / 3.20)
    swell = math.sin(math.pi * u)
    x_in = 0.32
    x_out = hw_env * (0.72 + 0.12 * swell)
    y_top = chine_y - 0.02
    y_bot = bot_y - 0.03 * swell
    cx = s * (x_in + x_out) * 0.5
    cy = (y_top + y_bot) * 0.5
    a = (x_out - x_in) * 0.5 * scale
    b = (y_top - y_bot) * 0.5 * scale
    pts = []
    n = 24
    for k in range(n):
        t = k * (2.0 * math.pi / n)
        c, sn = math.cos(t), math.sin(t)
        px = a * math.copysign(abs(c) ** 0.55, c)
        py = b * math.copysign(abs(sn) ** 0.55, sn)
        pts.append((cx + px, cy + py, z))
    if side < 0:
        pts = list(reversed(pts))
    return pts


def build_intake_shell(side: int, node_name: str, mats: dict) -> bpy.types.Object:
    """
    Hollow chine intake: rounded outer cowl, raked lip, inner S-duct liner ending on a dark
    compressor face, plus a boundary-layer splitter plate standing off the fuselage wall.
    Material slots: 0 cowl trim, 1 dark duct interior.
    """
    bm = bmesh.new()
    s = float(side)
    z_outer = [-2.10, -1.80, -1.40, -0.95, -0.50, 0.00, 0.55, 1.10]
    outer = add_lofted_sections(bm, [_intake_section(side, z, 1.0) for z in z_outer], False, True, 0)
    z_inner = [-2.06, -1.85, -1.60, -1.35]
    inner_st = [_intake_section(side, z, 0.84 - 0.06 * i) for i, z in enumerate(z_inner)]
    inner = add_lofted_sections(bm, inner_st, False, True, 1)
    # Lip joining cowl to liner
    n = len(outer[0])
    for j in range(n):
        jn = (j + 1) % n
        bm.faces.new((outer[0][j], outer[0][jn], inner[0][jn], inner[0][j])).material_index = 0
    # Boundary-layer splitter plate
    add_chamfer_prism(bm, (s * 0.285, -0.15, -2.24), (s * 0.285, -0.15, -1.30), 0.006, 0.15, 0.004, 0,
                      hh_end=0.13)
    for zz in (-2.0, -1.6):
        add_box_strip(bm, s * 0.29, s * 0.33, -0.17, -0.13, zz, zz + 0.05, 0)
    return finalize_mesh_obj(node_name, bm, (s * 0.68, -0.16, -0.50), [mats["skin_trim"], mats["cockpit_dark"]], 0.0, True)


def build_exhaust_ring(side: int, node_name: str, mats: dict) -> bpy.types.Object:
    """16 serrated nozzle petals + inner liner, turbine face and afterburner flame-holder ring."""
    bm = bmesh.new()
    s = float(side)
    xc = s * 0.50
    yc = 0.02
    n_petals = 16
    for k in range(n_petals):
        a0 = (k + 0.04) * (2.0 * math.pi / n_petals)
        a1 = (k + 0.96) * (2.0 * math.pi / n_petals)
        amid = (a0 + a1) * 0.5
        r_base_out, r_base_in = 0.30, 0.25
        r_tip_out, r_tip_in = 0.23, 0.18
        pts = [
            (xc + math.cos(a0) * r_base_in, yc + math.sin(a0) * r_base_in * 0.88, 3.65),
            (xc + math.cos(a1) * r_base_in, yc + math.sin(a1) * r_base_in * 0.88, 3.65),
            (xc + math.cos(a1) * r_base_out, yc + math.sin(a1) * r_base_out * 0.88, 3.65),
            (xc + math.cos(a0) * r_base_out, yc + math.sin(a0) * r_base_out * 0.88, 3.65),
            (xc + math.cos(a0) * r_tip_in, yc + math.sin(a0) * r_tip_in * 0.88, 4.44),
            (xc + math.cos(a1) * r_tip_in, yc + math.sin(a1) * r_tip_in * 0.88, 4.44),
            (xc + math.cos(amid) * r_tip_out, yc + math.sin(amid) * r_tip_out * 0.88, 4.55),
            (xc + math.cos(a0) * r_tip_out, yc + math.sin(a0) * r_tip_out * 0.88, 4.44),
        ]
        v = [bm.verts.new(t2b(*p)) for p in pts]
        bm.faces.new((v[0], v[3], v[2], v[1]))
        bm.faces.new((v[4], v[5], v[6], v[7]))
        bm.faces.new((v[3], v[7], v[6], v[2]))
        bm.faces.new((v[0], v[1], v[5], v[4]))
        bm.faces.new((v[1], v[2], v[6], v[5]))
        bm.faces.new((v[3], v[0], v[4], v[7]))
    # Inner liner, turbine face (cap at the forward end) and flame-holder torus
    add_tube(bm, (xc, yc, 3.58), (xc, yc, 4.30), 0.205, 0.17, seg=24, cap=False, mat_index=1)
    add_revolve(bm, (xc, yc, 3.60), (0.0, 0.0, 1.0),
                [(0.0, 0.0), (0.205, 0.0), (0.06, -0.06), (0.0, -0.07)], seg=24, closed_profile=False, mat_index=1)
    add_revolve(bm, (xc, yc, 3.78), (0.0, 0.0, 1.0),
                [(0.10, -0.012), (0.125, -0.012), (0.125, 0.012), (0.10, 0.012)], seg=24, mat_index=0)
    for k in range(6):
        ang = k * (math.pi / 3.0)
        add_tube(bm, (xc, yc, 3.78), (xc + math.cos(ang) * 0.11, yc + math.sin(ang) * 0.11, 3.78),
                 0.007, seg=6, mat_index=0)
    return finalize_mesh_obj(node_name, bm, (xc, yc, 4.10), [mats["nozzle_ceramic"], mats["cockpit_dark"]], 0.0, True)


def build_tip_light(side: int, node_name: str, mats: dict) -> bpy.types.Object:
    """Teardrop navigation-light lens on the winglet tip (red port / green starboard)."""
    bm = bmesh.new()
    s = float(side)
    profile = [(0.0, 0.0), (0.020, 0.04), (0.034, 0.14), (0.034, 0.30), (0.022, 0.42), (0.0, 0.46)]
    add_revolve(bm, (s * 4.90, 0.46, 1.90), (0.0, 0.0, 1.0),
                [(r * 1.0, a) for r, a in profile], seg=16, closed_profile=False, mat_index=0)
    return finalize_mesh_obj(node_name, bm, (s * 4.90, 0.46, 2.13),
                             mats["nav_red"] if side < 0 else mats["nav_green"], 0.0, True)


def build_gear_assembly(g_side, strut_piv, wheel_piv, door_box, w_rad, w_hw, mats, created_objects) -> None:
    """
    Articulated gear leg: oleo cylinder + chrome piston, collar, drag brace, torque-link scissor,
    axle; treaded tyre; multi-spoke rim with brake disc; ribbed door with hinges.
    """
    px, py, pz = strut_piv
    wx, wy, wz = wheel_piv
    mid_y = (py + wy) * 0.52
    ALLOY, CHROME = 0, 1

    # --- Strut ---
    bm_strut = bmesh.new()
    add_tube(bm_strut, (px, py + 0.05, pz), (px, mid_y, pz), 0.050, seg=20, mat_index=ALLOY)          # oleo cylinder
    add_tube(bm_strut, (px, mid_y + 0.03, pz), (px, mid_y - 0.03, pz), 0.060, seg=20, mat_index=ALLOY)  # gland collar
    add_tube(bm_strut, (px, mid_y, pz), (px, wy + 0.03, pz), 0.032, seg=16, mat_index=CHROME)        # chrome piston
    add_tube(bm_strut, (px, py + 0.02, pz - 0.30), (px, mid_y + 0.02, pz), 0.020, seg=10, mat_index=ALLOY)  # drag brace
    add_tube(bm_strut, (px - 0.05, py + 0.02, pz - 0.30), (px + 0.05, py + 0.02, pz - 0.30), 0.022, seg=10, mat_index=ALLOY)
    # Torque-link scissor on the aft face
    knee = (px, (mid_y + wy) * 0.5, pz + 0.12)
    add_chamfer_prism(bm_strut, (px, mid_y - 0.02, pz + 0.045), knee, 0.016, 0.007, 0.003, ALLOY,
                      width_axis=(1.0, 0.0, 0.0))
    add_chamfer_prism(bm_strut, knee, (px, wy + 0.06, pz + 0.040), 0.016, 0.007, 0.003, ALLOY,
                      width_axis=(1.0, 0.0, 0.0))
    add_tube(bm_strut, (px - 0.02, knee[1], knee[2]), (px + 0.02, knee[1], knee[2]), 0.012, seg=8, mat_index=CHROME)
    # Axle / fork
    if g_side == "FRONT":
        for sx in (-1.0, 1.0):
            add_chamfer_prism(bm_strut, (wx + sx * (w_hw + 0.025), wy + 0.09, wz),
                              (wx + sx * (w_hw + 0.025), wy, wz), 0.010, 0.026, 0.006, ALLOY)
        add_tube(bm_strut, (wx - w_hw - 0.04, wy + 0.10, wz), (wx + w_hw + 0.04, wy + 0.10, wz), 0.024, seg=12, mat_index=ALLOY)
    add_tube(bm_strut, (wx - w_hw - 0.04, wy, wz), (wx + w_hw + 0.04, wy, wz), 0.020, seg=12, mat_index=CHROME)
    s_name = f"AX9__GEAR__{g_side}__GEAR_STRUT_{g_side}"
    obj_strut = finalize_mesh_obj(s_name, bm_strut, strut_piv, [mats["alloy_mech"], mats["chrome"]], 0.0, True)
    created_objects[s_name] = obj_strut

    # --- Treaded tyre (revolved closed profile with 3 circumferential grooves) ---
    bm_wheel = bmesh.new()
    R, H = w_rad, w_hw
    half = [
        (0.60 * R, 0.86 * H), (0.78 * R, 1.00 * H), (0.93 * R, 0.94 * H), (0.99 * R, 0.70 * H),
        (1.00 * R, 0.52 * H), (0.965 * R, 0.48 * H), (0.965 * R, 0.38 * H), (1.00 * R, 0.34 * H),
        (1.00 * R, 0.08 * H), (0.965 * R, 0.04 * H),
    ]
    prof = half + [(r, -a) for r, a in reversed(half)]
    add_revolve(bm_wheel, wheel_piv, (1.0, 0.0, 0.0), prof, seg=40, closed_profile=True, mat_index=0)
    w_name = f"AX9__GEAR__{g_side}__GEAR_WHEEL_{g_side}"
    obj_wheel = finalize_mesh_obj(w_name, bm_wheel, wheel_piv, mats["tire_rubber"], 0.0, True)
    created_objects[w_name] = obj_wheel

    # --- Rim: dished wheel halves, 6 spokes, brake disc ---
    bm_hub = bmesh.new()
    rim_half = [(0.60 * R, 0.86 * H), (0.56 * R, 0.80 * H), (0.50 * R, 0.55 * H), (0.22 * R, 0.45 * H),
                (0.16 * R, 0.62 * H), (0.0, 0.64 * H)]
    add_revolve(bm_hub, wheel_piv, (1.0, 0.0, 0.0), rim_half, seg=28, closed_profile=False, mat_index=0)
    add_revolve(bm_hub, wheel_piv, (1.0, 0.0, 0.0), [(r, -a) for r, a in rim_half], seg=28, closed_profile=False, mat_index=0)
    for k in range(6):
        ang = k * (math.pi / 3.0)
        dy, dz = math.cos(ang), math.sin(ang)
        add_chamfer_prism(bm_hub, (wx, wy + dy * 0.18 * R, wz + dz * 0.18 * R),
                          (wx, wy + dy * 0.52 * R, wz + dz * 0.52 * R), 0.42 * H, 0.020 * R / 0.27, 0.004, 0)
    add_revolve(bm_hub, wheel_piv, (1.0, 0.0, 0.0),
                [(0.20 * R, -0.12 * H), (0.47 * R, -0.12 * H), (0.47 * R, 0.12 * H), (0.20 * R, 0.12 * H)],
                seg=28, closed_profile=True, mat_index=1)
    h_name = f"AX9__GEAR__{g_side}__GEAR_HUB_{g_side}"
    obj_hub = finalize_mesh_obj(h_name, bm_hub, wheel_piv, [mats["alloy_mech"], mats["chrome"]], 0.0, True)
    created_objects[h_name] = obj_hub

    w_world = obj_wheel.matrix_world.copy()
    obj_wheel.parent = obj_strut
    obj_wheel.matrix_parent_inverse = Matrix.Identity(4)
    obj_wheel.matrix_basis = obj_strut.matrix_world.inverted() @ w_world

    h_world = obj_hub.matrix_world.copy()
    obj_hub.parent = obj_wheel
    obj_hub.matrix_parent_inverse = Matrix.Identity(4)
    obj_hub.matrix_basis = obj_wheel.matrix_world.inverted() @ h_world

    # --- Door: skin plate + inner stiffener ribs + hinge knuckles ---
    dx0, dx1, dy0, dz0, dz1 = door_box
    bm_door = bmesh.new()
    cxd = (dx0 + dx1) * 0.5
    hwd = abs(dx1 - dx0) * 0.5
    add_chamfer_prism(bm_door, (cxd, dy0 - 0.005, dz0), (cxd, dy0 - 0.005, dz1), hwd, 0.010, 0.006, 0)
    for f in (0.25, 0.5, 0.75):
        xr = dx0 + (dx1 - dx0) * f
        add_box_strip(bm_door, xr - 0.008, xr + 0.008, dy0 + 0.005, dy0 + 0.030, dz0 + 0.05, dz1 - 0.05, 0)
    for zr in (dz0 + 0.06, dz1 - 0.06):
        add_box_strip(bm_door, dx0 + 0.02, dx1 - 0.02, dy0 + 0.005, dy0 + 0.022, zr - 0.008, zr + 0.008, 0)
    hinge_x = dx0 if g_side != "RIGHT" else dx1
    for zr in (dz0 + 0.12, dz1 - 0.12):
        add_tube(bm_door, (hinge_x, dy0 + 0.012, zr - 0.04), (hinge_x, dy0 + 0.012, zr + 0.04), 0.014, seg=10, mat_index=1)
    d_name = f"AX9__GEAR__{g_side}__GEAR_DOOR_{g_side}"
    door_piv = (dx0 if g_side != "RIGHT" else dx1, dy0, (dz0 + dz1) * 0.5)
    created_objects[d_name] = finalize_mesh_obj(d_name, bm_door, door_piv, [mats["carbon_stealth"], mats["alloy_mech"]], 0.0, True)


def build_wing(side: int, node_name: str, mats: dict) -> bpy.types.Object:
    bm = bmesh.new()
    s = float(side)
    # Main wing structural box from root (|x|=0.88) to wingtip (|x|=4.65)
    x_list = [0.88, 1.25, 2.05, 2.90, 3.75, 4.40, 4.65]
    stations = [build_wing_slice_ring(side, ax, 0.0, 1.0) for ax in x_list]
    # Smoothly canted upturned winglet
    stations.append(build_wing_slice_ring(side, 4.80, 0.0, 1.0, 0.24, 1.62, 2.32, 0.042))
    stations.append(build_wing_slice_ring(side, 4.92, 0.0, 1.0, 0.48, 1.85, 2.38, 0.026))

    if side < 0:
        stations = [list(reversed(st)) for st in stations]
    add_lofted_sections(bm, stations)
    return finalize_mesh_obj(node_name, bm, (s * 2.85, 0.04, 0.80), mats["skin_primary"], 0.0, True)


def build_leading_slat(side: int, node_name: str, mats: dict) -> bpy.types.Object:
    """
    Razor-sharp conformal leading-edge slat wrapping the forward 18% chord (f = 0.0 .. 0.18)
    of the exact wing airfoil with a 0.8mm conformal skin offset — ZERO cylindrical tubes!
    """
    bm = bmesh.new()
    s = float(side)
    x_list = [1.25, 2.05, 2.90, 3.75, 4.40]
    stations = []
    for ax in x_list:
        yc, z_le, z_te, thick = wing_planform(ax)
        stations.append(build_wing_slice_ring(side, ax, 0.0, 0.18, yc, z_le - 0.002, z_te, thick + 0.002))
    if side < 0:
        stations = [list(reversed(st)) for st in stations]
    add_lofted_sections(bm, stations)
    return finalize_mesh_obj(node_name, bm, (s * 2.82, 0.03, 0.02), mats["skin_trim"], 0.0, True)


def build_elevon(side: int, node_name: str, mats: dict) -> bpy.types.Object:
    """
    Razor-sharp conformal trailing-edge flaperon wrapping the aft 22% chord (f = 0.78 .. 1.0)
    of the exact wing airfoil with a 0.8mm conformal skin offset — ZERO gaps or steps!
    """
    bm = bmesh.new()
    s = float(side)
    x_list = [1.25, 2.05, 2.90, 3.75, 4.40]
    stations = []
    for ax in x_list:
        yc, z_le, z_te, thick = wing_planform(ax)
        stations.append(build_wing_slice_ring(side, ax, 0.78, 1.0, yc, z_le, z_te + 0.002, thick + 0.002))
    if side < 0:
        stations = [list(reversed(st)) for st in stations]
    add_lofted_sections(bm, stations)
    return finalize_mesh_obj(node_name, bm, (s * 2.82, 0.03, 2.00), mats["skin_trim"], 0.0, True)


def build_stabilizer(side: int, node_name: str, mats: dict) -> bpy.types.Object:
    """
    Horizontal tailplane rooted deeply into the rear fuselage chine (|x| = 0.52 .. 2.42).
    """
    bm = bmesh.new()
    s = float(side)
    stations = [
        build_wing_slice_ring(side, 0.52, 0.0, 1.0, 0.03, 2.68, 4.05, 0.095),
        build_wing_slice_ring(side, 1.48, 0.0, 1.0, 0.025, 3.20, 4.18, 0.068),
        build_wing_slice_ring(side, 2.42, 0.0, 1.0, 0.02, 3.68, 4.28, 0.038),
    ]
    if side < 0:
        stations = [list(reversed(st)) for st in stations]
    add_lofted_sections(bm, stations)
    return finalize_mesh_obj(node_name, bm, (s * 1.55, 0.025, 3.65), mats["carbon_stealth"], 0.0, True)


def build_fin(side: int, node_name: str, mats: dict) -> bpy.types.Object:
    """
    True symmetrical airfoil twin canted vertical stabilizer (canted 20 deg outward).
    """
    bm = bmesh.new()
    s = float(side)
    cant_rad = math.radians(20.0)
    nx = s * math.cos(cant_rad)
    ny = -math.sin(cant_rad)

    fin_specs = [
        (0.62, 0.24, 1.90, 3.85, 0.10),
        (0.98, 1.04, 2.48, 4.00, 0.072),
        (1.32, 1.80, 3.05, 4.14, 0.040),
    ]
    vert_stations = []
    for x_c, y_c, z_le, z_te, thick in fin_specs:
        base_ring = build_wing_slice_ring(1, 0.0, 0.0, 1.0, 0.0, z_le, z_te, thick)
        ring = []
        for _, offset_n, pz in base_ring:
            px = s * x_c + nx * offset_n
            py = y_c + ny * offset_n
            ring.append((px, py, pz))
        vert_stations.append(ring)

    if side < 0:
        vert_stations = [list(reversed(st)) for st in vert_stations]
    add_lofted_sections(bm, vert_stations)
    return finalize_mesh_obj(node_name, bm, (s * 0.98, 1.04, 3.15), mats["skin_primary"], 0.0, True)


def build_rear_shroud(side: int, node_name: str, mats: dict) -> bpy.types.Object:
    bm = bmesh.new()
    s = float(side)
    xc = s * 0.50
    yc = 0.02
    # Smoothly faired twin engine nacelle (+0.80m to +3.68m): starts tapered inside the fuselage
    # at z=+0.80 so there is ZERO blunt cylinder wall sticking out in Top view!
    z_list = [0.80 + 2.88 * (i / 14.0) for i in range(15)]
    stations = []
    for z in z_list:
        u = (z - 0.80) / 2.88
        front_blend = smoothstep(0.0, 0.35, u)
        rear_taper = 1.0 - 0.08 * smoothstep(0.65, 1.0, u)
        rx = (0.16 + 0.17 * front_blend) * rear_taper
        ry = (0.14 + 0.15 * front_blend) * rear_taper
        ring = []
        for k in range(20):
            ang = k * (2.0 * math.pi / 20.0)
            ring.append((xc + math.cos(ang) * rx, yc + math.sin(ang) * ry, z))
        stations.append(ring)
    add_lofted_sections(bm, stations)
    return finalize_mesh_obj(node_name, bm, (xc, yc, 2.40), mats["carbon_stealth"], 0.0, True)


def build_conformal_service_panel(
    side: int,
    idx: int,
    node_name: str,
    z_start: float,
    z_end: float,
    mats: dict,
) -> bpy.types.Object:
    """
    100% bilaterally symmetrical conformal skin panel hugging the exact `chine_ring` upper
    surface (`u` from 2/6 to 4/6 of the upper chine) with 0.8mm outer flushness.
    """
    bm = bmesh.new()
    s = float(side)
    z_steps = [z_start + (z_end - z_start) * (k / 5.0) for k in range(6)]
    stations = []
    u_in = 2.0 / 6.0
    u_mid = 3.0 / 6.0
    u_out = 4.0 / 6.0

    for z in z_steps:
        hw, top_y, _, chine_y = fuselage_envelope(z)

        def pt_on_upper_chine(u: float, offset_y: float) -> tuple[float, float, float]:
            theta = u * math.pi * 0.5
            x = s * hw * math.sin(theta)
            y = chine_y + (top_y - chine_y) * (math.cos(theta) ** 0.90)
            return (x, y + offset_y, z)

        p_in_top = pt_on_upper_chine(u_in, 0.0008)
        p_mid_top = pt_on_upper_chine(u_mid, 0.0008)
        p_out_top = pt_on_upper_chine(u_out, 0.0008)
        p_out_bot = pt_on_upper_chine(u_out, -0.012)
        p_mid_bot = pt_on_upper_chine(u_mid, -0.012)
        p_in_bot = pt_on_upper_chine(u_in, -0.012)
        stations.append([p_in_top, p_mid_top, p_out_top, p_out_bot, p_mid_bot, p_in_bot])

    if side < 0:
        stations = [list(reversed(st)) for st in stations]
    add_lofted_sections(bm, stations)

    pz = (z_start + z_end) * 0.5
    hw_mid, top_mid, _, chine_mid = fuselage_envelope(pz)
    theta_mid = u_mid * math.pi * 0.5
    px = s * hw_mid * math.sin(theta_mid)
    py = chine_mid + (top_mid - chine_mid) * (math.cos(theta_mid) ** 0.90)
    mat = mats["skin_trim"] if idx % 2 == 1 else mats["skin_primary"]
    return finalize_mesh_obj(node_name, bm, (px, py, pz), mat, 0.0, True)


def generate_aircraft() -> None:
    clear_scene()
    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    mats = create_materials()
    created_objects: dict[str, bpy.types.Object] = {}

    # 1. CORE (5 parts)
    created_objects["AX9__CORE__CENTER__NOSE_SHELL"] = build_nose_shell(mats)
    created_objects["AX9__CORE__CENTER__MAIN_FUSELAGE"] = build_main_fuselage(mats)
    created_objects["AX9__CORE__CENTER__UPPER_SPINE"] = build_upper_spine(mats)
    created_objects["AX9__CORE__CENTER__BELLY_SHELL"] = build_belly_shell(mats)
    created_objects["AX9__CORE__CENTER__REAR_FUSELAGE"] = build_rear_fuselage(mats)

    # 2. CANOPY (3 parts)
    created_objects["AX9__CANOPY__CENTER__CANOPY_GLASS"] = build_canopy_glass(mats)
    created_objects["AX9__CANOPY__CENTER__CANOPY_FRAME"] = build_canopy_frame(mats)
    created_objects["AX9__CANOPY__CENTER__DISPLAY_PLATE"] = build_display_plate(mats)

    # 3. SYMMETRIC LEFT / RIGHT SURFACES, DUCTS & LIGHTS (18 parts)
    for side_name, sgn in (("LEFT", -1), ("RIGHT", 1)):
        created_objects[f"AX9__SURFACE__{side_name}__WING_{side_name}"] = build_wing(
            sgn, f"AX9__SURFACE__{side_name}__WING_{side_name}", mats
        )
        created_objects[f"AX9__SURFACE__{side_name}__LEADING_TRIM_{side_name}"] = build_leading_slat(
            sgn, f"AX9__SURFACE__{side_name}__LEADING_TRIM_{side_name}", mats
        )
        created_objects[f"AX9__SURFACE__{side_name}__ELEVON_{side_name}"] = build_elevon(
            sgn, f"AX9__SURFACE__{side_name}__ELEVON_{side_name}", mats
        )
        created_objects[f"AX9__SURFACE__{side_name}__STABILIZER_{side_name}"] = build_stabilizer(
            sgn, f"AX9__SURFACE__{side_name}__STABILIZER_{side_name}", mats
        )
        created_objects[f"AX9__SURFACE__{side_name}__FIN_{side_name}"] = build_fin(
            sgn, f"AX9__SURFACE__{side_name}__FIN_{side_name}", mats
        )
        created_objects[f"AX9__DUCT__{side_name}__INTAKE_SHELL_{side_name}"] = build_intake_shell(
            sgn, f"AX9__DUCT__{side_name}__INTAKE_SHELL_{side_name}", mats
        )
        created_objects[f"AX9__DUCT__{side_name}__REAR_SHROUD_{side_name}"] = build_rear_shroud(
            sgn, f"AX9__DUCT__{side_name}__REAR_SHROUD_{side_name}", mats
        )
        created_objects[f"AX9__DUCT__{side_name}__EXHAUST_RING_{side_name}"] = build_exhaust_ring(
            sgn, f"AX9__DUCT__{side_name}__EXHAUST_RING_{side_name}", mats
        )

        created_objects[f"AX9__LIGHT__{side_name}__TIP_LIGHT_{side_name}"] = build_tip_light(
            sgn, f"AX9__LIGHT__{side_name}__TIP_LIGHT_{side_name}", mats
        )

    # 4. THREE ARTICULATED LANDING GEAR ASSEMBLIES (12 parts)
    gear_specs = [
        ("FRONT", (0.0, -0.32, -3.35), (0.0, -0.90, -3.35), (-0.18, 0.02, -0.31, -3.90, -2.85), 0.21, 0.070),
        ("LEFT", (-1.02, -0.32, 0.65), (-1.02, -0.90, 0.65), (-1.22, -0.76, -0.32, 0.05, 1.25), 0.27, 0.090),
        ("RIGHT", (1.02, -0.32, 0.65), (1.02, -0.90, 0.65), (0.76, 1.22, -0.32, 0.05, 1.25), 0.27, 0.090),
    ]

    for g_side, strut_piv, wheel_piv, door_box, w_rad, w_hw in gear_specs:
        build_gear_assembly(g_side, strut_piv, wheel_piv, door_box, w_rad, w_hw, mats, created_objects)

    # 5. FLUSH CONFORMAL EXTERIOR SERVICE PANELS (8 parts: strictly in z = -1.95 .. +0.75 ahead of nacelles)
    panel_z_ranges = [
        (1, -1.95, -1.32),
        (2, -1.26, -0.63),
        (3, -0.57, 0.06),
        (4, 0.12, 0.75),
    ]
    for side_name, sgn in (("LEFT", -1), ("RIGHT", 1)):
        for idx, z0, z1 in panel_z_ranges:
            node_name = f"AX9__PANEL__{side_name}__PANEL_{side_name}_{idx}"
            created_objects[node_name] = build_conformal_service_panel(
                sgn, idx, node_name, z0, z1, mats
            )

    # 6. VALIDATE & EXPORT GLB + ASSET REPORT
    expected_nodes = [p["nodeName"] for p in manifest["parts"]]
    missing = [n for n in expected_nodes if n not in created_objects]
    if missing:
        raise RuntimeError(f"Missing required contractual nodes: {missing}")

    total_tris = 0
    total_verts = 0
    for obj in created_objects.values():
        me = obj.data
        me.calc_loop_triangles()
        total_tris += len(me.loop_triangles)
        total_verts += len(me.vertices)

    os.makedirs(os.path.dirname(OUTPUT_GLB_PATH), exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=OUTPUT_GLB_PATH,
        export_format="GLB",
        export_apply=False,
        export_yup=True,
        export_materials="EXPORT",
        export_normals=True,
    )

    glb_size = os.path.getsize(OUTPUT_GLB_PATH)
    report = {
        "status": "PASS",
        "generator": "Blender 4.5 Headless Precision CAD & Conformal Stealth Generator (v5 Detailed Mechanics & Reference Palette)",
        "outputGlb": "public/assets/aircraft/aeris-x9.glb",
        "fileSizeBytes": glb_size,
        "expectedContractNodes": len(expected_nodes),
        "matchedContractNodes": len(created_objects),
        "missingContractNodes": missing,
        "totalTriangles": total_tris,
        "totalVertices": total_verts,
        "materialsCount": len(mats),
        "hasArticulated3PointLandingGear": True,
        "hasInternalStructuralBulkheads": True,
        "hasConformalStealthPanels": True,
    }
    with open(REPORT_JSON_PATH, "w", encoding="utf-8") as rf:
        json.dump(report, rf, indent=2)

    print(
        f"[AERIS X-9 v5] Exported {len(created_objects)}/46 nodes, "
        f"{total_tris} triangles, {glb_size} bytes -> {OUTPUT_GLB_PATH}"
    )


if __name__ == "__main__":
    generate_aircraft()
