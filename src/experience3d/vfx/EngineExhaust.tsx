import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '@/domain/store';
import { useAircraftRig } from '../aircraft/AircraftRig';

/** Nozzle exit centre in rig space (assembly offset y=1.42 + nozzle centre y=-0.01). */
const NOZZLES: ReadonlyArray<[number, number, number]> = [[0, 1.41, 4.62]];

/** Single large nozzle: plume layers are authored for r=0.16 and scaled up to the 0.34 exit. */
const NOZZLE_SCALE = 2.1;

const PLUME_VERTEX = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vV = -mv.xyz;
    vN = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }
`;

const PLUME_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uThrottle;
  uniform float uIntensity;
  uniform float uDiamonds;
  uniform float uSeed;
  uniform vec3 uCore;
  uniform vec3 uMid;
  uniform vec3 uTail;
  varying vec2 vUv;
  varying vec3 vN;
  varying vec3 vV;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  void main() {
    // Plume length follows throttle: v is normalised over the visible length.
    float len = max(uThrottle, 0.06);
    float v = vUv.y / len;
    if (v > 1.0) discard;

    // Soft volumetric body: bright where the surface faces the camera, fading at the rim.
    float facing = abs(dot(normalize(vN), normalize(vV)));
    float body = pow(facing, 2.2);
    float fall = pow(1.0 - v, 1.5) * smoothstep(0.0, 0.05, v);

    // Turbulent flicker scrolling downstream
    float n = noise(vec2(vUv.x * 7.0 + uSeed, v * 6.0 - uTime * 11.0));
    n = 0.5 * n + 0.5 * noise(vec2(vUv.x * 15.0 - uSeed, v * 13.0 - uTime * 19.0));
    float flicker = 0.7 + 0.6 * n;

    // Mach shock diamonds: periodic bright bands that decay downstream
    float diamonds = 1.0 + uDiamonds * pow(0.5 + 0.5 * cos(v * 6.2831 * 4.5), 8.0) * (1.0 - v) * 2.2;

    vec3 col = mix(uCore, uMid, smoothstep(0.0, 0.4, v));
    col = mix(col, uTail, smoothstep(0.4, 1.0, v));
    float a = body * fall * flicker * diamonds * uIntensity * smoothstep(0.03, 0.3, uThrottle);
    gl_FragColor = vec4(col * a, a);
  }
`;

const GLOW_FRAGMENT = /* glsl */ `
  uniform float uThrottle;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float core = pow(clamp(1.0 - d, 0.0, 1.0), 2.5);
    float pulse = 0.9 + 0.1 * sin(uTime * 37.0);
    vec3 col = mix(vec3(1.0, 0.55, 0.2), vec3(1.0, 0.95, 0.85), core);
    float a = core * uThrottle * pulse;
    gl_FragColor = vec4(col * a, a);
  }
`;

const GLOW_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

interface PlumeLayer {
  radiusNozzle: number;
  radiusTail: number;
  length: number;
  core: string;
  mid: string;
  tail: string;
  intensity: number;
  diamonds: number;
}

const LAYERS: PlumeLayer[] = [
  // Hot blue-white core with shock diamonds
  { radiusNozzle: 0.16, radiusTail: 0.04, length: 1.9, core: '#F4F8FF', mid: '#8FC2FF', tail: '#3355FF', intensity: 1.35, diamonds: 1.0 },
  // Afterburner flame body
  { radiusNozzle: 0.21, radiusTail: 0.12, length: 3.6, core: '#FFF1D2', mid: '#FF9C3A', tail: '#FF3F14', intensity: 1.0, diamonds: 0.25 },
  // Wide soft heat glow
  { radiusNozzle: 0.25, radiusTail: 0.36, length: 4.6, core: '#FFB070', mid: '#FF6A2A', tail: '#2A0A06', intensity: 0.3, diamonds: 0.0 },
];

function makePlumeGeometry(layer: PlumeLayer): THREE.BufferGeometry {
  // radiusTop = tail end; uv.y runs 0 (nozzle) -> 1 (tail)
  const len = layer.length * 1.35;
  const g = new THREE.CylinderGeometry(
    layer.radiusTail * NOZZLE_SCALE,
    layer.radiusNozzle * NOZZLE_SCALE,
    len,
    40,
    24,
    true
  );
  g.translate(0, len / 2, 0);
  g.rotateX(Math.PI / 2);
  return g;
}

export const EngineExhaust: React.FC = () => {
  const { currentFlightFrameRef } = useAircraftRig();
  const reducedMotion = useAppStore((s) => s.reducedMotion);
  const groupRef = useRef<THREE.Group | null>(null);
  const lightRef = useRef<THREE.PointLight | null>(null);
  const throttleRef = useRef(0);

  const geometries = useMemo(() => LAYERS.map(makePlumeGeometry), []);
  const glowGeometry = useMemo(() => new THREE.CircleGeometry(0.5, 40), []);

  // One material per (engine, layer) so each plume gets its own flicker seed
  const materials = useMemo(
    () =>
      NOZZLES.map((_, e) =>
        LAYERS.map(
          (layer, l) =>
            new THREE.ShaderMaterial({
              vertexShader: PLUME_VERTEX,
              fragmentShader: PLUME_FRAGMENT,
              uniforms: {
                uTime: { value: 0 },
                uThrottle: { value: 0 },
                uIntensity: { value: layer.intensity },
                uDiamonds: { value: layer.diamonds },
                uSeed: { value: e * 13.7 + l * 3.1 },
                uCore: { value: new THREE.Color(layer.core) },
                uMid: { value: new THREE.Color(layer.mid) },
                uTail: { value: new THREE.Color(layer.tail) },
              },
              transparent: true,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
              side: THREE.DoubleSide,
              toneMapped: false,
            })
        )
      ),
    []
  );
  const glowMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: GLOW_VERTEX,
        fragmentShader: GLOW_FRAGMENT,
        uniforms: { uThrottle: { value: 0 }, uTime: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    []
  );

  useFrame(({ clock }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const state = useAppStore.getState();
    const frame = currentFlightFrameRef.current;

    // Flight throttle from the timeline; story start/taxi phases show an idle glow.
    const idle = state.storyPhaseIndex !== null && state.storyPhaseIndex >= 1 && state.storyPhaseIndex <= 3 ? 0.14 : 0;
    const exploded = state.explodeProgress > 0.02;
    // Engines spool to take-off thrust well before the airflow builds up (wind ramps 0.7s..5.7s).
    const target = exploded ? 0 : Math.max(idle, Math.min(1, (frame.windIntensity / 0.82) * 2.4));
    throttleRef.current += (target - throttleRef.current) * Math.min(1, dt * 3.0);
    const throttle = throttleRef.current;
    const t = reducedMotion ? 0 : clock.elapsedTime;

    if (groupRef.current) groupRef.current.visible = throttle > 0.01;
    for (const engine of materials) {
      for (const m of engine) {
        m.uniforms.uTime.value = t;
        m.uniforms.uThrottle.value = throttle;
      }
    }
    glowMaterial.uniforms.uThrottle.value = Math.min(1, throttle * 1.6);
    glowMaterial.uniforms.uTime.value = t;
    if (lightRef.current) {
      lightRef.current.intensity = throttle * 7.0 * (reducedMotion ? 1 : 0.92 + 0.08 * Math.sin(t * 31.0));
    }
  });

  return (
    <group ref={groupRef} name="EngineExhaustVfx" visible={false}>
      {NOZZLES.map((pos, e) => (
        <group key={`nozzle-${e}`} position={pos}>
          {/* Inner nozzle glow facing aft (renders from both sides) */}
          <mesh geometry={glowGeometry} material={glowMaterial} position={[0, 0, -0.08]} renderOrder={2} />
          {geometries.map((g, l) => (
            <mesh key={`plume-${l}`} geometry={g} material={materials[e][l]} renderOrder={3 + l} frustumCulled={false} />
          ))}
        </group>
      ))}
      <pointLight ref={lightRef} position={[0, 1.4, 5.3]} color="#FF9A4A" distance={6} decay={2} intensity={0} />
    </group>
  );
};
