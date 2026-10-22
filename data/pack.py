import json, math
W = json.load(open('world2.json'))
LAT0, LON0 = 13.0677036, 80.2603443
KX = 111320 * math.cos(math.radians(LAT0)); KZ = 110574
CORE = dict(s=13.035, n=13.1, w=80.215, e=80.299)
cx0 = (CORE['w'] - LON0) * KX * 10; cx1 = (CORE['e'] - LON0) * KX * 10; cz0 = (LAT0 - CORE['n']) * KZ * 10; cz1 = (LAT0 - CORE['s']) * KZ * 10
def delta(p):
    out = [p[0], p[1]]
    for i in range(2, len(p), 2): out += [p[i] - p[i - 2], p[i + 1] - p[i - 1]]
    return out
def plen(p): return sum(math.hypot(p[i] - p[i - 2], p[i + 1] - p[i - 1]) for i in range(2, len(p), 2)) / 10
ed = []
for e in W['edges']:
    incore = cx0 < e['p'][0] < cx1 and cz0 < e['p'][1] < cz1
    if e['c'] == 5 and not incore and plen(e['p']) < 40: continue
    e['p'] = delta(e['p']); ed.append(e)
print('edges', len(W['edges']), '->', len(ed)); W['edges'] = ed
for b in W['buildings']:
    b['p'] = delta(b['p']); b.pop('r', None)
    if 'ln' in b and 's' not in b: b.pop('ln')
for w in W['walks']: w['p'] = delta(w['p'])
W['meta']['delta'] = 1
s = json.dumps(W, separators=(',', ':'), ensure_ascii=False)
open('world.json', 'w').write(s); print('MB', len(s) / 1e6)
for k in W: print(k, round(len(json.dumps(W[k], separators=(',', ':'))) / 1e6, 2))
