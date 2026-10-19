# 06 — CINEMATIC FLIGHT: TIME-BASED VISUAL DYNAMICS

> Đây là trình diễn mỹ thuật. Không mô phỏng thực tế điều khiển, vận hành hoặc khí động học của phương tiện thật.

## Trọng tâm: cố định máy bay nhưng tạo ảo giác chuyển động
**World XZ position jet = [0,0]** xuyên suốt. Đổi **Y** tối đa khoảng 1.4 unit để cảm nhận nhấc khỏi bàn xoay. Layer môi trường giả chuyển động mạnh theo +Z (bởi nose hướng -Z), wind trails được phát ra và trôi phía sau theo +Z; scroll noise UV cloud cùng chiều. Camera dolly/FOV (không dịch model xa), shading thay đổi theo phase. Những chuyển động này đánh lừa hệ thị giác tạo cảm giác "bay" trong viewport nhưng model không chạy ra khỏi khung.

## Timeline 0–7.0 giây: một authoritative clock
| t (s) | Phân đoạn | Turntable | Jet/gear | Camera/VFX |
|---|---|---|---|---|
| 0.0–0.7 | LOCK-IN | Spin decel → 0; accent ring sáng dần | Body ở rest, gear extended | Camera center to front 3/4 |
| 0.7–1.8 | POWER-UP | Halo pulse; base bắt đầu lower | Wheel speed 0 → peak; slight craft vibration | Thin trails; floor parallax bắt đầu |
| 1.8–3.0 | LIFTOFF | Base move y=0→-1.5; fade 1→0 | Jet rise y=0→0.65; wheel spin peak then slow | Backdrop parallax + streaks tăng |
| 3.0–3.6 | GEAR DOOR OPEN | Below floor; hidden | Main doors open 0→1 | Close-up cut nhẹ hoặc side-angle shift |
| 3.6–4.7 | GEAR RETRACT | Hidden | 3 gear struts rotate into bay; wheels retract; speed→0 | Wind density tăng, glow nhẹ |
| 4.7–5.4 | GEAR DOOR CLOSE | Hidden | Doors 1→0; body rise to y≈1.3 | Camera dollies ~0.7 scene unit |
| 5.4–7.0 | HOVER HANDOFF | Hidden | Enter hover sine bob; bank max 1.5° | Atmosphere scroll settles; dim runway |

## Quantitative visual parameters (art-direction defaults, NOT real aircraft data)
- `jetX = 0`, `jetZ = 0` exactly; `jetY = riseCurve(t) * 1.3` then `+ 0.035*sin(2π*0.7*(t-7))` at HOVER.
- Visual yaw toward front maintained; `pitch ≈ ±0.5°`, `bank ≈ ±1.2°`, finite, not free-flight motion.
- Platform `y`: 0→-1.7 and opacity 1→0; `visible=false` only **after** opacity near zero.
- Wind: 0→0.8 intensity and flows to rear; lines alpha up to 0.25; no harsh full-screen flashing.
- Wheel visual spin speed 0→ (e.g. 6rad/s artistic) then 0; **không phải vận tốc thật**. Rotation integrates using dt and uses timeline derivative if seeking from t0; see below.
- Gear progress open/closed separately; 3 groups must coordinate, not all pop instantly.

## Deterministic wheel spin while scrubbing/replay
If using wheel angle with `angle += speed*dt`, resuming/scrubbing causes mismatch. Instead integrate a prescribed smooth speed profile analytically or precompute a wheel angular position lookup table by sampling fixed timesteps with interpolation. Use pure `wheelAngleAt(t)` mapping t to angle; ensure `wheelAngleAt(0) = 0` and continuity 0–7s. 3 independent wheels if visually needed.

## Interpolation contract
`phaseProgress(t, start,end) = smoothstep(clamp((t-start)/(end-start)))`.
- Door open `P(3.0,3.6)`; gear retract `P(3.6,4.7)`; door close `1-P(4.7,5.4)`.
- Gear strut rotation = rest local quaternion slerped to **artist-authored** retracted quaternion (not generic X-rotation for all 3).
- Wheels remain child of gear pivot; door rotates about authored hinges; test clipping at 10 evenly spaced timestamps.
- Jet rise `0.65*P(1.8,3.0)+0.65*P(4.7,5.4)`, interpolation bounded.

## Return to showroom
Return state runs **separate reverse-cinematic choreography**, not reverse(t) blindly if it produces gear doors moving into strut:
1. reduce wind/background speed; stabilize craft.
2. gear doors open; gear pivots extend; doors close.
3. jet gently lowers to rest; platform rises and fades 0→1.
4. camera returns to showroom saved pose, resume base/model yaw spin.
Return from mid-transition should use current evaluated pose as transition starting values and blend towards a legal checkpoint; do not abruptly jump to t=7 or t=0. MVP may **disable Return until handoff at 7s** and expose Pause + Replay; if so UI must clearly show when action becomes available.

## Camera rig
`cameraMode`: hero, focusPart, flight, returning. Camera fits model in view throughout; set DPR/responsive target. Flight camera motion: tiny lateral sway and dolly; no FOV jerk. Prevent OrbitControls from writing when director controls camera, re-enable at HOVER.

## Audio optional
Ambient synth + wind whoosh only with user-enabled sound and CC0/original assets; `AudioContext` starts after gesture; disable automatically for reduced-motion if requested. Never block visual feature on audio.

## Tests
- Snapshot evaluate at t=0/.7/1.8/3/3.6/4.7/5.4/7; assert continuous boundary values (epsilon < 1e-3).
- Each key phase visibly demonstrable via browser screenshots; no gear interpenetration, no base pop.
- `x,z` stays identical for aircraft anchor at all sampled times; bounding box stays in 90% safe screen area.
- Replay 10 times stable; return completes in assembled/gear extended/platform visible state.
