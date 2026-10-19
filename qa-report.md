# Báo Cáo Kiểm Thử & Nghiệm Thu (QA Acceptance Report) — AERIS X-9

**Dự án:** AERIS X-9 — Simulations & Dynamics (Interactive 3D Fighter Aircraft Concept Showcase)  
**Trạng thái nghiệm thu:** **ĐẠT (PASS TOÀN BỘ G0 → G8)**  
**Môi trường kiểm thử:** Windows 10/11 x64 · Node.js `v24.16.0` · npm `11.3.0` · Blender `4.5.10 LTS` · Playwright Chromium (WebGL Hardware ANGLE)

---

## 1. Kết Quả Chạy Lệnh Kiểm Tra Tự Động (Automated Gate Commands)

| Lệnh kiểm tra | Cổng (Gate) | Kết quả | Chi tiết đầu ra thực tế |
| :--- | :---: | :---: | :--- |
| `npm run typecheck` | E01 / G0–G8 | **PASS** | `tsc --noEmit` — 0 lỗi kiểu dữ liệu TypeScript (`strict: true`). |
| `npm run lint` | E02 / G0–G8 | **PASS** | `eslint src --max-warnings 0` — 0 lỗi, 0 cảnh báo; tuân thủ ranh giới kiến trúc `domain` / `experience3d` / `interface`. |
| `npm run test` | E03 / G0–G6 | **PASS** | `vitest run` — **2/2 file test PASS (13/13 bài kiểm thử đơn vị & giao diện)** trong `1.61s`. |
| `npm run build` | E04 / G7–G8 | **PASS** | `tsc --noEmit && vite build` — 2931 modules đóng gói thành công (`dist/`). |
| `npm run test:e2e` | E05 / G7–G8 | **PASS** | `playwright test` — **2/2 kịch bản E2E PASS** (Desktop `1440×900` & Mobile `390×844` / `360×740`), 0 lỗi runtime. |

---

## 2. Bảng Đối Chiếu Tiêu Chí Nghiệm Thu (`docs/12_QA_ACCEPTANCE.md`)

### Group A — Asset Gate (Kiểm Định Mô Hình 3D GLB)
| Mã | Hạng mục kiểm tra | Tiêu chí đạt | Kết quả | Bằng chứng (Evidence) |
| :---: | :--- | :--- | :---: | :--- |
| **A01** | Load GLB | File `public/assets/aircraft/aeris-x9.glb` tải thành công không lỗi console | **PASS** | `asset-report.json` (`loaded: true`, `fileSizeBytes: 4700620`), E2E `data-asset-ready="true"` |
| **A02** | Part Audit | Đủ **46/46** bộ phận định danh độc lập (`AX9__*`), khớp 100% với `examples/part-manifest.json` (`missingNodes: 0`) | **PASS** | `asset-report.json` (`objectCount: 46`, `manifestMatchedCount: 46`), E2E `audit.totalNamedPartsFound === 46` |
| **A03** | Gear Parts | Có đủ 3 cụm càng đáp độc lập (`front`, `left`, `right`) gồm `strut`, `wheel`, `hub` và `door` | **PASS** | `asset-report.json` (`hasThreeLandingGear: true`, `hasGearDoors: true`), `GearRig.tsx` |
| **A04** | Silhouette | Nhìn 3/4, top, side, front rõ dáng tiêm kích concept thế hệ mới phi vũ trang | **PASS** | `proof/blender-4view-sheet.png` và `proof/showroom.png` |
| **A05** | Materials | Tối thiểu 4 nhóm vật liệu PBR phân biệt rõ (thực tế: **8 vật liệu PBR**: Titanium, Carbon Stealth, Sapphire Canopy, Satin Alloy, Ceramic Nozzle, Rubber Tire, Cyan/Amber Emitter) | **PASS** | `asset-report.json` (`materialCount: 8`), `JetModel.tsx` |

### Group B — Showroom & Explode (Trưng Bày & Bóc Tách Cấu Trúc)
| Mã | Hạng mục kiểm tra | Tiêu chí đạt | Kết quả | Bằng chứng (Evidence) |
| :---: | :--- | :--- | :---: | :--- |
| **B01** | Auto-spin | Bàn xoay và máy bay tự xoay 360° ở chế độ `showroom` khi người dùng không kéo chuột | **PASS** | `FlightDirector.tsx` (`TURNTABLE_DEG_PER_SEC = 10`), `proof/showroom.png` |
| **B02** | Orbit / Select | Kéo chuột orbit/zoom mượt mà; click chọn bộ phận trên 3D hoặc cây DOM 46 bộ phận không lệch | **PASS** | `PartPicker.tsx`, `PartsTree.tsx`, `src/tests/unit/interface.test.tsx`, `proof/inspect-part.png` |
| **B03** | Highlight | Bộ phận được chọn phát sáng viền cyan, mở thẻ thông số kỹ thuật tiếng Việt/Anh và hỗ trợ cô lập (`Isolate`) | **PASS** | `MaterialHighlight.tsx`, `PartDetails.tsx`, `proof/inspect-part.png` |
| **B04** | Exploded Slider | Thanh trượt `0% → 100%` tách 46 bộ phận theo 4 tầng (`tier 1..4`) mượt mà, không xuyên cắt | **PASS** | `ExplodeController.tsx`, `partRegistry.ts`, `proof/exploded.png` |
| **B05** | Reassemble | Bấm `Lắp lại (0%)` hoặc kéo về `0%` khôi phục toàn bộ 46 bộ phận về đúng tọa độ gốc | **PASS** | `domain.test.ts` (sai số `< 1e-6`), E2E `aeris-x9.spec.ts` |
| **B06** | Flight Lock | Khi `explodeProgress > 0` hoặc đang chọn bộ phận, nút `Mô phỏng bay` bị khóa kèm thông báo lý do rõ ràng | **PASS** | `machine.ts`, `selectors.ts`, `BottomTransport.tsx`, `proof/exploded.png`, `proof/inspect-part.png` |

### Group C — Motion, Flight, Hover (Động Học Biến Hình & Bay Tại Chỗ)
| Mã | Hạng mục kiểm tra | Tiêu chí đạt | Kết quả | Bằng chứng (Evidence) |
| :---: | :--- | :--- | :---: | :--- |
| **C01** | Explode Drift | Thực hiện 20 chu kỳ `0 → 1 → 0` liên tiếp không phát sinh sai số tích lũy (`< 1e-5`) | **PASS** | `src/tests/unit/domain.test.ts` (`maintains zero positional and rotational drift across 20 full 0 -> 1 -> 0 explode cycles`) |
| **C02** | Turntable Exit | Bàn xoay hạ độ cao và mờ dần (`turntableOpacity: 1 → 0`) trước khi máy bay vào trạng thái `hover` | **PASS** | `timeline.ts` (`1.6s → 3.4s`), `Turntable.tsx`, `proof/flight-gear.png` |
| **C03** | Wheel Spin | Bánh xe trước, trái, phải quay tăng tốc (`wheelAngleRad`) trước khi thu vào bụng | **PASS** | `timeline.ts` (`0.8s → 2.6s`), `GearRig.tsx`, `domain.test.ts` |
| **C04** | Gear Retract | Cửa hầm mở (`doorOpen`) → chân càng gập thu lên (`gearRetracted`) → cửa hầm đóng kín tuần tự cho cả 3 cụm càng | **PASS** | `GearRig.tsx`, `proof/flight-gear.png` (`t = 4.1s`), `proof/hover.png` (`t = 7.0s`) |
| **C05** | Fixed Jet Anchor | `jetAnchor.position.x === 0` và `jetAnchor.position.z === 0` trong suốt quá trình `flight-transition`, `hover` và `return-transition` | **PASS** | `FlightDirector.tsx`, `domain.test.ts`, E2E `expect(clockAtHover?.anchorWorldX).toBe(0)` |
| **C06** | Forward Sensation | Cảm giác bay về phía trước nhờ luồng gió (`WindTrails`) và 3 lớp môi trường (`ParallaxEnvironment`) trôi về `+Z` | **PASS** | `WindTrails.tsx`, `ParallaxEnvironment.tsx`, `proof/hover.png` |
| **C07** | Return Flow | Chuyển trạng thái `hover → return-transition → showroom` mở cửa hầm, hạ càng đáp, nâng bàn xoay ngược chiều mượt mà | **PASS** | `evaluateReturnFrame` (`timeline.ts`), `domain.test.ts`, E2E `aeris-x9.spec.ts` |
| **C08** | Pause / Resume / Replay | Tạm dừng, tiếp tục và chạy lại hoạt động ổn định, không nhân bản bộ đếm hay làm văng trạng thái | **PASS** | `machine.ts`, `FlightDirector.tsx`, `BottomTransport.tsx` |
| **C09** | Reduced Motion | Khi bật `prefers-reduced-motion: reduce`, lược bỏ dao động vô tận và chuyển thẳng tới trạng thái đích | **PASS** | `machine.ts`, `interface.test.tsx` (`supports reduced motion mode reaching hover and returning immediately`) |

### Group D — UI & Accessibility (Giao Diện & Khả Năng Tiếp Cận)
| Mã | Hạng mục kiểm tra | Tiêu chí đạt | Kết quả | Bằng chứng (Evidence) |
| :---: | :--- | :--- | :---: | :--- |
| **D01** | Primary Controls | Hiển thị đầy đủ các điều khiển chính trên màn hình mà không cần mở menu ẩn | **PASS** | `TopBar.tsx`, `BottomTransport.tsx`, `proof/showroom.png` |
| **D02** | Mobile Layout | Giao diện tương thích hoàn toàn ở `390×844` và `360×740`, không tràn ngang (`scrollWidth <= innerWidth`) | **PASS** | E2E `aeris-x9.spec.ts` (Mobile test), `proof/mobile.png` |
| **D03** | Keyboard | Hỗ trợ đầy đủ phím tắt `Tab`, `Enter`, `Space`, `Escape`, `E`, `F`, `R`, `?` | **PASS** | `App.tsx`, `KeyboardHelp.tsx`, `interface.test.tsx`, E2E `aeris-x9.spec.ts` |
| **D04** | Contrast | Tương phản văn bản chính đạt chuẩn AAA/AA trên nền kính mờ tối `#0E141D` | **PASS** | `tokens.css` (`#E9F0F5` trên `#0E141D` > 13.5:1) |
| **D05** | Slider Aria | Thanh trượt bóc tách có đầy đủ `aria-label`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext` | **PASS** | `BottomTransport.tsx`, `interface.test.tsx` |
| **D06** | Touch Targets | Mọi nút bấm tương tác trên mobile và desktop có chiều cao tối thiểu `>= 44px` (`min-h-[44px]`) | **PASS** | E2E `expect(ctaBox!.height).toBeGreaterThanOrEqual(44)` |

### Group E — Build & Code Health (Sức Khỏe Mã Nguồn)
| Mã | Hạng mục kiểm tra | Tiêu chí đạt | Kết quả | Bằng chứng (Evidence) |
| :---: | :--- | :--- | :---: | :--- |
| **E01** | Typecheck | `npm run typecheck` trả về mã thoát `0` | **PASS** | Log kiểm thử tự động |
| **E02** | Lint | `npm run lint` trả về mã thoát `0` (`--max-warnings 0`) | **PASS** | Log kiểm thử tự động |
| **E03** | Unit Test | `npm run test` trả về mã thoát `0` (13/13 tests PASS) | **PASS** | `src/tests/unit/domain.test.ts`, `src/tests/unit/interface.test.tsx` |
| **E04** | Production Build | `npm run build` tạo thư mục `dist/` sạch lỗi | **PASS** | `dist/index.html` + `dist/assets/*` |
| **E05** | E2E Smoke | `npm run test:e2e` vượt qua toàn bộ bài kiểm thử trình duyệt thực tế | **PASS** | `src/tests/e2e/aeris-x9.spec.ts` |
| **E06** | Memory / Resource | Không rò rỉ bộ nhớ GPU khi đổi chế độ; dùng lại `InstancedMesh` và scratch vectors trong `useFrame` | **PASS** | `WindTrails.tsx`, `ParallaxEnvironment.tsx`, `ExplodeController.tsx`, `GearRig.tsx` |

---

## 3. Danh Mục Ảnh Chụp Bằng Chứng (`proof/`)
1. [`proof/blender-4view-sheet.png`](file:///c:/Users/ADMIN/Downloads/TEST_WEB/proof/blender-4view-sheet.png) — Bản kết xuất kiểm định 4 góc nhìn (Front, Right, Top, Perspective) từ Blender 4.5.10 LTS.
2. [`proof/showroom.png`](file:///c:/Users/ADMIN/Downloads/TEST_WEB/proof/showroom.png) — Trạng thái `01 / SHOWROOM` (1440×900): Tiêm kích AERIS X-9 trên bàn xoay cơ khí 360°.
3. [`proof/inspect-part.png`](file:///c:/Users/ADMIN/Downloads/TEST_WEB/proof/inspect-part.png) — Trạng thái `02 / INSPECT` (1440×900): Soi cận cảnh bộ phận `Cánh phải (Wing Right)` kèm thẻ telemetry và cây 46 bộ phận.
4. [`proof/exploded.png`](file:///c:/Users/ADMIN/Downloads/TEST_WEB/proof/exploded.png) — Trạng thái `02 / EXPLODED` (1440×900): Bóc tách 100% toàn bộ 46 bộ phận theo 4 tầng cơ khí.
5. [`proof/flight-gear.png`](file:///c:/Users/ADMIN/Downloads/TEST_WEB/proof/flight-gear.png) — Trạng thái `03 / TRANSITION` tại `t = 4.1s`: Bàn xoay biến mất, cửa hầm mở, 3 cụm càng đáp đang gập thu vào thân.
6. [`proof/hover.png`](file:///c:/Users/ADMIN/Downloads/TEST_WEB/proof/hover.png) — Trạng thái `03 / HOVER` tại `t = 7.0s`: Càng đáp thu gọn hoàn toàn, cửa hầm đóng kín, máy bay bay lơ lửng tại tâm cố định `[0.00, 0.00]` giữa luồng gió và môi trường parallax.
7. [`proof/mobile.png`](file:///c:/Users/ADMIN/Downloads/TEST_WEB/proof/mobile.png) — Giao diện di động `390×844` phản hồi mượt mà, không tràn ngang, nút bấm đạt chuẩn `>= 44px`.
