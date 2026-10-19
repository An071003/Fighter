# 10 — STATE MACHINE / EVENTS / CONCURRENCY

## Authoritative mode
```
BOOT → LOADING → SHOWROOM ↔ INSPECT ↔ EXPLODED
                  │
                  └→ FLIGHT_TRANSITION → HOVER → RETURN_TRANSITION → SHOWROOM

ERROR can be reached from LOADING/any mode (asset/context-loss); RETRY returns to LOADING.
```
Possible `INSPECT` inside `EXPLODED` via overlay `selectedPart` while base mode remains EXPLODED; do **not** make ambiguous nested mode transitions. Keep UI panel state orthogonal, not another 3D timeline writer.

## Event contract
```
LOAD_SUCCESS, LOAD_FAILURE, SELECT_PART(id), DESELECT_PART,
SET_EXPLODE_PROGRESS(0..1), TOGGLE_EXPLODE,
START_FLIGHT, PAUSE_FLIGHT, RESUME_FLIGHT, COMPLETE_FLIGHT,
RETURN_TO_SHOWROOM, COMPLETE_RETURN,
SET_CAMERA_PRESET(name), RESET_VIEW,
SET_QUALITY(tier), SET_REDUCED_MOTION(bool), RETRY
```

## Guards
- START_FLIGHT iff `mode===SHOWROOM && explodeProgress===0 && selectedPart===null && assetReady && !isDirectorBusy`.
- SET_EXPLODE iff showroom or exploded; never while flight active.
- SELECT_PART iff showroom/inspect/exploded; no select during gear animation.
- RETURN_TO_SHOWROOM iff mode===HOVER, or controlled interruption capable of blending; MVP disable mid-flight return.
- RESET_VIEW must restore camera only; if user explicitly `Reset Scene` it restores state and animation.
- PAUSE only during timeline; camera orbit retains disabled when paused within transition unless deliberate manual mode.

## Decoupled progress
Domain holds `timelineStatus` and `elapsedMs` **at moderate UI update rate** (e.g. 10Hz). 3D visual clock ref updates every frame. UI `subscribeWithSelector` receives progress in batches; no render 60fps tree.

## State invariants
I1: `mode=HOVER` => platform invisible, gear retracted, doors closed, aircraft XZ anchored.
I2: `mode=SHOWROOM` => platform visible, gear extended, doors closed, explosion 0.
I3: no `flight timeline active` simultaneously with `explodeProgress>0`.
I4: selected part IDs must exist in manifest; invalid IDs cleared gracefully.
I5: `replay` returns starting pose then begins; never starts at gear half-way unless explicitly seek.

## Input ownership
Pointer orbit and scene part picking share event priority: click on part wins if no drag threshold breach; drag >4px treated orbit gesture. CSS overlay disables canvas pointer only inside interactive panel bounds. Touch tapping and moving do not both select accidentally.

## Pause/resume and interrupted transitions
When user hides tab: pause timeline and global visual event tick; on return continue. On context restored: re-init GPU resources, apply last stable snapshot; avoid creating multiple render loops.

## Keyboard/accessibility
DOM sidebar fully duplicates selecting parts; no requirement to click 3D mesh. Slider arrow keys use small increments; status announced politely at state transitions only, not per frame.

## Domain API example
```
type Mode = 'boot' | 'loading' | 'showroom' | 'inspect' |
 'exploded' | 'flight-transition' | 'hover' | 'return-transition' | 'error';

type SceneEvent = {type:'SELECT_PART'; partId:string}
 | {type:'SET_EXPLODE_PROGRESS'; value:number}
 | {type:'START_FLIGHT'} | {type:'PAUSE_FLIGHT'}
 | {type:'RESUME_FLIGHT'} | {type:'RETURN_TO_SHOWROOM'}
 | {type:'RESET_SCENE'};
```
No UI direct `modelRef.position.y += 1` from button handler; button dispatches event and director animates.
