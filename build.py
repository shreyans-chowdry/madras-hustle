"""Build Madras Hustle into dist/: index.html (game code inlined) + world data files."""
import os, glob, shutil
root = os.path.dirname(os.path.abspath(__file__))
tpl = open(os.path.join(root, 'src/template.html')).read()
import json
js = '\n'.join(open(f).read() for f in sorted(glob.glob(os.path.join(root, 'src/[0-9]*.js'))))
# data-driven content authored as JSON, inlined so the page also works as a single file
dialogue = json.load(open(os.path.join(root, 'data', 'dialogue.json')))
js = 'const DIALOGUE_DATA = ' + json.dumps(dialogue, ensure_ascii=False) + ';\n' + js
importmap = '<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}}</script>'
html = tpl + '\n' + importmap + '\n<script type="module">\n' + js + '\n</script>\n'
dist = os.path.join(root, 'dist'); os.makedirs(dist, exist_ok=True)
full = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n</head>\n<body>\n'
        + html + '\n</body>\n</html>\n')
open(os.path.join(dist, 'index.html'), 'w').write(full)          # standalone page for Vercel / any static host
open(os.path.join(root, 'artifact.html'), 'w').write(html)       # body-only version for the Claude artifact
for f in ('world-a.json', 'world-b.json'):
    src = os.path.join(root, 'data', f)
    if os.path.exists(src): shutil.copy(src, os.path.join(dist, f))
# base64 copies of the Blender models for hosts that only serve text files (the game falls back to these)
import base64
for f in glob.glob(os.path.join(dist, 'assets', '*.glb')):
    open(f + '.json', 'w').write(json.dumps({'glb': base64.b64encode(open(f, 'rb').read()).decode()}))
print('built dist/index.html', round(len(html) / 1e3), 'KB')
