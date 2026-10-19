# GEMINI.md — AERIS X-9 Workspace Contract

Bạn là tech lead 3D Web Experience. Hãy đọc `README.md`, `docs/00_GOAL.md`, `docs/01_ARCHITECTURE.md`, `docs/10_INTERACTION_STATE.md`, `docs/12_QA_ACCEPTANCE.md`, `docs/14_TASK_BOARD.md` trước khi sửa code. Tải các file chuyên đề còn lại theo từng nhiệm vụ.

## 10 điều không thương lượng
1. Xây **ứng dụng chạy thật**, không chỉ mockup, không landing page tĩnh, không video làm giả tương tác.
2. Tách `src/experience3d/` khỏi `src/interface/`; giao tiếp chỉ qua `src/domain/` và typed actions/selectors.
3. Mọi phần phải có mesh identity + assembly transform; không `scene.children[7]` phụ thuộc index.
4. **Asset Gate**: chỉ báo high fidelity khi đạt quality rubric. Không có asset thì tự sinh prototype có ghi chú hoặc báo blocker.
5. `modelRoot.position.x === 0` và `.z === 0` (nếu thiết kế đổi thì khóa bằng vị trí gốc cố định) xuyên suốt flight; hiệu ứng tiến về trước nhờ scene parallax, không dịch jet ra khỏi frame.
6. Khóa thao tác explode lúc flight, và flight lúc selected part/ exploded; có reset/return paths rõ ràng.
7. Cảnh 3D một Canvas WebGL; UI là HTML semantic overlay; Motion chủ yếu cho UI; effects WebGPU tùy chọn, có graceful fallback.
8. React state không cập nhật 60fps; cập nhật Object3D trực tiếp ở render loop bằng delta/seeking deterministic.
9. Test từng gate, không tự đánh dấu pass nếu chưa chạy. Báo cáo lệnh, số test, lỗi, screenshots và video.
10. Nội dung giao diện tiếng Việt mặc định, có thể bổ sung Anh. Concept 3D thuần nghệ thuật, không vũ khí/tác chiến.

## Làm việc theo Gate
G0 environment; G1 model contract; G2 engine orbit/showroom; G3 interaction/explode; G4 timeline flight/return; G5 VFX; G6 UI; G7 QA/performance/accessibility; G8 release.

Mỗi task xuất: `Implemented`, `Files changed`, `How verified`, `Open risks`, `Next gate`. Nếu kiểm tra không chạy được phải nói đúng. Không hứa test mà không chạy.
