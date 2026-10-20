import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { STORY_TAXI_SPEED } from '@/domain/config';
import { useAppStore } from '@/domain/store';
import { getStoryPhase } from '@/domain/story';
import { useAircraftRig } from '../aircraft/AircraftRig';

/** Ground surface height: wheels rest at world y ≈ 0.02. */
const GROUND_Y = 0.015;

/**
 * Procedural apron / taxiway / runway asphalt used by the guided story ground phases.
 * The aircraft stays anchored at X=Z=0; forward motion is shown by scrolling the markings (+Z).
 */
const GROUND_VERTEX = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const GROUND_FRAGMENT = /* glsl */ `
  uniform float uOffset;
  uniform float uRunway;
  uniform float uOpacity;
  uniform vec3 uFogColor;
  uniform vec3 uCamPos;
  varying vec3 vWorld;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float band(float v, float c, float w) { return 1.0 - smoothstep(w * 0.5, w * 0.5 + 0.02, abs(v - c)); }

  void main() {
    float x = vWorld.x;
    float z = vWorld.z - uOffset;
    // Asphalt with coarse aggregate & tyre-wear streak
    float n = noise(vec2(x, z) * 3.0) * 0.5 + noise(vec2(x, z) * 11.0) * 0.5;
    vec3 col = vec3(0.075, 0.078, 0.082) + (n - 0.5) * 0.025;
    col -= 0.02 * band(x, 0.0, 1.6);

    // Taxiway: amber dashed centreline, double yellow edge lines, blue edge lights
    float dash = step(0.45, fract(z / 3.0));
    float taxiCenter = band(x, 0.0, 0.12) * dash;
    float taxiEdge = band(abs(x), 6.0, 0.08) + band(abs(x), 6.25, 0.08);
    vec2 lightCell = vec2(abs(x) - 6.9, fract(z / 7.0) - 0.5);
    float edgeLight = 1.0 - smoothstep(0.05, 0.11, length(lightCell * vec2(1.0, 7.0)));

    // Runway: white centreline dashes, side stripes and threshold "piano keys"
    float rwDash = step(0.5, fract(z / 6.0)) * band(x, 0.0, 0.18);
    float rwSide = band(abs(x), 8.5, 0.22);
    float keys = step(0.5, fract(x / 0.9)) * (1.0 - step(5.5, abs(x))) * band(z, -14.0, 5.0);

    vec3 amber = vec3(0.96, 0.66, 0.14);
    vec3 white = vec3(0.86, 0.87, 0.88);
    vec3 blue = vec3(0.25, 0.45, 1.0);
    col = mix(col, amber, (taxiCenter + taxiEdge * 0.85) * (1.0 - uRunway));
    col = mix(col, white, (rwDash + rwSide + keys) * uRunway * 0.9);
    col += blue * edgeLight * 1.6 * (1.0 - uRunway);

    float dist = length(vWorld.xz - uCamPos.xz);
    float fade = 1.0 - smoothstep(18.0, 42.0, dist);
    col = mix(uFogColor, col, fade);
    gl_FragColor = vec4(col, uOpacity);
  }
`;

export const AirfieldGround: React.FC = () => {
  const { currentFlightFrameRef } = useAircraftRig();
  const meshRef = useRef<THREE.Mesh | null>(null);
  const offsetRef = useRef(0);
  const runwayRef = useRef(0);
  const uniforms = useMemo(
    () => ({
      uOffset: { value: 0 },
      uRunway: { value: 0 },
      uOpacity: { value: 1 },
      uFogColor: { value: new THREE.Color('#0A0A0B') },
      uCamPos: { value: new THREE.Vector3() },
    }),
    []
  );

  useFrame(({ camera, scene }, rawDelta) => {
    const dt = Math.min(rawDelta, 0.05);
    const mesh = meshRef.current;
    if (!mesh) return;
    const state = useAppStore.getState();
    const phase = getStoryPhase(state.storyPhaseIndex);
    const frame = currentFlightFrameRef.current;
    const onGround = phase !== null && (phase.flight.kind === 'ground' || phase.id === 'takeoff');
    const opacity = onGround ? 1 - smoothstep01((frame.jetY - 0.25) / 0.4) : 0;
    mesh.visible = opacity > 0.01;
    if (!mesh.visible) return;

    // Ground speed (units/s): taxi roll, take-off acceleration with the timeline, otherwise parked
    let speed = 0;
    if (phase?.id === 'taxi') speed = STORY_TAXI_SPEED;
    else if (phase?.id === 'takeoff') speed = STORY_TAXI_SPEED + (frame.windIntensity / 0.82) * 38;
    if (!state.reducedMotion && !state.flightPaused) offsetRef.current = (offsetRef.current + speed * dt) % 4200;

    const wantRunway = phase?.id === 'lineup' || phase?.id === 'takeoff' ? 1 : 0;
    runwayRef.current += (wantRunway - runwayRef.current) * Math.min(1, dt * 3);

    uniforms.uOffset.value = offsetRef.current;
    uniforms.uRunway.value = runwayRef.current;
    uniforms.uOpacity.value = opacity;
    uniforms.uCamPos.value.copy(camera.position);
    if (scene.fog instanceof THREE.Fog) uniforms.uFogColor.value.copy(scene.fog.color);
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, GROUND_Y, 0]} visible={false} renderOrder={-1}>
      <planeGeometry args={[110, 110]} />
      <shaderMaterial
        vertexShader={GROUND_VERTEX}
        fragmentShader={GROUND_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite
      />
    </mesh>
  );
};

function smoothstep01(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}
