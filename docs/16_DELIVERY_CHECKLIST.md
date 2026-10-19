# 16 — RELEASE & DELIVERABLES

## Bắt buộc bàn giao sau Gemini implement
- Repository `src/`, `public/`, `package.json` + lockfile, lint/tsconfig/test scripts, README chạy local.
- `aeris-x9.glb` (or explicit unresolved asset blocker), `part-manifest.json`, `asset-report.json` provenance/license.
- `quality-report.md` with hardware+browser+FPS observed, screenshots desktop/mobile.
- `qa-report.md` with A/B/C/D/E testcase pass/fail table and run commands.
- `proof/showroom.png`, `proof/exploded.png`, `proof/flight-gear.png`, `proof/hover.png`, `proof/mobile.png`.
- Optional screen capture ~25–45s, user permission before recording any private screens.

## Release contract
1. `npm ci` with lockfile, `npm run build`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run test:e2e` documented.
2. Production static build works under Vite preview; asset URLs relative-safe to chosen base.
3. No hidden third-party paid dependencies; no telemetry/secret key committed.
4. Asset usage rights recorded; self-host licensed fonts/materials.
5. All P0 acceptance pass, UI quality >=85/100 assessed using rubric, not just subjective claim.
6. If any critical feature blocked, put `NOT PRODUCTION READY` in final report with reason.

## Recommended final showcase capture beats
00–04s hero reveal & 360 base; 04–09s click wing/canopy focus; 09–14s exploded group & reassemble; 14–22s platform fold & gear retraction; 22–28s hover anchored; 28–34s return to showroom. If timeline fixed at 7s, recording beats adapt to user actions.
