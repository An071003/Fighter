# 11 — PERFORMANCE, DEVICE TIERS & RESOURCE SAFETY

## Mục tiêu thực tế
Desktop midrange warmed scene ~55–60fps, mobile midrange ~30fps khi flight; absolute target depends measured hardware. Load interactive target <5s on fast broadband after cache (asset size/network matters). No memory growth after 10 cycles. Do not assert performance without measured device info.

## Budgets khởi tạo
- Single canvas, no duplicate renderer; DPR auto ~1–1.75 desktop, ~1–1.5 mobile.
- `frameloop='always'` only when motion active; optional demand rendering when paused/showroom reduced motion. Profiling required.
- High drawcalls <=300 targeted, Medium <=180, Low <=110; avoid 600 tiny separated meshes making enormous drawcalls. Merge immobile adjacent detail nodes without merging selectable parts.
- Geometry high 250–550k total triangles, low 30–100k; up to ~200 GPU wind streak instances high. These are starting budgets not guarantees.
- Avoid 4k textures for every surface; compress glTF and texture with allowed tools.

## Adaptive quality
`Auto`: record fps stable 3–5s using `PerformanceMonitor` or own rolling median; adjust DPR, shadow resolution, wind count, postprocessing before lowering geometry LOD. Hysteresis prevents flicker/rapid ping-pong.
- HIGH: HDRI, shadows, modest selective bloom, up to 220 streaks, DPR 1.75.
- MED: HDRI lower map, 512–1024 shadow, no expensive transparency, 100 streaks, DPR 1.25.
- LOW: no SSAO, minimal contact fake, 20–40 streaks or 2D lines, DPR 1, static env.

## Mobile
Avoid 3 separate WebGL contexts. If WebGPU background plugin used, disable on Mobile/Low. Thin UI overlays reduce blurred glass. Critical part selection via sidebar rather than tiny on-mesh labels.

## Resource lifecycle
Textures/materials/geometry created once or memoized. Dispose generated resources on unmount; shared GLTF cached objects do not dispose prematurely; restore after WebGL context lost. Prevent shader compile inside useFrame, no new arrays/Vector3 per point each frame.

## Error handling
- Asset load failure → error boundary with retry and brief explanation.
- WebGL unavailable → rights-cleared static render + interactive controls disabled honestly, no simulated progress UI.
- Degraded GPU → auto quality downgrade and badge `Chế độ nhẹ`.
- Navigation away → listener/raf/audio clean up.

## Measurement & documentation
Use browser Performance panel, r3f Perf optional dev-only, Chrome GPU diagnostics, Playwright repeated cycle screenshots. Capture device specs, fps p50/p10, JS heap before/after 10 interactions, network transfer size. Qualify if synthetic metrics vary.
