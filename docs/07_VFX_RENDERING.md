# 07 — VFX / SHADERS / RENDERING

## Ngôn ngữ hình ảnh
Premium aerospace showroom, volumetric-feel nhưng tiết chế, cyan edge accents, near-black atmosphere, bạc titan matte và kính tối. Prioritize silhouettes and readability; hiệu ứng phải làm model trông cao cấp, không làm nó chìm trong "neon soup".

## Render passes & layering
1. PBR physically-based aircraft + environment map + key/rim lighting.
2. Contact shadows on turntable while grounded (fade as rises); soft floor shadow independent of platform.
3. Part-selection highlight selective; optional outlines from selected ID only.
4. Airflow ribbons or line particles (limited opacity) on flight.
5. Minimal tone mapping + FXAA/SMAA fallback, low bloom selective, vignette tiny, film grain only desktop high if justified.
6. HTML HUD overlay (no huge WebGL text panels), keeps sharp text/accessibility.

## Wind system: Không di chuyển model
- Spawn line segments/billboard streaks in a box around craft bounding volume with deterministic seeds; particles shift from front (-Z) to back (+Z) in camera-relative view (synchronization with model axes), wrap at volume boundary.
- For close-up wind around wing edges: thin animated curves/particle arcs, *decorative flow visualization*, NOT CFD. Use instance count 80–220 depending preset.
- Parallax backdrop: at least 3 bands (distant hazy particles slow; mid layer ribbons medium; foreground sparse streaks fast). Model position still XZ fixed.
- Quality Low: no GPU particles; 20 CSS overlay lines or instanced simple streaks and slower material UV scroll.

## Shader contract
Uniforms: `uTime`, `uIntensity`, `uQuality`, `uDirection`, `uSeed`. Never allocate new uniforms/materials every render; update in useFrame with refs. Color management ensure sRGB base textures and linear calculations; do not glow every surface.

## Turntable geometry/VFX
- 3 concentric rings, physically modeled 0.1–0.3 thick, central disk, radial tick marks (instanced), segmented emissive edge, mechanical seams. Separate `PlatformRig` so y/visibility doesn't move jet.
- Grounding: soft contact shadow when showroom; fade with jet rise. Hide geometry only when opacity reached threshold, using material transparency or shadable dissolve not `scale(0)`.
- Optional platform retraction hatch; P1 only after core works.

## High-quality lighting recipe
Three-point lighting: cool large key upper-left, warmer low-fill on right, thin back rim. HDRI indoor studio accent but overall scene stays dark. Keep aircraft reflections as broad soft streaks; metal roughness >= .2 typical; glass canopy controlled transmission without alpha sorting artifacts.

## shaders skill / WebGPU caution
`shader-effects-inc/shaders` offers WebGPU components for backgrounds. Use **only** if browser feature detection & performance allow and it doesn't create an overlapping canvas that steals pointer input. Default functional renderer remains WebGL via R3F. Do not force `WebGPURenderer` because a decorative WebGPU plugin exists. Fallback CSS gradient/noise textures.

## Anti-patterns
No overbloom, no flicker, no full-screen camera shake, no smoke covering model, no image planes standing in for parts. Avoid `shaderMaterial` black on low-end by providing MeshStandardMaterial fallback. Prevent transparency overdraw of giant fog planes.

## Accessibility
Reduced motion: no animated wind flow, no auto camera or turntable spin; static wind state icon/caption; user can still manually enter hover endpoint. No strobe; contrast of DOM overlays at least WCAG AA as applicable.
