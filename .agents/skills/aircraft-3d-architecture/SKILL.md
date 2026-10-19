---
name: aircraft-3d-architecture
description: Use for project aircraft GLB scene graph, semantic parts registry, camera ownership, R3F architecture and separation from interface.
---

# Aircraft 3D Architecture Skill

Use when working on `experience3d/aircraft`, `domain/partRegistry`, asset manifest and scene graph. Read `docs/01_ARCHITECTURE.md`, `docs/02_ASSET_PIPELINE.md`, `docs/03_PARTS_CONTRACT.md`.

Procedure:
1. Check actual model GLB & names. If missing high-quality asset, mark prototype and Asset Gate.
2. Normalize coordinate frame +Y up, nose -Z, ±X wings. Snapshot immutable rest local transforms.
3. Create named model root separate from platform, no `scene.children[index]` reliance.
4. Registry semantic selection from mesh ancestor to partId; DOM can trigger identical action.
5. Validate 32+ selectable groups and gear pivots; export audit and screenshots.
6. No weapons or operational simulation functionality; this is a fictional artistic display.

Quality check: 4 view renders, no torn shading, no glass clipping, 20 transform reset cycles, no UI imports into engine.
