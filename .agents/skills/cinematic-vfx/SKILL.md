---
name: cinematic-vfx
description: Use for premium three.js lighting, physically based materials, wind/parallax illusion, turntable fade, low-cost shaders and quality tiers.
---

# Cinematic VFX Skill

Read `docs/07_VFX_RENDERING.md`, `docs/09_DESIGN_SYSTEM.md`, `docs/11_PERFORMANCE.md`.

1. Secure crisp PBR metal/glass silhouette under 3-point studio lighting first.
2. Add selective cyan accents and bounded rim glow only. Avoid overbloom.
3. Build deterministic, instanced front-to-rear streaks, three parallax depth planes moving while craft anchored.
4. Base opacity lowers; remove after fade not instantly. Shadow fades with rise.
5. Implement Auto/High/Med/Low toggles and reduced motion / disabled wind.
6. WebGL first; shader-effects WebGPU optional and can be disabled without breaking interaction. Only one primary scene Canvas.
7. Performance check for allocations/material compilation in useFrame.
