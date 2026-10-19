# PROMPT G2–G3 — 3D ENGINE, PICKING, EXPLODE

Read docs/01_ARCHITECTURE.md, docs/03_PARTS_CONTRACT.md, docs/04_FEATURES.md, docs/05_EXPLODED_VIEW.md and docs/10_INTERACTION_STATE.md.

Create real React Three Fiber scene with PBR asset loader, Environment, turntable geometry with self rotation, independent aircraft root, OrbitControls/camera presets, mesh semantic picking + side DOM selector through shared domain events. Implement deterministic exploded view with authored offsets, component select/focus/isolate and assemble. Lock selected camera ownership vs user OrbitControls. All part transforms based on immutable rest local poses; no cumulative offsets.

Implement unit test for p=0 transform identity, p=1 unique offsets, 20 explode-reset cycles restoring original matrices, left/right symmetric movement and event blocking when flight active. Deliver screenshot and actual browser manual check. Never declare finished before G2/G3 tests.
