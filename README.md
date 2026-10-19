# AERIS X-9 — SIMULATIONS & DYNAMICS
## Gemini / Antigravity Production Build Kit • v1.0 • 2026-10-19

**Mục tiêu:** Xây một ứng dụng web 3D tương tác có thể chạy thật: một tiêm kích **concept hư cấu, không vũ trang** được trình diễn trên bàn xoay, chọn/soi/tách các bộ phận, và chuyển cảnh thành trạng thái lơ lửng/bay tại chỗ với gió, bánh xe quay rồi thu vào thân, bàn xoay rút xuống và mờ dần. Đây là hiệu ứng hình ảnh 3D, **không phải phần mềm vận hành/khí động học cho thiết bị thật**.

## Bộ tài liệu này LÀ gì và KHÔNG LÀ gì
- Là **bản đặc tả triển khai + rule/skill + prompt theo giai đoạn + bộ tiêu chí nghiệm thu + manifest mẫu**; không phải ứng dụng website đã code xong.
- Chưa bao gồm GLB high-poly cuối cùng. **Asset Gate** bắt buộc: Gemini phải tạo mô hình gốc phân mảnh đủ chất lượng bằng Blender hoặc sử dụng một asset do người dùng cung cấp có quyền sử dụng. Không được báo "production done" bằng một chiếc máy bay ghép 5 khối hộp.
- Nên phát triển theo vertical slice đầu tiên để kiểm nghiệm tương tác, sau đó nâng chất lượng 3D. Nếu môi trường không có Blender, cung cấp báo cáo thiếu dependency và giao diện đánh dấu prototype, không tuyên bố đã giao asset final.

## Bắt đầu trong 5 bước
1. Giải nén toàn bộ thư mục, mở **chính thư mục gốc** trong Antigravity / Gemini CLI.
2. Đọc `GEMINI.md`, `docs/00_GOAL.md`, `docs/01_ARCHITECTURE.md`, `docs/14_TASK_BOARD.md`.
3. Cài skill từ `docs/15_SKILLS_PLUGINS.md` (các skill tùy chọn, không thay thế code thực).
4. Dán **toàn bộ** nội dung `prompts/00_MASTER_ORCHESTRATOR.md` vào Gemini.
5. Yêu cầu Gemini thực hiện **theo Gate G0→G8**, test từng giai đoạn, ghi bằng chứng và chạy app bằng `npm run dev`. Không bắt đầu phần sau nếu gate trước chưa đạt.

## Tài liệu theo thứ tự
- `docs/00_GOAL.md` — mục đích, user journey, scope & acceptance.
- `docs/01_ARCHITECTURE.md` — module boundaries, states, tech stack.
- `docs/02_ASSET_PIPELINE.md` — Blender/GLB, chất lượng mô hình, chứng từ asset.
- `docs/03_PARTS_CONTRACT.md` — cấu trúc 40+ nhóm parts, naming, pivot, offsets.
- `docs/04_FEATURES.md` — hành vi showroom/inspect/explode/flight.
- `docs/05_EXPLODED_VIEW.md` — easing, collision, camera focus, reset.
- `docs/06_FLIGHT_TIMELINE.md` — timeline 7 giây và công thức fake motion.
- `docs/07_VFX_RENDERING.md` — gió, parallax, shaders, lights, postprocess.
- `docs/08_INTERFACE_LAYOUT.md` — bố cục giao diện tách độc lập.
- `docs/09_DESIGN_SYSTEM.md` — tokens, typography, motion, responsive.
- `docs/10_INTERACTION_STATE.md` — máy trạng thái, event guards, accessibility.
- `docs/11_PERFORMANCE.md` — LOD, render budget, quality presets, fallback.
- `docs/12_QA_ACCEPTANCE.md` — chức năng, visual, e2e, performance.
- `docs/13_IMPLEMENTATION_PLAN.md` — thứ tự triển khai module và files.
- `docs/14_TASK_BOARD.md` — bảng task có thứ tự, Definition of Done.
- `docs/15_SKILLS_PLUGINS.md` — skill thật, link và lệnh cài, lựa chọn.
- `docs/16_DELIVERY_CHECKLIST.md` — final release, asset license, demo.
- `docs/17_FAILURE_MODES.md` — các lỗi Gemini hay gặp, cách xử lý.
- `prompts/` — master + prompt cho từng nhóm nhiệm vụ.
- `.agents/skills/` — 5 **skill tùy chỉnh** dự án theo định dạng SKILL.md.
- `.agents/rules/` — các ràng buộc cho Antigravity; `GEMINI.md` — context toàn dự án.
- `examples/` — manifest JSON, giả mã timeline Typescript và ma trận trạng thái.

## Nguyên tắc tuyệt đối
**No fake deliverables.** Các nút phải bấm được; mesh phải thực sự tách theo transform; gear phải là thành phần có pivot; bàn xoay phải có geometry riêng; flight phải giữ tọa độ X/Z của craft root; không dùng video/mp4/CSS sprite làm giả 3D. Tuyệt đối không copy nguyên 3D/texture từ nguồn thiếu license. Chỉ tạo concept nghệ thuật, không mô phỏng vũ khí hay điều khiển tác chiến.

## Definition of Done cấp dự án
Ứng dụng chạy local, build thành công, 2 viewport (desktop/mobile) hoạt động, mô hình thật có >=32 nhóm mesh riêng và >=3 bánh, 360 turntable, selection + isolating + explode + focus, cinematic flight/reverse với landing gear động, nút dừng/chạy lại, animation reduced-motion, asset provenance, ảnh/video ghi hình demo và test summary.
