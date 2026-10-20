# UPGRADE_AUDIT.md — Báo Cáo Kiểm Toán Kỹ Thuật & Kế Hoạch Nâng Cấp AERIS X-9 Cinematic v2 (Gate U0)

**Thời điểm kiểm toán:** 2026-10-19  
**Git Baseline (Đã sao lưu):** Tag `v1-baseline` (commit `b9c875d`)  
**Ảnh chụp trạng thái trước nâng cấp (Before):**
- [`proof/u0-before-showroom.png`](file:///c:/Users/ADMIN/Downloads/TEST_WEB/proof/u0-before-showroom.png)
- [`proof/u0-before-exploded.png`](file:///c:/Users/ADMIN/Downloads/TEST_WEB/proof/u0-before-exploded.png)

---

## 1. Kiểm Tra Cây Thư Mục, Tài Liệu & Ràng Buộc Phiên Bản (Workspace & File Inventory)

### 1.1. Tệp tài liệu hiện có trong Workspace
- `GEMINI.md`, `AGENTS.md`, `README.md`
- `docs/00_GOAL.md` → `docs/17_FAILURE_MODES.md` (bao gồm `docs/01_ARCHITECTURE.md`, `docs/03_PARTS_CONTRACT.md`, `docs/10_INTERACTION_STATE.md`)
- `docs/skill-registry.json`
- `examples/part-manifest.json` (Hợp đồng 46 bộ phận định danh `AX9__*`)
- `prompts/00_MASTER_ORCHESTRATOR.md` → `prompts/06_REVIEW_AND_UPGRADE.md`
- `.agents/skills/`: Đã cài đặt 27 skills (`r3f-*` từ `EnzeD/r3f-skills`, `gsap-*` từ `greensock/gsap-skills`, `blender-skill` từ `kajisho5/blender-skill`, `motion-design` từ `LottieFiles/motion-design-skill`, `awwwards-motion` từ `adamperlis/awwwards-motion`, cùng 5 skill nội bộ `aircraft-3d-architecture`, `cinematic-vfx`, `kinematic-visual-motion`, `qa-webgl`, `ui-art-direction`).

### 1.2. Tệp tài liệu mở rộng v2 chưa được giải nén vào thư mục gốc (Báo cáo trung thực — Không suy diễn)
Các tệp mở rộng thuộc gói ZIP v2 bên ngoài chưa có mặt trên ổ đĩa tại `c:\Users\ADMIN\Downloads\TEST_WEB`:
- `GEMINI_UPGRADE.md`
- `docs/18_REFERENCE_EXTRACTION.md` → `docs/30_UPGRADE_ARCHITECTURE_AND_STATE.md`
- `prompts/07_UPGRADE_MASTER.md`
- `.agents/skills/{asset-fidelity-director,part-hierarchy-choreographer,airflow-vfx-director,cinematic-flight-director,aeris-visual-qa}/SKILL.md`

> **Hướng thích ứng (Adaptation):** Toàn bộ yêu cầu kỹ thuật của U0 → U7 đã được đặc tả trực tiếp trong Master Prompt của người dùng và hình ảnh tham chiếu đính kèm. Chúng tôi kế thừa nghiêm ngặt kiến trúc 3 tầng hiện tại (`src/domain/`, `src/experience3d/`, `src/interface/`) và hợp đồng 46 bộ phận trong `examples/part-manifest.json`.

### 1.3. Ràng buộc Runtime & Công cụ hiện có
- **Framework & 3D Engine:** `react@19.0.0`, `react-dom@19.0.0`, `three@0.175.0` / `@react-three/fiber@9.1.2`, `@react-three/drei@10.0.6`, `zustand@5.0.3`, `motion@12.6.3`, `tailwindcss@4.1.3`.
- **Công cụ 3D cục bộ:** Blender `4.5.10 LTS` (`C:\Program Files\Blender Foundation\Blender 4.5\blender.exe`) hoạt động hoàn chỉnh ở chế độ headless.
- **Trạng thái kiểm thử v1 trước nâng cấp:**
  - `npm run typecheck`: PASS (0 lỗi)
  - `npm run lint`: PASS (0 cảnh báo)
  - `npm run test`: PASS (13/13 unit tests)
  - `npm run build`: PASS
  - `npm run test:e2e`: PASS (2/2 kịch bản Playwright)

---

## 2. Chẩn Đoán Hình Ảnh Hiện Tại (v1) & Đối Chiếu Tham Chiếu (Visual Diagnosis)

### 2.1. Trạng thái xác minh tài liệu tham chiếu (Reference Verification)
- **Video TikTok (`https://vt.tiktok.com/ZSgk2jsTC/` → [`reference/reference.mp4`](file:///c:/Users/ADMIN/Downloads/TEST_WEB/reference/reference.mp4)):** Đã tải và phân tích trực tiếp toàn bộ 37 giây (`00:00 – 00:36`) cùng ảnh chụp màn hình tham chiếu (`media_1792421735084_ac484741.png`):
  1. **Thẩm mỹ CAD Kỹ thuật Tối (Dark Technical Blueprint / Obsidian Monolith — `Fig 1`):** Thân vỏ mang sắc đen-graphite mờ (`#0B0F17` – `#141C27`) kết hợp **đường viền cạnh kỹ thuật sắc nét (`#DCEAF8`)** chạy dọc mép cánh, thân, cửa khoang, động cơ và cánh đứng; góc máy 3/4 tiêu cự dài (`FOV 28°`) giúp toàn bộ sải cánh và mũi-đuôi nằm gọn trong vòng tròn bàn xoay mà không bị biến dạng phối cảnh góc rộng.
  2. **Chế độ X-Ray Cutaway (`Fig 1 — cutaway` tại `00:26 – 00:28`):** Khi kiểm tra hệ thống cơ khí bên trong hoặc trong pha thu càng đáp (`GEAR RETRACT`), lớp vỏ ngoài chuyển sang **bóng ma xuyên thấu (X-Ray Ghost Shell `opacity: 0.15`)**, làm nổi bật toàn bộ cụm cơ khí, càng đáp 3 điểm, cánh tà và buồng lái bằng **sắc vàng hổ phách kỹ thuật (`#F5A623`)**.
  3. **Hệ thống Động cơ, Đèn Hàng không & Telemetry Sống (`00:06 – 00:35`):**
     - **01–03 (`00:08 – 00:11`):** Cánh quạt tuabin nén quay tăng tốc (`N1 %`) với đồng hồ số lớn góc trên bên trái (`N1 %`, `kt`, `ft`).
     - **02 & 06 (`00:06`, `00:13`, `00:19`):** Đèn chống va chạm nháy đỏ `1 Hz` (`Beacon`) trên sống lưng/bụng, đèn Strobe chớp kép trắng đầu mút cánh, và **chùm đèn pha càng mũi (`Nose Taxi / Landing Light`)** chiếu vệt sáng hình nón xuống đường tâm màu hổ phách trên mặt bàn xoay.
     - **Thanh trạng thái & Bảng điều khiển kỹ thuật (`SYSTEMS / LIGHTS`):** Bật/tắt nhanh `Cutaway`, `Beacon`, `Strobe`, `Nose Taxi` cùng dòng trạng thái kỹ thuật thời gian thực (`N1 % · kt · gear down/moving/up`).

### 2.2. Năm hạn chế thực tế của phiên bản v1 (`proof/u0-before-showroom.png` & `proof/u0-before-exploded.png`)
1. **Hình học bị bo tròn kiểu viên nang ("Capsule / Pill Look"):**
   - Trong `scripts/generate_aeris_x9.py` (v1), các hàm `create_rounded_box` và `create_tapered_hull` áp dụng bộ biến đổi `SUBSURF` (Catmull-Clark Subdivision) trực tiếp lên các khối hộp ít lưới. Khi tách rời ở `proof/u0-before-exploded.png`, các cụm như `cockpit-shell`, `intake-duct-*`, `engine-core-*`, `rear-shroud-*`, `avionics-bay-*` bị biến thành các khối bầu dục trơn nhẵn giống viên thuốc thay vì chi tiết cơ khí hàng không sắc cạnh.
2. **Thiếu hốc lõm cơ khí và khung sườn nội thất (Missing Recessed Cavities & Inner Frames):**
   - Thân giữa (`fuselage-core`) và bụng (`belly-lower`) trong v1 là khối đặc lồi; khi nắp khoang điện tử, nắp lưng, vòm kính hoặc cửa càng đáp tách ra, người xem không thấy hốc khoang lõm, vách ngăn chịu lực (structural bulkheads) hay tầng cánh tuabin bên trong.
3. **Vật liệu quá sáng và thiếu đường nét kỹ thuật (Lack of Edge Definition & Material Contrast):**
   - Vỏ máy bay v1 dùng màu bạc sáng đồng nhất (`#B8C7D4`), thiếu độ tương phản giữa vỏ ngoài (Satin Graphite/Titanium), khung sườn bên trong (Dark Anodized Alloy), và không có lớp viền cạnh kỹ thuật (CAD Contour Edges) như ảnh tham chiếu.
4. **Hiệu ứng gió và chuyển động tách lớp còn đơn giản:**
   - Hiệu ứng gió v1 mới chỉ có 1 lớp tia thẳng (`WindTrails.tsx`), chưa có đủ 5 lớp (F1 đường dòng bám biên dạng thân/cánh, F2 hạt tốc độ cao, F3 xoáy đầu mút cánh, F4 nhiễu nhiệt họng xả, F5 mây/lưới khí quyển).
5. **HUD ở chế độ Inspect/Explode còn chiếm diện tích bên trái:**
   - Tiêu đề lớn `AERIS X-9` bên trái giữ nguyên kích thước khi đang soi chi tiết bộ phận hoặc bóc tách 100%, làm giảm không gian trình diễn mô hình.

---

## 3. Kế Hoạch Tệp Thực Thi Chi Tiết Theo Từng Gate (U0 → U7)

| Gate | Mục tiêu trọng tâm | Tệp mã nguồn tạo mới / cập nhật |
| :---: | :--- | :--- |
| **U0** | Kiểm toán, sao lưu tag `v1-baseline`, lưu ảnh `before`, lập kế hoạch kỹ thuật | `UPGRADE_AUDIT.md`, `proof/u0-before-showroom.png`, `proof/u0-before-exploded.png` |
| **U1** | **Tái thiết mô hình 3D Hard-Surface & Thẩm mỹ CAD Kỹ thuật:** Loại bỏ hoàn toàn `SUBSURF` viên nang; dựng mặt cắt đa trạm sắc cạnh (`BEVEL` góc giới hạn), khoang buồng lái/điện tử/hầm càng lõm có khung sườn chịu lực (`bulkhead ribs`), tuabin nhiều tầng cánh, họng xả 12 lá răng cưa, càng đáp có thanh giằng chữ V (`torque links`); bổ sung viền cạnh kỹ thuật `Edges` và đường tâm chuẩn hổ phách + đèn định vị trên bàn xoay | `scripts/generate_aeris_x9.py`, `public/assets/aircraft/aeris-x9.glb`, `asset-report.json`, `src/experience3d/aircraft/JetModel.tsx`, `src/experience3d/scene/Turntable.tsx`, `src/experience3d/scene/StudioLighting.tsx` |
| **U2** | **Động học bóc tách v2:** Tách theo nhóm phân cấp có nhịp trễ, vector tách chuẩn hóa theo trục cấu kiện, chụp bằng chứng 5 mức `0% / 25% / 50% / 75% / 100%` và kiểm tra sai số khôi phục = 0 | `src/domain/partRegistry.ts`, `src/experience3d/aircraft/ExplodeController.tsx`, `src/experience3d/scene/CameraRig.tsx` |
| **U3** | **Hệ thống 5 lớp hiệu ứng gió (Five-Layer Airflow VFX):** F1 3D Ribbons/Streamlines uốn quanh mũi-buồng lái-cánh, F2 Fast Streak Particles, F3 Wingtip Vortex Trails, F4 Aft Nozzle Shimmer, F5 Atmospheric Cloud/Grid Parallax + bộ bật/tắt cường độ gió | `src/experience3d/vfx/WindTrails.tsx`, `src/experience3d/vfx/AirflowLayers.tsx`, `src/domain/types.ts`, `src/domain/store.ts` |
| **U4** | **Biến hình bay 9.5s & Đảo chiều an toàn:** Chuỗi 6 pha (Prepare → Wheel Spin → Doors/Gear Retract → Platform Lower/Fade → Wind Ramp → Hero Flight Hold), kiểm thử seek/interrupt/reverse | `src/domain/config.ts`, `src/domain/timeline.ts`, `src/experience3d/flight/FlightDirector.tsx`, `src/experience3d/aircraft/GearRig.tsx` |
| **U5** | **Ánh sáng, 6 Góc Camera & Hậu kỳ:** Chuẩn hóa 6 preset camera không bị che khuất, cân chỉnh phản xạ kim loại tối và đo lường FPS/Drawcalls | `src/domain/config.ts`, `src/experience3d/scene/CameraRig.tsx`, `src/experience3d/scene/StudioLighting.tsx` |
| **U6** | **Nâng cấp Giao diện Kỹ thuật Tối giản:** Tự động thu gọn Hero overlay khi vào chế độ Inspect/Explode/Flight, bổ sung thanh điều chỉnh cường độ gió và thông số kỹ thuật thực của từng bộ phận | `src/interface/shell/TopBar.tsx`, `src/interface/shell/BottomTransport.tsx`, `src/interface/inspect/PartDetails.tsx` |
| **U7** | **Kiểm thử toàn diện & Bàn giao v2:** Chạy `typecheck`, `lint`, `test`, `build`, `test:e2e`, xuất bộ ảnh `H1–H6` và báo cáo nghiệm thu v2 | `src/tests/unit/domain.test.ts`, `src/tests/e2e/aeris-x9.spec.ts`, `qa-report.md`, `quality-report.md` |
