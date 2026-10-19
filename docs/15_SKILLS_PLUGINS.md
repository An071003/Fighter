# 15 — SKILL / PLUGIN PLAN FOR GEMINI & ANTIGRAVITY

## Skill không phải package runtime
- **Agent skill:** file Markdown hướng dẫn Gemini code đúng lĩnh vực; được đặt `.agents/skills/<skill>/SKILL.md` hoặc cài bằng skill CLI.
- **App/runtime package:** package npm thực sự tạo Canvas/UI, cài bằng npm.
- **MCP/plugin:** cầu nối tùy chọn để agent thao tác tool/registry; không bắt buộc và không thay thế thư viện.

## Bộ nên dùng — cài có chọn lọc
### (1) R3F — ưu tiên số 1
Nguồn: https://github.com/EnzeD/r3f-skills
```
npx skills add EnzeD/r3f-skills
```
Khi CLI hỏi, cài `r3f-fundamentals`, `r3f-loaders`, `r3f-animation`, `r3f-interaction`, `r3f-lighting`, `r3f-materials`, `r3f-postprocessing`; thêm `r3f-shaders` khi vào VFX. Không cần `r3f-physics` cho ảo giác bay tại chỗ.

### (2) UI UX Pro Max — design system, bố cục, accessibility
Nguồn: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
```
npx ui-ux-pro-max-cli init --ai antigravity
# Nếu chỉ dùng Gemini CLI: npx ui-ux-pro-max-cli init --ai gemini
```
Đây là lệnh cài của dự án, có hỗ trợ Antigravity/Gemini. Dùng cho phase G6, **không** giao nhiệm vụ mô hình 3D cho skill UI.

### (3) Better Interface — review typography/layout/contrast
Nguồn: https://github.com/jakubkrehel/skills
```
npx skills add jakubkrehel/skills
```
Chọn `better-ui`, `better-typography`, `better-layout`, `better-accessibility`, `interface-review`. Không nên load tất cả skill vào mọi prompt.

### (4) Shaders — **tùy chọn** chỉ dùng cho phụ cảnh WebGPU
Nguồn: https://github.com/shader-effects-inc/shaders
```
npx skills add shader-effects-inc/shaders
# Với hỗ trợ editor: npx shaders connect
```
Tài liệu dự án hỗ trợ free usage; một số presets/pro có trả phí. **Không bắt buộc dùng WebGPU cho scene lõi**, tránh double-canvas và compatibility failures. Nếu `npx shaders connect` yêu cầu đăng nhập, đó là optional; skip nếu không phù hợp môi trường.

### (5) Motion — DOM UI animation
Nguồn: https://motion.dev/docs/react
```
npm install motion
# optional skill theo nhà phát triển: npx motion-ai
```
Dùng panel, CTA, label, transport. THREE timeline vẫn do FlightDirector điều khiển.

### (6) Huashu Art Motion — chỉ cho storyboard / QA chuyển động
Nguồn: https://github.com/alchaincyf/huashu-art-motion
```
npx skills add alchaincyf/huashu-art-motion
```
Ưu tiên khi cần phân tích nhịp storyboard hoặc QA film/video. **Không** thay React Three Fiber và **không** bắt buộc: toolkit này chủ yếu code motion 2D/cinematic clip, không phải rig 3D browser.

## Các skill sẵn có trong thư mục này
- `.agents/skills/aircraft-3d-architecture/`: data contract & scene ownership.
- `.agents/skills/kinematic-visual-motion/`: timeline & return choreography.
- `.agents/skills/cinematic-vfx/`: fake wind, lighting & quality.
- `.agents/skills/ui-art-direction/`: premium visual design.
- `.agents/skills/qa-webgl/`: browser testing, evidence.
Antigravity phiên bản mới nhận `<workspace>/.agents/skills/<name>/SKILL.md` (legacy `.agent/skills` cũng có thể hoạt động tùy phiên bản). Do đó gói này dùng `.agents/skills/`.

## Runtime deps khởi tạo (đọc phiên bản tương thích trước)
```
npm install three @react-three/fiber @react-three/drei zustand motion lucide-react
npm install -D @types/three vitest @playwright/test
# theo hướng dẫn Vite chính thức:
npx shadcn@latest init -t vite
```
Tailwind v4 và shadcn có thể cần tạo trực tiếp project bằng CLI hoặc init trên app Vite hiện có: kiểm tài liệu https://ui.shadcn.com/docs/installation/vite và tránh chạy lệnh init khiến ghi đè project đã tạo.

## Version-safe / plugin caution
- React 19 ↔ Fiber 9 major matching là hướng chuẩn; kiểm npm latest compatible trước install.
- Nếu plugin skill yêu cầu thực thi shell/network script không rõ nguồn, review trước khi chạy. Không yêu cầu API key/pro license.
- Không cài các phần phụ trùng lặp hoặc thay đổi framework giữa chừng.

## Tham khảo chính thức
- Antigravity skills: https://www.antigravity.google/docs/skills?tab=ide
- Antigravity rules: https://www.antigravity.google/docs/rules/
- Gemini CLI GEMINI.md: https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/gemini-md.md
- Three.js: https://threejs.org/docs/
- R3F: https://r3f.docs.pmnd.rs/
- Drei: https://drei.docs.pmnd.rs/
- Khronos glTF: https://github.com/KhronosGroup/glTF
- Blender glTF: https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html
- Playwright screenshot: https://playwright.dev/docs/test-snapshots
