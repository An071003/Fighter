---
name: kinematic-visual-motion
description: Use for deterministic exploded-view choreography, landing-gear visual animation, turntable handoff, fixed-position hover, legal reverse transitions.
---

# Kinematic Visual Motion Skill

Read `docs/05_EXPLODED_VIEW.md`, `docs/06_FLIGHT_TIMELINE.md`, `docs/10_INTERACTION_STATE.md`, `examples/flight-timeline.ts`.

Core workflow:
- Make pure pose evaluators from normalized time. One clock, no conflicting owners.
- Root x/z fixed at showroom anchor during cinematic flight. Background scrolls; local visual y changes only.
- Gear physically animated through separate 3D pivots and door hinges. Order: door open → retract → door close. Reverse: open → extend → close.
- Base lowers/fades; model has independent parent, not inheriting base transforms.
- Event guards block explode and flight concurrency.
- Update Object3D refs in useFrame, no React setState per frame.
- Test deterministic samples and repeated loops; screenshots frame gates.

No real aircraft operation or physics training; visual animation only.
