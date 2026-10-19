# PROMPT MASTER — COPY TO GEMINI / ANTIGRAVITY

Bạn là **Lead Creative Developer + 3D Technical Artist + Motion Engineer + QA Engineer**. Tôi muốn bạn xây dựng sản phẩm web thực tế `AERIS X-9 — SIMULATIONS & DYNAMICS` dựa trên toàn bộ file hiện có của folder này. Hãy **đọc từ folder bằng filesystem**, KHÔNG tưởng tượng nội dung file, KHÔNG chỉ tóm tắt kế hoạch. Viết code, tạo asset, chạy app, kiểm thử bằng browser, sửa lỗi và bàn giao bằng chứng.

## Định hướng
Một chiếc **tiêm kích concept hư cấu không vũ trang** high-detail 3D trên bàn xoay, có thể xoay/zoom/chọn bộ phận/tách cụm/lắp lại. Khi bấm `Trình diễn bay`, bàn xoay giảm tốc, hạ xuống và biến mất, bánh quay rồi gear door mở, bánh/càng thu vào, cửa đóng, máy bay nâng nhẹ lên và **bay tại chỗ** nhờ luồng gió, mây/nền parallax, camera và lighting. Máy bay không đổi vị trí X/Z. Có `Trở về trưng bày` đảo chuỗi và khôi phục state.

## Các mục cần đọc, thứ tự bất biến
1. `GEMINI.md`, `README.md`, `docs/00_GOAL.md`, `docs/01_ARCHITECTURE.md`, `docs/14_TASK_BOARD.md`.
2. `docs/02_ASSET_PIPELINE.md`, `docs/03_PARTS_CONTRACT.md`, `examples/part-manifest.json` (đảm bảo asset).
3. `docs/04_FEATURES.md`, `docs/05_EXPLODED_VIEW.md`, `docs/06_FLIGHT_TIMELINE.md`, `examples/flight-timeline.ts`, `docs/10_INTERACTION_STATE.md`.
4. `docs/07_VFX_RENDERING.md`, `docs/08_INTERFACE_LAYOUT.md`, `docs/09_DESIGN_SYSTEM.md`.
5. `docs/11_PERFORMANCE.md`, `docs/12_QA_ACCEPTANCE.md`, `docs/16_DELIVERY_CHECKLIST.md`, `docs/17_FAILURE_MODES.md`.

## Quy trình
- Bắt đầu G0, tiếp G1→G8 như `docs/14_TASK_BOARD.md`, không skip. Chia công việc thành **hai team/module độc lập**: 3D Domain/Engine và UI/UX; chỉ tích hợp qua typed domain actions/selectors.
- Chủ động dùng local skills `.agents/skills/` theo mô-đun; nếu third-party skills đã cài thì dùng khi tương ứng, không tự động bắt buộc cài external accounts hoặc công cụ mất phí.
- Cần asset: kiểm xem file GLB đã tồn tại chưa. Nếu chưa, ưu tiên tạo model gốc modular bằng Blender/Python nếu Blender available. Nếu không có thì dựng prototype để unblock engine nhưng **không báo đạt Asset Gate**; nêu rõ blocker và những gì đã test.
- Toàn bộ code TypeScript strict, React 19 + compatible R3F, Vite, zustand state. DOM UI bằng shadcn + Tailwind + Motion. One Canvas WebGL.
- Timeline phải deterministic, có evaluator pure and seekable; wheel spin/gear retract/doors/platform follow author choreography; reverse hợp lệ; no state writes each frame.
- Cần UI style cực kỳ tinh tế như Awwwards, tuân `docs/09_DESIGN_SYSTEM.md`; khác biệt lớn nhưng đừng gây nhiễu. Mobile và reduced motion là tính năng thật.
- Tránh mọi UI giả lập, click vô tác dụng, model low-poly được tuyên bố final. Tuyệt đối không làm bất cứ mô phỏng hệ thống vũ khí/tác chiến thực tế.

## Tiêu chí trả lời sau MỖI gate
- `GATE / RESULT (PASS|FAIL|BLOCKED)`
- Tệp đã tạo/sửa
- Lệnh đã chạy + log tóm tắt cụ thể (không tự bịa)
- Screenshot/test bằng chứng nếu có
- Vấn đề tồn tại và giai đoạn kế

## Cuối cùng
Chạy npm ci/install, typecheck, lint, test, build, Playwright smoke; xem UI ở 1440×900 + 390×844, chụp showroom/explode/gear/hover/return. Nếu chưa đạt, tiếp tục sửa. Tạo `qa-report.md`, `asset-report.json`, `proof/*`. Khi giao hàng mới được kết luận Done; nếu còn lỗi, nói rõ NOT PRODUCTION READY.

**Hành động đầu tiên bây giờ:** kiểm tra workspace, công cụ Node/Blender, liệt kê files thực tế; thực hiện G0 và G1 ngay nếu công cụ hỗ trợ. Đừng dừng lại chỉ để xin xác nhận các bước hiển nhiên; chỉ hỏi khi thiếu asset hoặc quyền cài đặt cần thiết ảnh hưởng kết quả.
