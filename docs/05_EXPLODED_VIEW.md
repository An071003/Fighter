# 05 — EXPLODED VIEW ENGINE DESIGN

## High-level contract
Inputs: `partsManifest`, `restPoseById`, `explodeProgress[0,1]`, `groupFilter?`, `selectedPart?`.
Outputs: deterministic per-part matrices. All transforms evaluated relative to imported rest pose. **Never integrate offsets cumulatively**.

## Easing
Let `s(t) = t*t*(3-2*t)` clamped to 0..1. Group staged rollout:
- exterior service panels: normalized t=(p-0.0)/0.55
- wings/fairings/canopy: t=(p-0.10)/0.65
- tail/ducts: t=(p-0.18)/0.70
- gear/front: t=(p-0.25)/0.75
Use `s(clamp(t))`. When `p=1` offsets equal authored vectors precisely; at `p=0` exactly rest.

## Transform rule
`position_i(p) = restPosition_i + authoredOffset_i * easedP_i`. Với nested child cần tính parent/world offset cẩn thận: hoặc transforms đặt tại root `PartPivot` siblings, hoặc `convertWorldOffsetToParentLocal` mỗi frame cho world offsets. Đề xuất đầu tiên vì kiểm soát dễ.
`rotation_i(p) = restQuaternion_i * quatFromEuler(authoredRotation_i * easedP_i)`. Quaternions avoids gimbal drift; no accumulation.

## Ảnh cảm giác máy móc
- 0–20% mở khe (seam); 20–60% parts nhấc/horizontal translation theo đường đi; 60–100% xoay nghiêng 3–12° để thấy bề mặt.
- Dùng overshoot **rất nhẹ** (max 2–3% distance) hoặc không có cho parts sát nhau. Easing spring chỉ thêm camera, không phải part positions nếu cần seek deterministic.
- Lighting tăng rim intensity 10–15% lúc explode; shadow softness thay đổi nhẹ, nhưng không làm toàn bộ chrome cháy trắng.
- Connector/leader lines theo world endpoints optional, 0.4 opacity.

## Manual inspect / click-to-lift
- click left wing → stop group spin, focus left wing, lift along vector authored ~0.4–0.9 units and rotate ~6° around safe pivot.
- click canopy → lift ~0.35–0.6 units upward, show interior artistic; no clipping.
- click tire → zoom wheel + highlight hub; do not retract simultaneously.
- close panel → restore camera saved snapshot and part explode pose.

## Collision & readability
- For each p ∈ [0, .25, .5, .75, 1], capture top/front/side frame. No overlap of large parts labels or intersecting chunks. Intersections at p=0 are intentional physical assembly; at p>0 avoid visible tearing.
- Author offsets *per named group*, không tính offset là radial from model center cho tất cả vì sẽ lệch visual/tách wing sai hướng.
- Exploded formation overall max 2.5× aircraft width, auto camera fit with margin 12%.

## Interaction conflicts
- `explodeProgress>0` means `mode=EXPLODED`, all flight events blocked; no gear tracks.
- Chọn part khi explode: override per part inspect offset and restore on close.
- UI slider drag and animation auto transition must not own progress together; if slider drag begins cancel auto tween, persist manual value.

## Recovery
On any error, restoring `progress=0` recalculates entire scene from immutable rest; no manually subtract previous offsets; test 20× open/close per part and assert world matrix within tolerance 1e-5 of initial.
