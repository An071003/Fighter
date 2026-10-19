import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { QUALITY_SETTINGS } from '@/domain/config';
import { useAppStore } from '@/domain/store';
import { useAircraftRig } from '../aircraft/AircraftRig';

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface ParallaxBandItem {
  x: number;
  y: number;
  zBase: number;
  scaleX: number;
  scaleZ: number;
  speedMult: number;
  band: 0 | 1 | 2;
}

export const ParallaxEnvironment: React.FC = () => {
  const { currentFlightFrameRef } = useAircraftRig();
  const resolvedQuality = useAppStore((s) => s.resolvedQuality);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  const count = QUALITY_SETTINGS[resolvedQuality].parallaxParticles;
  const instancedRef = useRef<THREE.InstancedMesh | null>(null);
  const matRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const scrollOffsetRef = useRef<number>(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Deterministic 3-band parallax cloud/horizon markers (Far slow, Mid medium, Near fast)
  const items = useMemo<ParallaxBandItem[]>(() => {
    const rand = seededRandom(9001);
    const list: ParallaxBandItem[] = [];
    for (let i = 0; i < 240; i++) {
      const band = (i % 3) as 0 | 1 | 2;
      const speedMult = band === 0 ? 4.5 : band === 1 ? 9.5 : 16.0;
      const yRange =
        band === 0
          ? -4.8 - rand() * 2.5
          : band === 1
            ? -2.8 - rand() * 1.8
            : -1.6 - rand() * 3.2;
      const xSpread =
        band === 0
          ? (rand() - 0.5) * 34
          : band === 1
            ? (rand() - 0.5) * 24
            : (rand() > 0.5 ? 1 : -1) * (5.5 + rand() * 8.0);

      list.push({
        x: xSpread,
        y: yRange,
        zBase: (rand() - 0.5) * 44,
        scaleX: band === 0 ? 2.4 + rand() * 2.5 : band === 1 ? 0.6 + rand() * 0.9 : 0.12,
        scaleZ: band === 0 ? 4.5 + rand() * 4.0 : band === 1 ? 2.2 + rand() * 2.0 : 1.6 + rand() * 1.8,
        speedMult,
        band,
      });
    }
    return list;
  }, []);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const frame = currentFlightFrameRef.current;
    const mesh = instancedRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;

    const visible = frame.parallaxSpeed > 0.01;
    mesh.visible = visible;
    if (!visible) return;

    mat.opacity = Math.min(0.28, frame.parallaxSpeed * 0.28);

    if (!reducedMotion && !useAppStore.getState().flightPaused) {
      scrollOffsetRef.current = (scrollOffsetRef.current + dt * frame.parallaxSpeed) % 1000;
    }

    const activeCount = Math.min(count, items.length);
    mesh.count = activeCount;

    for (let i = 0; i < activeCount; i++) {
      const item = items[i];
      // Nose points toward -Z, so apparent forward flight moves environment toward +Z
      const wrappedZ =
        ((((item.zBase + scrollOffsetRef.current * item.speedMult) + 22) % 44) + 44) % 44 - 22;

      dummy.position.set(item.x, item.y, wrappedZ);
      dummy.scale.set(item.scaleX, 0.02, item.scaleZ);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={instancedRef}
      args={[undefined, undefined, 240]}
      frustumCulled={false}
      visible={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        ref={matRef}
        color="#67E5DF"
        transparent
        opacity={0}
        depthWrite={false}
      />
    </instancedMesh>
  );
};
