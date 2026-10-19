import React, { useEffect, useMemo, useState } from 'react';
import { Line } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PART_MANIFEST } from '@/domain/partRegistry';
import { useAppStore } from '@/domain/store';
import { useAircraftRig } from '../aircraft/AircraftRig';

interface OriginalMaterialProps {
  emissiveHex: number;
  emissiveIntensity: number;
  opacity: number;
  transparent: boolean;
}

export const MaterialHighlight: React.FC = () => {
  const { partNodesMapRef } = useAircraftRig();
  const selectedPartId = useAppStore((s) => s.selectedPartId);
  const hoveredPartId = useAppStore((s) => s.hoveredPartId);
  const isIsolated = useAppStore((s) => s.isIsolated);
  const mode = useAppStore((s) => s.mode);

  const originalMatMap = useMemo(
    () => new WeakMap<THREE.MeshStandardMaterial, OriginalMaterialProps>(),
    []
  );
  const box = useMemo(() => new THREE.Box3(), []);
  const center = useMemo(() => new THREE.Vector3(), []);

  const [leaderPoints, setLeaderPoints] = useState<
    [[number, number, number], [number, number, number], [number, number, number]] | null
  >(null);

  useEffect(() => {
    const nodes = partNodesMapRef.current;

    for (const part of PART_MANIFEST.parts) {
      const obj = nodes.get(part.id);
      if (!obj) continue;

      const isSelected = selectedPartId === part.id;
      const isHovered = hoveredPartId === part.id && !isSelected;
      const shouldDim = isIsolated && selectedPartId !== null && !isSelected;

      obj.traverse((child) => {
        if (child.userData.isCadEdge) {
          const lineSeg = child as THREE.LineSegments;
          const lineMat = lineSeg.material as THREE.LineBasicMaterial;
          if (lineMat) {
            if (isSelected) {
              lineMat.color.setHex(0x67e5df);
              lineMat.opacity = 0.96;
            } else if (isHovered) {
              lineMat.color.setHex(0x67e5df);
              lineMat.opacity = 0.78;
            } else if (shouldDim) {
              lineMat.color.setHex(0x7c97ad);
              lineMat.opacity = 0.1;
            } else {
              lineMat.color.setHex(0xc8e6f8);
              lineMat.opacity = 0.44;
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
              emissiveHex: stdMat.emissive.getHex(),
              emissiveIntensity: stdMat.emissiveIntensity,
              opacity: stdMat.opacity,
              transparent: stdMat.transparent,
            });
          }

          const orig = originalMatMap.get(stdMat)!;

          if (isSelected) {
            stdMat.emissive.setHex(0x67e5df);
            stdMat.emissiveIntensity = 0.42;
            stdMat.opacity = 1.0;
            stdMat.transparent = orig.transparent;
          } else if (isHovered) {
            stdMat.emissive.setHex(0x67e5df);
            stdMat.emissiveIntensity = 0.22;
            stdMat.opacity = shouldDim ? 0.25 : orig.opacity;
            stdMat.transparent = shouldDim ? true : orig.transparent;
          } else if (shouldDim) {
            stdMat.emissive.setHex(orig.emissiveHex);
            stdMat.emissiveIntensity = orig.emissiveIntensity * 0.3;
            stdMat.opacity = 0.18;
            stdMat.transparent = true;
          } else {
            stdMat.emissive.setHex(orig.emissiveHex);
            stdMat.emissiveIntensity = orig.emissiveIntensity;
            stdMat.opacity = orig.opacity;
            stdMat.transparent = orig.transparent;
          }
          stdMat.needsUpdate = true;
        }
      });
    }
  }, [selectedPartId, hoveredPartId, isIsolated, partNodesMapRef, originalMatMap]);

  // Update 3D leader line endpoints when a part is selected in inspect/exploded mode
  useFrame(() => {
    if (
      !selectedPartId ||
      (mode !== 'inspect' && mode !== 'exploded')
    ) {
      if (leaderPoints !== null) setLeaderPoints(null);
      return;
    }
    const obj = partNodesMapRef.current.get(selectedPartId);
    if (!obj) return;

    box.setFromObject(obj);
    box.getCenter(center);

    const p0: [number, number, number] = [center.x, center.y, center.z];
    const p1: [number, number, number] = [
      center.x + (center.x >= 0 ? 0.55 : -0.55),
      center.y + 0.65,
      center.z,
    ];
    const p2: [number, number, number] = [
      center.x + (center.x >= 0 ? 1.15 : -1.15),
      center.y + 0.65,
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
  });

  if (!leaderPoints) return null;

  return (
    <group name="SelectedPartLeaderLine">
      <Line
        points={leaderPoints}
        color="#67E5DF"
        lineWidth={1.5}
        transparent
        opacity={0.75}
      />
      <mesh position={leaderPoints[0]}>
        <sphereGeometry args={[0.045, 16, 16]} />
        <meshBasicMaterial color="#67E5DF" />
      </mesh>
    </group>
  );
};
