# 04 — FUNCTIONAL FEATURES / USE CASES

## F01 — Landing + Intro Reveal
- Preload essential GLB + envmap; loading stage hiển thị silhouette SVG abstract + % tải thật (không fake progress).
- Fade scene opacity via exposure/camera reveal 1.0–1.8s; không che CTA quá 3s.
- Auto turntable angle ~8–12°/sec. User orbit/focus tạm ngưng chuyển động.
- Callout hiển thị: `AERIS X-9`, `SIMULATIONS / DYNAMICS`, subcopy mô hình concept.

## F02 — Orbit / Zoom / Camera Presets
- Mouse drag xoay camera quanh jet, wheel/pinch zoom, click model để focus; touch 1 finger orbit, 2 fingers pan/zoom (pan giới hạn).
- Presets: `3/4 HERO`, `TOP`, `FRONT`, `SIDE`, `DETAIL`; tween camera khi preset đổi; reset.
- Bounds tránh nhìn xuyên canopy/underfloor bất thường; choose lower polar bound hợp lệ; camera fit nếu mobile.
- Keybinds: `R` reset, `E` explode (showroom), `F` flight (showroom only), `Esc` back/close, arrows rotate if focused.

## F03 — Part Explorer
- Sidebar list grouped + search; click row chọn cùng hành động raycast.
- Details panel (id, display name, short artistic description, group, actions Focus/Isolate/Reveal).
- Model pick ưu tiên highest eligible selectable ancestor; hitboxes đủ lớn; hover mode không bị panel overlay chặn canvas ngoài panel.
- Clicking empty deselect; keyboard list arrow navigation.

## F04 — Explosion & Reassembly
- Slider 0–100% cập nhật pose đồng bộ; click exploded toggle anim 1.8–2.4s; 0–20 ease before, 20–80 systematic separation, 80–100 final.
- Explode toàn bộ hoặc nhóm; selected part zoom có priority; reset returns original position/rotation exactly.
- Không cho chạy flight khi exploded>epsilon; nút CTA có tooltip "Lắp lại trước khi mô phỏng bay".
- Có guided tour theo thứ tự parts, từng bước user skip/pause.

## F05 — Cinematic Flight
- CTA ở footer. Start khi showroom/assembled.
- Timeline 0–7s và state `HOVER`; platform retracts/fades; wheel spin; jet vertical rise; doors open, gear retract, doors close; wind/backdrop parallax; hover loop subtle.
- `Pause`, `Resume`, `Replay`, `Return to Showroom`; UI spinner hiện trên timeline nếu đang asset streaming.
- Hover continues small bob no horizontal drift; user orbit allowed limited. Gear assembly không thể select khi animation đang chạy.

## F06 — Quality / Accessibility
- Low, Medium, High, Auto, optional sound toggle (default off, original/CC0 sounds only).
- prefers-reduced-motion disables auto spin, replaces 7s playback by step-based static states + accessible captions; functions vẫn hoạt động.
- Error UI khi WebGL unsupported: static poster do team render có license + feature explanation; không fake rằng 3D hoạt động.

## F07 — Shareable progress (P2)
- Query `?mode=inspect&part=wing-l` only for safe stable states; decode validation. Never allow URL force unstable mid-animation.

## Non-functional
No user account; no telemetry by default; no third-party tracking; no external model hotlinks; no unnecessary persistent storage. Respect DPR/device pixel ratio and return quality downgrade when frame drops.
