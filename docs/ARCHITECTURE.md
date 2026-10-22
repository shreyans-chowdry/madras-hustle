# Architecture

Madras Hustle stays on its WebGL runtime: Three.js, a single ES module, and no bundler. The overhaul adds a component and event architecture modelled on a Unity URP project, so each system can be moved to C# one at a time later without a redesign.

## Why not a Unity migration
- No Unity editor or license was available in the build environment. A Unity project that can't be compiled, played or verified would only be untested code.
- The game's world comes from about 16 MB of OpenStreetMap-derived JSON, and the city is generated procedurally at load time with chunk streaming. That pipeline is a natural fit for the browser and deploys anywhere as static files (Vercel).
- Instead, the new systems follow Unity conventions. Each one below lists its Unity / C# counterpart.

## Module map → Unity equivalents

| Web module | Responsibility | Unity / C# equivalent |
|---|---|---|
| `01_events.js` `EventBus` | Publish / subscribe channel; systems never hold references to each other | `ScriptableObject` event channels / C# `event Action<T>` |
| `01_events.js` `Systems` | Registered systems with `init()` / `update(dt)` ticked by priority | `MonoBehaviour.Start/Update` with Script Execution Order |
| `01_events.js` `Triggers` | Circle trigger volumes with `onEnter / onExit / onUse` and contextual prompts | Trigger `Collider` + `OnTriggerEnter/Exit` + an `IInteractable` interface |
| `01_events.js` `Layers` | `Default, Road, Obstacle, Interactable, Curb, Water` | Physics layers + layer collision matrix |
| `10_world.js` walls / `collideCircle(…, stepH)` | Building, fence and portal walls tagged with layers; `Curb` walls can be stepped over by people | `MeshCollider` / `BoxCollider` on layer + `CharacterController.stepOffset` |
| `08_worldfix.js` `WorldFix` | Load-time geometry repair (rail profile, road gaps, airport clearance, corridors) | Editor import post-processor (`AssetPostprocessor`) |
| `06_assets.js` `Assets` | Loads the Blender GLBs, clones per vehicle, recolours `Paint` | Prefabs + `MaterialPropertyBlock` for paint colour |
| `20_vehicles.js` `Vehicle` | Arcade physics for car / boat / heli / plane; gear, lights, landing gear | `VehicleController` (raycast or `WheelCollider`), `FlightController` |
| `20_vehicles.js` `Train` | Scheduled shuttle along a rail line, stops, sliding doors, `train:arrive/doors` events | `SplineContainer` follower + `Animator` for doors |
| `37_airport.js` `Airport` | Terminal flow (check-in → security → gate), passenger and pilot modes | `AirportController` + `FlightSequence` (Timeline) |
| `39_metro.js` `Metro` | Stations, token machine, turnstile gate, platform arrival, ride / alight | `MetroStation`, `Turnstile`, `MetroRide` components |
| `41_ui.js` `UI`, `Settings` | Menus, settings, briefing, objective tracker, flight HUD | UI Toolkit documents + a `HUDPresenter` |
| `44_living.js` `Dialogue`, `Living` | JSON dialogue trees, relationships, family home and cafe interiors | `DialogueGraph` ScriptableObjects + `RelationshipService` |
| `45_missions.js` `MissionFW`, `STEP` | Mission phases and checkpoint step types (incl. event-driven steps) | `MissionDefinition` ScriptableObject + `MissionRunner` state machine |
| `46_missions_new.js` | The Arrival, Commuter Hustle, Family Favor | Three `MissionDefinition` assets |
| `48_cheats.js` `Cheats`, `sanitizeSave` | Cheat registry + console; save validation | `CheatRegistry` + `[ConsoleCommand]`; save DTO validation |
| `13_weather.js` `Weather`, grade pass | Rain / fog / storm / lightning, wet roads, post grade | URP Volume profiles + VFX Graph rain |

## Events (the contracts between systems)

| Event | Raised by | Used by |
|---|---|---|
| `airport:enter`, `airport:ticket {mode}`, `airport:security`, `airport:board {mode}`, `airport:pilot {v}`, `airport:depart`, `airport:takeoff`, `airport:landed`, `airport:arrived` | Airport | Missions (The Arrival), UI |
| `metro:enter {station}`, `metro:token {to}`, `metro:gate`, `metro:arrive`, `metro:board {to}`, `metro:alight {station, elevated}` | Metro | Missions (Commuter Hustle) |
| `train:arrive`, `train:doors {open}` | Train | — (hooks for audio / UI) |
| `family:enter`, `family:favor_accepted` | Living / dialogue data | Missions (Family Favor, also as an auto-trigger) |
| `dialogue:start/end`, `relationship:change` | Dialogue | Save, UI |
| `mission:start`, `mission:checkpoint {index, label}`, `mission:passed {reward}`, `mission:failed {reason}`, `mission:pickup` | Mission framework | UI, tests |
| `interior:enter/exit {type}` | Interiors | Systems that populate NPCs |
| `trigger:enter/exit/use {id}` | Triggers | Any |
| `weather:change`, `cheat {cmd}`, `world:fixed {stats}`, `assets:loaded`, `failsafe` | various | UI, tests |

## Mission framework
A mission definition is plain data: `{ id, title, who, at | trigger, unlock, brief, reward, rel, steps, fail }`.

1. **Trigger.** Either walking into the marker and pressing E, or an event (`trigger: { event }`).
2. **Briefing.** A modal with the contact, the brief, the checkpoint list and the reward. Accept or decline.
3. **Checkpoints.** Every step that isn't a phone, give, wanted or spawn step is a checkpoint, shown in the tracker and announced with `mission:checkpoint`. Step types include `goto`, `enter`, `event` (completes when an EventBus event matches), `landPlane`, `pickupIn`, `rob`, `hold`, `rings`, `collect` and others. A `pre` predicate lets a step complete immediately if its condition already holds.
4. **Fail / success.** A global timer, a destroyed target vehicle, being wasted or busted, plus per-mission `fail: [{ when, reason }]` predicates.
5. **Reward.** Bank payout, a relationship bonus, and a banner with the time taken. The result is saved through `sanitizeSave`.

## Data flow at boot
`loadWorldData` + `Assets.load` (parallel) → `WorldFix.apply` → `initWorld` (roads, water, rails → portals → elevated stations, airport + fence, buildings minus removed ones, trees) → interiors + services → `Systems.init()` (Airport, Metro, Living) → missions + triggers → chunk streaming.
