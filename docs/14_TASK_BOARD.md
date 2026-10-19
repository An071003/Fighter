# 14 — TASK BOARD / GATES / DEFINITION OF DONE

> Quy tắc: thực hiện *đúng thứ tự* và tạo progress report sau mỗi gate. UI polish **không được** đi trước asset/motion contract. Nếu phụ thuộc bị thiếu, đánh dấu `BLOCKED` trung thực.

| Gate | Task ID | Mô tả deliverable | Độc lập với | DoD | Priority |
|---|---|---|---|---|---|
| G0 | T00 | Vite/TS setup + dev/build/test scripts | none | `npm run dev` và build lên | P0 |
| G0 | T01 | install skills, record versions/README | T00 | registry kiểm được skill paths | P1 |
| G1 | T02 | GLB original/source + audit | T00 | >=32 named parts + 3 gear | P0 |
| G1 | T03 | manifest + pivot maps | T02 | no missing critical IDs | P0 |
| G2 | T04 | Canvas, scene lights, PBR env | T02 | model renders all angles | P0 |
| G2 | T05 | platform mesh with turntable orbit | T04 | 360° continuous, pause | P0 |
| G2 | T06 | orbit/zoom/camera presets | T04 | mouse/touch/reset | P0 |
| G3 | T07 | picking + inspector semantic state | T03,T06 | click from DOM + canvas same | P0 |
| G3 | T08 | exploded engine deterministic | T03,T07 | p0/p1 and 20 reset cycles | P0 |
| G3 | T09 | highlight/leader lines | T07 | visible but not overbloom | P1 |
| G4 | T10 | timeline pure evaluator + tests | T05,T08 | samples/continuity tests | P0 |
| G4 | T11 | gear animation with 3 distinct pivots | T03,T10 | door/strut/wheel visible sequence | P0 |
| G4 | T12 | platform lowering/jet rise/return | T10,T11 | no x/z drift; reset | P0 |
| G5 | T13 | parallax + wind VFX | T12 | hover looks moving from 2 views | P0 |
| G5 | T14 | lighting/reflections/postprocessing | T13 | high+low both legible | P1 |
| G6 | T15 | UI design system + shell | T05,T08 | desktop hero matches spec | P0 |
| G6 | T16 | parts/transport/panel responsive | T15,T12 | CTA and state truthful mobile | P0 |
| G6 | T17 | keyboard/reduced motion | T16 | all actions keyboard, no autospin reduced | P0 |
| G7 | T18 | unit/integration/e2e tests | T17 | A–E QA report evidence | P0 |
| G7 | T19 | performance profile + low tier | T18 | no growth after 10 cycles | P1 |
| G8 | T20 | release docs, screenshots, demo capture | T18,T19 | bundle + report + caveats | P0 |

## Required gate reports
```
GATE: G4 — FLIGHT ENGINE
STATUS: PASS | FAIL | BLOCKED
CHANGED: src/domain/timeline.ts; src/experience3d/aircraft/GearRig.tsx
TESTS EXECUTED: npm run test -- ...; npm run build
RESULTS: 14/14 passing, screenshots ... (actual numbers only)
SCREENSHOTS: proof/...
RISKS: ...
NEXT: G5
```

## Priorities if context budget is constrained
Do not cut G1, G3, G4. Cut optional particles/sound/tour first. Quality of architecture and visible believable transformations matters more than adding more generic UI cards.
