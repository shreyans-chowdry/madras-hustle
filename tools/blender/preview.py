"""Render each exported GLB from a front 3/4 view (Cycles CPU) and tile them into one contact sheet."""
import bpy, os, sys, math
from mathutils import Vector
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'dist', 'assets'); out = sys.argv[sys.argv.index('--') + 1] if '--' in sys.argv else '/tmp/preview.png'
tiles = []
for n in sorted(f for f in os.listdir(SRC) if f.endswith('.glb')):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, n))
    pts = [o.matrix_world @ Vector(c) for o in bpy.data.objects if o.type == 'MESH' for c in o.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))); hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    c = (lo + hi) / 2; r = (hi - lo).length / 2
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); bpy.context.collection.objects.link(cam); cam.data.lens = 40
    d = Vector((1.0, -1.3, 0.75)).normalized(); cam.location = c + d * r * 2.6
    cam.rotation_euler = (c - cam.location).to_track_quat('-Z', 'Y').to_euler()
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 4; sun.rotation_euler = (0.7, 0.3, 0.6); bpy.context.collection.objects.link(sun)
    sc = bpy.context.scene; sc.camera = cam; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 16
    sc.world = bpy.data.worlds.new('w'); sc.world.use_nodes = True; bg = sc.world.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.5, 0.6, 0.75, 1); bg.inputs[1].default_value = 0.9
    bpy.ops.mesh.primitive_plane_add(size=r * 20, location=(c.x, c.y, lo.z))
    sc.render.resolution_x, sc.render.resolution_y = 480, 320; f = f'/tmp/_tile_{n}.png'; sc.render.filepath = f
    bpy.ops.render.render(write_still=True); tiles.append((n, f))
from PIL import Image, ImageDraw
cols = 4; rows = math.ceil(len(tiles) / cols); sheet = Image.new('RGB', (480 * cols, 320 * rows), (30, 30, 30))
for i, (n, f) in enumerate(tiles):
    im = Image.open(f).convert('RGB'); ImageDraw.Draw(im).text((8, 6), n, fill=(255, 255, 0)); sheet.paste(im, ((i % cols) * 480, (i // cols) * 320))
sheet.save(out); print('wrote', out)
