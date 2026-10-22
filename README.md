# Madras Hustle

An open-world crime game set on about 200 km² of real Chennai streets, built from OpenStreetMap data. It runs in the browser using Three.js and needs no install. It works with keyboard and mouse, or with a PS4/PS5 controller over USB or Bluetooth.

## Play locally
```
cd dist
python3 -m http.server 8000
```
Open http://localhost:8000. You need a web server; opening `index.html` directly won't load the map data.

## Deploy to Vercel (anyone can play)
**Option A, drag and drop:** go to https://vercel.com/new, choose "Deploy" with no framework, and upload this folder. `vercel.json` already points to `dist/`.

**Option B, CLI:**
```
npm i -g vercel
cd madras-hustle
vercel          # first time: answer the prompts (no framework, no build command)
vercel --prod   # publish the public URL
```

**Option C, GitHub:** push this folder to a repo, import it at vercel.com/new, set Framework = Other, Output Directory = `dist`.

## Edit the game
- Game code is in `src/`. Files are concatenated in numeric order. `template.html` holds the HUD and menus.
- After editing, run `python3 build.py`. This writes `dist/index.html` and copies the world data into `dist/`.

## Rebuild the map (optional)
The `data/` scripts download OpenStreetMap tiles (`fetch2.py`), parse them (`parse2.py`), turn them into game geometry (`process2.py`, which needs `shapely`), and compress and split the result (`pack.py`). This produces `world-a.json` and `world-b.json`.

## Controls
| Action | Keyboard | PS4 |
|---|---|---|
| Move / drive | WASD | Left stick |
| Camera | Mouse | Right stick |
| Enter / exit vehicle | F | Triangle |
| Interact / start mission | E | D-pad right |
| Aim / shoot | Right / left mouse | L2 / R2 |
| Sprint / jump | Shift / Space | X / Square |
| Weapons | 1-8, wheel | L1 / R1 |
| Map | M | Touchpad |
| Pause | Esc | Options |
| Day / night | L | Share |

Map data © OpenStreetMap contributors (ODbL).
