# PROMPT G5–G6 — VFX + AWWWARDS-QUALITY UI

Read docs/07_VFX_RENDERING.md, docs/08_INTERFACE_LAYOUT.md, docs/09_DESIGN_SYSTEM.md, docs/11_PERFORMANCE.md.

First implement wind as sparse instanced trails moving relative to fixed craft, layered parallax/haze and camera easing. Ensure shaders have low fallback and don't obscure PBR aircraft. Then implement sophisticated editorial UI in separate `interface/` layer: asymmetric desktop hero, top utility bar, right parts inspector, bottom cinematic transport and exploder slider, responsive mobile bottom-sheet, keyboard navigation, animation with Motion for React. Use design tokens exactly before visual refinement. Ensure all controls dispatch domain semantic events only. Add reduced motion support, disabled action hints, aria states, touch sizes and keyboard handling.

Screenshots desktop 1440×900 and 390×844 for initial, exploded, flight hover. Visual QA: model visible, headline hierarchy, CTA visible, no generic SaaS cards, no fake telemetry, no flashy overbloom.
