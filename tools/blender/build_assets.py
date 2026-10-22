"""Procedural Blender asset pipeline for Madras Hustle.

Builds the hero models (aircraft, metro coach, cars, auto-rickshaw, trees, terminal props) with bevelled,
subdivided geometry and PBR materials, then exports one GLB per asset into dist/assets/.

Run headless with Blender's Python module (pip install bpy) or the Blender CLI:
    python tools/blender/build_assets.py            # bpy module
    blender -b -P tools/blender/build_assets.py     # Blender app

Conventions (so the game can drop the models in without per-asset tweaks):
  * 1 Blender unit = 1 metre, origin on the ground under the vehicle centre.
  * Nose / front points along Blender -Y, which the glTF exporter maps to three.js +Z (the game's forward).
  * A material named "Paint" is recoloured per vehicle at runtime.
  * Named child objects the game animates: Gear (landing gear), Prop, Rotor, DoorL*/DoorR* (sliding doors),
    Headlights (emissive, switched with the headlight toggle).
"""
import math, os, sys
import bpy, bmesh
from mathutils import Vector, Matrix

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'dist', 'assets')
os.makedirs(OUT, exist_ok=True)
MATS = {}


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear()


def mat(name, color, metal=0.0, rough=0.5, emit=None, emit_strength=0.0, alpha=1.0):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*color, 1.0)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1.0)
        b.inputs['Emission Strength'].default_value = emit_strength
    if alpha < 1.0:
        b.inputs['Alpha'].default_value = alpha
        m.blend_method = 'BLEND' if hasattr(m, 'blend_method') else None
    MATS[name] = m
    return m


def srgb(h):
    """hex sRGB -> linear tuple (Blender colour inputs are linear)."""
    c = [((h >> s) & 255) / 255 for s in (16, 8, 0)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def obj_from_bm(name, bm, material, parent=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    me.materials.append(material)
    if parent:
        ob.parent = parent
    for p in me.polygons:
        p.use_smooth = True
    return ob


def box(name, size, loc, material, bevel=0.0, segs=2, parent=None, rot=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=min(bevel, min(size) * 0.49), segments=segs, affect='EDGES', profile=0.5)
    bmesh.ops.rotate(bm, cent=Vector((0, 0, 0)), matrix=Matrix.Rotation(rot[0], 3, 'X') @ Matrix.Rotation(rot[1], 3, 'Y') @ Matrix.Rotation(rot[2], 3, 'Z'), verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector(loc), verts=bm.verts)
    return obj_from_bm(name, bm, material, parent)


def cyl(name, r1, r2, depth, loc, material, axis='Z', segs=24, parent=None, cap=True):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=segs, radius1=r1, radius2=r2, depth=depth)
    if axis == 'X':
        bmesh.ops.rotate(bm, cent=Vector((0, 0, 0)), matrix=Matrix.Rotation(math.pi / 2, 3, 'Y'), verts=bm.verts)
    elif axis == 'Y':
        bmesh.ops.rotate(bm, cent=Vector((0, 0, 0)), matrix=Matrix.Rotation(math.pi / 2, 3, 'X'), verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector(loc), verts=bm.verts)
    return obj_from_bm(name, bm, material, parent)


def sphere(name, r, loc, material, scale=(1, 1, 1), segs=24, rings=12, parent=None):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=r)
    bmesh.ops.scale(bm, vec=Vector(scale), verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector(loc), verts=bm.verts)
    return obj_from_bm(name, bm, material, parent)


def loft(name, sections, material, parent=None, segs=28, cap=True):
    """Fuselage-style loft: sections = [(y, cx, cz, rx, rz)], elliptical rings along the Y axis."""
    bm = bmesh.new()
    rings = []
    for (y, cx, cz, rx, rz) in sections:
        ring = []
        for i in range(segs):
            a = i / segs * math.tau
            ring.append(bm.verts.new((cx + math.cos(a) * rx, y, cz + math.sin(a) * rz)))
        rings.append(ring)
    for r0, r1 in zip(rings, rings[1:]):
        for i in range(segs):
            j = (i + 1) % segs
            bm.faces.new((r0[i], r0[j], r1[j], r1[i]))
    if cap:
        for ring in (rings[0], rings[-1]):
            if max(v.co.x for v in ring) - min(v.co.x for v in ring) > 1e-4:
                bm.faces.new(ring)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bm(name, bm, material, parent)


def wing(name, span, root_chord, tip_chord, sweep, thick, loc, material, dihedral=0.0, parent=None, vertical=False):
    """Tapered, swept, airfoil-ish wing (both halves unless vertical)."""
    bm = bmesh.new()
    halves = [1] if vertical else [-1, 1]
    for s in halves:
        prof = []
        for k, (yy, zz) in enumerate([(0, 0), (0.15, 0.6), (0.45, 0.5), (1, 0), (0.45, -0.35), (0.15, -0.35)]):
            prof.append((yy, zz))
        root = [bm.verts.new((0, -root_chord * 0.5 + yy * root_chord, zz * thick)) for yy, zz in prof]
        half = span / 2 if not vertical else span
        if vertical:
            tip = [bm.verts.new((zz * thick * 0.5, -tip_chord * 0.5 + yy * tip_chord + sweep, half)) for yy, zz in prof]
        else:
            tip = [bm.verts.new((s * half, -tip_chord * 0.5 + yy * tip_chord + sweep, zz * thick * 0.5 + dihedral * half)) for yy, zz in prof]
        n = len(prof)
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((root[i], root[j], tip[j], tip[i]))
        bm.faces.new(tip)
        bm.faces.new(list(reversed(root)))
        if vertical:
            for v in root + tip:
                v.co.x, v.co.z = v.co.x, v.co.z
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.translate(bm, vec=Vector(loc), verts=bm.verts)
    return obj_from_bm(name, bm, material, parent)


def subsurf(ob, levels=2):
    m = ob.modifiers.new('sub', 'SUBSURF')
    m.levels = levels
    m.render_levels = levels
    return ob


def bevel_mod(ob, w=0.03, segs=2):
    m = ob.modifiers.new('bev', 'BEVEL')
    m.width = w
    m.segments = segs
    m.limit_method = 'ANGLE'
    return ob


def empty(name, loc=(0, 0, 0), parent=None):
    e = bpy.data.objects.new(name, None)
    e.location = loc
    bpy.context.collection.objects.link(e)
    if parent:
        e.parent = parent
    return e


def export(name):
    path = os.path.join(OUT, name + '.glb')
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_yup=True,
                              export_materials='EXPORT', export_cameras=False, export_lights=False, export_extras=True)
    print('exported', path, round(os.path.getsize(path) / 1024), 'KB')


# --------------------------------------------------------------------------------------------- materials
def common():
    return dict(
        paint=mat('Paint', srgb(0xf4f4f2), 0.6, 0.22),
        white=mat('White', srgb(0xf2f2ef), 0.1, 0.35),
        glass=mat('Glass', srgb(0x0b1520), 0.9, 0.04),
        chrome=mat('Chrome', srgb(0xd8d8d8), 1.0, 0.12),
        dark=mat('Trim', srgb(0x18191b), 0.2, 0.6),
        rubber=mat('Rubber', srgb(0x111111), 0.0, 0.9),
        metal=mat('Metal', srgb(0x9aa0a6), 0.85, 0.3),
        head=mat('Headlights', srgb(0xfff4d8), 0.0, 0.1, emit=srgb(0xfff4d8), emit_strength=6.0),
        tail=mat('Taillights', srgb(0x8a0f0f), 0.0, 0.2, emit=srgb(0xff2010), emit_strength=2.0),
        nav_r=mat('NavRed', srgb(0xff2020), 0, 0.3, emit=srgb(0xff2020), emit_strength=8.0),
        nav_g=mat('NavGreen', srgb(0x20ff40), 0, 0.3, emit=srgb(0x20ff40), emit_strength=8.0),
        window=mat('CabinWindows', srgb(0x1a2430), 0.6, 0.1, emit=srgb(0xffe2a8), emit_strength=0.6),
    )


# --------------------------------------------------------------------------------------------- aircraft
def airliner():
    reset(); M = common()
    stripe = mat('Livery', srgb(0x1f4fb3), 0.4, 0.3)
    root = empty('Airliner')
    L = 40.0
    secs = [(-20.0, 0, 4.3, 0.05, 0.05), (-19.4, 0, 4.25, 0.9, 1.0), (-18.0, 0, 4.2, 1.6, 1.75), (-16.0, 0, 4.2, 2.0, 2.1),
            (14.0, 0, 4.2, 2.0, 2.1), (16.5, 0, 4.6, 1.5, 1.4), (19.0, 0, 5.1, 0.75, 0.55), (20.4, 0, 5.4, 0.08, 0.06)]
    # nose is -Y (front), tail +Y: flip the section list so the tail rises
    fus = loft('Fuselage', [(-y, cx, cz, rx, rz) for (y, cx, cz, rx, rz) in reversed(secs)], M['paint'], root)
    subsurf(fus, 1)
    loft('Belly', [(-15, 0, 3.0, 2.02, 0.9), (14, 0, 3.0, 2.02, 0.9)], M['white'], root, cap=True)
    # cheatline + windows
    loft('Cheatline', [(-17, 0, 4.0, 2.03, 0.35), (15, 0, 4.0, 2.03, 0.35)], stripe, root)
    for i in range(30):
        y = -14 + i * 0.95
        for s in (-1, 1):
            box(f'Win{i}{s}', (0.05, 0.28, 0.36), (s * 2.0, y, 4.75), M['window'], 0.05, 1, root)
    box('Cockpit', (2.2, 1.2, 0.5), (0, -18.6, 5.0), M['glass'], 0.2, 2, root, rot=(-0.5, 0, 0))
    # wings with engines
    wing('Wing', 36, 7.5, 1.8, 6.0, 0.7, (0, -1.0, 3.2), M['white'], dihedral=0.08, parent=root)
    wing('HStab', 13, 3.4, 1.4, 2.6, 0.35, (0, 17.5, 5.6), M['white'], dihedral=0.1, parent=root)
    wing('Fin', 7.5, 5.6, 2.2, 4.0, 0.45, (0, 15.8, 6.0), stripe, parent=root, vertical=True)
    for s in (-1, 1):
        x = s * 6.6
        n = cyl(f'Nacelle{s}', 1.15, 0.95, 4.6, (x, -4.6, 2.35), M['white'], axis='Y', segs=28, parent=root)
        cyl(f'Intake{s}', 1.0, 1.0, 0.12, (x, -6.92, 2.35), M['dark'], axis='Y', segs=28, parent=root)
        cyl(f'Spinner{s}', 0.0, 0.35, 0.6, (x, -6.7, 2.35), M['chrome'], axis='Y', segs=16, parent=root)
        box(f'Pylon{s}', (0.35, 3.0, 0.9), (x, -3.2, 3.0), M['white'], 0.1, 1, root)
        box(f'Nav{s}', (0.2, 0.3, 0.15), (s * 17.9, 1.8, 4.6), M['nav_g'] if s > 0 else M['nav_r'], 0.05, 1, root)
    # landing gear (toggled at runtime)
    gear = empty('Gear', parent=root)
    for (x, y) in ((0, -15.5), (2.9, 1.2), (-2.9, 1.2)):
        cyl(f'Strut{x}{y}', 0.14, 0.14, 2.4, (x, y, 1.6), M['metal'], parent=gear)
        for dx in ((-0.35, 0.35) if x == 0 else (-0.55, 0.55)):
            cyl(f'Tyre{x}{y}{dx}', 0.6 if x else 0.45, 0.6 if x else 0.45, 0.42, (x + dx, y, 0.6 if x else 0.45), M['rubber'], axis='X', segs=20, parent=gear)
    export('airliner')


def prop_plane():
    reset(); M = common()
    root = empty('Plane')
    secs = [(-4.3, 0, 1.55, 0.25, 0.25), (-4.0, 0, 1.55, 0.55, 0.6), (-2.5, 0, 1.6, 0.68, 0.75), (0.5, 0, 1.6, 0.62, 0.7), (3.4, 0, 1.75, 0.22, 0.3), (4.2, 0, 1.9, 0.06, 0.08)]
    subsurf(loft('Fuselage', secs, M['paint'], root), 1)
    box('Canopy', (1.05, 1.6, 0.6), (0, -1.3, 2.25), M['glass'], 0.25, 3, root)
    wing('Wing', 11, 1.6, 1.1, 0.2, 0.22, (0, -0.9, 2.2), M['white'], dihedral=0.04, parent=root)
    wing('HStab', 3.6, 1.0, 0.6, 0.3, 0.12, (0, 3.7, 1.8), M['white'], parent=root)
    wing('Fin', 1.5, 1.2, 0.6, 0.6, 0.12, (0, 3.6, 1.9), M['paint'], parent=root, vertical=True)
    cyl('Spinner', 0.0, 0.25, 0.5, (0, -4.55, 1.55), M['chrome'], axis='Y', parent=root)
    prop = empty('Prop', (0, -4.4, 1.55), root)
    box('Blade', (2.0, 0.06, 0.16), (0, 0, 0), M['dark'], 0.03, 1, prop)
    gear = empty('Gear', parent=root)
    for (x, y, r) in ((0.9, -0.9, 0.3), (-0.9, -0.9, 0.3), (0, 3.0, 0.15)):
        cyl(f'Leg{x}{y}', 0.05, 0.05, 1.2, (x, y, 0.9), M['metal'], parent=gear)
        cyl(f'Wheel{x}{y}', r, r, 0.16, (x, y, r), M['rubber'], axis='X', segs=18, parent=gear)
    for s in (-1, 1):
        box(f'Nav{s}', (0.12, 0.2, 0.1), (s * 5.45, -0.6, 2.25), M['nav_g'] if s > 0 else M['nav_r'], 0.03, 1, root)
    export('plane')


def helicopter():
    reset(); M = common()
    root = empty('Heli')
    secs = [(-1.9, 0, 1.6, 0.2, 0.3), (-1.4, 0, 1.6, 1.05, 1.0), (0.4, 0, 1.75, 1.2, 1.15), (1.6, 0, 1.9, 0.6, 0.6), (3.0, 0, 2.0, 0.28, 0.28), (6.1, 0, 2.1, 0.16, 0.16)]
    subsurf(loft('Body', secs, M['paint'], root), 1)
    sphere('Bubble', 1.05, (0, -1.0, 1.75), M['glass'], (1, 0.95, 0.85), parent=root)
    wing('Fin', 1.4, 1.0, 0.5, 0.5, 0.12, (0, 5.8, 2.1), M['paint'], parent=root, vertical=True)
    for s in (-1, 1):
        cyl(f'Skid{s}', 0.06, 0.06, 3.8, (s * 1.0, -0.4, 0.08), M['dark'], axis='Y', parent=root)
        for y in (-1.2, 0.6):
            box(f'SkidLeg{s}{y}', (0.07, 0.07, 0.75), (s * 0.95, y, 0.45), M['dark'], 0.02, 1, root, rot=(0, s * 0.25, 0))
    cyl('Mast', 0.16, 0.2, 0.55, (0, -0.4, 3.0), M['dark'], parent=root)
    rotor = empty('Rotor', (0, -0.4, 3.3), root)
    for k in range(4):
        a = k * math.pi / 2
        box(f'Blade{k}', (5.4, 0.3, 0.05), (math.cos(a) * 2.75, math.sin(a) * 2.75, 0), M['dark'], 0.02, 1, rotor, rot=(0, 0, a))
    export('heli')


# --------------------------------------------------------------------------------------------- metro coach
def metro_coach(front):
    reset(); M = common()
    body_c = mat('CoachBody', srgb(0xe9ecef), 0.55, 0.25)
    blue = mat('Livery', srgb(0x1f6fd2), 0.35, 0.3)
    seat = mat('Seat', srgb(0x2a5fae), 0.0, 0.7)
    floor_m = mat('Floor', srgb(0x55595e), 0.1, 0.8)
    light = mat('CeilingLight', srgb(0xffffff), 0, 0.2, emit=srgb(0xf4f8ff), emit_strength=3.0)
    root = empty('Coach')
    L, W, H = 19.5, 2.9, 3.4
    shell = box('Shell', (W, L, 2.9), (0, 0, 1.0 + 1.45), body_c, 0.35, 3, root)
    box('Skirt', (W * 0.96, L * 0.98, 0.7), (0, 0, 0.75), M['dark'], 0.08, 1, root)
    box('Stripe', (W + 0.02, L * 0.995, 0.28), (0, 0, 1.55), blue, 0.05, 1, root)
    box('RoofAC1', (1.6, 2.6, 0.32), (0, -5, 4.05), M['metal'], 0.12, 2, root)
    box('RoofAC2', (1.6, 2.6, 0.32), (0, 5, 4.05), M['metal'], 0.12, 2, root)
    # window band (glass with lit interior glow)
    for s in (-1, 1):
        for i in range(6):
            y = -7.6 + i * 3.04
            box(f'Win{s}{i}', (0.06, 1.7, 0.95), (s * (W / 2 + 0.005), y, 2.75), M['window'], 0.12, 2, root)
        for j, y in enumerate((-L / 4 - 1.2, L / 4 + 1.2)):
            d = box(f'Door{"L" if s < 0 else "R"}{j}', (0.06, 1.3, 2.05), (s * (W / 2 + 0.02), y, 2.1), M['metal'], 0.04, 1, root)
            box(f'DoorGlass{"L" if s < 0 else "R"}{j}', (0.03, 0.8, 0.7), (0, 0, 0.45), M['glass'], 0.02, 1, d)
            d.location = (s * (W / 2 + 0.02), y, 2.1)
            for v in d.data.vertices:
                v.co -= Vector((s * (W / 2 + 0.02), y, 2.1))
    # interior: seats along both walls + passenger floor + lights
    box('InteriorFloor', (W - 0.3, L - 0.6, 0.05), (0, 0, 1.15), floor_m, 0, 1, root)
    for s in (-1, 1):
        for y in (-8.3, -4.5, 0, 4.5, 8.3):
            box(f'Bench{s}{y}', (0.5, 2.8, 0.45), (s * 1.1, y, 1.4), seat, 0.08, 2, root)
    for y in range(-8, 9, 4):
        box(f'Light{y}', (0.25, 1.6, 0.04), (0, y, 3.85), light, 0.02, 1, root)
    for z in (-L / 2 + 3, L / 2 - 3):
        for s in (-1, 1):
            cyl(f'Wheel{z}{s}', 0.45, 0.45, 0.18, (s * 0.95, z, 0.45), M['dark'], axis='X', parent=root)
    if front:
        nose = loft('Cab', [(-L / 2, 0, 2.45, W / 2, 1.45), (-L / 2 - 0.9, 0, 2.3, W / 2 * 0.92, 1.3), (-L / 2 - 1.5, 0, 2.0, W / 2 * 0.7, 0.9)], blue, root)
        subsurf(nose, 1)
        box('Windscreen', (W * 0.8, 0.06, 1.0), (0, -L / 2 - 0.85, 2.9), M['glass'], 0.1, 2, root, rot=(0.35, 0, 0))
        for s in (-1, 1):
            box(f'HeadL{s}', (0.4, 0.06, 0.16), (s * 0.85, -L / 2 - 1.42, 1.7), M['head'], 0.03, 1, root)
        box('Pantograph', (1.2, 0.1, 0.6), (0, -6, 4.4), M['metal'], 0.02, 1, root, rot=(0.6, 0, 0))
    export('metro_front' if front else 'metro_coach')


# --------------------------------------------------------------------------------------------- road vehicles (bodies only; the game adds wheels)
def car(kind):
    reset(); M = common()
    root = empty('Car')
    if kind == 'super':
        L, W = 4.6, 2.05
        secs = [(-2.3, 0, 0.5, 0.95, 0.12), (-2.0, 0, 0.55, 1.0, 0.22), (-0.6, 0, 0.72, 1.02, 0.36), (0.6, 0, 0.78, 1.03, 0.42), (1.9, 0, 0.72, 1.0, 0.38), (2.3, 0, 0.66, 0.95, 0.25)]
        body = loft('Body', secs, M['paint'], root, segs=24)
        subsurf(body, 2)
        sphere('Canopy', 0.9, (0, 0.15, 1.02), M['glass'], (0.82, 1.55, 0.33), parent=root)
        box('Splitter', (W * 0.9, 0.18, 0.04), (0, -2.22, 0.36), M['dark'], 0.02, 1, root)
        box('Wing', (W * 0.95, 0.35, 0.05), (0, 2.1, 1.12), M['dark'], 0.02, 1, root)
        for s in (-1, 1):
            box(f'WingPost{s}', (0.06, 0.08, 0.28), (s * 0.7, 2.1, 0.95), M['dark'], 0.01, 1, root)
            box(f'Intake{s}', (0.05, 0.9, 0.22), (s * (W / 2 + 0.005), 0.6, 0.62), M['dark'], 0.02, 1, root)
            box(f'HeadL{s}', (0.5, 0.06, 0.08), (s * 0.68, -2.27, 0.62), M['head'], 0.02, 1, root, rot=(0, 0, s * 0.15))
            box(f'TailL{s}', (0.55, 0.05, 0.07), (s * 0.6, 2.32, 0.78), M['tail'], 0.02, 1, root)
    elif kind == 'auto':
        L, W = 2.7, 1.4
        yel = mat('Paint', srgb(0xf2c41f), 0.3, 0.35)
        grn = mat('AutoGreen', srgb(0x1e6b3a), 0.2, 0.5)
        canvas = mat('Canvas', srgb(0x161616), 0.0, 0.85)
        subsurf(box('Tub', (W * 0.96, 1.7, 0.62), (0, 0.28, 0.6), yel, 0.18, 3, root), 1)
        subsurf(box('Nose', (W * 0.6, 0.8, 0.8), (0, -0.92, 0.68), yel, 0.25, 3, root), 1)
        box('Floor', (W * 0.98, L * 0.92, 0.09), (0, 0.05, 0.33), grn, 0.03, 1, root)
        subsurf(box('Hood', (W * 1.02, L * 0.86, 0.12), (0, 0.18, 1.62), canvas, 0.06, 2, root), 1)
        box('Rear', (W, 0.12, 0.9), (0, 1.22, 1.12), canvas, 0.05, 1, root)
        for s in (-1, 1):
            box(f'PostF{s}', (0.05, 0.06, 0.95), (s * W * 0.47, -0.6, 1.12), M['dark'], 0.02, 1, root)
            box(f'PostR{s}', (0.05, 0.06, 0.95), (s * W * 0.48, 0.9, 1.12), M['dark'], 0.02, 1, root)
        box('Windscreen', (W * 0.76, 0.05, 0.6), (0, -0.98, 1.2), M['glass'], 0.02, 1, root)
        box('Seat', (W * 0.84, 0.7, 0.16), (0, 0.55, 0.88), mat('SeatBrown', srgb(0x3b2a1e), 0, 0.7), 0.05, 1, root)
        box('HeadL', (0.2, 0.05, 0.16), (0, -1.33, 0.95), M['head'], 0.03, 1, root)
    else:  # sedan / taxi / police share a three-box saloon
        L, W = 4.5, 1.8
        secs = [(-2.25, 0, 0.66, 0.84, 0.26), (-2.1, 0, 0.7, 0.89, 0.36), (-1.0, 0, 0.74, 0.91, 0.42), (1.4, 0, 0.76, 0.91, 0.42), (2.2, 0, 0.76, 0.88, 0.36), (2.27, 0, 0.74, 0.84, 0.24)]
        subsurf(loft('Body', secs, M['paint'], root, segs=24), 2)
        # greenhouse: tapered glass loft from windscreen to rear window, with a painted roof skin
        gh = [(-0.95, 0, 1.12, 0.84, 0.04), (-0.45, 0, 1.32, 0.76, 0.22), (0.95, 0, 1.32, 0.76, 0.22), (1.5, 0, 1.12, 0.84, 0.04)]
        subsurf(loft('Cabin', gh, M['glass'], root, segs=20), 1)
        subsurf(box('Roof', (W * 0.8, 1.35, 0.07), (0, 0.25, 1.55), M['paint'], 0.03, 1, root), 1)
        for s in (-1, 1):
            for y, t in ((-0.62, 0.35), (1.25, -0.4)):
                box(f'Pillar{s}{y}', (0.07, 0.08, 0.5), (s * 0.74, y, 1.32), M['paint'], 0.02, 1, root, rot=(t, 0, 0))
            box(f'HeadL{s}', (0.42, 0.05, 0.14), (s * 0.6, -2.27, 0.78), M['head'], 0.03, 1, root)
            box(f'TailL{s}', (0.4, 0.05, 0.14), (s * 0.62, 2.27, 0.86), M['tail'], 0.03, 1, root)
            box(f'Mirror{s}', (0.16, 0.08, 0.1), (s * (W / 2 + 0.06), -0.8, 1.12), M['paint'], 0.03, 1, root)
        box('GrilleF', (0.8, 0.04, 0.16), (0, -2.27, 0.6), M['chrome'], 0.02, 1, root)
        box('BumperF', (W * 0.96, 0.1, 0.18), (0, -2.26, 0.45), M['dark'], 0.06, 2, root)
        box('BumperR', (W * 0.96, 0.1, 0.18), (0, 2.26, 0.45), M['dark'], 0.06, 2, root)
    export('car_' + kind)


# --------------------------------------------------------------------------------------------- trees (merged to one mesh per material at runtime)
def palm():
    reset()
    trunk = mat('Trunk', srgb(0x6b5340), 0, 0.9)
    leaf = mat('Leaf', srgb(0x5f8f2f), 0, 0.8)
    root = empty('Palm')
    pts = [(0.0, 0.0, 0.0), (0.15, 0.0, 3.0), (0.45, 0.05, 6.0), (0.7, 0.1, 8.6)]
    for i in range(len(pts) - 1):
        a, b = Vector(pts[i]), Vector(pts[i + 1])
        d = b - a
        c = cyl(f'Trunk{i}', 0.26 - i * 0.04, 0.22 - i * 0.04, d.length, (0, 0, 0), trunk, segs=10, parent=root)
        c.rotation_euler = Vector((0, 0, 1)).rotation_difference(d).to_euler()
        c.location = (a + b) / 2
    top = Vector(pts[-1])
    for k in range(9):
        ang = k / 9 * math.tau
        bm = bmesh.new()
        prev = None
        for j in range(7):
            t = j / 6
            r = t * 4.2
            droop = -1.6 * t * t + 0.6 * t
            w = 0.55 * math.sin(math.pi * min(1, t * 1.15)) + 0.05
            c = Vector((math.cos(ang) * r, math.sin(ang) * r, droop))
            side = Vector((-math.sin(ang), math.cos(ang), 0)) * w
            v1, v2 = bm.verts.new(c + side + Vector((0, 0, -0.12 * t))), bm.verts.new(c - side + Vector((0, 0, -0.12 * t)))
            mid = bm.verts.new(c + Vector((0, 0, 0.08)))
            if prev:
                bm.faces.new((prev[0], v1, mid, prev[2]))
                bm.faces.new((prev[2], mid, v2, prev[1]))
            prev = (v1, v2, mid)
        bmesh.ops.translate(bm, vec=top, verts=bm.verts)
        obj_from_bm(f'Frond{k}', bm, leaf, root)
    sphere('Coconuts', 0.45, (top.x, top.y, top.z - 0.25), mat('Coconut', srgb(0x4a5a22), 0, 0.6), (1, 1, 0.7), segs=10, rings=6, parent=root)
    export('palm')


def neem():
    reset()
    trunk = mat('Trunk', srgb(0x5e4a36), 0, 0.9)
    leaf = mat('Leaf', srgb(0x4f7d33), 0, 0.85)
    root = empty('Tree')
    cyl('Trunk', 0.22, 0.38, 3.6, (0, 0, 1.8), trunk, segs=10, parent=root)
    for i, (x, y, z, ax) in enumerate(((0.6, 0, 3.4, 0.5), (-0.5, 0.4, 3.5, -0.5), (0, -0.6, 3.3, 0.6))):
        b = cyl(f'Branch{i}', 0.08, 0.16, 1.8, (x * 0.6, y * 0.6, z), trunk, segs=8, parent=root)
        b.rotation_euler = (y * 0.9, x * 0.9, 0)
    blobs = [(0, 0, 5.0, 2.4), (1.4, 0.5, 4.5, 1.8), (-1.3, -0.6, 4.6, 1.9), (0.3, -1.4, 4.4, 1.6), (-0.4, 1.4, 4.7, 1.7), (0.2, 0.2, 6.1, 1.6)]
    for i, (x, y, z, r) in enumerate(blobs):
        bm = bmesh.new()
        bmesh.ops.create_icosphere(bm, subdivisions=2, radius=r)
        for v in bm.verts:  # lumpy canopy
            n = v.co.normalized()
            v.co += n * (0.25 * math.sin(v.co.x * 3.1 + i) * math.cos(v.co.y * 2.7) + 0.15 * math.sin(v.co.z * 4.0))
            v.co.z *= 0.8
        bmesh.ops.translate(bm, vec=Vector((x, y, z)), verts=bm.verts)
        obj_from_bm(f'Canopy{i}', bm, leaf, root)
    export('neem')


if __name__ == '__main__':
    only = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    jobs = {'airliner': airliner, 'plane': prop_plane, 'heli': helicopter, 'metro_front': lambda: metro_coach(True), 'metro_coach': lambda: metro_coach(False),
            'car_super': lambda: car('super'),
            # car('sedan') / car('auto') are also modelled; the game keeps its procedural versions of those for now
            'palm': palm, 'neem': neem}
    for k, fn in jobs.items():
        if not only or k in only:
            fn()
