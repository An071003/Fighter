# 13 — MODULE IMPLEMENTATION PLAN / CODE OWNERSHIP

## Phase 0: Scaffold / tooling
`npm create vite@latest aeris-x9 -- --template react-ts`; add dependencies after validating version compatibility; Tailwind v4 + shadcn Vite init per official docs; Vitest, Playwright. Add aliases, strict TS, ESLint/Prettier if needed.

## Phase 1: Model and loader
`assetPipeline.ts`: load GLB via useGLTF/Suspense; traverse nodes and label `userData.partId` from manifest; snapshot rest transforms; audit missing parts; show error boundary. Test GLB can be viewed at fixed camera angle without UI.

## Phase 2: Scene/Showroom
`ExperienceCanvas`, `StudioLighting`, `Turntable`, `CameraRig`, `AircraftRig`; camera positions and spotlight physically plausible. FPS profiler dev-only. Stage control `showroom` rotates model+platform coordinated; controls pause spin.

## Phase 3: Selection/Explode
`PartPicker`, `PartRegistry`, `ExplodeController`; implement deterministic transforms; store only semantic part IDs and progress. Add DOM parts list as engineering UI first (simple functional layout), then polish.

## Phase 4: Flight director
`timeline.ts` pure evaluator + `FlightDirector` useFrame apply output; `GearRig` pivot mapping, `Turntable` position/fade, `CameraRig` target, `ParallaxEnvironment`. Start state guards and reverse. Write unit tests for t endpoints/continuity.

## Phase 5: VFX/art direction
Add material detail, shadows, wind trails, subtle post-process AFTER motion working. Use instances, no new renderer. Compare high/medium/low.

## Phase 6: UI & design system
Finalize top hero, parts drawer, bottom transport, quality menu; Motion transitions and responsiveness. One source of truth via selectors, never direct three refs.

## Phase 7: Accessibility/test/perf
Keyboard, reduced motion, canvas fallback, lazy assets, automation e2e. Run physical browser, inspect screenshots, iterate art direction. Record caveats transparently.

## API data contracts (core)
`PartRegistry.list(): PartDefinition[]`; `resolveMesh(partId): Object3D`; `getRestPose(partId): {position, quaternion, scale}`; `setPartVisualPose(partId, pose)` no UI import.
`SceneDirector.evaluate(t): FlightVisualFrame`; `SceneDirector.play()/pause()/seek(t)/reset()/return()` only domain actions exposed to UI.
`QualityManager.quality: 'auto'|'high'|'medium'|'low'`; `CameraRig.focus(partId)`, `restore()`.

## Key architectural pitfalls
React useFrame hook only inside Canvas; CSS layout only outside Canvas; one owner per transform channel. Do not use positional `scene.children[i]`; do not dispatch React setState 60fps; do not pair incompatible React/Fiber versions. Stabilize GLB pivots before polish to avoid rewriting animations.
