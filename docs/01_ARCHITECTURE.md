# 01 — ARCHITECTURE & TECH STACK

## Quyết định kỹ thuật
- Vite + React 19 + TypeScript strict (ưu tiên single-page static deploy, tránh SSR 3D phức tạp).
- Three.js + `@react-three/fiber` tương thích cùng major + `@react-three/drei` để useGLTF, camera, environment, bounds. Đọc version hiện tại, KHÔNG trộn Fiber 8 với React 19.
- `zustand` cho app-level state events; `xstate` là **tùy chọn**, chỉ dùng nếu state machine phức tạp hơn; không thêm cả 2 cho cùng nhiệm vụ.
- `motion` (import `motion/react`) cho DOM UI; không dùng làm timeline authoritative của Three.js.
- `@react-three/postprocessing` chỉ bật khi GPU đủ khả năng; `lucide-react` + `shadcn/ui` + Tailwind CSS v4 UI.
- Blender để author assets; GLB/glTF 2.0 tách node; thử `gltf-transform` tối ưu trước khi build release.
- Test: Vitest (pure functions), React Testing Library (DOM), Playwright (browser + screenshot); optional `@react-three/test-renderer` nếu tương thích.

## Data flow và ownership
```
UI: Button/PartTree/Inspector/Timeline  ────────┐
    └─ dispatch semantic event                  │
                                                v
DOMAIN: appStore + reducer/event guards → SceneSnapshot
    ├─ state: mode, selection, progress, quality, reducedMotion
    ├─ timeline controller → deterministic visual progress
    └─ selectors: canExplode/canFlight/canInspect
                                                │ read/selectors
                                                v
RENDERER: <Canvas> <SceneRoot> <JetRoot> <Platform> <Vfx>
    ├─ glbNodes named groups + transform registry
    ├─ refs-based animation updates; no state update on each frame
    ├─ orbit/control manager with locked phases
    └─ resource/LOD performance monitor
```

## Cấu trúc mã ứng dụng Gemini phải tạo
```
project/
  public/assets/aircraft/aeris-x9.glb
  public/assets/env/studio-hangar.exr (hoặc .hdr licensed)
  public/assets/textures/*
  src/
    app/App.tsx; app/providers.tsx; app/styles.css
    domain/types.ts; domain/events.ts; domain/store.ts
    domain/selectors.ts; domain/machine.ts; domain/timeline.ts
    domain/partRegistry.ts; domain/config.ts
    experience3d/ExperienceCanvas.tsx; SceneRoot.tsx
    experience3d/aircraft/JetModel.tsx; AircraftRig.tsx; GearRig.tsx
    experience3d/aircraft/PartPicker.tsx; ExplodeController.tsx
    experience3d/scene/Turntable.tsx; StudioLighting.tsx; CameraRig.tsx
    experience3d/flight/FlightDirector.tsx; ParallaxEnvironment.tsx
    experience3d/vfx/WindTrails.tsx; Atmosphere.tsx; MaterialHighlight.tsx
    experience3d/quality/QualityManager.tsx; ResourceBoundary.tsx
    interface/shell/TopBar.tsx; BottomTransport.tsx
    interface/inspect/PartsTree.tsx; PartDetails.tsx
    interface/controls/ModeSwitch.tsx; QualityMenu.tsx; CameraPresets.tsx
    interface/common/StatusToast.tsx; KeyboardHelp.tsx
    styles/tokens.css; styles/typography.css
    tests/unit/*; tests/e2e/*
```
**Không** import `three` vào `interface` và **không** import React UI vào `experience3d`. Mọi message thông qua semantic IDs.

## Scene graph
```
Canvas
 ├─ StudioLights / Environment / ContactShadows
 ├─ TurntableRoot (spinAngle / lowerY / opacity)
 │   ├─ floorBase / ringOuter / ringInner / lightMarkers
 ├─ JetAnchor (x=0,z=0 fixed WORLD reference)
 │   └─ JetVisualRig (hoverY / subtle pitch roll)
 │       └─ AircraftAssemblyRoot (NO automatic platform inherit)
 │           ├─ Fuselage, Canopy, Wings, ControlSurfaces
 │           └─ GearPivotNodes, Doors, Wheels
 ├─ WindVfxRoot (bounded near JetAnchor)
 ├─ ParallaxBackdrop (moves local texture/cloud/lines)
 └─ CameraRig
```
**Lưu ý:** để xoay tàu trên bệ, xoay `JetVisualRig` và `TurntableRoot` qua coordinator chung ở showroom; khi transition, giảm angular velocity về 0 rồi ngừng. Không parent jet dưới platform để tránh bị kéo xuống theo bàn xoay.

## Tính xác định của thời gian
- Visual output `pose = evaluateScene(time, mode, params)` là pure function theo `time`, khả năng seek/back/replay.
- `requestAnimationFrame`/`useFrame` chỉ dùng để tăng `time`, áp pose lên refs. `Math.random` không dùng mỗi frame; particle instance seed ổn định.
- Khi tab inactive hoặc context loss: pause clock; resume từ tiến độ đúng, không nhảy qua gear frame.
- `delta = clamp(delta,0,0.05)`, giảm speed khi inactive; test fixed times t=0,1,2,3,4,5,7.

## Không nên thêm
Không cần React Router, NestJS, DB, auth, Rapier physics, realtime websocket. Không WebGPU-only, không shader nặng luôn bật. Không mô phỏng vận hành hay đặc tính kỹ thuật máy bay thật.
