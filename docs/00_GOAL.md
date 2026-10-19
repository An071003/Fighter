# 00 — GOAL / PRODUCT BRIEF

## Vision
Tạo "AERIS X-9 — The Living Machine": một màn trưng bày tiêm kích concept tương lai không vũ trang, đủ tinh tế để làm case study Awwwards. Trải nghiệm không chạy một video tuyến tính; người xem làm chủ bằng chuột/touch/phím, khám phá từng lớp kết cấu; bấm `Khởi động trình diễn` đưa vật thể từ showroom sang bay lơ lửng tại chỗ nhờ ảo giác thị giác.

## Persona & mục tiêu cảm xúc
- Người yêu nghệ thuật 3D, motion design, công nghệ aerospace concept; không cần kiến thức kỹ thuật.
- 3 giây đầu phải nhìn ra "đây là một vật thể có chiều sâu"; sau 10 giây muốn tương tác; sau 30 giây nhìn được ít nhất 1 cấu kiện và diễn tiến bay.
- Hero là **mô hình**, UI chỉ hỗ trợ; không tràn ngập biểu đồ giả hoặc động cơ tác chiến.

## 3 câu chuyện chính
### Story A — Trưng bày 360°
Mở trang, cinematic reveal 1.8 s, turntable rotation nhẹ. Hover/click để ngưng xoay và khám phá. Kéo thì orbit có giới hạn; scroll để zoom, có giới hạn khoảng cách tránh xuyên qua mô hình.
### Story B — Khám phá kết cấu
Chọn "Tháo rời" hoặc click wing/cover/gear; camera focus, outline highlight và tên part. Có thể tách cả cụm rồi từng part, layer selection, reset.
### Story C — Biến hình bay
Từ showroom nguyên vẹn, click "Mô phỏng bay": đèn bàn xoay đổi pha; platform hạ dần rồi biến mất; wheel quay, body nhấc khỏi bệ; cửa gear mở, càng/ bánh thu vào, cửa đóng; vệt gió và lớp không gian chuyển động ra sau; jet ở gần tâm viewport. "Về trưng bày" đảo quá trình mượt mà và đáp xuống đế quay.

## Phạm vi tính năng
P0: GLB modular; 360 turntable; orbit/zoom; part selection; inspect; explode/assemble; deterministic flight 0-7s; actual landing gear motion; fake wind; responsive UI; reduced-motion; QA.
P1: cinematic transition camera, particle field, shader highlight, feature guided tour, keyboard shortcut, visual presets.
P2: timeline scrub, share link state, multilingual EN, cinematic capture, alternate paint finish.

## Ràng buộc sản phẩm
Không tài khoản/backend, không thanh toán, không services cần key trả phí. Không flight physics/điều khiển chiến đấu, không mô phỏng chi tiết thiết kế vũ khí. PBR asset gốc trong `public/assets/` và xem được offline sau build static (trừ font CDN nếu chọn; ưu tiên local).

## Chỉ tiêu nghiệm thu
- Asset phải đủ tách rời & chi tiết (>=32 nhóm chọn được; >=3 bánh; >=2 cửa gear; left/right wing; fuselage; canopy; tail; ducts).
- 4/4 hành động `Select → Focus → Explode → Reassemble` lặp 20 lần không lệch gốc.
- 5/5 đường trạng thái `showroom → inspecting → showroom → transitioning → hover → returning → showroom` có guard.
- Flight 0-7 s, đảo trạng thái, restart được; jet root không trôi ngang; không giật trong timeline.
- Visual: silhouette rõ ở 1440×900, ánh sáng có đặc tính kim loại, mobile không mất CTA.
- Tech: build/test/lint và Playwright smoke có log; WebGL fallback/error state, không console error định kỳ.
