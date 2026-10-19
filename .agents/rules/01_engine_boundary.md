---
description: 3D engine and domain boundaries
alwaysApply: true
---

- `experience3d` owns meshes, shaders, camera, lights and render-loop; `interface` owns DOM, labels and layout; `domain` owns finite-state orchestration.
- Components in `interface` must not import Three.js, GLTF or mutate object refs.
- Meshes cannot directly update React UI every animation frame.
- One WebGL Canvas and one authoritative timeline clock.
- Model cannot fly away from root fixed horizontal anchor.
