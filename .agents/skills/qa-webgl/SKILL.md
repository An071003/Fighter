---
name: qa-webgl
description: Use for test gates, Playwright visual regression, WebGL quality and memory profiling, asset provenance, evidenced release reports.
---

# QA WebGL Skill

Read `docs/12_QA_ACCEPTANCE.md`, `docs/16_DELIVERY_CHECKLIST.md`, `docs/17_FAILURE_MODES.md`.

- Run app in actual browser and check screenshot states, not code read only.
- TCs A/B/C/D/E must have PASS/FAIL/BLOCKED evidence.
- Use deterministic test-time control for screenshot not recorded live time.
- Test 20 exploded resets, 10 flight/return cycles, fixed anchor, gear doors order, mobile viewport.
- Capture console errors, GPU context loss fallback, build/lint/types unit/e2e.
- Asset missing => FAIL or BLOCKED, not pretend.
- Show logs, actual filenames, device/browser details, performance numbers only measured.
