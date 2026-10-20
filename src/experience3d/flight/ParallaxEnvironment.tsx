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

interface CloudPuff {
  x: number;
  y: number;
  zBase: number;
  sx: number;
  sz: number;
  speedMult: number;
}

const WRAP = 50;

/**
 * Soft fbm cloud puff on a horizontal quad. Seeded per instance from its (x, y) so the shape is
 * stable while it scrolls; fades at the wrap boundary and with distance.
 */
const CLOUD_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying float vSeed;
  varying float vFade;
  void main() {
    vUv = uv;
    vec4 wp = instanceMatrix * vec4(position, 1.0);
    vSeed = instanceMatrix[3].x * 0.37 + instanceMatrix[3].y * 1.91;
    vFade = 1.0 - smoothstep(${(WRAP / 2 - 9).toFixed(1)}, ${(WRAP / 2).toFixed(1)}, abs(wp.z));
    gl_Position = projectionMatrix * modelViewMatrix * wp;
  }
`;
const CLOUD_FRAGMENT = /* glsl */ `
  uniform float uOpacity;
  uniform float uTime;
  varying vec2 vUv;
  varying float vSeed;
  varying float vFade;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }
  void main() {
    vec2 c = vUv - 0.5;
    float d = length(c * vec2(1.0, 1.0)) * 2.0;
    float n = fbm(vUv * 3.2 + vSeed + uTime * 0.02);
    float density = smoothstep(1.0, 0.25, d + (n - 0.5) * 0.9);
    density *= smoothstep(0.25, 0.65, n + 0.25);
    vec3 shade = mix(vec3(0.42, 0.44, 0.47), vec3(0.80, 0.82, 0.85), n);
    float a = density * uOpacity * vFade;
    gl_FragColor = vec4(shade, a);
  }
`;

export const ParallaxEnvironment: React.FC = () => {
  const { currentFlightFrameRef } = useAircraftRig();
  const resolvedQuality = useAppStore((s) => s.resolvedQuality);
  const reducedMotion = useAppStore((s) => s.reducedMotion);

  const count = Math.min(90, Math.round(QUALITY_SETTINGS[resolvedQuality].parallaxParticles * 0.38));
  const instancedRef = useRef<THREE.InstancedMesh | null>(null);
  const matRef = useRef<THREE.ShaderMaterial | null>(null);
  const scrollOffsetRef = useRef<number>(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const uniforms = useMemo(() => ({ uOpacity: { value: 0 }, uTime: { value: 0 } }), []);

  // Deterministic cloud deck: a low thick layer, a mid broken layer and a few high wisps
  const puffs = useMemo<CloudPuff[]>(() => {
    const rand = seededRandom(9001);
    const list: CloudPuff[] = [];
    for (let i = 0; i < 90; i++) {
      const layer = i % 3;
      const y = layer === 0 ? -6.5 - rand() * 2.0 : layer === 1 ? -3.2 - rand() * 1.4 : 7.5 + rand() * 2.5;
      const spread = layer === 0 ? 46 : layer === 1 ? 34 : 40;
      let x = (rand() - 0.5) * spread;
      // Keep the mid layer out of the immediate airframe volume
      if (layer === 1 && Math.abs(x) < 3) x += Math.sign(x || 1) * 3;
      const size = layer === 0 ? 7 + rand() * 7 : layer === 1 ? 3.5 + rand() * 4 : 6 + rand() * 6;
      list.push({
        x,
        y,
        zBase: (rand() - 0.5) * WRAP,
        sx: size,
        sz: size * (1.3 + rand() * 0.9),
        speedMult: layer === 0 ? 7 : layer === 1 ? 12 : 4.5,
      });
    }
    return list;
  }, []);

  useFrame(({ clock }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const frame = currentFlightFrameRef.current;
    const mesh = instancedRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;

    const visible = frame.parallaxSpeed > 0.01;
    mesh.visible = visible;
    if (!visible) return;

    mat.uniforms.uOpacity.value = Math.min(0.62, frame.parallaxSpeed * 0.7);
    mat.uniforms.uTime.value = reducedMotion ? 0 : clock.elapsedTime;

    if (!reducedMotion && !useAppStore.getState().flightPaused) {
      scrollOffsetRef.current = (scrollOffsetRef.current + dt * frame.parallaxSpeed) % 1000;
    }

    const activeCount = Math.min(count, puffs.length);
    mesh.count = activeCount;
    for (let i = 0; i < activeCount; i++) {
      const p = puffs[i];
      // Nose points toward -Z, so apparent forward flight moves the clouds toward +Z
      const z = ((((p.zBase + scrollOffsetRef.current * p.speedMult) + WRAP / 2) % WRAP) + WRAP) % WRAP - WRAP / 2;
      dummy.position.set(p.x, p.y, z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(p.sx, p.sz, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={instancedRef} args={[undefined, undefined, 90]} frustumCulled={false} visible={false}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial
        ref={matRef}
        vertexShader={CLOUD_VERTEX}
        fragmentShader={CLOUD_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  );
};
