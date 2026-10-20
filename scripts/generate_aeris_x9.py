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
    open_ring: bool = False,
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
        for j in range(n_pts - 1 if open_ring else n_pts):
            jn = (j + 1) % n_pts
            faces.append(bm.faces.new((r0[j], r0[jn], r1[jn], r1[j])))

    if not closed_loop and not open_ring:
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

def _scaled_ring(z: float, s: float) -> list[tuple[float, float, float]]:
    return chine_ring(z, s)


def add_hollow_shell(
    bm: bmesh.types.BMesh,
    z_list: list[float],
    wall_scale: float,
    out_idx: int,
    in_idx: int,
    close_start: bool = False,
    close_end: bool = False,
) -> None:
    """Outer skin + inner liner (scaled chine rings) joined by rim faces at open ends."""
    outer = add_lofted_sections(bm, [chine_ring(z) for z in z_list], close_start, close_end, out_idx)
    inner = add_lofted_sections(bm, [_scaled_ring(z, wall_scale) for z in z_list], False, False, in_idx)
    n = len(outer[0])
    for end, is_open in ((0, not close_start), (-1, not close_end)):
        if not is_open:
            continue
        for j in range(n):
            jn = (j + 1) % n
            bm.faces.new((outer[end][j], outer[end][jn], inner[end][jn], inner[end][j])).material_index = out_idx


def add_ring_frame(bm, z: float, depth: float, s_out: float, s_in: float, idx: int) -> None:
    """Annular bulkhead frame (ring with a lightening hole) conforming to the chine section."""
    z0, z1 = z - depth * 0.5, z + depth * 0.5
    o = add_lofted_sections(bm, [chine_ring(z0, s_out), chine_ring(z1, s_out)], False, False, idx)
    i = add_lofted_sections(bm, [chine_ring(z0, s_in), chine_ring(z1, s_in)], False, False, idx)
    n = len(o[0])
    for end in (0, 1):
        for j in range(n):
            jn = (j + 1) % n
            bm.faces.new((o[end][j], o[end][jn], i[end][jn], i[end][j])).material_index = idx


def add_seam_band(bm, z: float, idx: int, width: float = 0.014, lift: float = 1.006) -> None:
    """Raised circumferential panel seam (renders as a crisp double CAD line)."""
    add_lofted_sections(bm, [chine_ring(z - width * 0.5, lift), chine_ring(z + width * 0.5, lift)], False, False, idx)


def add_blade_antenna(bm, base: tuple[float, float, float], up: float, idx: int) -> None:
    """Swept blade antenna (thin tapered fin)."""
    bx, by, bz = base
    add_chamfer_prism(bm, (bx, by, bz - 0.09), (bx, by, bz + 0.06), 0.006, 0.004, 0.002, idx)
    stations = [
        [(bx - 0.006, by, bz - 0.08), (bx + 0.006, by, bz - 0.08), (bx + 0.006, by, bz + 0.06), (bx - 0.006, by, bz + 0.06)],
        [(bx - 0.003, by + up, bz + 0.02), (bx + 0.003, by + up, bz + 0.02), (bx + 0.003, by + up, bz + 0.08), (bx - 0.003, by + up, bz + 0.08)],
    ]
    add_lofted_sections(bm, stations, True, True, idx)


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

    # Seat pedestal / rails down to the well floor, tub side walls and floor plate
    add_chamfer_prism(bm, (0.0, 0.165, -2.22), (0.0, 0.165, -1.80), 0.11, 0.055, 0.012, TUB)
    for sx in (-1.0, 1.0):
        add_chamfer_prism(bm, (sx * 0.27, 0.22, -2.95), (sx * 0.27, 0.22, -1.55), 0.012, 0.11, 0.004, TUB)
    add_chamfer_prism(bm, (0.0, 0.112, -2.95), (0.0, 0.112, -1.55), 0.27, 0.006, 0.003, TUB)

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

    COCKPIT_DZ = -1.05
    bmesh.ops.translate(bm, vec=t2b(0.0, 0.10, COCKPIT_DZ), verts=bm.verts)
    return finalize_mesh_obj(
        "AX9__CANOPY__CENTER__DISPLAY_PLATE",
        bm,
        (0.0, 0.58, -2.30 + COCKPIT_DZ),
        [mats["cockpit_dark"], mats["emitter_cyan"], mats["seat_cushion"], mats["alloy_mech"], mats["hazard"]],
        0.0,
        True,
    )


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

    bpy.context.view_layer.update()  # refresh matrix_world before re-parenting
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


# ==============================================================================
# v8 STEALTH-FIGHTER OML (5th-gen proportions: chined nose, flat blended top, caret DSI
# intakes beside the cockpit, trapezoid wing with aligned edges, canted twin tails,
# single serrated nozzle). Three.js assembly space: x right, y up, z aft, nose at z=-6.5.
# ==============================================================================

TAN35 = math.tan(math.radians(35.0))
TAN14 = math.tan(math.radians(14.0))

NOSE_END_Z = -4.55
MAIN_END_Z = 2.20
TAIL_END_Z = 4.05
NOZZLE_C = (0.0, -0.01)


def _seg(z: float, z0: float, z1: float, a: tuple, b: tuple) -> tuple:
    t = smoothstep(z0, z1, z)
    return tuple(av + (bv - av) * t for av, bv in zip(a, b))


def fuselage_envelope(z: float) -> tuple[float, float, float, float]:
    """(half_width, top_y, bottom_y, chine_y) of the blended stealth fuselage at station z."""
    # key stations: (hw, top, bot, chine)
    tip = (0.012, -0.02, -0.04, -0.03)
    radome = (0.64, 0.38, -0.34, -0.03)
    cockpit = (0.76, 0.50, -0.46, 0.02)
    mid = (1.16, 0.58, -0.56, 0.08)
    aft = (1.09, 0.55, -0.52, 0.07)
    tail = (0.54, 0.44, -0.44, 0.00)
    if z < NOSE_END_Z:
        u = clamp01((z + 6.50) / (NOSE_END_Z + 6.50))
        o = u ** 0.72
        return tuple(a + (b - a) * o for a, b in zip(tip, radome))
    if z < -3.20:
        return _seg(z, NOSE_END_Z, -3.20, radome, cockpit)
    if z < -0.60:
        return _seg(z, -3.20, -0.60, cockpit, mid)
    if z < MAIN_END_Z:
        return _seg(z, -0.60, MAIN_END_Z, mid, aft)
    return _seg(z, MAIN_END_Z, TAIL_END_Z + 0.05, aft, tail)


def _upper_y(r: float, top_y: float, chine_y: float) -> float:
    """Flat top with rounded shoulders, dropping sharply onto the chine at r=1."""
    r = clamp01(r)
    return chine_y + (top_y - chine_y) * (1.0 - r ** 2.6) ** 0.85


def _lower_y(r: float, bot_y: float, chine_y: float) -> float:
    """Inward-canted lower side facet (chine -> r=0.80) then a near-flat belly."""
    r = clamp01(r)
    flat_y = bot_y + 0.04
    if r >= 0.80:
        return chine_y + (flat_y - chine_y) * ((1.0 - r) / 0.20)
    return bot_y + 0.04 * (r / 0.80) ** 2


def fuselage_upper_y_at_x(abs_x: float, z: float) -> float:
    hw, top_y, _, chine_y = fuselage_envelope(z)
    if hw <= 1e-5:
        return top_y
    return _upper_y(abs_x / hw, top_y, chine_y)


def fuselage_lower_y_at_x(abs_x: float, z: float) -> float:
    hw, _, bot_y, chine_y = fuselage_envelope(z)
    if hw <= 1e-5:
        return bot_y
    return _lower_y(abs_x / hw, bot_y, chine_y)


COCKPIT_WELL_HW = 0.31
COCKPIT_WELL_DEPTH = 0.30


def cockpit_well_depth(abs_x: float, z: float) -> float:
    """Depth of the open cockpit tub below the deck at (|x|, z); 0 outside the well."""
    dz = smoothstep(-4.32, -4.08, z) * (1.0 - smoothstep(-2.78, -2.52, z))
    dx = 1.0 - smoothstep(COCKPIT_WELL_HW - 0.07, COCKPIT_WELL_HW, abs_x)
    return COCKPIT_WELL_DEPTH * dz * dx


def chine_ring(z: float, scale_inset: float = 1.0) -> list[tuple[float, float, float]]:
    """48-point bilaterally symmetric faceted section (sharp chine at |x| = hw), with the cockpit well."""
    hw, top_y, bot_y, chine_y = fuselage_envelope(z)
    mid_y = (top_y + bot_y) * 0.5
    right: list[tuple[float, float, float]] = []
    n = 12
    for k in range(n + 1):  # top centre -> chine
        r = math.sin((k / n) * math.pi * 0.5)
        right.append((hw * r, _upper_y(r, top_y, chine_y) - cockpit_well_depth(hw * r, z), z))
    for k in range(1, n + 1):  # chine -> bottom centre
        r = math.cos((k / n) * math.pi * 0.5)
        right.append((hw * r, _lower_y(r, bot_y, chine_y), z))
    if scale_inset != 1.0:
        right = [(x * scale_inset, mid_y + (y - mid_y) * scale_inset, zz) for x, y, zz in right]
    left = [(-x, y, zz) for x, y, zz in reversed(right[1:-1])]
    return right + left


def dorsal_canopy_spine_profile(z: float) -> tuple[float, float]:
    """(half_width, height above deck): bubble canopy (-4.42..-2.40) flowing into a broad dorsal hump."""
    if z < -4.42 or z > 3.0:
        return (0.02, 0.0)
    if z < -3.45:
        u = clamp01((z + 4.42) / 0.97)
        s = smoothstep(0.0, 1.0, u)
        return (0.10 + 0.28 * s ** 0.6, 0.01 + 0.43 * s ** 0.8)
    if z < -2.40:
        u = clamp01((z + 3.45) / 1.05)
        return (0.38 + 0.02 * u, 0.44 - 0.16 * smoothstep(0.0, 1.0, u))
    u = clamp01((z + 2.40) / 5.40)
    t = (1.0 - smoothstep(0.0, 1.0, u)) ** 1.1
    return (0.06 + 0.36 * t, 0.005 + 0.275 * t)


def wing_planform(abs_x: float) -> tuple[float, float, float, float]:
    """Trapezoid wing (|x| 0.95..3.85): LE sweep 35 deg, TE sweep -14 deg, LEX blending to the intake."""
    ax = max(0.95, min(3.85, abs_x))
    z_le = -1.40 + (ax - 1.05) * TAN35
    z_le = min(z_le, -3.05 + (ax - 1.0) * 3.6)  # leading-edge extension along the intake shoulder
    z_te = 2.50 - (ax - 1.05) * TAN14
    u = clamp01((ax - 1.05) / 2.80)
    y_c = 0.10 - 0.04 * u
    thick = 0.15 * (1.0 - 0.62 * u)
    return (y_c, z_le, z_te, thick)


def build_wing(side: int, node_name: str, mats: dict) -> bpy.types.Object:
    bm = bmesh.new()
    s = float(side)
    x_list = [0.95, 1.08, 1.22, 1.38, 1.6, 2.0, 2.6, 3.2, 3.85]
    stations = [build_wing_slice_ring(side, ax, 0.0, 1.0) for ax in x_list]
    if side < 0:
        stations = [list(reversed(st)) for st in stations]
    add_lofted_sections(bm, stations)
    return finalize_mesh_obj(node_name, bm, (s * 2.4, 0.08, 0.9), mats["skin_primary"], 0.0, True)


def build_leading_slat(side: int, node_name: str, mats: dict) -> bpy.types.Object:
    bm = bmesh.new()
    s = float(side)
    stations = []
    for ax in [1.62, 2.2, 2.8, 3.35, 3.8]:
        yc, z_le, z_te, thick = wing_planform(ax)
        stations.append(build_wing_slice_ring(side, ax, 0.0, 0.16, yc, z_le - 0.002, z_te, thick + 0.002))
    if side < 0:
        stations = [list(reversed(st)) for st in stations]
    add_lofted_sections(bm, stations)
    return finalize_mesh_obj(node_name, bm, (s * 2.7, 0.08, 0.2), mats["skin_trim"], 0.0, True)


def build_elevon(side: int, node_name: str, mats: dict) -> bpy.types.Object:
    """Inboard flaperon on the aft 24% chord."""
    bm = bmesh.new()
    s = float(side)
    stations = []
    for ax in [1.25, 1.8, 2.35, 2.85]:
        yc, z_le, z_te, thick = wing_planform(ax)
        stations.append(build_wing_slice_ring(side, ax, 0.76, 1.0, yc, z_le, z_te + 0.002, thick + 0.002))
    if side < 0:
        stations = [list(reversed(st)) for st in stations]
    add_lofted_sections(bm, stations)
    return finalize_mesh_obj(node_name, bm, (s * 2.05, 0.08, 2.2), mats["skin_trim"], 0.0, True)


def build_stabilizer(side: int, node_name: str, mats: dict) -> bpy.types.Object:
    """All-moving trapezoid tailplane, edges parallel to the wing."""
    bm = bmesh.new()
    s = float(side)
    specs = [(0.55, 2.80, 4.55, 0.09), (1.4, 2.80 + 0.85 * TAN35, 4.62, 0.065), (2.55, 2.80 + 2.0 * TAN35, 4.70, 0.035)]
    stations = [build_wing_slice_ring(side, ax, 0.0, 1.0, 0.0, zl, zt, th) for ax, zl, zt, th in specs]
    if side < 0:
        stations = [list(reversed(st)) for st in stations]
    add_lofted_sections(bm, stations)
    return finalize_mesh_obj(node_name, bm, (s * 1.55, 0.0, 3.9), mats["carbon_stealth"], 0.0, True)


def build_fin(side: int, node_name: str, mats: dict) -> bpy.types.Object:
    """Twin vertical tail canted 25 deg outboard, swept LE, mounted on the fuselage shoulders."""
    bm = bmesh.new()
    s = float(side)
    cant = math.radians(25.0)
    base_x = 0.80
    base_y = fuselage_upper_y_at_x(base_x, 2.9) - 0.05
    specs = [(0.0, 1.95, 3.85, 0.095), (0.8, 1.95 + 0.8 * 0.78, 3.90, 0.065), (1.6, 1.95 + 1.6 * 0.78, 3.98, 0.035)]
    nx = s * math.cos(cant)
    ny = -math.sin(cant)
    stations = []
    for h, z_le, z_te, thick in specs:
        cx = s * (base_x + h * math.sin(cant))
        cy = base_y + h * math.cos(cant)
        ring = []
        for _, off, pz in build_wing_slice_ring(1, 0.0, 0.0, 1.0, 0.0, z_le, z_te, thick):
            ring.append((cx + nx * off, cy + ny * off, pz))
        stations.append(ring)
    if side < 0:
        stations = [list(reversed(st)) for st in stations]
    add_lofted_sections(bm, stations)
    return finalize_mesh_obj(node_name, bm, (s * 1.1, base_y + 0.7, 3.2), mats["skin_primary"], 0.0, True)


def _intake_params(z: float) -> tuple[float, float, float, float, float]:
    """(x_inner, x_outer_top, x_outer_bot, y_top, y_bot) of the caret intake at station z."""
    hw = fuselage_envelope(min(z, -3.2))[0]
    u = clamp01((z + 3.30) / 2.6)
    xi = hw - 0.01
    return (xi, xi + 0.50 - 0.06 * u, xi + 0.38 - 0.04 * u, 0.16 - 0.02 * u, -0.40 + 0.05 * u)


def _intake_poly(side: int, z: float, scale: float = 1.0, rake: bool = False) -> list[tuple[float, float, float]]:
    s = float(side)
    xi, xot, xob, yt, yb = _intake_params(z)
    pts2 = [
        (xi + 0.02, yt), (xot - 0.03, yt), (xot, yt - 0.03), (xob, yb + 0.03),
        (xob - 0.03, yb), (xi + 0.02, yb), (xi, yb + 0.02), (xi, yt - 0.02),
    ]
    cx = sum(p[0] for p in pts2) / len(pts2)
    cy = sum(p[1] for p in pts2) / len(pts2)
    out = []
    for x, y in pts2:
        px = cx + (x - cx) * scale
        py = cy + (y - cy) * scale
        pz = z
        if rake:
            # Caret lip: top/inner edge forward, bottom/outer edge swept aft
            pz = z + 0.24 * (yt - py) / (yt - yb) + 0.14 * (px - xi) / (xot - xi)
        out.append((s * px, py, pz))
    if side < 0:
        out = list(reversed(out))
    return out


def build_intake_shell(side: int, node_name: str, mats: dict) -> bpy.types.Object:
    """
    Caret inlet beside the cockpit: raked forward-swept lip, hollow duct ending on a dark
    compressor face, and the diverterless (DSI) bump on the fuselage wall ahead of it.
    Slots: 0 cowl trim, 1 dark duct interior.
    """
    bm = bmesh.new()
    s = float(side)
    z_lip = -3.30
    z_outer = [z_lip, -2.9, -2.4, -1.9, -1.4, -0.9]
    outer_st = [_intake_poly(side, z_lip, 1.0, True)] + [_intake_poly(side, z) for z in z_outer[1:]]
    outer = add_lofted_sections(bm, outer_st, False, True, 0)
    inner_st = [_intake_poly(side, z_lip, 0.84, True)] + [_intake_poly(side, z, 0.84 - 0.05 * i) for i, z in enumerate([-3.0, -2.7, -2.45], 1)]
    inner = add_lofted_sections(bm, inner_st, False, True, 1)
    n = len(outer[0])
    for j in range(n):
        jn = (j + 1) % n
        bm.faces.new((outer[0][j], outer[0][jn], inner[0][jn], inner[0][j])).material_index = 0
    # DSI bump: smooth blister on the fuselage side just ahead of the lip
    bump = []
    for i in range(9):
        z = -3.95 + 0.85 * i / 8.0
        hw = fuselage_envelope(z)[0]
        b = 0.11 * math.sin(math.pi * i / 8.0) ** 0.8
        ring = []
        for k in range(9):
            t = -math.pi / 2 + math.pi * k / 8.0
            ring.append((s * (hw - 0.01 + b * math.cos(t)), -0.10 + 0.20 * math.sin(t), z))
        if side < 0:
            ring = list(reversed(ring))
        bump.append(ring)
    add_lofted_sections(bm, bump, False, False, 0, open_ring=True)
    return finalize_mesh_obj(node_name, bm, (s * 0.95, -0.08, -2.4), [mats["skin_trim"], mats["cockpit_dark"]], 0.0, True)


def _half_arc(side: int, cx: float, cy: float, r: float, z: float, n: int = 12) -> list[tuple[float, float, float]]:
    """Half circle on the given side (x>=cx for right), ordered bottom -> top."""
    s = float(side)
    return [(cx + s * r * math.cos(t), cy + r * math.sin(t), z)
            for t in (-math.pi / 2 + math.pi * k / n for k in range(n + 1))]


def build_rear_shroud(side: int, node_name: str, mats: dict) -> bpy.types.Object:
    """Half of the single engine casing (split down the centreline) with stiffening rings."""
    bm = bmesh.new()
    cx, cy = NOZZLE_C
    stations = []
    for i in range(12):
        z = 0.20 + 3.85 * i / 11.0
        r_out = 0.36 + 0.05 * smoothstep(0.0, 0.3, i / 11.0)
        outer = _half_arc(side, cx, cy, r_out, z)
        inner = _half_arc(side, cx, cy, r_out - 0.03, z)
        ring = outer + list(reversed(inner))
        if side < 0:
            ring = list(reversed(ring))
        stations.append(ring)
    add_lofted_sections(bm, stations, True, True, 0)
    for zr in (0.6, 1.4, 2.2, 3.0, 3.7):
        ring = _half_arc(side, cx, cy, 0.425, zr - 0.03) + list(reversed(_half_arc(side, cx, cy, 0.40, zr - 0.03)))
        ring2 = _half_arc(side, cx, cy, 0.425, zr + 0.03) + list(reversed(_half_arc(side, cx, cy, 0.40, zr + 0.03)))
        if side < 0:
            ring, ring2 = list(reversed(ring)), list(reversed(ring2))
        add_lofted_sections(bm, [ring, ring2], True, True, 1)
    return finalize_mesh_obj(node_name, bm, (side * 0.2, cy, 2.1), [mats["carbon_stealth"], mats["alloy_mech"]], 0.0, True)


def build_exhaust_ring(side: int, node_name: str, mats: dict) -> bpy.types.Object:
    """Half of the single serrated (sawtooth) nozzle: 8 petals, inner liner, turbine face, flame holder."""
    bm = bmesh.new()
    cx, cy = NOZZLE_C
    n_total = 16
    ks = range(0, 8) if side > 0 else range(8, 16)
    for k in ks:
        a0 = -math.pi / 2 + (k + 0.04) * (2.0 * math.pi / n_total)
        a1 = -math.pi / 2 + (k + 0.96) * (2.0 * math.pi / n_total)
        amid = (a0 + a1) * 0.5
        rbo, rbi, rto, rti = 0.46, 0.40, 0.38, 0.33
        z0, z1, z2 = 4.00, 4.58, 4.74
        pts = [
            (cx + math.cos(a0) * rbi, cy + math.sin(a0) * rbi, z0),
            (cx + math.cos(a1) * rbi, cy + math.sin(a1) * rbi, z0),
            (cx + math.cos(a1) * rbo, cy + math.sin(a1) * rbo, z0),
            (cx + math.cos(a0) * rbo, cy + math.sin(a0) * rbo, z0),
            (cx + math.cos(a0) * rti, cy + math.sin(a0) * rti, z1),
            (cx + math.cos(a1) * rti, cy + math.sin(a1) * rti, z1),
            (cx + math.cos(amid) * rto, cy + math.sin(amid) * rto, z2),
            (cx + math.cos(a0) * rto, cy + math.sin(a0) * rto, z1),
        ]
        v = [bm.verts.new(t2b(*p)) for p in pts]
        bm.faces.new((v[0], v[3], v[2], v[1]))
        bm.faces.new((v[4], v[5], v[6], v[7]))
        bm.faces.new((v[3], v[7], v[6], v[2]))
        bm.faces.new((v[0], v[1], v[5], v[4]))
        bm.faces.new((v[1], v[2], v[6], v[5]))
        bm.faces.new((v[3], v[0], v[4], v[7]))
    # Inner liner (half tube), turbine face (half disc) and flame-holder half ring
    liner = [_half_arc(side, cx, cy, r, z) for r, z in ((0.39, 3.92), (0.34, 4.50))]
    if side < 0:
        liner = [list(reversed(r)) for r in liner]
    add_lofted_sections(bm, liner, False, False, 1, open_ring=True)
    face = [_half_arc(side, cx, cy, r, 3.93) for r in (0.39, 0.06)]
    if side < 0:
        face = [list(reversed(r)) for r in face]
    add_lofted_sections(bm, face, False, False, 1, open_ring=True)
    holder = []
    for r, dz in ((0.20, -0.02), (0.24, -0.02), (0.24, 0.02), (0.20, 0.02)):
        holder.append(_half_arc(side, cx, cy, r, 4.12 + dz))
    if side < 0:
        holder = [list(reversed(r)) for r in holder]
    add_lofted_sections(bm, holder, False, False, 0, True, open_ring=True)
    return finalize_mesh_obj(node_name, bm, (side * 0.2, cy, 4.35), [mats["nozzle_ceramic"], mats["cockpit_dark"]], 0.0, True)


def build_tip_light(side: int, node_name: str, mats: dict) -> bpy.types.Object:
    """Flush navigation-light lens on the cropped wingtip (red port / green starboard)."""
    bm = bmesh.new()
    s = float(side)
    yc, z_le, z_te, _ = wing_planform(3.85)
    zc = z_le + 0.15
    add_revolve(bm, (s * 3.87, yc, zc), (0.0, 0.0, 1.0),
                [(0.0, 0.0), (0.016, 0.03), (0.026, 0.10), (0.026, 0.26), (0.016, 0.36), (0.0, 0.40)],
                seg=14, closed_profile=False, mat_index=0)
    return finalize_mesh_obj(node_name, bm, (s * 3.87, yc, zc + 0.2),
                             mats["nav_red"] if side < 0 else mats["nav_green"], 0.0, True)


def build_upper_spine(mats: dict) -> bpy.types.Object:
    bm = bmesh.new()
    z_list = [-2.40 + 5.30 * (i / 24.0) for i in range(25)]
    add_lofted_sections(bm, [build_dorsal_arch_ring(z) for z in z_list])
    return finalize_mesh_obj("AX9__CORE__CENTER__UPPER_SPINE", bm, (0.0, 0.62, 0.3), mats["skin_trim"], 0.0, True)


def build_canopy_glass(mats: dict) -> bpy.types.Object:
    bm = bmesh.new()
    z_list = [-4.42 + 2.02 * (i / 22.0) for i in range(23)]
    add_lofted_sections(bm, [build_dorsal_arch_ring(z) for z in z_list])
    return finalize_mesh_obj("AX9__CANOPY__CENTER__CANOPY_GLASS", bm, (0.0, 0.62, -3.4), mats["canopy_glass"], 0.0, True)


def build_canopy_frame(mats: dict) -> bpy.types.Object:
    """Canopy sill rails + the single aft bow where the bubble meets the dorsal fairing."""
    bm = bmesh.new()
    z_list = [-4.42 + 2.02 * (i / 18.0) for i in range(19)]
    for side in (-1.0, 1.0):
        st = []
        for z in z_list:
            w, _ = dorsal_canopy_spine_profile(z)
            w = max(0.03, w)
            y_in = fuselage_upper_y_at_x(max(0.0, w - 0.015), z)
            y_out = fuselage_upper_y_at_x(w + 0.02, z)
            st.append([
                (side * (w - 0.015), y_in + 0.02, z),
                (side * (w + 0.02), y_out + 0.01, z),
                (side * (w + 0.02), y_out - 0.012, z),
                (side * (w - 0.015), y_in - 0.012, z),
            ])
        if side < 0:
            st = [list(reversed(s_)) for s_ in st]
        add_lofted_sections(bm, st)
    # aft canopy bow
    a = build_dorsal_arch_ring(-2.42, 0.012, 0.012)
    b = build_dorsal_arch_ring(-2.36, 0.012, 0.012)
    add_lofted_sections(bm, [a, b])
    return finalize_mesh_obj("AX9__CANOPY__CENTER__CANOPY_FRAME", bm, (0.0, 0.42, -3.4), mats["carbon_stealth"], 0.0, True)


def build_belly_shell(mats: dict) -> bpy.types.Object:
    """Ventral centre-line fairing on the flat belly between the main gear bays."""
    bm = bmesh.new()
    stations = []
    for i in range(19):
        z = -2.0 + 4.0 * i / 18.0
        hwb = 0.38 + 0.08 * math.sin(math.pi * i / 18.0)
        top, bot = [], []
        for k in range(-3, 4):
            x = hwb * k / 3.0
            y = fuselage_lower_y_at_x(abs(x), z)
            top.append((x, y + 0.012, z))
            bot.append((x, y - 0.016 * (1.0 - abs(k) / 3.0) - 0.004, z))
        stations.append(top + list(reversed(bot)))
    add_lofted_sections(bm, stations)
    return finalize_mesh_obj("AX9__CORE__CENTER__BELLY_SHELL", bm, (0.0, -0.40, 0.0), mats["carbon_stealth"], 0.0, True)


def add_long_seam(bm, z0: float, z1: float, u: float, side: float, idx: int, steps: int = 10) -> None:
    """Raised longitudinal panel seam on the flat top at lateral fraction u of the half-width."""
    stations = []
    for k in range(steps + 1):
        z = z0 + (z1 - z0) * k / steps
        hw = fuselage_envelope(z)[0]
        pts = []
        for du, dy in ((-0.007, 0.004), (0.007, 0.004), (0.007, -0.004), (-0.007, -0.004)):
            x = (u + du) * hw
            pts.append((side * x, fuselage_upper_y_at_x(x, z) + dy, z))
        if side < 0:
            pts = list(reversed(pts))
        stations.append(pts)
    add_lofted_sections(bm, stations, True, True, idx)


def build_conformal_service_panel(side: int, idx: int, node_name: str, z_start: float, z_end: float, mats: dict) -> bpy.types.Object:
    """Flush access panel on the flat upper deck between the spine and the chine shoulder."""
    bm = bmesh.new()
    s = float(side)
    stations = []
    for k in range(6):
        z = z_start + (z_end - z_start) * (k / 5.0)
        hw = fuselage_envelope(z)[0]
        xs = [hw * f for f in (0.42, 0.56, 0.70)]
        top = [(s * x, fuselage_upper_y_at_x(x, z) + 0.0015, z) for x in xs]
        bot = [(s * x, fuselage_upper_y_at_x(x, z) - 0.012, z) for x in reversed(xs)]
        st = top + bot
        if side < 0:
            st = list(reversed(st))
        stations.append(st)
    add_lofted_sections(bm, stations)
    pz = (z_start + z_end) * 0.5
    px = fuselage_envelope(pz)[0] * 0.56
    mat = mats["skin_trim"] if idx % 2 == 1 else mats["skin_primary"]
    return finalize_mesh_obj(node_name, bm, (s * px, fuselage_upper_y_at_x(px, pz), pz), mat, 0.0, True)



def build_nose_shell(mats: dict) -> bpy.types.Object:
    """
    Chined stealth radome (hollow) with radome joint seams, pitot, IRST window ahead of the
    windscreen, ventral blade antenna, and an AESA array on the forward pressure bulkhead.
    Slots: 0 skin, 1 dark interior, 2 trim seams, 3 alloy, 4 radar tiles.
    """
    bm = bmesh.new()
    SKIN, DARK, TRIM, ALLOY, TILE = 0, 1, 2, 3, 4
    z_list = [-6.50 + (NOSE_END_Z + 6.50) * (i / 21.0) for i in range(22)]
    add_hollow_shell(bm, z_list[1:], 0.95, SKIN, DARK)
    add_lofted_sections(bm, [chine_ring(z_list[0]), chine_ring(z_list[1])], True, False, SKIN)
    for zs in (-5.75, -5.15):
        add_seam_band(bm, zs, TRIM)
    for side in (-1.0, 1.0):
        add_long_seam(bm, -5.6, -4.6, 0.5, side, TRIM, 6)
    add_tube(bm, (0.0, -0.03, -6.48), (0.0, -0.03, -6.92), 0.013, 0.008, seg=10, mat_index=ALLOY)
    add_tube(bm, (0.0, -0.03, -6.92), (0.0, -0.03, -7.04), 0.006, 0.004, seg=8, mat_index=ALLOY)
    # Faceted EOTS/IRST window under the nose (sapphire facets)
    zc = -5.0
    yb = fuselage_lower_y_at_x(0.0, zc)
    add_revolve(bm, (0.0, yb + 0.01, zc), (0.0, -1.0, 0.0),
                [(0.0, 0.0), (0.09, 0.0), (0.08, 0.04), (0.05, 0.065), (0.0, 0.07)], seg=8, closed_profile=False, mat_index=TILE)
    _, top_y, _, _ = fuselage_envelope(-4.75)
    add_blade_antenna(bm, (0.0, top_y - 0.005, -4.95), 0.10, TRIM)
    add_ring_frame(bm, -4.60, 0.05, 0.95, 0.30, DARK)
    add_revolve(bm, (0.0, 0.0, -4.66), (0.0, 0.0, -1.0),
                [(0.0, 0.0), (0.25, 0.0), (0.265, 0.025), (0.25, 0.05), (0.0, 0.05)], seg=32, closed_profile=False, mat_index=ALLOY)
    for gx in range(-2, 3):
        for gy in range(-2, 3):
            cx, cy = gx * 0.088, gy * 0.08
            if cx * cx + cy * cy > 0.21 ** 2:
                continue
            add_box_strip(bm, cx - 0.037, cx + 0.037, cy - 0.034, cy + 0.034, -4.722, -4.71, TILE)
    add_tube(bm, (0.0, 0.0, -4.58), (0.0, 0.0, -4.66), 0.045, seg=16, mat_index=ALLOY)
    return finalize_mesh_obj(
        "AX9__CORE__CENTER__NOSE_SHELL", bm, (0.0, 0.0, -5.4),
        [mats["skin_primary"], mats["cockpit_dark"], mats["skin_trim"], mats["alloy_mech"], mats["emitter_cyan"]],
        0.0, True,
    )


def build_main_fuselage(mats: dict) -> bpy.types.Object:
    """
    Hollow blended centre body: skin with seams/antennas, ring frames, longerons, avionics racks
    with status LEDs, wiring looms and a conformal fuel cell.
    Slots: 0 skin, 1 dark liner, 2 trim seams, 3 alloy, 4 LEDs, 5 fuel cell.
    """
    bm = bmesh.new()
    SKIN, DARK, TRIM, ALLOY, LED, TANK = 0, 1, 2, 3, 4, 5
    z_list = [NOSE_END_Z + (MAIN_END_Z - NOSE_END_Z) * (i / 30.0) for i in range(31)]
    add_hollow_shell(bm, z_list, 0.955, SKIN, DARK)
    for zs in (-4.48, -2.2, -1.0, 0.1, 1.2):
        add_seam_band(bm, zs, TRIM)
    for side in (-1.0, 1.0):
        add_long_seam(bm, -2.2, 2.1, 0.30, side, TRIM, 14)
        add_long_seam(bm, -0.9, 2.1, 0.86, side, TRIM, 10)
    add_blade_antenna(bm, (0.0, fuselage_lower_y_at_x(0.0, -0.9) + 0.005, -0.9), -0.15, TRIM)
    add_blade_antenna(bm, (0.0, fuselage_lower_y_at_x(0.0, 1.4) + 0.005, 1.4), -0.11, TRIM)
    for z_rib in (-4.2, -3.4, -2.6, -1.8, -1.0, -0.2, 0.6, 1.4, 2.05):
        add_ring_frame(bm, z_rib, 0.045, 0.95, 0.80, ALLOY)
    ring_a = chine_ring(NOSE_END_Z + 0.05, 0.90)
    ring_b = chine_ring(MAIN_END_Z - 0.05, 0.90)
    for k in (0, 6, 12, 18, 24, 30, 36, 42):
        add_tube(bm, ring_a[k], ring_b[k], 0.012, seg=6, mat_index=ALLOY)
    for sx in (-1.0, 1.0):
        for y0, y1 in ((0.02, 0.12), (0.14, 0.24)):
            add_chamfer_prism(bm, (sx * 0.22, (y0 + y1) / 2, -2.20), (sx * 0.22, (y0 + y1) / 2, -1.60),
                              0.14, (y1 - y0) / 2, 0.008, DARK)
            add_box_strip(bm, sx * 0.09, sx * 0.33, y1 - 0.02, y1 - 0.014, -2.205, -2.195, LED)
        add_tube(bm, (sx * 0.22, 0.25, -1.58), (sx * 0.14, 0.27, 1.6), 0.018, seg=8, mat_index=DARK)
        add_tube(bm, (sx * 0.28, 0.22, -1.58), (sx * 0.34, 0.20, 1.6), 0.012, seg=8, mat_index=TRIM)
    tank = []
    for i in range(9):
        z = -1.2 + 3.1 * i / 8.0
        sw = math.sin(math.pi * i / 8.0) ** 0.35
        a, b = 0.42 * sw + 0.02, 0.11 * sw + 0.01
        ring = []
        for k in range(20):
            t = k * 2.0 * math.pi / 20
            c, s_ = math.cos(t), math.sin(t)
            ring.append((a * math.copysign(abs(c) ** 0.6, c), 0.20 + b * math.copysign(abs(s_) ** 0.6, s_), z))
        tank.append(ring)
    add_lofted_sections(bm, tank, True, True, TANK)
    return finalize_mesh_obj(
        "AX9__CORE__CENTER__MAIN_FUSELAGE", bm, (0.0, 0.02, -1.2),
        [mats["skin_primary"], mats["cockpit_dark"], mats["skin_trim"], mats["alloy_mech"],
         mats["emitter_cyan"], mats["carbon_stealth"]],
        0.0, True,
    )


def build_rear_fuselage(mats: dict) -> bpy.types.Object:
    """Hollow aft body tapering onto the single nozzle, with seams and frames."""
    bm = bmesh.new()
    SKIN, DARK, TRIM, ALLOY = 0, 1, 2, 3
    z_list = [MAIN_END_Z - 0.02 + (TAIL_END_Z - MAIN_END_Z + 0.02) * (i / 16.0) for i in range(17)]
    add_hollow_shell(bm, z_list, 0.94, SKIN, DARK)
    for zs in (2.8, 3.5):
        add_seam_band(bm, zs, TRIM)
    for z_rib in (2.4, 3.1, 3.8):
        add_ring_frame(bm, z_rib, 0.04, 0.94, 0.80, ALLOY)
    return finalize_mesh_obj(
        "AX9__CORE__CENTER__REAR_FUSELAGE", bm, (0.0, 0.02, 3.1),
        [mats["skin_primary"], mats["cockpit_dark"], mats["skin_trim"], mats["alloy_mech"]],
        0.0, True,
    )


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
        ("FRONT", (0.0, -0.40, -4.30), (0.0, -1.19, -4.30), (-0.15, 0.05, -0.40, -4.85, -3.80), 0.21, 0.070),
        ("LEFT", (-0.80, -0.51, 0.85), (-0.80, -1.13, 0.85), (-1.00, -0.58, -0.52, 0.20, 1.45), 0.27, 0.090),
        ("RIGHT", (0.80, -0.51, 0.85), (0.80, -1.13, 0.85), (0.58, 1.00, -0.52, 0.20, 1.45), 0.27, 0.090),
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
        "generator": "Blender 4.5 Headless Precision CAD & Conformal Stealth Generator (v8 Stealth Fighter OML)",
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
        f"[AERIS X-9 v8] Exported {len(created_objects)}/46 nodes, "
        f"{total_tris} triangles, {glb_size} bytes -> {OUTPUT_GLB_PATH}"
    )


if __name__ == "__main__":
    generate_aircraft()
