import xml.etree.ElementTree as ET, glob, pickle, collections
nodes={}; ways={}; rels={}
for f in sorted(glob.glob('tiles2/*.osm')):
    for ev,el in ET.iterparse(f):
        if el.tag=='node':
            i=int(el.get('id')); 
            if i not in nodes:
                t={c.get('k'):c.get('v') for c in el if c.tag=='tag'}
                nodes[i]=(float(el.get('lat')),float(el.get('lon')),t or None)
            el.clear()
        elif el.tag=='way':
            i=int(el.get('id'))
            if i not in ways:
                ways[i]=([int(c.get('ref')) for c in el if c.tag=='nd'],{c.get('k'):c.get('v') for c in el if c.tag=='tag'})
            el.clear()
        elif el.tag=='relation':
            i=int(el.get('id'))
            if i not in rels:
                rels[i]=([(c.get('type'),int(c.get('ref')),c.get('role')) for c in el if c.tag=='member'],{c.get('k'):c.get('v') for c in el if c.tag=='tag'})
            el.clear()
pickle.dump((nodes,ways,rels),open('osm2.pkl','wb'))
print(len(nodes),len(ways),len(rels))
C=collections.Counter()
for nd,t in ways.values():
    for k in ('highway','building','railway','waterway','natural','landuse','leisure','amenity'):
        if k in t: C[(k, t[k] if k!='building' else 'any')]+=1
for k,v in C.most_common(70): print(k,v)
print('levels tagged', sum(1 for nd,t in ways.values() if 'building' in t and ('building:levels' in t or 'height' in t)))
print('rel types', collections.Counter(t.get('type') for m,t in rels.values()).most_common(8))
