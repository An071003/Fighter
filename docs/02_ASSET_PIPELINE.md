# 02 — ASSET & BLENDER PRODUCTION PIPELINE

## Asset Gate — điều kiện bắt đầu phát triển chất lượng cao
Phải có một `aeris-x9.glb` gồm nhiều Object3D riêng, có pivot và UV/material hợp lệ. **Một GLB có duy nhất mesh nguyên khối sẽ không đáp ứng yêu cầu.** Chỉ có ảnh tham chiếu không thể click tách 3D; phải có dữ liệu mesh và topology.

## Các cách lấy asset hợp lệ (ưu tiên theo thứ tự)
1. Người dùng cung cấp GLB/Blend có license rõ ràng, đủ part; import, chuẩn hóa manifest, kiểm tra.
2. Agent tạo **original fictional design** bằng Blender Python/mesh modeling; sau đó render 4 góc, tinh chỉnh thủ công nếu có Blender GUI; không làm bản sao 1:1 của mẫu máy bay có bản quyền.
3. Nếu chưa thể tạo high fidelity: dựng prototype modular 20–40 part bằng parametric meshes để kiểm tra motion, dán nhãn "PROTOTYPE" và chờ Asset Gate. Không báo production ready.

## Quy ước không gian
- World `+Y = up`, wing span `±X`, aircraft nose `-Z`, center of gravity/origin gần tâm thân.
- Aircraft size normalized: full span ~= 9 scene units, length ~= 11 units (tỷ lệ nghệ thuật, không phải thông số khí động học thực).
- Export glTF units as configured scene scale. Không đổi axes một cách tự phát sau khi tạo manifest.
- Pivots đặt tại bản lề riêng; wheel spin axis rõ; `restLocalPosition/Quaternion` được ghi lại lúc GLB load.
- Group names chuẩn `AX9__<CATEGORY>__<SIDE>__<IDENTIFIER>`; xem manifest.

## Quy trình Blender đề xuất
**Blockout → Silhouette → Panel Lines → High-detail Mesh → UV/PBR → Pivots/Hierarchy → Anim clips tùy chọn → Export GLB → Audit.**
- Blockout: hình nêm phần mũi, canopy kính, thân chính dày vừa phải, wing cánh liền thân, tailplanes, hai cụm cửa hút khí trừu tượng, mép xả hậu cảnh, 3 càng đáp.
- Dùng inset/bevel thật để có highlight cạnh; cạnh kim loại không razor-sharp; nhiều bề mặt cong không bị faceted.
- Panel detail: tấm bảo trì, seam curves, fastener dots, insets, edge trims, heat tint rất nhẹ ở rear. Chỉ thêm chi tiết phục vụ visual; không mô tả cơ cấu kỹ thuật tác chiến.
- Wheels: từng hub + tire + strut, pivot cho strut; door mở riêng, bánh xoay riêng. Mọi pivot đặt tại điểm hợp lý trên mô hình và thử trong Blender.
- Vật liệu: powder coated titanium-like (#AAB9C4), dark ceramic (#18222B), glass/canopy (#0B1A25 transmission vừa phải), amber accent, emission cyan. Metalness/roughness kiểm tra dưới 3 môi trường.
- Reflection: ưu tiên env map có phép sử dụng; no third-party images unlicensed, no hotlink.
- Decals: số hiệu hư cấu `AX-09` và chữ `AERIS`, không logo hãng quân sự thật.

## Geometry hierarchy bắt buộc
Core hull (nose, main fuselage, dorsal, belly); 2 wings; 2 moving control surfaces; 2 fins; 2 engine shrouds + exhaust rings; canopy + frame; 3 wheel modules (wheel/hub/strut); 3 gear doors or covers; inner shell/interior panels; 8+ service plates; fairings; navigation lamps; decorative interfaces. Tổng >=32 mesh/groups ổn định, visible in isolation (tham khảo `examples/part-manifest.json`).

## LOD và ngân sách mục tiêu (khuyến nghị, tùy máy)
Desktop high: 250k–550k triangles cho aircraft; 2K maps chính (không tràn textures), shadow 1k/2k. Medium: 100k–250k tris + 1K maps. Low: 30k–100k tris + shadow mềm/đơn giản. Đây là **budgets khởi điểm**, phải profile máy thật và chỉnh tương ứng.
- Upload/GLB compressed sau optimize ưu tiên 5–20MB (mục tiêu, không bắt buộc); PBR KTX2 khi có pipeline.
- Hạn chế drawcalls và transparent overlap. Không dùng 4K cho mọi part.

## glTF export checklist
1. Apply/freeze transforms theo cách không phá pivot, kiểm tra local origin.
2. No negative scale trên node animated; triangulation consistent; normal smooth/weighted.
3. Validate no unexpected hidden objects / lights / cameras / duplicate meshes.
4. Export GLB: materials, UV, hierarchy, actions; reload trong fresh Blender & Three.js viewer.
5. So sánh local rest transforms với manifest; test scale/rotation/selection; traverse name->mesh.
6. `asset-report.json` ghi source, tác giả, license, triangle count, texture count, named parts, missing groups.

## Chứng nhận Asset Gate
`GET /assets/aircraft/aeris-x9.glb` thành công, >=32 part thực, chọn được 8 vùng tiêu biểu, 3 gear pivots + wheel axes hợp lệ, 360° silhouette không lỗi; 4 ảnh top/front/side/three-quarter; xuất report. Nếu fail, ưu tiên sửa asset trước VFX.
