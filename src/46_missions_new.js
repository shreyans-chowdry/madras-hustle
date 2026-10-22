// ===================== NEW MISSIONS: The Arrival · Commuter Hustle · Family Favor =====================
function beachLZ() {
  // the longest stretch of sand (Marina) is the landing zone; fall back to the far end of the runway
  let best = null, ba = 0;
  for (const d of WD.areas.beach) { const pts = toPts(d.p); if (pts.length < 3) continue; const a = Math.abs(signedArea(pts)); if (a > ba) { ba = a; best = pts; } }
  if (!best) { const rw = mainRunway(), e = edgePoint(rw.E, rw.len * 0.8, 1, {}); return [e.x, e.z]; }
  let [cx, cz] = centroid(best); if (!pointInPoly(cx, cz, best)) [cx, cz] = best[Math.floor(best.length / 2)];
  return [cx, cz];
}
function commuterRoute() {
  // origin: metro station near home; destination: an elevated station at least 3 km down the line
  const hp = homeProp(), hx = hp ? hp.door.x : 0, hz = hp ? hp.door.z : 0;
  const cands = Metro.stations.filter(S => S.svc).sort((a, b) => dist2(a.x, a.z, hx, hz) - dist2(b.x, b.z, hx, hz));
  for (const S of cands) { const d = Metro.destinations(S).find(o => o.D.elevated && o.km > 3 && o.D.svc); if (d) return { S, D: d.D }; }
  for (const S of cands) { const d = Metro.destinations(S).find(o => o.D.svc && o.km > 2); if (d) return { S, D: d.D }; }
  return null;
}
function defineTransitMissions(near, hd) {
  const term = Airport.svc, drop = WorldFix.dropoff;
  if (term && drop) MISSIONS.push({
    id: 'm13', title: 'The Arrival', who: 'Priya', at: near(hd.x, hd.z, 50), unlock: () => true, reward: 8000, rel: ['priya', 8],
    brief: 'Priya at Madras Air has a charter plane nobody is free to fly. Drive to the airport, check in like a regular passenger, clear security, board at Gate 4 — then take the controls yourself and put the plane down on the beach landing zone.',
    steps: [
      { t: 'phone', from: 'Priya', msg: 'The charter is fuelled and waiting. Come through the terminal like everyone else, the tower is watching.' },
      { t: 'enter', need: 'car', text: 'Get a <b>car</b>', label: 'Get a car' },
      { t: 'goto', need: 'car', stop: true, to: () => [drop.x, drop.z], r: 14, text: 'Drive to the <b>airport departures drop-off</b>', label: 'Drive to the airport drop-off' },
      { t: 'event', name: 'airport:enter', text: 'Walk into the <b>terminal</b>', label: 'Enter the terminal', target: () => player.interior ? null : [term.x, term.z] },
      { t: 'event', name: 'airport:ticket', match: d => d.mode === 'charter', text: 'Check in at the <b>Madras Air</b> desk and buy the <b>charter</b>', label: 'Check in for the charter' },
      { t: 'event', name: 'airport:security', text: 'Walk through <b>security</b>', label: 'Clear security' },
      { t: 'event', name: 'airport:board', text: 'Board at <b>Gate 4</b>', label: 'Board at the gate' },
      { t: 'landPlane', to: () => beachLZ(), r: 160, timer: 600, text: 'Take off and land on the <b>beach landing zone</b>', label: 'Fly to the LZ and land' },
    ],
    fail: [{ when: M => M.si >= 7 && player.veh && player.veh.kind === 'plane' && player.veh.y > 590, reason: 'You left controlled airspace.' }],
  });
  const route = commuterRoute();
  if (route) MISSIONS.push({
    id: 'm14', title: 'Commuter Hustle', who: 'Anand', at: [route.S.svc.x + 3, route.S.svc.z + 3], unlock: () => true, reward: 6000, rel: ['anand', 6],
    brief: `Anand left a briefcase on the platform at ${route.D.name}. Ride the metro like a normal commuter — buy a token, tap in, board — and grab it before someone else does.`,
    steps: [
      { t: 'phone', from: 'Anand', msg: `Platform bench, ${route.D.name}. Don't drive, the traffic on that side is murder. Take the metro.` },
      { t: 'event', name: 'metro:enter', match: d => d.station === route.S.name, text: `Enter <b>${route.S.name}</b> metro station`, label: 'Enter the metro station', target: () => player.interior ? null : [route.S.svc.x, route.S.svc.z] },
      { t: 'event', name: 'metro:token', match: d => d.to === route.D.name, text: `Buy a token to <b>${route.D.name}</b> at the ticket machine`, label: `Buy a token to ${route.D.name}` },
      { t: 'event', name: 'metro:gate', text: 'Tap in at the <b>turnstiles</b>', label: 'Tap in at the turnstiles' },
      { t: 'event', name: 'metro:board', text: 'Wait on the <b>platform</b> and board the train', label: 'Board the train' },
      { t: 'event', name: 'metro:alight', match: d => d.station === route.D.name, text: `Ride to <b>${route.D.name}</b>${route.D.elevated ? ' (elevated)' : ''} and get off`, label: `Ride to ${route.D.name}` },
      { t: 'pickupIn', interior: 'metro', at: [14, -6.3], where: () => player.interior.svc && player.interior.svc.station === route.D, text: 'Grab the <b>briefcase</b> from the platform bench', label: 'Retrieve the drop' },
      { t: 'goto', to: () => [route.D.svc.x, route.D.svc.z], r: 1e9, check: () => !player.interior, text: 'Leave the station', label: 'Leave the station' },
    ],
  });
  const fam = Living.family;
  if (fam) MISSIONS.push({
    id: 'm15', title: 'Family Favor', who: 'Amma', trigger: { event: 'family:favor_accepted' }, at: [fam.x + Math.sin(fam.h + Math.PI) * 4, fam.z + Math.cos(fam.h + Math.PI) * 4], unlock: () => true, reward: 5000, rel: ['amma', 10],
    brief: "Amma called. Something about Appa's car and Uncle Raju's garage. Go home, talk to her, and do what she asks — carefully, it's Appa's pride and joy.",
    steps: [
      { t: 'event', name: 'family:enter', pre: () => player.interior && player.interior.type === 'family', text: 'Go inside your <b>family home</b>', label: 'Visit the family home', target: () => player.interior ? null : [fam.x, fam.z] },
      { t: 'event', name: 'family:favor_accepted', pre: M => M.via === 'family:favor_accepted', text: 'Talk to <b>Amma</b>', label: 'Talk to Amma' },
      { t: 'spawn', type: 'sedan', color: 0xe8e2d0, at: () => Living.familyCar },
      { t: 'enter', need: 'target', text: "Get in <b>Appa's Ambassador</b> outside", label: "Get in Appa's car" },
      { t: 'goto', need: 'target', stop: true, to: () => { const [x, z] = ll(13.0850, 80.2101); const s = roadSpot(x, z, 1, true); return [s.x, s.z]; }, r: 10, timer: 0, text: "Deliver the car to <b>Uncle Raju's garage</b> before he closes", label: "Deliver the car to Uncle Raju" },
    ],
    fail: [{ when: M => M.target && M.target.health < M.target.spec.hp * 0.4, reason: "You wrecked Appa's car. Amma is not speaking to you." }],
  });
  EventBus.on('airport:pilot', d => { if (mission && mission.def.id === 'm13') mission.target = d.v; });
  // delivery timer scales with the distance from the family home
  const m15 = MISSIONS.find(m => m.id === 'm15'); if (m15) { const g = m15.steps[4]; const [x, z] = ll(13.0850, 80.2101); g.timer = Math.round(Math.hypot(x - fam.x, z - fam.z) / 9 + 75); }
}
