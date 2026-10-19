# 03 — PARTS MANIFEST / NAMING / PIVOTS

## Định nghĩa part
`PartDefinition { id, nodeName, label.vi, label.en, category, side?, parentId?, inspectOrder, selectable, explode: { offset: [x,y,z], rotationDeg? }, focus: { preferredAzimuthDeg, distanceMultiplier }, interaction: {canOpen,canSpin,canHide} }`.
- `nodeName` phải đúng 100% trong GLB; `id` không đổi sau khi đã dùng trong URL/state.
- `restLocal` lấy từ mesh lúc tải GLB và lưu trong immutable `PartRegistry`. Không assume origin zero cho mọi part.
- `explode.offset` là **local offset tương đối với reference pose**, không cộng dồn mỗi click. End transform = `rest + offset * e(progress)`; quaternion = `restQ * quatFromAxisAngle(...)`, lưu reference.
- Khi tách toàn bộ phải chia tầng: layer1 skin/service doors, layer2 wings/tail/fairing, layer3 landing gear, layer4 core. Pair symmetrical part tách đối xứng (đừng cho hai cánh chồng nhau).

## Nhóm logic / visual
- `CORE`: nose + fuselage + belly + rear shell — không được ẩn hết làm mất reference.
- `SURFACE`: left/right wings, elevons, fins, edge fairings.
- `CANOPY`: canopy, frame, dashboard artistic abstraction.
- `DUCT`: air-intake shells, aft duct/exhaust ring (decorative appearance only).
- `GEAR`: front, left, right gear struts; each wheel can rotate; doors move.
- `PANEL`: >=8 maintenance panels; detail cues, not engineering schematics.
- `LIGHT`: beacons/strip accents.

## Kỹ thuật chọn part
Raycast `event.object` (node mesh) → đi ngược ancestor tìm `userData.partId` → `selectPart(partId)`. Dùng raycaster built-in R3F, không tạo raycaster mới mỗi frame. Hover highlight chỉ material clone của selected mesh hoặc outline selective; không đổi material global.

## Visual khi chọn
- Pause platform rotation, camera orbit không fight animation.
- Viền cyan mỏng 1–2 px / rim-light shader giới hạn, không glow toàn vật thể.
- Kẻ leader-line sang panel DOM anchored world point, tránh che những nhãn khác.
- `Focus`: camera move 0.8–1.3s với bounded distance; selected group giữ rest transform hoặc local `partInspectOffset`.
- `Isolate`: dim phần còn lại opacity 0.2–0.35 hoặc wireframe overlay; không xuyên sáng vô lý.

## Độ bền của registry
Nếu thiếu part bắt buộc, hiển thị lỗi Asset Contract thay vì silently pretend. Missing optional panel có thể bỏ kèm warning; mỗi asset upgrade phải chạy test snapshot manifest.

## Hai cấp bóc tách
1. **Group exploded:** ấn "Tách cấu trúc", hệ thống kéo các cụm chính 20–100%.
2. **Individual inspect:** click một part cụ thể, nhấc 0.2–0.9 units hoặc kéo ra theo axis đã định, camera zoom; nút `Lắp lại` đưa về rest.
Mọi trạng thái có `progress` duy nhất, chống drift lặp lại.

## Chọn camera theo part
`preferredView` authored per part (nose ~ front-3/4, left wing ~ left-high, wheel ~ below-side); hạn chế camera clipping; use frustum fit bounding sphere part + margin. `cameraTarget` damp in/out; restore exactly previous camera pose on close.

## Quan hệ gear
Gear group luôn là parent của tire/hub; bánh chỉ spin quanh axle local. Nếu gear angle bị chuyển, chuyển động bánh vẫn local child. Gear doors là siblings với pivot riêng, transition không va vào fuselage ở keyframes đã kiểm tra.

## Tránh lỗi phổ biến
Không dùng `scale=0` để giấu vật; đừng detach Object3D rồi mất worldTransform; tránh double parent rotation; nếu clip Blender được dùng thì engine phải xác định **một chủ thể sở hữu** track gear, không vừa CSS vừa mixer vừa useFrame sửa rotation.
