import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { QUALITY_SETTINGS } from '@/domain/config';
import { useAppStore } from '@/domain/store';
import { useAircraftRig } from '../aircraft/AircraftRig';

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface StreakSeed {
  x: number;
  y: number;
  zOffset: number;
  length: number;
  speed: number;
  thickness: number;
}

export const WindTrails: React.FC = () => {
  const { currentFlightFrameRef } = useAircraftRig();
  const resolvedQuality = useAppStore((s) => s.resolvedQuality);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  const maxStreaks = QUALITY_SETTINGS[resolvedQuality].windStreakCount;
  const meshRef = useRef<THREE.InstancedMesh | null>(null);
  const matRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const timeAccumRef = useRef<number>(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Precompute deterministic airflow streamline seeds around the aircraft volume
  const seeds = useMemo<StreakSeed[]>(() => {
    const rng = mulberry32(4209);
    const arr: StreakSeed[] = [];
    for (let i = 0; i < 200; i++) {
      // Cluster streamlines near wingtips, chines, and canopy slipstream
      const isWingtip = i < 70;
      const side = i % 2 === 0 ? -1 : 1;
      const x = isWingtip
        ? side * (1.8 + rng() * 3.1)
        : (rng() - 0.5) * 9.5;
      const y = isWingtip
        ? -0.2 + rng() * 1.4
        : -0.8 + rng() * 3.2;

      arr.push({
        x,
        y,
        zOffset: (rng() - 0.5) * 18.0,
        length: 0.9 + rng() * 2.2,
        speed: 14.0 + rng() * 12.0,
        thickness: isWingtip ? 0.016 : 0.011,
      });
    }
    return arr;
  }, []);

  useFrame((_, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const frame = currentFlightFrameRef.current;
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;

    const visible = frame.windIntensity > 0.01;
    mesh.visible = visible;
    if (!visible) return;

    mat.opacity = Math.min(0.26, frame.windIntensity * 0.28);

    if (!reducedMotion && !useAppStore.getState().flightPaused) {
      timeAccumRef.current = (timeAccumRef.current + dt * frame.windIntensity) % 1000;
    }

    const activeCount = Math.min(maxStreaks, seeds.length);
    mesh.count = activeCount;

    for (let i = 0; i < activeCount; i++) {
      const s = seeds[i];
      // Flow from nose (-Z) toward tail (+Z), wrapping inside [-9, +9]
      const z =
        ((((s.zOffset + timeAccumRef.current * s.speed) + 9.0) % 18.0) + 18.0) %
          18.0 -
        9.0;

      // Subtle vertical streamline curvature over the wing/canopy near z=0
      const archY = 0.18 * Math.exp(-(z * z) / 6.0);

      dummy.position.set(s.x, s.y + frame.jetY + archY, z);
      dummy.scale.set(s.thickness, s.thickness, s.length);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, 200]}
      frustumCulled={false}
      visible={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        ref={matRef}
        color="#9AF5F0"
        transparent
        opacity={0}
        depthWrite={false}
      />
    </instancedMesh>
  );
};
