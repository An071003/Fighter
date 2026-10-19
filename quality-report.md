# Báo Cáo Chất Lượng Đồ Họa, Hiệu Năng & Thẩm Mỹ (Quality Report) — AERIS X-9

**Dự án:** AERIS X-9 — Simulations & Dynamics  
**Phong cách nghệ thuật:** Awwwards × Cinematic Product Showcase × Aerospace Engineering  
**Tổng điểm đánh giá Rubric (`prompts/06_REVIEW_AND_UPGRADE.md`):** **97 / 100**

---

## 1. Nguồn Gốc & Hồ Sơ Kỹ Thuật Tài Nguyên 3D (Asset Provenance)

- **Đường dẫn tệp GLB:** [`public/assets/aircraft/aeris-x9.glb`](file:///c:/Users/ADMIN/Downloads/TEST_WEB/public/assets/aircraft/aeris-x9.glb)
- **Kịch bản sinh mô hình gốc:** [`scripts/generate_aeris_x9.py`](file:///c:/Users/ADMIN/Downloads/TEST_WEB/scripts/generate_aeris_x9.py) (chạy qua Blender `4.5.10 LTS` ở chế độ headless `--background --factory-startup`)
- **Báo cáo kiểm định tự động:** [`asset-report.json`](file:///c:/Users/ADMIN/Downloads/TEST_WEB/asset-report.json)
- **Bản quyền & An toàn nội dung:** 100% hình học nguyên bản được thiết kế riêng cho dự án; **hoàn toàn phi vũ trang** (không tên lửa, không bom, không giá treo vũ khí hay HUD khóa mục tiêu), tập trung thuần túy vào hình thái khí động học, cơ khí chính xác và trình diễn công nghiệp.
- **Thông số kỹ thuật mô hình:**
  - **Dung lượng tệp:** `4,700,620 bytes` (~4.48 MB, dưới ngưỡng trần 20 MB của `docs/03_MODEL_SPEC.md`)
  - **Số lượng đối tượng định danh (`AX9__*`):** **46 / 46** khớp tuyệt đối với `examples/part-manifest.json` (`missingFromManifest: []`, `extraUnmapped: []`)
  - **Tổng số đa giác:** `183,584 triangles` / `91,878 vertices`
  - **Số lượng vật liệu PBR:** `8` vật liệu chuyên biệt:
    1. `AX9_Mat_TitaniumPrimary` (Hợp kim Titan xám bạc phản xạ anisotropic)
    2. `AX9_Mat_CarbonStealth` (Composite Carbon nhám tối cho mép cánh và cửa khoang)
    3. `AX9_Mat_CanopyGlass` (Kính vòm buồng lái phủ sapphire xanh lục bảo, `transmission` + `ior: 1.52`)
    4. `AX9_Mat_AlloyFrame` (Khung sườn cơ khí, ty thủy lực và mâm bánh xe)
    5. `AX9_Mat_CeramicNozzle` (Vật liệu gốm chịu nhiệt họng xả vector)
    6. `AX9_Mat_RubberTire` (Cao su lốp hàng không rãnh ma sát cao)
    7. `AX9_Mat_CyanEmitter` (Đèn định vị biên dạng khí động học `#67E5DF`)
    8. `AX9_Mat_AmberCore` (Lõi năng lượng & cảm biến quang học `#FFBF81`)

---

## 2. Chấm Điểm Theo Rubric Nghệ Thuật & Kỹ Thuật (`prompts/06_REVIEW_AND_UPGRADE.md`)

| Hạng mục đánh giá | Trọng số | Điểm đạt | Nhận xét chuyên môn |
| :--- | :---: | :---: | :--- |
| **1. Bố cục & Dáng hình mô hình (Composition & Silhouette)** | 25 | **24 / 25** | Dáng tiêm kích cánh tam giác liền thân (Blended Wing-Body), mũi khí động học sắc gọn, 2 cánh đứng nghiêng chữ V, đặt tại vùng trung tâm-phải (65% khung hình) hoàn toàn thoáng đãng. |
| **2. Vật liệu & Ánh sáng Studio (Materials & Lighting)** | 25 | **24 / 25** | Hệ thống chiếu sáng 3 điểm (Key ấm `#F8FBFF`, Rim lạnh `#67E5DF`, Under-fill hắt từ bàn xoay `#FFBF81`) kết hợp phản xạ môi trường studio giúp tôn rõ các đường gân vát và chất liệu kim loại. |
| **3. Biên đạo chuyển động (Motion Choreography)** | 20 | **20 / 20** | Chuyển động bóc tách 4 tầng có độ trễ tự nhiên; chu trình cất cánh 7.0 giây tuần tự (quay bánh → hạ bàn xoay → mở cửa hầm → gập 3 càng đáp → đóng cửa hầm → bay lơ lửng); tâm XZ cố định tuyệt đối tại `[0.00, 0.00]`. |
| **4. Typography & Giao diện Editorial (Typography & UI)** | 15 | **14 / 15** | Phân cấp rõ giữa tiêu đề lớn `AERIS X-9`, nhãn thông số monospace và nội dung tiếng Việt chuẩn xác; bề mặt kính mờ `#0E141D` tương phản cao. |
| **5. Trải nghiệm Di động (Mobile Responsiveness)** | 10 | **10 / 10** | Bố cục tự động thu gọn thông minh ở `390×844` và `360×740`; không tràn ngang; toàn bộ nút bấm đạt chuẩn vùng chạm `>= 44px`. |
| **6. Vi tương tác & Tiếp cận (Microinteraction & A11y)** | 5 | **5 / 5** | Đầy đủ phím tắt (`E`, `F`, `R`, `Esc`, `?`), hỗ trợ `prefers-reduced-motion`, ARIA đầy đủ cho thanh trượt và các hộp thoại. |
| **TỔNG CỘNG** | **100** | **97 / 100** | **Đạt chuẩn phát hành Production (Gate G8)** |

---

## 3. Năm Vấn Đề Thực Tế Đã Phát Hiện & Khắc Phục Trong Vòng Duyệt Ảnh (Iterative Upgrade Log)

Trong quá trình kiểm tra ảnh chụp trình duyệt thực tế ở Gate G7, chúng tôi đã phát hiện và xử lý triệt để 5 vấn đề sau:

1. **Ngắt dòng tiêu đề Hero `AERIS X-9` và tràn thanh trạng thái trên màn hình nhỏ (`TopBar.tsx`):**
   - *Hiện tượng ban đầu:* Dấu gạch ngang dài khiến chữ `9` bị rớt xuống dòng thứ hai trên màn hình desktop và nhãn trạng thái trên mobile `390px` đẩy các nút công cụ sát mép phải.
   - *Khắc phục:* Chuẩn hóa tiêu đề `AERIS X-9` với `whitespace-nowrap`, đồng thời ẩn nhãn phụ trên viewport `< 640px` và thu gọn khoảng cách nút trên mobile.
2. **Nhãn thanh trượt `ĐỘ TÁCH CẤU TRÚC` bị bó hẹp khi đặt chung hàng với 6 nút góc máy (`BottomTransport.tsx`):**
   - *Hiện tượng ban đầu:* Khi đặt cả 6 nút `CameraPresets` cùng hàng ngang với thanh trượt bóc tách, nhãn `ĐỘ TÁCH CẤU TRÚC` bị ép xuống 4 dòng ngắn.
   - *Khắc phục:* Tách cụm `CameraPresets` thành thanh nổi độc lập phía trên bảng điều khiển chính và cấp `min-w-[160px] max-w-xl whitespace-nowrap` cho thanh trượt.
3. **Ngăn thông tin bộ phận bên phải (`PartDetails.tsx`) chạm vào mép trên của thanh điều khiển đáy:**
   - *Hiện tượng ban đầu:* Ở ảnh chụp `inspect-part.png` đầu tiên, ngăn kéo bên phải (`bottom-20`) chạm nhẹ vào thanh transport.
   - *Khắc phục:* Nâng khoảng cách đáy của ngăn kéo lên `bottom-44 md:bottom-36`, tạo khoảng thở rõ ràng với thanh điều khiển bên dưới.
4. **Góc máy ở chế độ Exploded View 100% và Inspect Part (`CameraRig.tsx`):**
   - *Hiện tượng ban đầu:* Khi tách 100% cả 46 bộ phận, chóp mũi và đầu mút cánh tiến sát rìa khung hình ở hệ số lùi `1.25x`.
   - *Khắc phục:* Tăng hệ số lùi camera theo độ tách lên `1.42x` (`1.0 + explodeProgress * 0.42`) và tinh chỉnh góc nhìn cận cảnh 3/4 phía trước khi chọn bộ phận để toàn bộ chi tiết nằm gọn trong vùng trống trung tâm.
5. **Độ thu gọn của bánh xe mũi trong khoang thân mỏng khi đóng cửa hầm ở trạng thái Hover (`GearRig.tsx` & `FlightDirector.tsx`):**
   - *Hiện tượng ban đầu:* Khi nâng thẳng trục càng mũi lên cao (`retractLiftY = 0.38`), đỉnh bánh xe hơi nhô lên mặt lưng mũi thôn gọn và nhãn pha động học chưa cập nhật khi nhảy trực tiếp tới `t = 7.0s`.
   - *Khắc phục:* Áp dụng tỷ lệ thu gọn nội khoang `bayTuckScale` khi `gearRetracted > 0.72` kết hợp `retractLiftY = 0.22` và đồng bộ `syncTimelineUi` ở trạng thái `hover`, giúp thân mũi kín khít tuyệt đối trong `proof/hover.png`.

---

## 4. Kiến Trúc Hiệu Năng WebGL & Quản Lý Bộ Nhớ

- **Không cập nhật React state ở 60fps:** Toàn bộ chuyển động xoay bàn, tách lớp 46 bộ phận, gập càng đáp, vệt gió và môi trường parallax đều cập nhật trực tiếp lên `THREE.Object3D` và `THREE.InstancedMesh` bên trong `useFrame`. Đồng bộ UI chỉ diễn ra tối đa mỗi `90ms` (~11Hz) khi đang chuyển pha.
- **Tái sử dụng đối tượng toán học (Zero-GC Allocation):** Các vector/quaternion/matrix tạm (`scratch` / `dummy`) được cấp phát một lần qua `useMemo` trong `GearRig`, `ExplodeController`, `WindTrails` và `ParallaxEnvironment`.
- **Tự động điều chỉnh chất lượng (`QualityManager.tsx`):** Giám sát thời gian khung hình trung bình trong cửa sổ 2.2 giây và tự động chuyển đổi mượt mà giữa 3 mức `high` / `medium` / `low` (điều chỉnh DPR, mật độ tia gió và bóng đổ) mà không làm gián đoạn trạng thái cảnh.
