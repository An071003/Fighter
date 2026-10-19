# 17 — FAILURE MODES / ANTI-HALLUCINATION

## FM01: Gemini dựng máy bay bằng hộp/thân hình thoi sơ sài
Symptom: silhouette không giống concept, chỉ 1 object mesh. Remedy: Asset Gate + original Blender modular build or authorized asset; deliver prototype labeled explicitly until ready. Do not hide lack of model behind bloom.

## FM02: Explode bằng một lần `position +=` rồi cứ click bị trôi
Remedy: immutable rest transforms + pure evaluator. Add 20-cycle matrix test.

## FM03: Gear fake opacity hoặc wheel chỉ biến mất
Remedy: 3 separately hinged struts, wheels/hubs children, doors open before retraction; sample screenshots to confirm.

## FM04: 'Bay tại chỗ' thành model dịch khỏi màn hình
Remedy: lock craft root X/Z and measure bounding box each keyframe; move camera/background. Root Y only plus tiny angular hover.

## FM05: Platform pop bằng `display:none` tức thì
Remedy: fade+lower first; hide late. Shadow must fade as craft rises.

## FM06: UI đẹp nhưng controls không chạy
Remedy: UI cannot directly manipulate mesh refs; dispatch events; e2e check actual mode and scene states.

## FM07: Shader library khiến trắng/đen Canvas hoặc overlay không tương tác
Remedy: WebGL-first, optional secondary shader backdrop only if supported; fallback CSS. Disable pointer-events decorative overlay.

## FM08: RAF > 1 loop / camera fights OrbitControls
Remedy: one authoritative time driver, camera ownership by mode; lock OrbitControls while cinematic camera updates.

## FM09: Performance mobile tụt mạnh
Remedy: use quality tiers, instancing, LOD, lower DPR; replace expensive particles and transparency.

## FM10: Hardcoded paths or missing licensed assets
Remedy: import asset through manifest, Vite public path respect base; test production preview, provenance record.

## FM11: Agent nói hoàn tất nhưng không chạy test
Remedy: enforce gate report including executed commands and concrete log; mark blocked if cannot run.

## FM12: Reversing gear timeline puts doors through wheels
Remedy: separate legal choreography for return + screenshot 10 keyframes; never simply set `t=7-t` without checking scene constraints.
