import os, time, subprocess, sys
S, N, W, E = 12.975, 13.105, 80.160, 80.300
dl, dn = 0.0065, 0.008
UA = "MadrasHustleBuilder/1.0 (personal hobby project)"
lat = S; r = 0; jobs = []
while lat < N - 1e-9:
    lon = W; c = 0
    while lon < E - 1e-9:
        jobs.append((r, c, round(lat, 4), round(min(lat + dl, N), 4), round(lon, 4), round(min(lon + dn, E), 4)))
        lon += dn; c += 1
    lat += dl; r += 1
print(len(jobs), 'tiles', flush=True)
for (r, c, s, n, w, e) in jobs:
    f = f"tiles2/t_{r:02d}_{c:02d}.osm"
    if os.path.exists(f) and os.path.getsize(f) > 100 and open(f, 'rb').read()[-200:].find(b'</osm>') >= 0: continue
    for attempt in range(4):
        code = subprocess.run(['curl', '-sS', '-m', '180', '-A', UA, '-o', f, '-w', '%{http_code}', f"https://api.openstreetmap.org/api/0.6/map?bbox={w},{s},{e},{n}"], capture_output=True, text=True).stdout
        if code == '200': break
        print('retry', f, code, flush=True); time.sleep(5 + attempt * 10)
    print(f, code, os.path.getsize(f) if os.path.exists(f) else 0, flush=True)
    time.sleep(1.2)
print('DONE', flush=True)
