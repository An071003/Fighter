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

/** Comet-shaped speed streak: bright head, long fading tail, soft cross-section. */
const STREAK_VERTEX = /* glsl */ `
  varying vec3 vLocal;
  void main() {
    vLocal = position;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;
const STREAK_FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  uniform vec3 uColor;
  varying vec3 vLocal;
  void main() {
    // z: -0.5 (head, toward nose) .. +0.5 (tail)
    float head = smoothstep(-0.5, -0.38, vLocal.z);
    float tail = 1.0 - smoothstep(-0.38, 0.5, vLocal.z);
    float a = head * tail * tail * uOpacity;
    gl_FragColor = vec4(uColor * a, a);
  }
`;

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
  const matRef = useRef<THREE.ShaderMaterial | null>(null);
  const uniforms = useMemo(
    () => ({ uOpacity: { value: 0 }, uColor: { value: new THREE.Color('#E8ECF0') } }),
    []
  );
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
        length: 1.4 + rng() * 3.2,
        speed: 14.0 + rng() * 12.0,
        thickness: isWingtip ? 0.012 : 0.008,
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

    mat.uniforms.uOpacity.value = Math.min(0.55, frame.windIntensity * 0.6);

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
      <shaderMaterial
        ref={matRef}
        vertexShader={STREAK_VERTEX}
        fragmentShader={STREAK_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </instancedMesh>
  );
};
