# 08 — INTERFACE SPEC — TÁCH RIÊNG KHỎI 3D

## Layout desktop 1440×900
- Fullscreen scene `position: fixed; inset: 0` + `Canvas` as background layer (`z-index:0`). Grid composition asymmetric.
- Top left logo `AERIS / SIMULATIONS & DYNAMICS` and compact INDEX 01/03, top right `SOUND`, `QUALITY`, `HELP`.
- Left editorial hero 19–25% width: eyebrow, title **AERIS X—9**, 2-line description, info tags. Keep model clear at center-right.
- Right details panel (300–370px width) slides in only when selecting component or using Parts explorer.
- Bottom transport HUD: segmented mode [SHOWROOM | EXPLORE | FLIGHT], central timeline with play/pause, primary CTA, bottom-right camera reset & quality dropdown.
- Bottom-left scientific-looking live metadata is *visual states only* (`DISPLAY MODE`, `ASSEMBLY`, `VISUAL WIND`); **không hiển thị giả số Mach/thông số hiệu năng thật**.
- Model centroid roughly x=55–60vw, y=48vh. Safe area tránh UI chồng canopy/wings.

## Mobile 390×844
- Header 56 px, title two lines not overlay nose.
- Scene occupies top ~62%; bottom sheet with controls; details drawer bottom sheet, swipe/close, no permanent right panel.
- Primary CTA reachable thumb area, min touch target 44×44 CSS px. Hide nonessential ambient metadata but preserve mode status.
- Camera auto-fit aircraft with 12–16% margins; zero horizontal scrolling; no clipped buttons in landscape or notch safe areas.

## Component inventory
- `GlobalHeader` (brand/section/time quality)
- `HeroCopy` (eyebrow, heading, subline)
- `ModeNavigation` semantic tablist or group of buttons, proper disabled state
- `PrimaryActionButton` (`Mô phỏng bay`, `Trở về bàn xoay`)
- `PartsTree` collapse headings, search and keyboard selection
- `PartInspectorDrawer` heading, description, focus/isolate/close
- `ExplodeSlider` label 0–100%, live value aria-valuetext
- `TransportBar` start/pause/replay/return; elapsed and remaining
- `CameraPresetBar` 3/4, top, side, close-up; reset
- `QualityMenu` Auto/Low/Medium/High; Motion preference
- `FeatureTour` overlay explanation and skip
- `ErrorFallback` WebGL unavailable/asset missing; retry

## Interaction feedback
- Buttons show hover/pressed/keyboard focus, never motion-only affordance.
- Active mode = border+text marker, not just glowing color.
- Selected part = panel name + mesh outline + breadcrumb.
- Busy state: controls disabled with contextual explanation; no swallowing click silently.
- Canvas pointer capture should not intercept overlay buttons; layer pointer-events proper: outer overlay `none`, interactive controls `auto`.

## UI animation principles
Motion (React) transitions 180–500ms; panel entry slide+fade 260ms; global hero reveal 800ms max; no 2s hover animations. UI timeline only *displays* engine progress; it does not independently drive simulation.

## Copy (VN/EN candidates)
- Khám phá cấu trúc / Explore Assembly
- Tháo rời / Explode
- Lắp lại / Reassemble
- Tập trung chi tiết / Focus Detail
- Trình diễn bay / Flight Sequence
- Lơ lửng / Hovering
- Trở về trưng bày / Return to Showroom
- Tạm dừng / Pause

## Acceptance
Desktop 1440, 1920 viewport; mobile 390, 360 widths; keyboard tab order; click all controls; drawer can close with Esc; shell visually deliberate, not dashboard template dump.
