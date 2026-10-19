# 12 — QA / ACCEPTANCE TEST PLAN

## Quy định PASS/FAIL
Mỗi TC phải có `PASS|FAIL|BLOCKED` + screenshot/video hoặc automated test log; **không được tự báo PASS bằng suy đoán**. Cấu hình kiểm thử Chromium desktop 1440×900, 1920×1080; mobile 390×844, 360×740. Firefox/Safari smoke nếu có môi trường.

### Group A: Assets
- A01 GLB loads and >=32 unique named selectable part groups.
- A02 Left/right components and front/left/right landing gear are separate Object3Ds.
- A03 Axes & local pivots correct; normals material clean under orbit.
- A04 All asset source/license recorded; `asset-report.json` generated.
- A05 If asset missing, honest error state; no fabricated success.

### Group B: Interaction
- B01 Orbit & pinch zoom, preset and reset work; no clip through jet.
- B02 Click mesh selects correct semantic part; same part via sidebar produces same result.
- B03 Focus moves camera smoothly and zooms; Esc restores prior camera.
- B04 Explode slider at 0%, 25%, 50%, 75%, 100% produces distinct stable poses.
- B05 Repeat explode/assemble 20 times; matrix returns to rest within eps 1e-5.
- B06 Selecting part while flight active is refused with clear UI state.

### Group C: Flight + Reverse
- C01 Start only when assembled. CTA disabled with helpful message when exploded.
- C02 Turntable angular velocity smoothly goes 0; base lowers, opacity fades before invisible.
- C03 Wheels visibly spin first and retract **after** doors open; three gear assemblies distinct.
- C04 Doors close after struts inside (visual check screenshots at t=3.5,4.2,5.2).
- C05 Visual wind/parallax moves; jet X/Z anchor constant at all sampled frames.
- C06 Hover remains near center after 15 seconds; no drift/clipping.
- C07 Return to Showroom restores platform, gear extended, closed doors, camera original.
- C08 Pause/resume/replay 10 runs stable; tab hidden & restored no major jump.
- C09 Reduced motion can reach same logical endpoints with no auto perpetual animations.

### Group D: UI / Accessibility
- D01 All buttons working; no placeholder dead clicks.
- D02 Desktop hierarchy clear, 3D unobscured; screens 360/390 have no horizontal scroll.
- D03 Keyboard all actions accessible: Tab/Enter/Space/Esc/slider arrow keys.
- D04 Focus ring visible; mode not color-only; panel announced and can close.
- D05 Contrast passes at least WCAG AA for UI text (verify with tooling).
- D06 Mobile controls not covered by notch/safe-area; min 44px click targets.

### Group E: Tech / Visual QA
- E01 `npm run build` pass, `npm run typecheck`, `npm run lint`, `npm run test` pass.
- E02 Playwright real browser smoke runs and screenshots for scenes.
- E03 Console contains no uncaught JS errors, and no repeated WebGL warnings.
- E04 Auto low-quality usable, high-quality postprocess does not obscure craft.
- E05 Asset and software licensing report present; no unexpected paid key.
- E06 Test snapshot 1440×900 + 390×844 before/after flight; record acceptance visual score.

## Suggested Playwright scenarios
- Navigate: assert header, canvas, loading resolves, CTA visible.
- Hit `data-testid='explode-toggle'`: slider value 100, screenshot; toggle to 0.
- Click `data-testid='flight-start'`, wait until `data-scene-mode='hover'`, assert model anchor based on exposed debug-only state selector and screenshot.
- Click return, await showroom, compare UI states not brittle exact pixels. For visual screenshots, freeze/seeking time at deterministic `?testTime=...` permitted only in dev/test mode (not production).

## Definition of Done final
ALL critical A01–A05, B01–B06, C01–C09, D01–D06, E01–E03 PASS. E04–E06 documented with evidence; failures triaged with severity P0/P1/P2.
