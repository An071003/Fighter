import React, { useEffect, useMemo, useState } from 'react';
import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PART_MANIFEST, getPartRestPose } from '@/domain/partRegistry';
import { useAppStore } from '@/domain/store';
import { useAircraftRig } from '../aircraft/AircraftRig';

interface OriginalMaterialProps {
  colorHex: number;
  emissiveHex: number;
  emissiveIntensity: number;
  opacity: number;
  transparent: boolean;
  depthWrite: boolean;
}

const CUTAWAY_INTERNAL_CATEGORIES = new Set(['GEAR', 'LIGHT']);
const CUTAWAY_INTERNAL_IDS = new Set([
  'display-plate',
  'exhaust-ring-left',
  'exhaust-ring-right',
  'leading-trim-left',
  'leading-trim-right',
  'elevon-left',
  'elevon-right',
]);

export const MaterialHighlight: React.FC = () => {
  const { partNodesMapRef } = useAircraftRig();
  const selectedPartId = useAppStore((s) => s.selectedPartId);
  const hoveredPartId = useAppStore((s) => s.hoveredPartId);
  const isIsolated = useAppStore((s) => s.isIsolated);
  const isCutaway = useAppStore((s) => s.isCutaway);
  const mode = useAppStore((s) => s.mode);
  const flightPhaseLabel = useAppStore((s) => s.flightPhaseLabel);
  const explodeProgress = useAppStore((s) => s.explodeProgress);

  // Automatic Cutaway X-Ray during gear retraction window (matching 00:26-00:28 in reference video)
  const autoFlightCutaway =
    mode === 'flight-transition' &&
    (flightPhaseLabel === 'GEAR DOOR OPEN' || flightPhaseLabel === 'GEAR RETRACT');

  const effectiveCutaway = isCutaway || autoFlightCutaway;

  const originalMatMap = useMemo(
    () => new WeakMap<THREE.MeshStandardMaterial, OriginalMaterialProps>(),
    []
  );
  const box = useMemo(() => new THREE.Box3(), []);
  const center = useMemo(() => new THREE.Vector3(), []);

  const [leaderPoints, setLeaderPoints] = useState<
    [[number, number, number], [number, number, number], [number, number, number]] | null
  >(null);

  const [explodeDatumLines, setExplodeDatumLines] = useState<
    Array<[[number, number, number], [number, number, number]]>
  >([]);

  useEffect(() => {
    const nodes = partNodesMapRef.current;

    for (const part of PART_MANIFEST.parts) {
      const obj = nodes.get(part.id);
      if (!obj) continue;

      const isSelected = selectedPartId === part.id;
      const isHovered = hoveredPartId === part.id && !isSelected;
      const shouldDim = isIsolated && selectedPartId !== null && !isSelected;

      const isInternalHighlight =
        effectiveCutaway &&
        (CUTAWAY_INTERNAL_CATEGORIES.has(part.category) ||
          CUTAWAY_INTERNAL_IDS.has(part.id));
      const isOuterGhostShell = effectiveCutaway && !isInternalHighlight;

      obj.traverse((child) => {
        if (child.userData.isCadEdge) {
          const lineSeg = child as THREE.LineSegments;
          const lineMat = lineSeg.material as THREE.LineBasicMaterial;
          if (lineMat) {
            if (isSelected) {
              lineMat.color.setHex(0x67e5df);
              lineMat.opacity = 0.98;
            } else if (isHovered) {
              lineMat.color.setHex(0x67e5df);
              lineMat.opacity = 0.86;
            } else if (isInternalHighlight) {
              lineMat.color.setHex(0xffb84d);
              lineMat.opacity = 0.95;
            } else if (isOuterGhostShell) {
              lineMat.color.setHex(0x9bc5ef);
              lineMat.opacity = 0.42;
            } else if (shouldDim) {
              lineMat.color.setHex(0x7c97ad);
              lineMat.opacity = 0.12;
            } else {
              lineMat.color.setHex(0xdceaf8);
              lineMat.opacity = 0.64;
            }
            lineMat.needsUpdate = true;
          }
          return;
        }

        if (!(child as THREE.Mesh).isMesh) return;
        const mesh = child as THREE.Mesh;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        for (const m of mats) {
          const stdMat = m as THREE.MeshStandardMaterial;
          if (!stdMat || !stdMat.isMeshStandardMaterial) continue;

          if (!originalMatMap.has(stdMat)) {
            originalMatMap.set(stdMat, {
              colorHex: stdMat.color.getHex(),
              emissiveHex: stdMat.emissive.getHex(),
              emissiveIntensity: stdMat.emissiveIntensity,
              opacity: stdMat.opacity,
              transparent: stdMat.transparent,
              depthWrite: stdMat.depthWrite,
            });
          }

          const orig = originalMatMap.get(stdMat)!;

          if (isSelected) {
            stdMat.color.setHex(orig.colorHex);
            stdMat.emissive.setHex(0x67e5df);
            stdMat.emissiveIntensity = 0.46;
            stdMat.opacity = 1.0;
            stdMat.transparent = orig.transparent;
            stdMat.depthWrite = true;
          } else if (isHovered) {
            stdMat.color.setHex(orig.colorHex);
            stdMat.emissive.setHex(0x67e5df);
            stdMat.emissiveIntensity = 0.25;
            stdMat.opacity = shouldDim ? 0.25 : orig.opacity;
            stdMat.transparent = shouldDim ? true : orig.transparent;
            stdMat.depthWrite = !shouldDim;
          } else if (isInternalHighlight) {
            // Reference Video Cutaway X-Ray: Internal mechanical parts glow in warm engineering Amber/Gold
            stdMat.color.setHex(0xf5a623);
            stdMat.emissive.setHex(0xf5a623);
            stdMat.emissiveIntensity = 0.68;
            stdMat.opacity = 1.0;
            stdMat.transparent = false;
            stdMat.depthWrite = true;
          } else if (isOuterGhostShell) {
            // Reference Video Cutaway X-Ray: Outer airframe becomes translucent X-Ray ghost shell
            stdMat.color.setHex(0x1b2838);
            stdMat.emissive.setHex(0x3a6085);
            stdMat.emissiveIntensity = 0.14;
            stdMat.opacity = 0.15;
            stdMat.transparent = true;
            stdMat.depthWrite = false;
          } else if (shouldDim) {
            stdMat.color.setHex(orig.colorHex);
            stdMat.emissive.setHex(orig.emissiveHex);
            stdMat.emissiveIntensity = orig.emissiveIntensity * 0.3;
            stdMat.opacity = 0.16;
            stdMat.transparent = true;
            stdMat.depthWrite = false;
          } else {
            stdMat.color.setHex(orig.colorHex);
            stdMat.emissive.setHex(orig.emissiveHex);
            stdMat.emissiveIntensity = orig.emissiveIntensity;
            stdMat.opacity = orig.opacity;
            stdMat.transparent = orig.transparent;
            stdMat.depthWrite = orig.depthWrite;
          }
          stdMat.needsUpdate = true;
        }
      });
    }
  }, [
    selectedPartId,
    hoveredPartId,
    isIsolated,
    effectiveCutaway,
    partNodesMapRef,
    originalMatMap,
  ]);

  // Update 3D leader line endpoints when a part is selected or exploded
  useFrame(() => {
    const nodes = partNodesMapRef.current;

    if (
      selectedPartId &&
      (mode === 'inspect' || mode === 'exploded')
    ) {
      const obj = nodes.get(selectedPartId);
      if (obj) {
        box.setFromObject(obj);
        box.getCenter(center);

        const p0: [number, number, number] = [center.x, center.y, center.z];
        const p1: [number, number, number] = [
          center.x + (center.x >= 0 ? 0.55 : -0.55),
          center.y + 0.68,
          center.z,
        ];
        const p2: [number, number, number] = [
          center.x + (center.x >= 0 ? 1.25 : -1.25),
          center.y + 0.68,
          center.z,
        ];

        setLeaderPoints((prev) => {
          if (
            prev &&
            Math.abs(prev[0][0] - p0[0]) < 0.02 &&
            Math.abs(prev[0][1] - p0[1]) < 0.02 &&
            Math.abs(prev[0][2] - p0[2]) < 0.02
          ) {
            return prev;
          }
          return [p0, p1, p2];
        });
      }
    } else if (leaderPoints !== null) {
      setLeaderPoints(null);
    }

    // Update exploded assembly datum leader lines when exploded > 12%
    if (explodeProgress > 0.12 && (mode === 'exploded' || mode === 'inspect')) {
      const keyIds = [
        'nose-shell',
        'canopy-glass',
        'upper-spine',
        'belly-shell',
        'wing-left',
        'wing-right',
        'fin-left',
        'fin-right',
        'exhaust-ring-left',
        'exhaust-ring-right',
      ];
      const nextLines: Array<[[number, number, number], [number, number, number]]> = [];
      for (const id of keyIds) {
        const obj = nodes.get(id);
        if (!obj) continue;
        const rest = getPartRestPose(id);
        const pRest: [number, number, number] = [
          rest.position[0],
          rest.position[1] + 1.42,
          rest.position[2],
        ];
        const pCurr: [number, number, number] = [
          obj.position.x,
          obj.position.y + 1.42,
          obj.position.z,
        ];
        nextLines.push([pRest, pCurr]);
      }
      setExplodeDatumLines((prev) => {
        if (
          prev.length === nextLines.length &&
          prev.length > 0 &&
          Math.abs(prev[0][1][2] - nextLines[0][1][2]) < 0.03
        ) {
          return prev;
        }
        return nextLines;
      });
    } else if (explodeDatumLines.length > 0) {
      setExplodeDatumLines([]);
    }
  });

  return (
    <group name="CADHighlightsAndLeaderLines">
      {leaderPoints && (
        <group name="SelectedPartLeaderLine">
          <Line
            points={leaderPoints}
            color="#F5A623"
            lineWidth={1.6}
            transparent
            opacity={0.9}
          />
          <mesh position={leaderPoints[0]}>
            <boxGeometry args={[0.075, 0.075, 0.075]} />
            <meshBasicMaterial color="#F5A623" wireframe />
          </mesh>
        </group>
      )}
      {explodeDatumLines.map((pts, i) => (
        <Line
          key={`datum-line-${i}`}
          points={pts}
          color="#67E5DF"
          lineWidth={1.0}
          dashed
          dashSize={0.12}
          gapSize={0.08}
          transparent
          opacity={0.45}
        />
      ))}
    </group>
  );
};
